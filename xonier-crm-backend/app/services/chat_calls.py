"""Conversation-scoped app-to-app calls. LiveKit owns media; Trakeroo owns access."""
from datetime import timedelta

from bson import ObjectId

from app.core.config import get_setting
from app.services.chat_auth import database
from app.services.chat_policy import now, oid, public
from app.utils.custom_exception import AppException


def configured():
    s = get_setting()
    return bool(s.LIVEKIT_URL and s.LIVEKIT_API_KEY and s.LIVEKIT_API_SECRET)


def media_client():
    from livekit import api
    s = get_setting()
    return api.LiveKitAPI(s.LIVEKIT_URL, s.LIVEKIT_API_KEY, s.LIVEKIT_API_SECRET)


async def authorized_participants(call, participants, client):
    """Revoke suspended users/company access in the media provider as well as chat."""
    from livekit import api
    db = database()
    conversation = await db.chat_conversations.find_one({"_id": oid(call["conversationId"]), "companyId": call["companyId"]})
    company = await db.companies.find_one({"_id": call["companyId"], "status": "active", "deletedAt": None})
    if not company or not conversation:
        await client.room.delete_room(api.DeleteRoomRequest(room=call["room"]))
        return []
    users = await db.users.find({"_id": {"$in": [oid(u) for u in conversation["memberIds"]]},
        "companyId": call["companyId"], "status": "active", "deletedAt": None}, {"_id": 1}).to_list(len(conversation["memberIds"]))
    allowed = {str(u["_id"]) for u in users}
    valid = []
    for participant in participants:
        if participant.identity in allowed:
            valid.append(participant)
        else:
            try:
                await client.room.remove_participant(api.RoomParticipantIdentity(room=call["room"], identity=participant.identity))
            except api.TwirpError as exc:
                if exc.code != "not_found":
                    raise
    return valid


async def start(service, conversation_id, kind):
    if not configured():
        raise AppException(503, "Voice/video calls require LiveKit configuration")

    async def commit(session):
        conversation = await service.conversation(conversation_id, session)
        if conversation.get("activeCallId"):
            existing = await service.db.chat_calls.find_one(service.scope(_id=oid(conversation["activeCallId"])), session=session)
            if existing and existing["status"] in ("ringing", "live"):
                return public(existing)
        call = {"_id": ObjectId(), "companyId": service.company, "conversationId": conversation_id,
            "kind": kind, "createdBy": service.uid, "creatorName": service.actor["name"],
            "status": "ringing", "participants": [], "declined": [], "createdAt": now(),
            "expiresAt": now() + timedelta(seconds=60), "endedAt": None, "mediaCheckAt": now()}
        call["room"] = f"trakeroo-{service.company}-{call['_id']}"
        await service.db.chat_calls.insert_one(call, session=session)
        await service.db.chat_conversations.update_one(service.scope(_id=conversation["_id"]), {"$set": {"activeCallId": str(call["_id"]) }}, session=session)
        await service.event("call.updated", conversation_id, call, session)
        return public(call)
    return await service.transaction(commit)


async def load(service, conversation_id, call_id):
    conversation = await service.conversation(conversation_id)
    call = await service.db.chat_calls.find_one(service.scope(_id=oid(call_id), conversationId=conversation_id))
    if not call:
        raise AppException(404, "Call not found")
    return conversation, call


async def join(service, conversation_id, call_id):
    from livekit import api
    _, call = await load(service, conversation_id, call_id)
    if call["status"] not in ("ringing", "live"):
        raise AppException(409, "This call has ended")
    s = get_setting()
    if not configured():
        raise AppException(503, "Calling is unavailable")
    async with media_client() as client:
        await client.room.create_room(api.CreateRoomRequest(name=call["room"],
            empty_timeout=60, departure_timeout=30, max_participants=s.CHAT_MAX_CALL_PARTICIPANTS))
    # Recheck after network I/O: an owner may have ended the call while room creation ran.
    await service.conversation(conversation_id)
    current = await service.db.chat_calls.find_one(service.scope(_id=call["_id"]))
    if current["status"] not in ("ringing", "live"):
        raise AppException(409, "This call has ended")
    token = (api.AccessToken(s.LIVEKIT_API_KEY, s.LIVEKIT_API_SECRET)
        .with_identity(service.uid).with_name(service.actor["name"]).with_ttl(timedelta(minutes=5))
        .with_grants(api.VideoGrants(room_join=True, room=call["room"],
            can_publish=True, can_subscribe=True, can_publish_data=False)).to_jwt())
    return {"token": token, "serverUrl": s.LIVEKIT_URL, "call": public(current)}


async def end(service, conversation_id, call_id):
    from livekit import api
    conversation, call = await load(service, conversation_id, call_id)
    if service.uid not in (call["createdBy"], conversation["ownerId"]):
        raise AppException(403, "Only the caller or conversation owner can end the call for everyone")
    if call["status"] in ("ended", "missed"):
        return public(call)
    # Revoke media first; if this fails the room remains visible and can be retried.
    async with media_client() as client:
        try:
            await client.room.delete_room(api.DeleteRoomRequest(room=call["room"]))
        except api.TwirpError as exc:
            if exc.code != "not_found":
                raise
    return await finish(call, "ended")


