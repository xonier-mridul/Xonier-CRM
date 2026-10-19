"""Private, bounded direct uploads; only a scanned immutable copy is downloadable."""
import asyncio
import struct
from datetime import timedelta
from functools import lru_cache
from pathlib import PurePosixPath

from bson import ObjectId
from pymongo import ReturnDocument

from app.core.config import get_setting
from app.services.chat_policy import now, oid, public
from app.utils.custom_exception import AppException


def storage_configured():
    s = get_setting()
    return bool(s.CHAT_S3_BUCKET and s.CHAT_CLAMAV_HOST)


@lru_cache(maxsize=1)
def s3_client():
    import boto3
    from botocore.config import Config
    return boto3.client("s3", region_name=get_setting().CHAT_S3_REGION,
        config=Config(connect_timeout=5, read_timeout=30, retries={"max_attempts": 2, "mode": "standard"}))


async def create_upload(service, conversation_id, command):
    await service.conversation(conversation_id)
    s = get_setting()
    if not storage_configured():
        raise AppException(503, "File sharing requires private S3 storage and a ClamAV scanner")
    if command.size > s.CHAT_MAX_FILE_BYTES:
        raise AppException(400, f"File exceeds the {s.CHAT_MAX_FILE_BYTES // 1024 // 1024} MB limit")
    filename = PurePosixPath(command.name.replace("\\", "/")).name
    filename = "".join(c for c in filename if ord(c) >= 32 and c != "\x7f")
    if not filename:
        raise AppException(400, "Invalid filename")
    file_id = ObjectId()
    key = f"chat/quarantine/{service.company}/{file_id}"
    # The only object the upload credential can write is this unique quarantine key.
    client = await asyncio.to_thread(s3_client)
    post = await asyncio.to_thread(client.generate_presigned_post,
        Bucket=s.CHAT_S3_BUCKET, Key=key, Fields={"Content-Type": command.contentType},
        Conditions=[{"Content-Type": command.contentType}, ["content-length-range", command.size, command.size]], ExpiresIn=300)
    file = {"_id": file_id, "companyId": service.company, "conversationId": conversation_id,
        "uploaderId": service.uid, "name": filename, "size": command.size,
        "contentType": command.contentType, "storageKey": key,
        "sealedKey": f"chat/files/{service.company}/{file_id}", "state": "uploading",
        "createdAt": now(), "messageId": None, "scanLease": now(), "attempts": 0}
    await service.db.chat_files.insert_one(file)
    return {"file": public(file), "upload": post}


async def complete_upload(service, conversation_id, file_id):
    await service.conversation(conversation_id)
    file = await service.db.chat_files.find_one(service.scope(_id=oid(file_id), conversationId=conversation_id, uploaderId=service.uid))
    if not file:
        raise AppException(404, "File not found")
    if file["state"] != "uploading":
        return public(file)
    try:
        client = await asyncio.to_thread(s3_client)
        head = await asyncio.to_thread(client.head_object, Bucket=get_setting().CHAT_S3_BUCKET, Key=file["storageKey"])
    except Exception:
        raise AppException(400, "Upload has not completed; please retry")
    if head["ContentLength"] != file["size"] or head["ContentType"] != file["contentType"]:
        raise AppException(400, "Uploaded file does not match the approved size/type")
    await service.db.chat_files.update_one(service.scope(_id=file["_id"], state="uploading"), {"$set": {"state": "scanning", "scanLease": now()}})
    file["state"] = "scanning"
    return public(file)


async def download(service, conversation_id, file_id):
    await service.conversation(conversation_id)
    file = await service.db.chat_files.find_one(service.scope(_id=oid(file_id), conversationId=conversation_id))
    if not file or (file["uploaderId"] != service.uid and not file.get("messageId")):
        raise AppException(404, "File not found")
    if file.get("messageId"):
        message = await service.db.chat_messages.find_one(service.scope(_id=oid(file["messageId"]), deletedAt=None))
        if not message:
            raise AppException(404, "File not found")
    if file["state"] != "ready":
        raise AppException(409, "File is still scanning or was rejected")
    # attachment disposition avoids executing user-controlled documents in our origin.
    client = await asyncio.to_thread(s3_client)
    url = await asyncio.to_thread(client.generate_presigned_url, "get_object", Params={
        "Bucket": get_setting().CHAT_S3_BUCKET, "Key": file["sealedKey"],
        "ResponseContentDisposition": "attachment", "ResponseContentType": "application/octet-stream"}, ExpiresIn=60)
    return {"url": url}


async def scan_bytes(data):
    s = get_setting()
    reader, writer = await asyncio.wait_for(asyncio.open_connection(s.CHAT_CLAMAV_HOST, s.CHAT_CLAMAV_PORT), timeout=10)
    try:
        writer.write(b"zINSTREAM\0")
        for offset in range(0, len(data), 65536):
            chunk = data[offset:offset + 65536]
            writer.write(struct.pack("!I", len(chunk)) + chunk)
            await writer.drain()
        writer.write(struct.pack("!I", 0))
        await writer.drain()
        result = await asyncio.wait_for(reader.readuntil(b"\0"), timeout=90)
        if b"FOUND" in result:
            return False
        if result.rstrip(b"\0\n").endswith(b"OK"):
            return True
        raise RuntimeError("Scanner did not return a clean result")
    finally:
        writer.close()
        await writer.wait_closed()


async def scan_one(db):
    if not storage_configured():
        return
    file = await db.chat_files.find_one_and_update({"state": "scanning", "scanLease": {"$lte": now()}},
        {"$set": {"scanLease": now() + timedelta(minutes=3)}, "$inc": {"attempts": 1}}, return_document=ReturnDocument.AFTER)
    if not file:
        return
    s = get_setting()
    try:
        client = await asyncio.to_thread(s3_client)
        def read_object():
            obj = client.get_object(Bucket=s.CHAT_S3_BUCKET, Key=file["storageKey"])
            try:
                data = obj["Body"].read(s.CHAT_MAX_FILE_BYTES + 1)
                return data
            finally:
                obj["Body"].close()
        data = await asyncio.to_thread(read_object)
        clean = len(data) == file["size"] and len(data) <= s.CHAT_MAX_FILE_BYTES and await scan_bytes(data)
        if clean:
            # Upload URL may still be valid: store the EXACT bytes scanned under a different key.
            await asyncio.to_thread(client.put_object, Bucket=s.CHAT_S3_BUCKET,
                Key=file["sealedKey"], Body=data, ContentType=file["contentType"])
        await asyncio.to_thread(client.delete_object, Bucket=s.CHAT_S3_BUCKET, Key=file["storageKey"])
        await db.chat_files.update_one({"_id": file["_id"]}, {"$set": {"state": "ready" if clean else "rejected", "scannedAt": now()}})
    except Exception:
        # Fail closed. No download is permitted without a clean verdict.
        await db.chat_files.update_one({"_id": file["_id"]}, {"$set": {
            "state": "rejected" if file["attempts"] >= 5 else "scanning",
            "scanLease": now() + timedelta(seconds=min(300, 10 * 2 ** file["attempts"]))}})
