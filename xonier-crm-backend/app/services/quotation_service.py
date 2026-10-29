from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from typing import Dict, Any, Optional
from app.repositories.deal_repository import DealRepository
from bson import ObjectId
from app.db.db import Client
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from io import BytesIO
from html import escape
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from beanie import PydanticObjectId
from app.utils.get_team_members import GetTeamMembers
from app.repositories.enquiry_repository import EnquiryRepository
from app.repositories.quotation_repository import QuotationRepository
from app.utils.email_manager import EmailManager
from app.utils.enquiry_id_generator import generate_enquiry_id
from app.core.constants import COMPANY_ADDRESS, COMPANY_LOGO_LINK
from fastapi.encoders import jsonable_encoder
from app.core.crypto import Encryption
from app.core.enums import (
    DEAL_STAGES,
    QuotationStatus,
    QuotationEventType,
    DEAL_STATUS,
    ACTIVITY_ACTION,
    ACTIVITY_ENTITY_TYPE,
    DEAL_PIPELINE, INVOICE_STATUS
)
from app.repositories.quotation_history_repository import QuotationHistoryRepository
from app.repositories.invoice_repository import InvoiceRepository
from datetime import datetime, timezone, timedelta
from fastapi_cache import FastAPICache
from app.core.constants import (
    DEAL_CACHE_NAMESPACE,
    DEAL_CACHE_NAMESPACE_BY_ID,
    LEAD_CACHE_NAMESPACE,
)
from app.repositories.activity_repository import ActivityRepository

from app.utils.activity_payload import activity_payload
from app.utils.jwt_token_generator import create_token, verify_token
from app.core.config import get_setting
from app.utils.validate_admin import validate_admin, validate_admin_company_admin

CURRENCY_SYMBOLS = {
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "INR": "₹",
    "AED": "د.إ",
    "SAR": "﷼",
    "PKR": "₨",
    "CAD": "CA$",
    "AUD": "A$",
}