async def decline(service, conversation_id, call_id):
    _, call = await load(service, conversation_id, call_id)
    await service.db.chat_calls.update_one(service.scope(_id=call["_id"]), {"$addToSet": {"declined": service.uid}})
    return {"declined": True}


async def finish(call, status):
    from app.services.chat_service import ChatService
    service = ChatService({"id": call["createdBy"], "company": str(call["companyId"]), "name": call["creatorName"]})

    async def commit(session):
        current = await service.db.chat_calls.find_one(service.scope(_id=call["_id"]), session=session)
        if current["status"] in ("ended", "missed"):
            return public(current)
        current.update(status=status, endedAt=now(), participants=[])
        await service.db.chat_calls.replace_one(service.scope(_id=call["_id"]), current, session=session)
        await service.db.chat_conversations.update_one(service.scope(_id=oid(call["conversationId"]), activeCallId=str(call["_id"])), {"$unset": {"activeCallId": ""}}, session=session)
        await service.event("call.updated", call["conversationId"], current, session)
        return public(current)
    return await service.transaction(commit)


async def webhook(body, authorization):
    from livekit import api
    if not configured():
        raise AppException(503, "Calling is unavailable")
    s = get_setting()
    try:
        event = api.WebhookReceiver(api.TokenVerifier(s.LIVEKIT_API_KEY, s.LIVEKIT_API_SECRET)).receive(body, authorization)
    except Exception:
        raise AppException(401, "Invalid media webhook signature")
    db = database()
    call = await db.chat_calls.find_one({"room": event.room.name})
    if not call:
        return
    if call["status"] in ("ended", "missed"):
        # A previously issued bearer grant can remain valid briefly. Never allow
        # a closed call to be resurrected by auto-creating its old media room.
        if event.event == "participant_joined":
            async with media_client() as client:
                try:
                    await client.room.delete_room(api.DeleteRoomRequest(room=call["room"]))
                except api.TwirpError as exc:
                    if exc.code != "not_found":
                        raise
        return
    if event.event == "room_finished":
        await finish(call, "ended" if call["status"] == "live" else "missed")
    elif event.event in ("participant_joined", "participant_left"):
        # Webhooks may be retried or arrive out of order: reconcile against authoritative media state.
        async with media_client() as client:
            try:
                response = await client.room.list_participants(api.ListParticipantsRequest(room=call["room"]))
                participants = [p.identity for p in await authorized_participants(call, response.participants, client)]
            except api.TwirpError as exc:
                if exc.code != "not_found":
                    raise
                participants = []
        from app.services.chat_service import ChatService
        service = ChatService({"id": call["createdBy"], "company": str(call["companyId"]), "name": call["creatorName"]})

        async def commit(session):
            current = await db.chat_calls.find_one({"_id": call["_id"]}, session=session)
            if current["status"] not in ("ringing", "live"):
                return
            current["participants"] = participants
            # Creator joining alone must not consume the invitation timeout.
            if len(participants) >= 2:
                current["status"] = "live"
            await db.chat_calls.replace_one({"_id": call["_id"]}, current, session=session)
            await service.event("call.updated", call["conversationId"], current, session)
        await service.transaction(commit)


async def expire_one(db):
    if not configured():
        return
    from livekit import api
    from pymongo import ReturnDocument
    call = await db.chat_calls.find_one_and_update({"mediaCheckAt": {"$lte": now()}, "$or": [
        {"status": "ringing", "expiresAt": {"$lt": now()}}, {"status": "live"}]},
        {"$set": {"mediaCheckAt": now() + timedelta(seconds=30)}}, return_document=ReturnDocument.AFTER)
    if not call:
        return
    async with media_client() as client:
        try:
            response = await client.room.list_participants(api.ListParticipantsRequest(room=call["room"]))
            participants = await authorized_participants(call, response.participants, client)
            if len(participants) >= 2:
                # Heal missed participant webhooks instead of terminating an established call.
                from app.services.chat_service import ChatService
                service = ChatService({"id": call["createdBy"], "company": str(call["companyId"]), "name": call["creatorName"]})
                async def commit(session):
                    current = await db.chat_calls.find_one({"_id": call["_id"]}, session=session)
                    if current["status"] not in ("ringing", "live"):
                        return
                    current.update(status="live", participants=[p.identity for p in participants])
                    await db.chat_calls.replace_one({"_id": call["_id"]}, current, session=session)
                    await service.event("call.updated", call["conversationId"], current, session)
                await service.transaction(commit)
                return
            if participants and call["status"] == "live":
                return
            await client.room.delete_room(api.DeleteRoomRequest(room=call["room"]))
        except api.TwirpError as exc:
            if exc.code != "not_found":
                raise
    await finish(call, "ended" if call["status"] == "live" else "missed")
