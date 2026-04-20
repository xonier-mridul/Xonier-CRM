
from typing import Dict, Any, List
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone
from jinja2 import Environment, BaseLoader
from email.message import EmailMessage
import aiosmtplib

from app.repositories.email_history_repository import EmailHistoryRepository
from app.repositories.email_template_repository import EmailTemplateRepository
from app.db.models.communications.email_history_model import EmailHistoryModel
from app.db.models.email_template_model import EmailTemplateModel
from app.config.email_config import EMAIL_USER, EMAIL_HOST, EMAIL_PASS, EMAIL_PORT, FROM_EMAIL
from app.core.enums import EmailStatus
from app.utils.custom_exception import AppException


class EmailService:
    def __init__(self):
        self.history_repo = EmailHistoryRepository()
        self.template_repo = EmailTemplateRepository()
        self.jinja_env = Environment(loader=BaseLoader())

    
    async def send_email(self, payload: Dict[str, Any], user: Dict[str, Any]):
        try:
            template = await self._get_template(payload["template_id"])
            variables = payload.get("variables", {})

            
            self._validate_required_variables(template.variables, variables)

            
            rendered = self._render_template(template, variables)

            

            from_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()

            
            history = await self._create_history(
                template_id=payload["template_id"],
                rendered=rendered,
                variables=variables,
                user=user,
                from_name=from_name,
                to_emails=payload["to_emails"],
                cc_emails=payload.get("cc_emails", []),
                bcc_emails=payload.get("bcc_emails", []),
                reply_to=payload.get("reply_to"),
                payload=payload
            )

            
            await self._dispatch_email(
                to=payload["to_emails"],
                subject=rendered["subject"],
                html=rendered["html"],
                text=rendered["text"],
                cc=payload.get("cc_emails", []),
                bcc=payload.get("bcc_emails", []),
                reply_to=payload.get("reply_to"),
                from_name=from_name,
            )

            
            await self._mark_sent(history)

            
            await self._increment_usage(payload["template_id"])

            return jsonable_encoder(history)

        except AppException:
            raise
        except Exception as e:
            
            import traceback
            if 'history' in locals():
                await self._mark_failed(history, str(e))
            print("traceback:", traceback.format_exc())
            raise AppException(500, f"Failed to send email: {str(e)}")

    
    async def send_bulk_email(self, payload: Dict[str, Any], user: Dict[str, Any]):
        try:
            template = await self._get_template(payload["template_id"])
            global_variables = payload.get("variables", {})
            recipients = payload["recipients"]

            from_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()

            results = []
            failed = []
            success_count = 0

            for recipient in recipients:
                recipient_email = recipient["email"]

                
                merged_vars = {**global_variables, **recipient.get("variables", {})}

                try:
                    
                    self._validate_required_variables(template.variables, merged_vars)

                    
                    rendered = self._render_template(template, merged_vars)

                    
                    history = await self._create_history(
                        template_id=payload["template_id"],
                        rendered=rendered,
                        variables=merged_vars,
                        user=user,
                        from_name=from_name,
                        to_emails=[recipient_email],
                        cc_emails=payload.get("cc_emails", []),
                        bcc_emails=payload.get("bcc_emails", []),
                        reply_to=None,
                        payload=payload
                    )

                    
                    await self._dispatch_email(
                        to=[recipient_email],
                        subject=rendered["subject"],
                        html=rendered["html"],
                        text=rendered["text"],
                        cc=payload.get("cc_emails", []),
                        bcc=payload.get("bcc_emails", []),
                        reply_to=None,
                        from_name=from_name,
                    )

                    await self._mark_sent(history)
                    await self._increment_usage(payload["template_id"])

                    success_count += 1
                    results.append({
                        "email": recipient_email,
                        "status": "sent",
                        "history_id": str(history.id)
                    })

                except Exception as e:
                    if 'history' in locals():
                        await self._mark_failed(history, str(e))
                    failed.append({
                        "email": recipient_email,
                        "status": "failed",
                        "error": str(e)
                    })

            return {
                "total": len(recipients),
                "success_count": success_count,
                "failed_count": len(failed),
                "results": results,
                "failed": failed
            }

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Failed to send bulk email: {str(e)}")

   
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
        try:
            original = await self.history_repo.find_one(
                filter={
                    "_id": PydanticObjectId(id),
                    "sent_by.$id": PydanticObjectId(user["_id"])
                }
            )
            if not original:
                raise AppException(404, "Email not found or access denied")

            to_emails = payload.get("to_emails") or original.to_emails
            cc_emails = payload.get("cc_emails") or original.cc_emails
            bcc_emails = payload.get("bcc_emails") or original.bcc_emails
            from_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()

            
            new_history = EmailHistoryModel(
                template=original.template,
                subject=original.subject,
                html_body=original.html_body,
                text_body=original.text_body,
                variables_used=original.variables_used,
                sent_by=PydanticObjectId(user["_id"]),
                from_email=FROM_EMAIL,
                from_name=from_name,
                to_emails=to_emails,
                cc_emails=cc_emails,
                bcc_emails=bcc_emails,
                reply_to=original.reply_to,
                status=EmailStatus.QUEUED,
                provider="smtp",
                retry_count=original.retry_count + 1,
                lead_id=original.lead_id,
                deal_id=original.deal_id,
                client_id=original.client_id,
                invoice_id=original.invoice_id,
                quotation_id=original.quotation_id,
                prospect_id=original.prospect_id,
            )
            await new_history.insert()

            await self._dispatch_email(
                to=to_emails,
                subject=original.subject,
                html=original.html_body,
                text=original.text_body,
                cc=cc_emails,
                bcc=bcc_emails,
                reply_to=original.reply_to,
                from_name=from_name,
            )

            await self._mark_sent(new_history)
            return jsonable_encoder(new_history)

        except AppException:
            raise
        except Exception as e:
            if 'new_history' in locals():
                await self._mark_failed(new_history, str(e))
            raise AppException(500, f"Failed to resend email: {str(e)}")

    
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
        try:
            existing = await self.history_repo.find_one(
                filter={
                    "_id": PydanticObjectId(id),
                    "sent_by.$id": PydanticObjectId(user["_id"])
                }
            )
            if not existing:
                raise AppException(404, "Email not found or access denied")

            await EmailHistoryModel.find_one({"_id": PydanticObjectId(id)}).delete()
            return {"message": "Email deleted successfully"}

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    
    async def bulk_delete(self, ids: List[str], user: Dict[str, Any]):
        try:
            object_ids = [PydanticObjectId(id) for id in ids]

            histories = await EmailHistoryModel.find({
                "_id": {"$in": object_ids},
                "sent_by.$id": PydanticObjectId(user["_id"])
            }).to_list()

            if not histories:
                raise AppException(404, "No emails found or access denied")

            found_ids = [h.id for h in histories]
            not_found_ids = [id for id in ids if PydanticObjectId(id) not in found_ids]

            await EmailHistoryModel.find({"_id": {"$in": found_ids}}).delete()

            return {
                "deleted_count": len(found_ids),
                "deleted_ids": [str(id) for id in found_ids],
                "skipped_ids": not_found_ids,
                "skipped_count": len(not_found_ids)
            }

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    
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

   
    async def _create_history(
        self, template_id, rendered, variables,
        user, from_name, to_emails, cc_emails,
        bcc_emails, reply_to, payload
    ) -> EmailHistoryModel:
        history = EmailHistoryModel(
            template=PydanticObjectId(template_id),
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
        await history.insert()
        return history

    
    async def _dispatch_email(self, to, subject, html, text, cc, bcc, reply_to, from_name):
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{FROM_EMAIL}>"
        msg["To"] = ", ".join(to)

        if cc:
            msg["Cc"] = ", ".join(cc)
        if bcc:
            msg["Bcc"] = ", ".join(bcc)
        if reply_to:
            msg["Reply-To"] = reply_to

        if text:
            msg.set_content(text)
        msg.add_alternative(html, subtype="html")

        await aiosmtplib.send(
            msg,
            hostname=EMAIL_HOST,
            port=EMAIL_PORT,
            username=EMAIL_USER,
            password=EMAIL_PASS,
            start_tls=True
        )

    
    async def _mark_sent(self, history: EmailHistoryModel):
        history.status = EmailStatus.SENT
        history.sent_at = datetime.now(timezone.utc)
        history.updated_at = datetime.now(timezone.utc)
        await history.save()

    
    async def _mark_failed(self, history: EmailHistoryModel, error: str):
        history.status = EmailStatus.FAILED
        history.error_message = error
        history.failed_at = datetime.now(timezone.utc)
        history.updated_at = datetime.now(timezone.utc)
        await history.save()

    
    async def _increment_usage(self, template_id: str):
        await EmailTemplateModel.find_one(
            {"_id": PydanticObjectId(template_id)}
        ).update({
            "$inc": {"usage_count": 1},
            "$set": {"last_used_at": datetime.now(timezone.utc)}
        })

    
    def _render(self, template_str: str, variables: Dict) -> str:
        if not template_str:
            return ""
        template = self.jinja_env.from_string(template_str)
        return template.render(**variables)