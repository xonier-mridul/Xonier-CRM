import re

from fastapi import Request
from pydantic import ValidationError
from python_multipart.exceptions import MultipartParseError
from starlette.datastructures import UploadFile
from starlette.exceptions import HTTPException
from starlette.formparsers import MultiPartException

from app.schemas.communication.gmail_schema import GmailSend
from app.utils.custom_exception import AppException


MAX_ATTACHMENTS_BYTES = 10 * 1024 * 1024
# Allow room for the JSON payload, multipart headers and boundaries.
MAX_REQUEST_BYTES = 12 * 1024 * 1024


async def send_email_upload(request: Request, service):
    # Called inside the endpoint so auth dependencies and the rate limiter run first.
    try:
        length = int(request.headers.get("content-length", "0"))
    except ValueError as exc:
        raise AppException(400, "Invalid upload length") from exc
    if length < 0:
        raise AppException(400, "Invalid upload length")
    if length > MAX_REQUEST_BYTES:
        raise AppException(413, "Email upload is too large")

    received = 0
    oversized = False

    async def receive():
        nonlocal received, oversized
        message = await request.receive()
        if message["type"] == "http.request":
            received += len(message.get("body", b""))
            if received > MAX_REQUEST_BYTES:
                oversized = True
                # Starlette closes partially written files on this exception.
                raise MultiPartException("Email upload is too large")
        return message

    bounded_request = Request(request.scope, receive)
    try:
        form = await bounded_request.form(max_files=5, max_fields=1)
    except (HTTPException, MultiPartException, MultipartParseError) as exc:
        if oversized:
            raise AppException(413, "Email upload is too large") from exc
        raise AppException(400, "Invalid email form. Include one message and up to 5 attachments.") from exc

    try:
        payload = form.get("payload")
        files = form.getlist("files")
        if not isinstance(payload, str) or not all(isinstance(file, UploadFile) for file in files):
            raise AppException(422, "Include the email message and attach files using the files field")
        if len(payload) > 120000:
            raise AppException(413, "Email text is too large")
        try:
            command = GmailSend.model_validate_json(payload)
        except ValidationError as exc:
            raise AppException(422, "Check recipients, subject and message. Maximum 20 recipients per email.") from exc

        if sum(file.size for file in files) > MAX_ATTACHMENTS_BYTES:
            raise AppException(413, "Attachments must total 10 MB or less")
        attachments = []
        for file in files:
            name = re.split(r"[/\\]", file.filename or "attachment")[-1].replace("\r", "").replace("\n", "")[:200]
            attachments.append({"name": name or "attachment", "content": await file.read()})
        return await service.send(request.state.user, command, attachments)
    finally:
        await form.close()
