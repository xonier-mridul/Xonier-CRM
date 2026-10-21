
from typing import Dict, Any, List
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone
from jinja2 import Environment, BaseLoader
import hashlib
import json
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from app.core.security_store import now
from datetime import timedelta
from app.services.mail_queue import MailQueue

from app.repositories.email_history_repository import EmailHistoryRepository
from app.repositories.email_template_repository import EmailTemplateRepository
from app.db.models.communications.email_history_model import EmailHistoryModel
from app.db.models.email_template_model import EmailTemplateModel
from app.config.email_config import FROM_EMAIL
from app.core.enums import EmailStatus
from app.utils.custom_exception import AppException


class EmailService:
    def __init__(self):
        self.history_repo = EmailHistoryRepository()
        self.template_repo = EmailTemplateRepository()
        self.jinja_env = Environment(loader=BaseLoader())

    
    async def send_email(self, payload: Dict[str, Any], user: Dict[str, Any]):
        template = await self._get_template(payload["template_id"])
        variables = payload.get("variables", {})
        self._validate_required_variables(template.variables, variables)
        rendered = self._render_template(template, variables)
        return await self._enqueue_rendered(payload["template_id"], rendered, variables, payload, user)


    async def send_bulk_email(self, payload: Dict[str, Any], user: Dict[str, Any]):
        results, failed = [], []
        for index, recipient in enumerate(payload["recipients"]):
            message = {**payload, "to_emails": [recipient["email"]],
                "variables": {**payload.get("variables", {}), **recipient.get("variables", {})}, "_kind": "bulk"}
            message.pop("recipients", None)
            if payload.get("_request_key"):
                message["_request_key"] = f"{payload['_request_key']}:{index}"
            try:
                history = await self.send_email(message, user)
                results.append({"email": recipient["email"], "status": "queued", "history_id": str(history.get("_id") or history.get("id"))})
            except AppException as error:
                failed.append({"email": recipient["email"], "status": "failed", "error": error.message})
        return {"total": len(payload["recipients"]), "queued_count": len(results),
                "success_count": len(results), "failed_count": len(failed), "results": results, "failed": failed}


    async def get_all(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = filters.get("page") or 1
            limit = filters.get("limit") or 10
            query: Dict[str, Any] = {
                "sent_by.$id": PydanticObjectId(user["_id"])
            }

            if "status" in filters:
                query["status"] = filters["status"]
            if "template_id" in filters:
                query["template.$id"] = PydanticObjectId(filters["template_id"])
            if "lead_id" in filters:
                query["lead_id"] = filters["lead_id"]
            if "deal_id" in filters:
                query["deal_id"] = filters["deal_id"]
            if "invoice_id" in filters:
                query["invoice_id"] = filters["invoice_id"]
            if "client_id" in filters:
                query["client_id"] = filters["client_id"]
            if "quotation_id" in filters:
                query["quotation_id"] = filters["quotation_id"]

            result = await self.history_repo.get_all(
                page=int(page),
                limit=int(limit),
                filters=query,
                populate=["template", "sent_by"],
                sort=["-created_at"]
            )

            if not result:
                raise AppException(404, "No email history found")
            return jsonable_encoder(result)

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

   
    async def get_by_id(self, id: str, user: Dict[str, Any]):
        try:
            history = await self.history_repo.find_one(
                filter={
                    "_id": PydanticObjectId(id),
                    "sent_by.$id": PydanticObjectId(user["_id"])
                },
                populate=["template", "sent_by"]
            )
            if not history:
                raise AppException(404, "Email not found or access denied")

            return jsonable_encoder(history)

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

   
    async def resend_email(self, id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        original = await self.history_repo.find_one(filter={"_id": PydanticObjectId(id),
            "sent_by.$id": PydanticObjectId(user["_id"])})
        if not original:
            raise AppException(404, "Email not found or access denied")
        recipients = {**payload, "to_emails": payload.get("to_emails") or original.to_emails,
            "cc_emails": payload.get("cc_emails") or original.cc_emails,
            "bcc_emails": payload.get("bcc_emails") or original.bcc_emails, "reply_to": original.reply_to,
            **{field: getattr(original, field) for field in ["lead_id", "deal_id", "client_id", "invoice_id", "quotation_id", "prospect_id"]}}
        template = original.template
        template_id = str(template.ref.id if hasattr(template, "ref") else template.id) if template else None
        return await self._enqueue_rendered(template_id,
            {"subject": original.subject, "html": original.html_body, "text": original.text_body},
            original.variables_used, recipients, user)


    async def update(self, id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        try:
            existing = await self.history_repo.find_one(
                filter={
                    "_id": PydanticObjectId(id),
                    "sent_by.$id": PydanticObjectId(user["_id"])
                }
            )
            if not existing:
                raise AppException(404, "Email not found or access denied")

            payload["updated_at"] = datetime.now(timezone.utc)
            updated = await self.history_repo.update(id=PydanticObjectId(id), data=payload)

            if not updated:
                raise AppException(400, "Failed to update email")

            return jsonable_encoder(updated)

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    
    async def delete(self, id: str, user: Dict[str, Any]):
        result = await self.bulk_delete([id], user)
        return {"message": "Email history deleted; pending delivery cancelled", **result}

    async def bulk_delete(self, ids: List[str], user: Dict[str, Any]):
        queue = MailQueue()
        object_ids = list({PydanticObjectId(value) for value in ids})
        async def commit(session):
            rows = await queue.db.email_history.find({"_id": {"$in": object_ids},
                "sent_by.$id": PydanticObjectId(user["_id"])}, {"_id": 1}, session=session).to_list(len(object_ids))
            found = [row["_id"] for row in rows]
            if not found:
                raise AppException(404, "No emails found or access denied")
            if await queue.db.email_jobs.find_one({"historyId": {"$in": found},
                    "state": {"$in": ["sending", "uncertain"]}}, session=session):
                raise AppException(409, "Delivery is in progress or requires review. Resolve it before deleting history.")
            # Cancellation races with worker claims on the same job documents;
            # transaction conflicts retry and re-check the in-flight guard.
            await queue.db.email_jobs.update_many({"historyId": {"$in": found}, "state": "queued"},
                {"$set": {"state": "cancelled", "updatedAt": now(),
                          "cleanupAt": now() + timedelta(days=queue.settings.MAIL_RETENTION_DAYS)},
                 "$unset": {"payloadCipher": ""}}, session=session)
            await queue.db.email_history.delete_many({"_id": {"$in": found}}, session=session)
            missing = [str(value) for value in object_ids if value not in found]
            return {"deleted_count": len(found), "deleted_ids": [str(value) for value in found],
                    "skipped_ids": missing, "skipped_count": len(missing)}
        async with await queue.db.client.start_session() as session:
            return await session.with_transaction(commit)

    async def _get_template(self, template_id: str):
        template = await EmailTemplateModel.find_one(
            {"_id": PydanticObjectId(template_id), "deleted_at": None}
        )
        if not template:
            raise AppException(404, "Email template not found")
        return template

    
    def _validate_required_variables(self, defined_vars, provided_vars: Dict):
        for var in defined_vars:
            if var.is_required and var.key not in provided_vars:
                raise AppException(400, f"Required variable missing: {var.key}")

    
    def _render_template(self, template, variables: Dict) -> Dict:
        return {
            "subject": self._render(template.subject, variables),
            "html": self._render(template.html_body, variables),
            "text": self._render(template.text_body, variables) if template.text_body else None,
        }

   
    async def _enqueue_rendered(self, template_id, rendered, variables, payload, user):
        queue = MailQueue()
        from_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()
        request_hash = hashlib.sha256(json.dumps({"payload": payload, "rendered": rendered}, sort_keys=True, default=str).encode()).hexdigest()
        request_key = payload.get("_request_key")
        history_id = ObjectId(hashlib.sha256(f"{user['_id']}:{request_key}".encode()).hexdigest()[:24]) if request_key else ObjectId()
        async def commit(session):
            existing = await EmailHistoryModel.find_one({"_id": history_id}, session=session)
            if existing:
                if existing.request_hash != request_hash:
                    raise AppException(409, "Idempotency key already used for a different email")
                return jsonable_encoder(existing)
            if request_key and await queue.db.email_outbox.find_one({
                    "_id": hashlib.sha256(f"email-history:{history_id}".encode()).hexdigest()}, session=session):
                raise AppException(409, "This email request was already processed and its history was deleted")
            history = await self._create_history(template_id, rendered, variables, user, from_name,
                payload["to_emails"], payload.get("cc_emails", []), payload.get("bcc_emails", []),
                payload.get("reply_to"), payload, session=session, history_id=history_id, request_hash=request_hash)
            await queue.enqueue(to=payload["to_emails"], cc=payload.get("cc_emails"), bcc=payload.get("bcc_emails"),
                reply_to=payload.get("reply_to"), from_name=from_name, subject=rendered["subject"],
                html=rendered["html"], text=rendered.get("text"), kind=payload.get("_kind", "transactional"),
                history_id=history.id, tenant_id=user.get("companyId"), key=f"email-history:{history.id}", session=session)
            return jsonable_encoder(history)
        for attempt in range(3):
            try:
                async with await queue.db.client.start_session() as session:
                    return await session.with_transaction(commit)
            except DuplicateKeyError:
                if attempt == 2:
                    raise AppException(409, "Concurrent email request; retry using the same idempotency key")

    async def _create_history(
        self, template_id, rendered, variables,
        user, from_name, to_emails, cc_emails,
        bcc_emails, reply_to, payload, *, session=None, history_id=None, request_hash=None
    ) -> EmailHistoryModel:
        history = EmailHistoryModel(
            id=history_id,
            request_hash=request_hash,
            template=PydanticObjectId(template_id) if template_id else None,
            subject=rendered["subject"],
            html_body=rendered["html"],
            text_body=rendered["text"],
            variables_used=variables,
            sent_by=PydanticObjectId(user["_id"]),
            from_email=FROM_EMAIL,
            from_name=from_name,
            to_emails=to_emails,
            cc_emails=cc_emails,
            bcc_emails=bcc_emails,
            reply_to=reply_to,
            status=EmailStatus.QUEUED,
            provider="smtp",
            lead_id=payload.get("lead_id"),
            deal_id=payload.get("deal_id"),
            client_id=payload.get("client_id"),
            invoice_id=payload.get("invoice_id"),
            quotation_id=payload.get("quotation_id"),
            prospect_id=payload.get("prospect_id"),
        )
        await history.insert(session=session)
        return history

    
    def _render(self, template_str: str, variables: Dict) -> str:
        if not template_str:
            return ""
        template = self.jinja_env.from_string(template_str)
        return template.render(**variables)