class QuotationService:
    def __init__(self):
        self.repo = QuotationRepository()
        self.dealRepo = DealRepository()
        self.historyRepo = QuotationHistoryRepository()
        self.client = Client
        self.getTeamMem = GetTeamMembers()
        self.emailManager = EmailManager()
        self.encryption = Encryption()
        self.invoiceRepo = InvoiceRepository()
        self.activityRepo = ActivityRepository()
        self.setting = get_setting()

    async def _clear_caches_best_effort(self, *namespaces: str) -> None:
        """Cache invalidation is advisory and must not abort quotation transactions."""
        try:
            backend = FastAPICache.get_backend()
        except Exception as error:
            print(f"[Warning] Could not access cache backend while invalidating quotation caches: {error}")
            return

        if not backend:
            return

        for namespace in namespaces:
            try:
                await backend.clear(namespace=namespace)
            except Exception as error:
                print(f"[Warning] Could not clear quotation cache '{namespace}': {error}")

    async def create(self, user: Dict[str, Any], payload: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if payload.get("deal"):
                        if not ObjectId.is_valid(payload["deal"]):
                            raise AppException(400, "Invalid deal Id")

                        deal = await self.dealRepo.find_by_id(
                            PydanticObjectId(payload["deal"]), populate=["createdBy"]
                        )

                        if not deal:
                            raise AppException(404, "Deal not found against deal id")

                        deal = deal.model_dump(mode="json")

                        if deal["inQuotation"]:
                            raise AppException(
                                400,
                                "Action stopped, Already created quotation against this deal",
                            )

                        if (
                            deal["dealStage"] == DEAL_STAGES.DELETE.value
                            and deal["status"] == DEAL_STATUS.DELETE.value
                        ):
                            raise AppException(
                                400, f"Quotation failed, {deal["dealName"]} deleted"
                            )

                        isAdmin = False
                        isCreator = False
                        isManager = False

                        isAdmin = validate_admin_company_admin(user["userRole"])

                        if not isAdmin:

                            if deal["createdBy"]["id"] == user["_id"]:
                                isCreator = True

                            if not isCreator:
                                members = await self.getTeamMem.get_team_members(
                                    user["_id"]
                                )

                                if members:
                                    isManager = deal["createdBy"]["id"] in members

                        if not isAdmin and not isCreator and not isManager:
                            raise AppException(
                                403,
                                "Permission denied, Only Admin, Creator or Manager can perform this",
                            )

                    quote_id = generate_enquiry_id(prefix="QUT")

                    new_payload: Dict[str, Any] = {
                        **payload,
                        "createdBy": user["_id"],
                        "quoteId": quote_id,
                    }

                    if new_payload.get("valid") is None:
                        new_payload.pop("valid")

                    create = await self.repo.create(data=new_payload, session=session)

                    if not create:
                        raise AppException(400, "Quotation creation failed")

                    token = create_token(
                        payload={
                            "id": str(create.id),
                            "title": create.title,
                            "customerEmail": create.customerEmail,
                        },
                        expiry=1,
                        type="quotation",
                    )

                    url = f"{self.setting.CLIENT_URL}/quotation/{token}"

                    await self.emailManager.send_quotation_email(
                        to=payload["customerEmail"],
                        quote_id=quote_id,
                        title=payload["title"],
                        customer_name=payload["customerName"],
                        customer_email=payload["customerEmail"],
                        customer_phone=payload.get("customerPhone"),
                        company_name=payload.get("companyName"),
                        company_address=payload.get("companyAddress", ""),
                        company_website=payload.get("companyWebsite", ""),
                        issue_date=payload["issueDate"],
                        valid_until=payload.get("valid", ""),
                        link=url,
                        sub_total=payload["subTotal"],
                        total=payload["total"],
                        currency_symbol=CURRENCY_SYMBOLS.get(
                            payload.get("currency", "USD"), "$"
                        ),
                        currency_code=payload.get("currency", "USD"),
                        tax_amount=payload.get("taxAmount") or 0,
                        tax_percent=payload.get("taxPercent") or 0,
                        discount_amount=payload.get("discountAmount") or 0,
                        discount_percent=payload.get("discountPercent") or 0,
                        shipping_amount=payload.get("shippingAmount") or 0,
                        line_items=payload.get("lineItems") or [],
                        description=payload.get("description"),
                        payment_terms=payload.get("paymentTerms", ""),
                        payment_method=payload.get("paymentMethod", ""),
                        terms_conditions=payload.get("termsAndConditions", ""),
                        notes=payload.get("notes", ""),
                        company_logo=COMPANY_LOGO_LINK,
               
                    )

                    if payload.get("deal"):
                        update_deal = await self.dealRepo.update(
                            id=PydanticObjectId(payload["deal"]),
                            data={
                                "inQuotation": True,
                                "dealStage": DEAL_STAGES.PROPOSAL,
                                "dealPipeline": DEAL_PIPELINE.PROPOSAL,
                            },
                            session=session,
                        )

                        if not update_deal:
                            raise AppException(400, "Deal field not updated")

                    activity = activity_payload(
                        userId=PydanticObjectId(user["_id"]),
                        entityType=ACTIVITY_ENTITY_TYPE.QUOTATION,
                        entityId=PydanticObjectId(create.id),
                        action=ACTIVITY_ACTION.CREATED,
                        title="create quotation",
                        metadata={"quoteId": create.quoteId, "leadName": create.title},
                    )

                    is_activity = await self.activityRepo.create(
                        data=activity, session=session
                    )

                    if not is_activity:
                        raise AppException(400, "Activity creation failed")

                    await self._clear_caches_best_effort(
                        DEAL_CACHE_NAMESPACE,
                        DEAL_CACHE_NAMESPACE_BY_ID,
                    )

                    return create.model_dump(mode="json")

                except AppException:
                    raise

                except ValueError as e:
                    raise AppException(400, f"{e}")

                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

    async def getAll(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            isAdmin = False

            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            isAdmin = validate_admin_company_admin(user["userRole"])

            query = {
                "quotationStatus": {
                    "$in": [
                        QuotationStatus.ACCEPTED.value,
                        QuotationStatus.DRAFT.value,
                        QuotationStatus.EXPIRED.value,
                        QuotationStatus.REJECTED.value,
                        QuotationStatus.RESEND.value,
                        QuotationStatus.SENT.value,
                        QuotationStatus.UPDATED.value,
                        QuotationStatus.VIEWED.value,
                    ]
                }
            }

            if not isAdmin:
                members = await self.getTeamMem.get_team_members(user["_id"])

                if members:
                    query.update({"createdBy.$id": {"$in": members}})

                if not members:
                    query.update({"createdBy.$id": PydanticObjectId(user["_id"])})

            if "title" in filters:
                query["title"] = {"$regex": filters["title"], "$options": "i"}

            if "dealId" in filters:
                query.update({"deal.$id": PydanticObjectId(filters["dealId"])})

            if "status" in filters:
                query.update({"quotationStatus": filters["status"]})

            if "search" in filters and filters["search"].strip():
                search_regex = {"$regex": filters["search"].strip(), "$options": "i"}
                query.update(
                    {
                        "$or": [
                            {"quoteId": search_regex},
                            {"title": search_regex},
                            {"customerName": search_regex},
                            {"companyName": search_regex},
                        ]
                    }
                )

            if "fromDate" in filters or "toDate" in filters:
                date_filter = {}
                if "fromDate" in filters:
                    try:
                        from_dt = datetime.fromisoformat(str(filters["fromDate"]))
                        from_dt = from_dt.replace(
                            hour=0,
                            minute=0,
                            second=0,
                            microsecond=0,
                            tzinfo=timezone.utc,
                        )
                        date_filter["$gte"] = from_dt
                    except (ValueError, TypeError):
                        raise AppException(
                            400, "Invalid fromDate format. Use ISO format: YYYY-MM-DD"
                        )

                if "toDate" in filters:
                    try:
                        to_dt = datetime.fromisoformat(str(filters["toDate"]))
                        to_dt = to_dt.replace(
                            hour=23,
                            minute=59,
                            second=59,
                            microsecond=999999,
                            tzinfo=timezone.utc,
                        )
                        date_filter["$lte"] = to_dt
                    except (ValueError, TypeError):
                        raise AppException(
                            400, "Invalid toDate format. Use ISO format: YYYY-MM-DD"
                        )

                if date_filter:
                    query.update({"createdAt": date_filter})

            result = await self.repo.get_all(
                page=int(page),
                limit=int(limit),
                filters=query,
                populate=["lead", "createdBy", "updatedBy"],
                sort=["-createdAt"],
            )

            if not result:
                raise AppException(404, "Quotations data not found")

            result = jsonable_encoder(result)

            return result

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_by_token(self, token: str):
        try:
            
            payload = verify_token(token)
            
            if payload.get("type") != "quotation":
                raise AppException(400, "Invalid token type")

            quote_id = payload.get("id")

            if not quote_id or not ObjectId.is_valid(quote_id):
                raise AppException(400, "Invalid token payload")

            
            exp = payload.get("exp")
            if exp:
                exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
                if datetime.now(timezone.utc) > exp_dt:

                    quotation = await self.repo.find_by_id(
                        id=PydanticObjectId(quote_id)
                    )
                    if quotation and quotation.quotationStatus in [
                        QuotationStatus.SENT,
                        QuotationStatus.RESEND,
                        QuotationStatus.UPDATED,
                        QuotationStatus.VIEWED,
                    ]:
                        await self.repo.update(
                            id=PydanticObjectId(quote_id),
                            data={"quotationStatus": QuotationStatus.EXPIRED},
                        )
                    raise AppException(410, "Quotation link has expired")

            quotation = await self.repo.find_by_id(
                id=PydanticObjectId(quote_id), populate=["deal", "createdBy"]
            )

            if not quotation:
                raise AppException(404, "Quotation not found")

            if quotation.quotationStatus == QuotationStatus.DELETE:
                raise AppException(404, "Quotation no longer available")

            if quotation.quotationStatus in [
                QuotationStatus.SENT,
                QuotationStatus.RESEND,
            ]:
                await self.repo.update(
                    id=PydanticObjectId(quote_id),
                    data={"quotationStatus": QuotationStatus.VIEWED},
                )
                quotation.quotationStatus = QuotationStatus.VIEWED

            quotation = quotation.model_dump(mode="json")

            quotation["customerEmail"] = self.encryption.decrypt_data(
                quotation["customerEmail"]
            )
            if quotation.get("customerPhone"):
                quotation["customerPhone"] = self.encryption.decrypt_data(
                    quotation["customerPhone"]
                )

            return quotation

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def confirm(self, token: str):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    payload = verify_token(token)

                    if payload.get("type") != "quotation":
                        raise AppException(400, "Invalid token type")

                    quote_id = payload.get("id")

                    if not quote_id or not ObjectId.is_valid(quote_id):
                        raise AppException(400, "Invalid token payload")

                    exp = payload.get("exp")
                    if exp:
                        exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
                        if datetime.now(timezone.utc) > exp_dt:
                            await self.repo.update(
                                id=PydanticObjectId(quote_id),
                                data={"quotationStatus": QuotationStatus.EXPIRED},
                                session=session,
                            )
                            raise AppException(410, "Quotation link has expired")

                    quotation = await self.repo.find_by_id(
                        id=PydanticObjectId(quote_id),
                        populate=["deal", "createdBy"],
                        session=session,
                    )

                    if not quotation:
                        raise AppException(404, "Quotation not found")

                    if quotation.quotationStatus == QuotationStatus.ACCEPTED:
                        raise AppException(400, "Quotation already accepted")

                    if quotation.quotationStatus == QuotationStatus.REJECTED:
                        raise AppException(400, "Quotation already rejected")

                    if quotation.quotationStatus == QuotationStatus.EXPIRED:
                        raise AppException(410, "Quotation has expired")

                    if quotation.quotationStatus == QuotationStatus.DELETE:
                        raise AppException(404, "Quotation no longer available")

                    updated = await self.repo.update(
                        id=PydanticObjectId(quote_id),
                        data={"quotationStatus": QuotationStatus.ACCEPTED},
                        session=session,
                    )

                    if not updated:
                        raise AppException(400, "Failed to confirm quotation")

                    deal_id = (
                        str(quotation.deal.id)
                        if quotation.deal and hasattr(quotation.deal, "id")
                        else (str(quotation.deal) if quotation.deal else None)
                    )
                    if deal_id:
                        await self.dealRepo.update(
                            id=PydanticObjectId(deal_id),
                            data={
                                "dealStage": DEAL_STAGES.WON,
                                "dealPipeline": DEAL_PIPELINE.WON,
                            },
                            session=session,
                        )

                    invoice_id = generate_enquiry_id("INV")

                    invoice_payload = {
                        "invoiceId": invoice_id,
                        "sourceQuoteId": quotation.quoteId,
                        "companyId": quotation.companyId,
                        "deal": quotation.deal.id if quotation.deal else None,
                        "quotation": quotation.id,
                        "customerName": quotation.customerName,
                        "customerEmail": quotation.customerEmail,
                        "customerPhone": quotation.customerPhone,
                        "companyName": quotation.companyName,
                        "companyAddress": quotation.companyAddress,
                        "companyWebsite": quotation.companyWebsite,
                        "billingAddress": quotation.companyAddress,
                        "lineItems": [item.model_dump() if hasattr(item, "model_dump") else item for item in (quotation.lineItems or [])],
                        "currency": quotation.currency.value if hasattr(quotation.currency, "value") else str(quotation.currency),
                        "subTotal": quotation.subTotal,
                        "discountAmount": quotation.discountAmount,
                        "discountPercent": quotation.discountPercent,
                        "taxAmount": quotation.taxAmount,
                        "taxPercent": quotation.taxPercent,
                        "shippingAmount": quotation.shippingAmount,
                        "total": quotation.total,
                        "issueDate": quotation.issueDate,
                        "dueDate": (datetime.now(timezone.utc) + timedelta(days=30)).date(),
                        "paymentTerms": quotation.paymentTerms,
                        "notes": quotation.notes,
                        "termsAndConditions": quotation.termsAndConditions,
                        "status": INVOICE_STATUS.ISSUED,
                        "createdBy": quotation.createdBy.id,
                    }
                    created_invoice = await self.invoiceRepo.create(data=invoice_payload, session=session)

                    await self.repo.update(
                        id=PydanticObjectId(quote_id),
                        data={
                            "quotationStatus": QuotationStatus.ACCEPTED,
                            "convertedToInvoice": True,
                            "confirmedAt": datetime.now(timezone.utc),
                            "invoiceId": created_invoice.id,
                        },
                        session=session,
                    )

                    await self.historyRepo.create(
                        data={
                            "quotation": quotation.id,
                            "eventType": QuotationEventType.ACCEPTED.value,
                            "delta": {
                                "quotationStatus": {
                                    "old": quotation.quotationStatus.value,
                                    "new": QuotationStatus.ACCEPTED.value,
                                }
                            },
                            "performedBy": None,
                        },
                        session=session,
                    )

                    activity = activity_payload(
                        userId=quotation.createdBy.id,
                        entityType=ACTIVITY_ENTITY_TYPE.QUOTATION,
                        entityId=PydanticObjectId(quotation.id),
                        action=ACTIVITY_ACTION.UPDATED,
                        title="Quotation accepted by customer",
                        metadata={
                            "quoteId": quotation.quoteId,
                            "title": quotation.title,
                        },
                    )

                    is_activity = await self.activityRepo.create(
                        data=activity, session=session
                    )

                    if not is_activity:
                        raise AppException(400, "Activity creation failed")

                    await self._clear_caches_best_effort(
                        DEAL_CACHE_NAMESPACE,
                        DEAL_CACHE_NAMESPACE_BY_ID,
                    )

                    return {
                        "message": "Quotation confirmed successfully",
                        "quoteId": quotation.quoteId,
                    }

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

    async def get_by_id(self, quoteId: str, user: Dict[str, Any]):
        try:

            isAdmin = validate_admin_company_admin(user["userRole"])

            quotation = await self.repo.find_by_id(
                id=PydanticObjectId(quoteId),
                populate=["deal", "createdBy", "updatedBy"],
            )

            if not quotation:
                raise AppException(404, "Quotation not found")

            quotation = quotation.model_dump(mode="json")

            quotation["customerEmail"] = self.encryption.decrypt_data(
                quotation["customerEmail"]
            )

            if quotation["customerPhone"]:
                quotation["customerPhone"] = self.encryption.decrypt_data(
                    quotation["customerPhone"]
                )

            quotation["createdBy"]["email"] = self.encryption.decrypt_data(
                quotation["createdBy"]["email"]
            )

            if isAdmin:
                return quotation

            if str(quotation["createdBy"]["id"]) == str(user["_id"]):
                return quotation

            members = await self.getTeamMem.get_team_members(user["_id"])

            if members and ObjectId(quotation["createdBy"]["id"]) in members:
                return quotation

            raise AppException(
                403,
                "Permission denied. Only Admin, Creator, or Manager can access this quotation",
            )

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def update(self, quoteId: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(quoteId):
                        raise AppException(400, "Invalid quotation id")

                    quotation = await self.repo.find_by_id(
                        id=PydanticObjectId(quoteId),
                        populate=["deal", "createdBy"],
                        session=session,
                    )

                    if not quotation:
                        raise AppException(404, "Quotation not found")

                    if quotation.quotationStatus == QuotationStatus.DELETE:
                        raise AppException(
                            400, "Quotation deleted, quotation updation failed"
                        )

                    if quotation.quotationStatus == QuotationStatus.ACCEPTED:
                        raise AppException(
                            400, "Quotation accepted, quotation updation failed"
                        )

                    newIssueDate = payload.get("issueDate", None)
                    newValidTill = payload.get("valid", None)

                    
                        
                    issueData = newIssueDate if newIssueDate else quotation.issueDate 
                    validTill = newValidTill if newValidTill else quotation.valid
                    
                        
                    # if not issueData or not validTill:
                    #     raise AppException(422, "Issue data or valid date must be required")
                    
                   
                    if validTill and issueData > validTill:
                        raise AppException(400, "Valid date must be greater then issue date")
                    


                    isAdmin = validate_admin_company_admin(user["userRole"])

                    if not isAdmin:
                        isCreator = str(quotation.createdBy.id) == str(user["_id"])
                        isManager = False

                        if not isCreator:
                            members = await self.getTeamMem.get_team_members(
                                user["_id"]
                            )
                            if members:
                                isManager = quotation.createdBy.id in members

                        if not isCreator and not isManager:
                            raise AppException(403, "Permission denied")

                    old_data = quotation.model_dump()

                    delta = {}

                    for field, new_value in payload.items():
                        old_value = getattr(quotation, field, None)

                        if new_value != old_value:
                            delta[field] = {"old": old_value, "new": new_value}
                            setattr(quotation, field, new_value)

                    if not delta:
                        raise AppException(400, "No changes detected")

                    updated_payload = {
                        **payload,
                        "quotationStatus": QuotationStatus.UPDATED,
                        "updatedBy": PydanticObjectId(user["_id"]),
                    }

                    await self.repo.update(
                        id=PydanticObjectId(quoteId),
                        data=updated_payload,
                        session=session,
                    )

                    await self.historyRepo.create(
                        data={
                            "quotation": quotation.id,
                            "eventType": "updated",
                            "delta": delta,
                            "performedBy": user["_id"],
                        },
                        session=session,
                    )

                    activity = activity_payload(
                        userId=PydanticObjectId(user["_id"]),
                        entityType=ACTIVITY_ENTITY_TYPE.QUOTATION.value,
                        entityId=PydanticObjectId(quotation.id),
                        action=ACTIVITY_ACTION.UPDATED.value,
                        title="update quotation",
                        metadata={"quoteId": quotation.quoteId, **delta},
                    )

                    is_activity = await self.activityRepo.create(
                        data=activity, session=session
                    )

                    if not is_activity:
                        raise AppException(400, "Activity creation failed")

                    return True

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

    async def update_status(
    self, quoteId: str, payload: Dict[str, Any], user: Dict[str, Any]
):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(quoteId):
                        raise AppException(400, "Invalid quotation id")
                    

                    quotation = await self.repo.find_by_id(
                        id=PydanticObjectId(quoteId),
                        populate=["deal", "createdBy"],
                        session=session,
                    )
                    
                    if not quotation:
                        raise AppException(404, "Quotation not found")

                    if quotation.quotationStatus == QuotationStatus.DELETE:
                        raise AppException(400, "Quotation deleted, quotation updation failed")

                    if quotation.quotationStatus == QuotationStatus.ACCEPTED:
                        raise AppException(400, "Quotation already accepted, quotation updation failed")

                    isAdmin = validate_admin_company_admin(user["userRole"])

                    if not isAdmin:
                        isCreator = str(quotation.createdBy.id) == str(user["_id"])
                        isManager = False
                        
                        if not isCreator:
                            members = await self.getTeamMem.get_team_members(user["_id"])
                            if members:
                                isManager = quotation.createdBy.id in members
                        
                        if not isCreator and not isManager:
                            raise AppException(403, "Permission denied")

                    delta = {}
                    
                    for field, new_value in payload.items():
                        old_value = getattr(quotation, field, None)
                        if new_value != old_value:
                            delta[field] = {"old": old_value, "new": new_value}
                            setattr(quotation, field, new_value)
                    
                    if not delta:
                        raise AppException(400, "No changes detected")

                    quotation.quotationStatus = payload["quotationStatus"]
                    
                    await quotation.save(session=session)

                    await self.historyRepo.create(
                        data={
                            "quotation": quotation.id,
                            "eventType": QuotationEventType.STATUS_CHANGED,
                            "delta": delta,
                            "performedBy": user["_id"],
                        },
                        session=session,
                    )
                    
                    new_status = payload["quotationStatus"]

                    if new_status == QuotationStatus.ACCEPTED:
                        invoice_id = generate_enquiry_id("INV")
                        
                        invoice_payload = {
                            "invoiceId": invoice_id,
                            "sourceQuoteId": quotation.quoteId,
                            "companyId": quotation.companyId,
                            "deal": quotation.deal.id if quotation.deal else None,
                            "quotation": quotation.id,
                            "customerName": quotation.customerName,
                            "customerEmail": quotation.customerEmail,
                            "customerPhone": quotation.customerPhone,
                            "companyName": quotation.companyName,
                            "companyAddress": quotation.companyAddress,
                            "companyWebsite": quotation.companyWebsite,
                            "billingAddress": quotation.companyAddress,
                            "lineItems": [item.model_dump() if hasattr(item, "model_dump") else item for item in (quotation.lineItems or [])],
                            "currency": quotation.currency.value if hasattr(quotation.currency, "value") else str(quotation.currency),
                            "subTotal": quotation.subTotal,
                            "discountAmount": quotation.discountAmount,
                            "discountPercent": quotation.discountPercent,
                            "taxAmount": quotation.taxAmount,
                            "taxPercent": quotation.taxPercent,
                            "shippingAmount": quotation.shippingAmount,
                            "total": quotation.total,
                            "issueDate": quotation.issueDate,
                            "dueDate": (datetime.now(timezone.utc) + timedelta(days=30)).date(),
                            "paymentTerms": quotation.paymentTerms,
                            "notes": quotation.notes,
                            "termsAndConditions": quotation.termsAndConditions,
                            "status": INVOICE_STATUS.ISSUED,
                            "createdBy": PydanticObjectId(quotation.createdBy.id if quotation.createdBy else user["_id"]),
                        }
                        
                        created_invoice = await self.invoiceRepo.create(data=invoice_payload, session=session)
                        
                        await self.repo.update(
                            id=PydanticObjectId(quoteId),
                            data={
                                "convertedToInvoice": True,
                                "confirmedAt": datetime.now(timezone.utc),
                                "invoiceId": created_invoice.id,
                            },
                            session=session,
                        )

                        quotation.convertedToInvoice = True
                        quotation.invoiceId = created_invoice.id

                        

                        if quotation.deal:
                            await self.dealRepo.update(
                                id=PydanticObjectId(quotation.deal.id),
                                data={
                                    "dealStage": DEAL_STAGES.WON.value,
                                    "dealPipeline": DEAL_PIPELINE.WON.value,
                                },
                                session=session,
                            )
                        
                    elif new_status == QuotationStatus.REJECTED:
                        if quotation.deal:
                            await self.dealRepo.update(
                                id=PydanticObjectId(quotation.deal.id),
                                data={
                                    "dealStage": DEAL_STAGES.LOST.value,
                                    "dealPipeline": DEAL_PIPELINE.LOST.value,
                                },
                                session=session,
                            )
                    
                    serialized_delta = {
                        field: {
                            "old": change["old"].value if hasattr(change["old"], "value") else change["old"],
                            "new": change["new"].value if hasattr(change["new"], "value") else change["new"],
                        }
                        for field, change in delta.items()
                    }

                    activity = activity_payload(
                        userId=PydanticObjectId(user["_id"]),
                        entityType=ACTIVITY_ENTITY_TYPE.QUOTATION.value,
                        entityId=PydanticObjectId(quotation.id),
                        action=ACTIVITY_ACTION.UPDATED.value,
                        title="update quotation status",
                        metadata={"quoteId": quotation.quoteId, **serialized_delta},
                    )
                    
                    is_activity = await self.activityRepo.create(data=activity, session=session)
                    
                    if not is_activity:
                        raise AppException(400, "Activity creation failed")
                    
                    await self._clear_caches_best_effort(
                        DEAL_CACHE_NAMESPACE,
                        DEAL_CACHE_NAMESPACE_BY_ID,
                    )
                    
                    return quotation.model_dump(mode="json")

                except AppException as e:
                    
                    raise e
                except Exception as e:
                    print("REAL ERROR: ", type(e).__name__, str(e))
                    raise AppException(500, f"Internal server error: {e}")
                

    async def resend(self, quoteId: str, user: Dict[str, Any]) -> bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(quoteId):
                        raise AppException(400, "Invalid quotation id")

                    quotation = await self.repo.find_by_id(
                        id=PydanticObjectId(quoteId),
                        populate=["deal", "createdBy"],
                        session=session,
                    )

                    if not quotation:
                        raise AppException(404, "Quotation not found")

                    if quotation.quotationStatus == QuotationStatus.DELETE:
                        raise AppException(400, "Quotation deleted, quotation resending failed")

                    isAdmin = validate_admin_company_admin(user["userRole"])

                    if not isAdmin:
                        isCreator = str(quotation.createdBy.id) == str(user["_id"])
                        isManager = False

                        if not isCreator:
                            members = await self.getTeamMem.get_team_members(user["_id"])
                            if members:
                                isManager = quotation.createdBy.id in members

                        if not isCreator and not isManager:
                            raise AppException(403, "Permission denied")

                    if quotation.quotationStatus in [
                        QuotationStatus.DRAFT,
                        QuotationStatus.ACCEPTED,
                        QuotationStatus.REJECTED,
                        QuotationStatus.EXPIRED,
                    ]:
                        raise AppException(400, f"Cannot resend quotation in '{quotation.quotationStatus}' status")

                    customer_email = self.encryption.decrypt_data(quotation.customerEmail)
                    customer_phone = (
                        self.encryption.decrypt_data(quotation.customerPhone)
                        if quotation.customerPhone
                        else None
                    )

                    token = create_token(
                        payload={
                            "id": str(quotation.id),
                            "title": quotation.title,
                            "customerEmail": quotation.customerEmail,
                        },
                        expiry=1,
                        type="quotation",
                    )

                    url = f"{self.setting.CLIENT_URL}/quotation/{token}"

                    currency = str(quotation.currency.value) if quotation.currency else "USD"

                    

                    is_send = await self.emailManager.send_quotation_email(
                        to=customer_email,
                        quote_id=quotation.quoteId,
                        title=quotation.title,
                        customer_name=quotation.customerName,
                        customer_email=customer_email,
                        customer_phone=customer_phone,
                        company_name=quotation.companyName,
                        company_address=quotation.companyAddress or COMPANY_ADDRESS,
                        company_website=quotation.companyWebsite or "",
                        issue_date=str(quotation.issueDate),
                        valid_until=str(quotation.valid) if quotation.valid else "",
                        link=url,
                        sub_total=quotation.subTotal,
                        total=quotation.total,
                        currency_symbol=CURRENCY_SYMBOLS.get(currency, "$"),
                        currency_code=currency,
                        tax_amount=quotation.taxAmount or 0,
                        tax_percent=quotation.taxPercent or 0,
                        discount_amount=quotation.discountAmount or 0,
                        discount_percent=quotation.discountPercent or 0,
                        shipping_amount=quotation.shippingAmount or 0,
                        line_items=[item.model_dump() for item in quotation.lineItems] if quotation.lineItems else [],
                        description=quotation.description,
                        payment_terms=quotation.paymentTerms or "",
                        payment_method=quotation.paymentMethod or "",
                        terms_conditions=quotation.termsAndConditions or "",
                        notes=quotation.notes or "",
                        company_logo=COMPANY_LOGO_LINK,
                        quote_version=quotation.version,
                    )

                    if not is_send:
                        raise AppException(400, "Quotation mail failed")

                    await self.repo.update(
                        id=quotation.id,
                        data={
                            "quotationStatus": QuotationStatus.RESEND,
                            "sentAt": datetime.now(timezone.utc),
                            "updatedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session,
                    )

                    await self.historyRepo.create(
                        data={
                            "quotation": quoteId,
                            "eventType": QuotationEventType.RESEND,
                            "previousStatus": quotation.quotationStatus,
                            "newStatus": QuotationStatus.RESEND,
                            "performedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session,
                    )

                    

                    activity = activity_payload(
                        userId=PydanticObjectId(user["_id"]),
                        entityType=ACTIVITY_ENTITY_TYPE.QUOTATION,
                        entityId=PydanticObjectId(quotation.id),
                        action=ACTIVITY_ACTION.RESEND,
                        title="Resend quotation",
                        metadata={
                            "quoteId": quotation.quoteId,
                            "quotationStatus": QuotationStatus.RESEND,
                        },
                    )
                    
                    is_activity = await self.activityRepo.create(data=activity, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity creation failed")
                    
                    return True

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                

    async def delete(self, quoteId: str, user: Dict[str, Any]) -> bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(quoteId):
                        raise AppException(400, "Invalid quotation id")

                    quotation = await self.repo.find_by_id(
                        id=PydanticObjectId(quoteId),
                        populate=["deal", "createdBy"],
                        session=session,
                    )

                    if not quotation:
                        raise AppException(404, "Quotation not found")

                    isAdmin = validate_admin_company_admin(user["userRole"])

                    if not isAdmin:
                        isCreator = str(quotation.createdBy.id) == str(user["_id"])
                        isManager = False

                        if not isCreator:
                            members = await self.getTeamMem.get_team_members(
                                user["_id"]
                            )
                            if members:
                                isManager = quotation.createdBy.id in members

                        if not isCreator and not isManager:
                            raise AppException(403, "Permission denied")

                    if quotation.quotationStatus in [
                        QuotationStatus.DELETE,
                    ]:
                        raise AppException(400, f"{quotation.quoteId} already deleted")

                    await self.repo.update(
                        id=PydanticObjectId(quoteId),
                        data={
                            "quotationStatus": QuotationStatus.DELETE,
                            "deletedAt": datetime.now(timezone.utc),
                            "deletedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session,
                    )

                    if quotation.deal:
                        await self.dealRepo.update(
                            id=PydanticObjectId(quotation.deal.id),
                            data={
                                "inQuotation": False,
                                "dealStage": DEAL_STAGES.REQUIREMENT_ANALYSIS.value,
                                "dealPipeline": DEAL_PIPELINE.REQUIREMENT_ANALYSIS.value,
                            },
                            session=session,
                        )

                    await self.historyRepo.create(
                        data={
                            "quotation": quoteId,
                            "eventType": QuotationEventType.DELETE,
                            "previousStatus": quotation.quotationStatus,
                            "newStatus": QuotationStatus.DELETE,
                            "performedBy": user["_id"],
                        },
                        session=session,
                    )

                    activity = activity_payload(
                        userId=PydanticObjectId(user["_id"]),
                        entityType=ACTIVITY_ENTITY_TYPE.QUOTATION,
                        entityId=PydanticObjectId(quotation.id),
                        action=ACTIVITY_ACTION.DELETE.value,
                        title="delete quotation",
                        metadata={
                            "quoteId": quotation.quoteId,
                            "leadName": quotation.title,
                        },
                    )

                    is_activity = await self.activityRepo.create(
                        data=activity, session=session
                    )

                    if not is_activity:
                        raise AppException(400, "Activity creation failed")

                    await self._clear_caches_best_effort(
                        DEAL_CACHE_NAMESPACE,
                        DEAL_CACHE_NAMESPACE_BY_ID,
                        LEAD_CACHE_NAMESPACE,
                    )

                    return True

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

    # ──────────────────────────────────────────────────────────────────
    # Quotation PDF Download
    # ──────────────────────────────────────────────────────────────────

    async def download_quotation(self, quoteId: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(quoteId):
                raise AppException(400, "Invalid quotation id")

            is_super_admin = validate_admin_company_admin(user.get("userRole", []))

            access_query: Dict[str, Any] = {"_id": PydanticObjectId(quoteId)}

            if not is_super_admin:
                members = await self.getTeamMem.get_team_members(user["_id"])
                allowed_ids = [PydanticObjectId(m) for m in (members or [])]
                allowed_ids.append(PydanticObjectId(user["_id"]))
                access_query["createdBy.$id"] = {"$in": allowed_ids}

            quotation = await self.repo.find_one(filter=access_query, populate=["createdBy", "deal"])

            if not quotation:
                raise AppException(403, "You are not authorized to access this quotation or it does not exist")

            quote_data = jsonable_encoder(quotation, exclude={"createdBy": {"password"}})

            # Decrypt sensitive fields
            if quote_data.get("customerEmail"):
                try:
                    quote_data["customerEmail"] = self.encryption.decrypt_data(quote_data["customerEmail"])
                except Exception:
                    pass
            if quote_data.get("customerPhone"):
                try:
                    quote_data["customerPhone"] = self.encryption.decrypt_data(quote_data["customerPhone"])
                except Exception:
                    pass

            # Decrypt creator (sales representative) details
            if quote_data.get("createdBy") and isinstance(quote_data["createdBy"], dict):
                cb = quote_data["createdBy"]
                if cb.get("email"):
                    try:
                        cb["email"] = self.encryption.decrypt_data(cb["email"])
                    except Exception:
                        pass
                if cb.get("phone"):
                    try:
                        cb["phone"] = self.encryption.decrypt_data(cb["phone"])
                    except Exception:
                        pass

            # Fetch company branding
            quote_data["companyBranding"] = await self._get_company_quotation_branding(
                quote_data.get("companyId") or user.get("companyId")
            )

            pdf_buffer = await self._generate_quotation_pdf(quote_data)

            filename = f"quotation_{quote_data.get('quoteId', quoteId)}.pdf"

            return {"pdf_buffer": pdf_buffer, "filename": filename, "quote_id": quote_data.get("quoteId", quoteId)}

        except AppException:
            raise
        except Exception as e:
            print("Quotation download error:", e)
            import traceback; traceback.print_exc()
            raise AppException(500, "Internal server error while generating quotation PDF")

    async def _get_company_quotation_branding(self, company_id) -> Dict[str, Any]:
        if isinstance(company_id, dict):
            company_id = company_id.get("id") or company_id.get("_id")
        if not company_id or not ObjectId.is_valid(str(company_id)):
            return {}
        database = self.client[self.setting.DATABASE_NAME]
        company = await database["companies"].find_one({"_id": ObjectId(str(company_id))})
        if not company:
            return {}

        def decrypt_optional(v: Optional[str]) -> str:
            if not v:
                return ""
            try:
                return self.encryption.decrypt_data(v)
            except Exception:
                return v

        branding: Dict[str, Any] = {
            "companyName": company.get("companyName", ""),
            "address": company.get("address", ""),
            "email": decrypt_optional(company.get("email")),
            "phone": decrypt_optional(company.get("number")),
            "website": company.get("website", ""),
            "registrationNumber": company.get("registrationNumber", ""),
            "tradeNumber": company.get("tradeNumber", ""),
        }

        logo_file_id = company.get("logoFileId")
        if logo_file_id and ObjectId.is_valid(str(logo_file_id)):
            try:
                bucket = AsyncIOMotorGridFSBucket(database, bucket_name="company_logos")
                stream = await bucket.open_download_stream(ObjectId(str(logo_file_id)))
                branding["logoBytes"] = await stream.read()
            except Exception:
                pass

        return branding

    @staticmethod
    def _pdf_text_q(value) -> str:
        return str(value or "").encode("latin-1", "replace").decode("latin-1")

    @classmethod
    def _fit_pdf_text_q(cls, value, max_width: float, font: str, font_size: float) -> str:
        text = cls._pdf_text_q(value)
        if stringWidth(text, font, font_size) <= max_width:
            return text
        while text and stringWidth(text + "...", font, font_size) > max_width:
            text = text[:-1]
        return f"{text.rstrip()}..." if text else ""

    def _format_date_q(self, v) -> str:
        from datetime import date as _date
        if not v:
            return "N/A"
        try:
            if hasattr(v, "strftime"):
                return v.strftime("%B %d, %Y")
            if isinstance(v, str):
                return datetime.fromisoformat(v.replace("Z", "+00:00")).strftime("%B %d, %Y")
            return str(v)
        except Exception:
            return str(v)

    async def _generate_quotation_pdf(self, q: Dict[str, Any]) -> BytesIO:
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=44,
                leftMargin=44,
                topMargin=150,
                bottomMargin=75,
            )
            elements = []
            styles = getSampleStyleSheet()

            # Palette: Executive Forest & Emerald Proposal
            ink    = colors.HexColor("#0F172A")
            muted  = colors.HexColor("#64748B")
            accent = colors.HexColor("#065F46")   # Deep forest green
            mint   = colors.HexColor("#047857")   # Emerald
            line   = colors.HexColor("#E2E8F0")
            pale   = colors.HexColor("#F8FAFC")
            mint_pale = colors.HexColor("#F0FDF4")
            mint_border = colors.HexColor("#86EFAC")

            eyebrow       = ParagraphStyle("QEyebrow",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7, leading=9, textColor=muted, spaceAfter=4)
            body          = ParagraphStyle("QBody",      parent=styles["Normal"], fontName="Helvetica",      fontSize=8.5, leading=12, textColor=ink)
            cust_name_sty = ParagraphStyle("QCust",      parent=body,            fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=ink, spaceAfter=3)
            small         = ParagraphStyle("QSmall",     parent=body,            fontSize=8, leading=11, textColor=muted)
            section       = ParagraphStyle("QSection",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=accent, spaceBefore=0, spaceAfter=8)
            tbl_hdr       = ParagraphStyle("QTblHdr",    parent=eyebrow, textColor=colors.white, fontName="Helvetica-Bold", fontSize=7.5, leading=9)
            det_label     = ParagraphStyle("QDetLabel",  parent=eyebrow, fontSize=6.5, leading=8, spaceAfter=0)
            det_value     = ParagraphStyle("QDetValue",  parent=body,    fontSize=7.8, leading=10, spaceAfter=0)

            safe  = lambda v: escape(self._pdf_text_q(v)).replace("\n", "<br/>")
            currency = self._pdf_text_q(q.get("currency") or "USD")
            money = lambda v: f"{currency} {float(v or 0):,.2f}"

            # ── 1. Recipient & Sales Rep Info (Distinct to Quotation!) ──────────
            cust_parts = []
            if q.get("customerName"):  cust_parts.append(Paragraph(safe(q["customerName"]), cust_name_sty))
            if q.get("companyName"):   cust_parts.append(Paragraph(f"<b>{safe(q['companyName'])}</b>", body))
            for lbl, key in (("Email", "customerEmail"), ("Phone", "customerPhone"), ("Address", "companyAddress")):
                if q.get(key):
                    cust_parts.append(Paragraph(f"<font color='#64748B'>{lbl}:</font> {safe(q[key])}", small))
            if not cust_parts:
                cust_parts.append(Paragraph("Client contact not specified", small))

            # Sales representative info
            created_by = q.get("createdBy") or {}
            rep_name = " ".join([p for p in [created_by.get("firstName"), created_by.get("lastName")] if p]).strip() or "Sales Team"
            rep_email = created_by.get("email") or ""
            deal_data = q.get("deal") or {}
            deal_title = deal_data.get("title") if isinstance(deal_data, dict) else ""

            status_str = self._pdf_text_q(str(q.get("quotationStatus") or "Sent")).replace("_", " ").title()
            valid_date_str = self._format_date_q(q.get("valid"))
            issue_date_str = self._format_date_q(q.get("issueDate"))

            details = [
                [Paragraph("PROPOSAL DATE", det_label), Paragraph(safe(issue_date_str), det_value),
                 Paragraph("VALID UNTIL",   det_label), Paragraph(f"<b>{safe(valid_date_str)}</b>", det_value)],
                [Paragraph("PROPOSAL STATUS", det_label), Paragraph(f"<b>{safe(status_str)}</b>", det_value),
                 Paragraph("CURRENCY",      det_label), Paragraph(safe(currency), det_value)],
                [Paragraph("PREPARED BY",   det_label), Paragraph(safe(rep_name), det_value),
                 Paragraph("REP EMAIL",     det_label), Paragraph(safe(rep_email or "—"), det_value)],
            ]
            if deal_title:
                details.append([
                    Paragraph("OPPORTUNITY", det_label), Paragraph(safe(deal_title), det_value),
                    Paragraph("", det_label), Paragraph("", det_value)
                ])

            det_tbl = Table(details, colWidths=[0.85*inch, 1.25*inch, 0.75*inch, 1.35*inch])
            det_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), pale),
                ("BOX", (0,0), (-1,-1), 0.5, line),
                ("LINEBELOW", (0,0), (-1,-2), 0.35, line),
                ("LINEBEFORE", (2,0), (2,-1), 0.35, line),
                ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
                ("LEFTPADDING", (0,0), (-1,-1), 6),
                ("RIGHTPADDING", (0,0), (-1,-1), 6),
                ("TOPPADDING", (0,0), (-1,-1), 6),
                ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ]))

            identity = Table([[([Paragraph("PROPOSAL PREPARED FOR", eyebrow)] + cust_parts), det_tbl]], colWidths=[2.85*inch, 4.2*inch])
            identity.setStyle(TableStyle([
                ("VALIGN", (0,0), (-1,-1), "TOP"),
                ("LEFTPADDING", (0,0), (-1,-1), 0),
                ("RIGHTPADDING", (0,0), (-1,-1), 8),
                ("TOPPADDING", (0,0), (-1,-1), 0),
                ("BOTTOMPADDING", (0,0), (-1,-1), 0),
            ]))
            elements.append(identity)
            elements.append(Spacer(1, 14))

            # ── 2. Project Scope & Proposal Subject (Unique to Quotation!) ──────
            title_text = q.get("title") or (deal_title if deal_title else "")
            desc_text  = q.get("description") or ""
            if title_text or desc_text:
                scope_content = []
                if title_text:
                    scope_content.append(Paragraph(f"<b>Proposal Subject:</b> {safe(title_text)}", body))
                if desc_text:
                    scope_content.append(Paragraph(f"<font color='#64748B'><b>Scope Overview:</b></font> {safe(desc_text)}", small))
                scope_table = Table([[scope_content]], colWidths=[7.05*inch])
                scope_table.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,-1), mint_pale),
                    ("BOX", (0,0), (-1,-1), 0.6, mint_border),
                    ("TOPPADDING", (0,0), (-1,-1), 7),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 7),
                    ("LEFTPADDING", (0,0), (-1,-1), 10),
                    ("RIGHTPADDING", (0,0), (-1,-1), 10),
                ]))
                elements.extend([scope_table, Spacer(1, 14)])

            elements.append(Paragraph("Proposed Deliverables & Pricing Schedule", section))

            # ── 3. Line Items Table (Deliverables & Scope) ──────────────────────
            raw_items = q.get("lineItems") or []
            rows = [[
                Paragraph("NO.", tbl_hdr),
                Paragraph("SCOPE & DELIVERABLE SPECIFICATION", tbl_hdr),
                Paragraph("QTY", tbl_hdr),
                Paragraph("UNIT PRICE", tbl_hdr),
                Paragraph("ESTIMATED AMOUNT", tbl_hdr)
            ]]
            if raw_items:
                for idx, item in enumerate(raw_items, 1):
                    if hasattr(item, "model_dump"): item = item.model_dump()
                    if not isinstance(item, dict): continue
                    desc  = safe(item.get("description") or "Proposed Service / Deliverable")
                    unit  = safe(item.get("unit") or "")
                    qty   = item.get("quantity", 1)
                    try:   qty_lbl = f"{float(qty):g}" + (f" {unit}" if unit else "")
                    except: qty_lbl = str(qty)
                    rows.append([
                        Paragraph(f"{idx:02d}", small),
                        Paragraph(desc, body),
                        Paragraph(safe(qty_lbl), small),
                        Paragraph(money(item.get("unitPrice")), small),
                        Paragraph(money(item.get("total")), body),
                    ])
            else:
                fallback_title = title_text or "Professional Services"
                rows.append([
                    Paragraph("01", small),
                    Paragraph(safe(fallback_title), body),
                    Paragraph("1 Unit", small),
                    Paragraph(money(q.get("subTotal")), small),
                    Paragraph(money(q.get("subTotal")), body)
                ])

            item_table = Table(rows, colWidths=[0.42*inch, 3.48*inch, 0.75*inch, 1.15*inch, 1.25*inch], repeatRows=1, hAlign="LEFT")
            item_table.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,0), accent),
                ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
                ("LINEBELOW",  (0,0), (-1,0), 0.8, mint),
                ("LINEBELOW",  (0,1), (-1,-1), 0.35, line),
                ("VALIGN",  (0,0), (-1,-1), "MIDDLE"),
                ("ALIGN",   (0,1), (0, -1), "CENTER"),
                ("ALIGN",   (2,1), (-1,-1), "RIGHT"),
                ("LEFTPADDING",  (0,0), (-1,-1), 8),
                ("RIGHTPADDING", (0,0), (-1,-1), 8),
                ("TOPPADDING",   (0,0), (-1,-1), 8),
                ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ]))
            elements.extend([item_table, Spacer(1, 14)])

            # ── 4. Commercials & Totals Block (No 'Balance Due' on a Quote!) ─────
            totals = []
            for lbl, key in (("Subtotal", "subTotal"), ("Proposed Discount", "discountAmount"), ("Estimated Tax", "taxAmount"), ("Logistics / Shipping", "shippingAmount")):
                amt = q.get(key)
                if key == "subTotal" or amt not in (None, 0, 0.0):
                    amt_lbl = f"− {money(amt)}" if "Discount" in lbl else money(amt)
                    totals.append([Paragraph(safe(lbl), small), Paragraph(amt_lbl, body)])
            totals.append([
                Paragraph("<b>Total Estimated Value</b>", body),
                Paragraph(f"<font color='{accent.hexval()}'><b>{money(q.get('total'))}</b></font>", body)
            ])

            totals_table = Table(totals, colWidths=[1.8*inch, 1.6*inch], hAlign="RIGHT")
            totals_table.setStyle(TableStyle([
                ("ALIGN",  (0,0), (-1,-1), "RIGHT"),
                ("LINEABOVE", (0, len(totals)-1), (-1, len(totals)-1), 1, accent),
                ("TOPPADDING",    (0,0), (-1,-1), 5),
                ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                ("LEFTPADDING",   (0,0), (-1,-1), 6),
                ("RIGHTPADDING",  (0,0), (-1,-1), 6),
            ]))
            totals_wrap = Table([
                [Paragraph("<font color='#64748B'><i>* This document is an estimate and commercial offer. Official tax invoice will follow upon formal acceptance.</i></font>", small),
                 totals_table]
            ], colWidths=[3.65*inch, 3.4*inch], hAlign="LEFT")
            totals_wrap.setStyle(TableStyle([
                ("VALIGN", (0,0), (-1,-1), "TOP"),
                ("ALIGN", (1,0), (1,0), "RIGHT"),
                ("LEFTPADDING", (0,0), (-1,-1), 0),
                ("RIGHTPADDING", (0,0), (-1,-1), 0),
                ("TOPPADDING", (0,0), (-1,-1), 0),
                ("BOTTOMPADDING", (0,0), (-1,-1), 0),
            ]))
            elements.extend([totals_wrap, Spacer(1, 16)])

            # ── 5. Commercial Terms & Validity (Quotation-Specific!) ────────────
            elements.append(Paragraph("Commercial Terms & Proposal Validity", section))
            terms_elements = [
                Paragraph(f"• <b>Validity:</b> This price proposal is firm and valid through <b>{safe(valid_date_str)}</b>. Deliverables and pricing are subject to review after this date.", small),
            ]
            if q.get("paymentTerms"):
                terms_elements.append(Paragraph(f"• <b>Payment Milestones:</b> {safe(q['paymentTerms'])}", small))
            if q.get("notes"):
                terms_elements.append(Paragraph(f"• <b>Notes & Deliverable Assumptions:</b> {safe(q['notes'])}", small))
            if q.get("termsAndConditions"):
                terms_elements.append(Paragraph(f"• <b>Terms & Conditions:</b> {safe(q['termsAndConditions'])}", small))

            terms_box = Table([[terms_elements]], colWidths=[7.05*inch])
            terms_box.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), pale),
                ("BOX", (0,0), (-1,-1), 0.5, line),
                ("TOPPADDING", (0,0), (-1,-1), 8),
                ("BOTTOMPADDING", (0,0), (-1,-1), 8),
                ("LEFTPADDING", (0,0), (-1,-1), 10),
                ("RIGHTPADDING", (0,0), (-1,-1), 10),
            ]))
            elements.extend([terms_box, Spacer(1, 16)])

            # ── 6. Acceptance & Authorization Sign-off (Distinct to Quotation!) ─
            is_accepted = str(q.get("quotationStatus") or "").upper() == "ACCEPTED"
            if is_accepted:
                conf_name = q.get("confirmedByName") or q.get("customerName") or "Authorized Client Signatory"
                conf_date = self._format_date_q(q.get("confirmedAt") or q.get("updatedAt") or q.get("issueDate"))
                accept_box = Table([[
                    [
                        Paragraph(f"<font color='{accent.hexval()}'><b>✓ PROPOSAL OFFICIALLY ACCEPTED & CONFIRMED</b></font>", body),
                        Paragraph(f"Accepted by client representative: <b>{safe(conf_name)}</b> on <b>{safe(conf_date)}</b>.<br/>"
                                  f"This quotation is officially confirmed and authorized for execution.", small),
                    ]
                ]], colWidths=[7.05*inch])
                accept_box.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,-1), mint_pale),
                    ("BOX", (0,0), (-1,-1), 0.8, mint_border),
                    ("TOPPADDING", (0,0), (-1,-1), 9),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 9),
                    ("LEFTPADDING", (0,0), (-1,-1), 12),
                    ("RIGHTPADDING", (0,0), (-1,-1), 12),
                ]))
                elements.append(accept_box)
            else:
                sign_note = Paragraph("<font color='#64748B'>To accept this proposal and authorize project commencement, please sign and return a copy:</font>", small)
                sig_left = [
                    Paragraph("<b>CLIENT AUTHORIZATION & ACCEPTANCE:</b>", eyebrow),
                    Spacer(1, 12),
                    Paragraph("Authorized Signature: _______________________________", small),
                    Spacer(1, 6),
                    Paragraph("Printed Name & Title: ________________________________", small),
                    Spacer(1, 6),
                    Paragraph("Date: ____________________________________________", small),
                ]
                sig_right = [
                    Paragraph(f"<b>SUBMITTED BY {safe(q.get('companyBranding', {}).get('companyName') or 'COMPANY')}:</b>", eyebrow),
                    Spacer(1, 12),
                    Paragraph(f"Account Representative: <b>{safe(rep_name)}</b>", small),
                    Spacer(1, 6),
                    Paragraph("Authorized Signature: _______________________________", small),
                    Spacer(1, 6),
                    Paragraph(f"Date: {safe(issue_date_str)}", small),
                ]
                sig_table = Table([[sig_left, sig_right]], colWidths=[3.5*inch, 3.55*inch])
                sig_table.setStyle(TableStyle([
                    ("VALIGN", (0,0), (-1,-1), "TOP"),
                    ("BOX", (0,0), (-1,-1), 0.5, line),
                    ("BACKGROUND", (0,0), (-1,-1), pale),
                    ("LEFTPADDING", (0,0), (-1,-1), 10),
                    ("RIGHTPADDING", (0,0), (-1,-1), 10),
                    ("TOPPADDING", (0,0), (-1,-1), 8),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 10),
                ]))
                elements.extend([sign_note, Spacer(1, 6), sig_table])

            branding = {
                **(q.get("companyBranding") or {}),
                "quoteId": q.get("quoteId", ""),
                "valid": self._format_date_q(q.get("valid")),
                "customerName": q.get("customerName", ""),
            }
            doc.build(
                elements,
                onFirstPage=lambda canvas, document: self._draw_quotation_branding(canvas, document, branding),
                onLaterPages=lambda canvas, document: self._draw_quotation_branding(canvas, document, branding),
            )
            buffer.seek(0)
            return buffer

        except Exception as e:
            print("Quotation PDF generation error:", e)
            import traceback; traceback.print_exc()
            raise AppException(500, f"Error generating quotation PDF: {str(e)}")

    def _draw_quotation_branding(self, canvas: Canvas, doc, branding: Dict[str, Any]) -> None:
        page_width, page_height = A4
        left  = doc.leftMargin
        right = page_width - doc.rightMargin
        accent = colors.HexColor("#064E3B")    # Deep Forest Green
        mint   = colors.HexColor("#10B981")    # Emerald Highlight
        tint   = colors.HexColor("#D1FAE5")    # Soft Mint
        company_name = self._pdf_text_q(branding.get("companyName") or "Company")

        canvas.saveState()
        # Top Header: Sleek, architectural banner (Distinct from the wavy invoice!)
        canvas.setFillColor(accent)
        canvas.rect(0, page_height - 130, page_width, 130, stroke=0, fill=1)

        # Thin mint divider rule line
        canvas.setFillColor(mint)
        canvas.rect(0, page_height - 133, page_width, 3, stroke=0, fill=1)

        # Company Logo Box
        logo_bytes = branding.get("logoBytes")
        logo_x, logo_y, logo_w, logo_h = left, page_height - 98, 54, 48
        canvas.setFillColor(colors.white)
        canvas.roundRect(logo_x - 4, logo_y - 4, logo_w + 8, logo_h + 8, 6, stroke=0, fill=1)
        if logo_bytes:
            try:
                canvas.drawImage(ImageReader(BytesIO(logo_bytes)), logo_x, logo_y, width=logo_w, height=logo_h, preserveAspectRatio=True, anchor="c", mask="auto")
            except Exception:
                self._draw_company_monogram_q(canvas, logo_x, logo_y, logo_w, logo_h, company_name, accent)
        else:
            self._draw_company_monogram_q(canvas, logo_x, logo_y, logo_w, logo_h, company_name, accent)

        # Company Details (Left Column)
        company_x = left + 72
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 12)
        col_w = right - company_x - 190
        canvas.drawString(company_x, page_height - 50, self._fit_pdf_text_q(company_name, col_w, "Helvetica-Bold", 12))

        address = self._pdf_text_q(branding.get("address"))
        lines = []
        if address:
            lines.extend([p.strip() for p in address.replace("\n", ", ").split(",") if p.strip()][:2])
        contact_line = "  |  ".join(self._pdf_text_q(i) for i in [branding.get("email"), branding.get("phone"), branding.get("website")] if i)
        if contact_line:
            lines.append(contact_line)

        canvas.setFillColor(colors.HexColor("#A7F3D0"))
        canvas.setFont("Helvetica", 7.5)
        for i, ln in enumerate(lines[:3]):
            canvas.drawString(company_x, page_height - 66 - (i * 11), self._fit_pdf_text_q(ln, col_w, "Helvetica", 7.5))

        # Right Column Header: Clear Proposal Identity
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 22)
        canvas.drawRightString(right, page_height - 50, "PRICE QUOTATION")

        canvas.setFillColor(tint)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawRightString(right, page_height - 66, "COMMERCIAL PROPOSAL & SCOPE")

        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica", 7.5)
        quote_id = self._pdf_text_q(branding.get("quoteId", ""))
        if quote_id:
            canvas.drawRightString(right, page_height - 80, f"Ref: {quote_id}")

        valid_str = self._pdf_text_q(branding.get("valid", ""))
        if valid_str:
            canvas.setFillColor(colors.HexColor("#6EE7B7"))
            canvas.setFont("Helvetica-Bold", 7.5)
            canvas.drawRightString(right, page_height - 94, f"Valid Through: {valid_str}")

        # Footer: Modern, clean architectural footer band
        canvas.setFillColor(colors.HexColor("#064E3B"))
        canvas.rect(0, 0, page_width, 55, stroke=0, fill=1)
        canvas.setFillColor(mint)
        canvas.rect(0, 55, page_width, 2, stroke=0, fill=1)

        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.drawString(left, 36, "CONFIDENTIAL COMMERCIAL PROPOSAL")

        canvas.setFont("Helvetica", 6.8)
        canvas.setFillColor(colors.HexColor("#A7F3D0"))
        contact_str = "   |   ".join(self._pdf_text_q(i) for i in [branding.get("phone"), branding.get("email"), branding.get("website")] if i)
        if contact_str:
            canvas.drawString(left, 24, self._fit_pdf_text_q(contact_str, 320, "Helvetica", 6.8))

        # Right side legal & page
        reg_items = []
        if branding.get("registrationNumber"): reg_items.append(f"Reg: {self._pdf_text_q(branding['registrationNumber'])}")
        if branding.get("tradeNumber"): reg_items.append(f"Trade: {self._pdf_text_q(branding['tradeNumber'])}")
        if reg_items:
            canvas.drawRightString(right, 36, self._fit_pdf_text_q("   |   ".join(reg_items), 220, "Helvetica", 6.8))

        canvas.setFillColor(colors.white)
        canvas.drawRightString(right, 22, self._fit_pdf_text_q(f"{company_name}  ·  Page {doc.page}", 200, "Helvetica", 6.8))

        canvas.restoreState()

    @staticmethod
    def _draw_company_monogram_q(canvas, x, y, width, height, name, accent):
        canvas.setFillColor(colors.HexColor("#ECFDF5"))
        canvas.roundRect(x, y, width, height, 6, stroke=0, fill=1)
        initials = "".join(w[0] for w in name.split()[:2]).upper() or "Q"
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 16)
        canvas.drawCentredString(x + width / 2, y + height / 2 - 5, initials)
