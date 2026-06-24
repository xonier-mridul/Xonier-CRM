from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from typing import Dict, Any
from app.repositories.deal_repository import DealRepository
from bson import ObjectId
from app.db.db import Client

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

    async def create(self, user: Dict[str, Any], payload: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
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

                    isAdmin = validate_admin(user["userRole"])

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

                    await FastAPICache.get_backend().clear(
                        namespace=DEAL_CACHE_NAMESPACE
                    )
                    await FastAPICache.get_backend().clear(
                        namespace=DEAL_CACHE_NAMESPACE_BY_ID
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

            isAdmin = validate_admin(user["userRole"])

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
                        if hasattr(quotation.deal, "id")
                        else str(quotation.deal)
                    )
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
    "deal": quotation.deal.id,
    "quotation": quotation.id,
    "customerName": quotation.customerName,
    "customerEmail": quotation.customerEmail,
    "customerPhone": quotation.customerPhone,
    "companyName": quotation.companyName,
    "companyAddress": quotation.companyAddress,
    "companyWebsite": quotation.companyWebsite,
    "billingAddress": quotation.companyAddress,
    "lineItems": [item.model_dump() for item in (quotation.lineItems or [])],
    "currency": quotation.currency,
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
    "sourceQuoteId": quotation.quoteId,
}
                    await self.invoiceRepo.create(data=invoice_payload, session=session)

                    await self.repo.update(
    id=PydanticObjectId(quote_id),
    data={
        "quotationStatus": QuotationStatus.ACCEPTED,
        "convertedToInvoice": True,
        "confirmedAt": datetime.now(timezone.utc),
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

                    await FastAPICache.get_backend().clear(
                        namespace=DEAL_CACHE_NAMESPACE
                    )
                    await FastAPICache.get_backend().clear(
                        namespace=DEAL_CACHE_NAMESPACE_BY_ID
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

            isAdmin = validate_admin(user["userRole"])

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

                    isAdmin = validate_admin(user["userRole"])

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

                    isAdmin = validate_admin(user["userRole"])

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
                            "deal": quotation.deal.id,
                            "quotation": quotation.id,
                            "customerName": quotation.customerName,
                            "customerEmail": quotation.customerEmail,
                            "customerPhone": quotation.customerPhone,
                            "companyName": quotation.companyName,
                            "companyAddress": quotation.companyAddress,
                            "companyWebsite": quotation.companyWebsite,
                            "billingAddress": quotation.companyAddress,
                            "lineItems": [item.model_dump() for item in (quotation.lineItems or [])],
                            "currency": quotation.currency,
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
                            "createdBy": user["_id"],
                        }
                        
                        await self.invoiceRepo.create(data=invoice_payload, session=session)
                        
                        await self.repo.update(
                            id=PydanticObjectId(quoteId),
                            data={
                                "convertedToInvoice": True,
                                "confirmedAt": datetime.now(timezone.utc),
                            },
                            session=session,
                        )

                        

                        await self.dealRepo.update(
                            id=PydanticObjectId(quotation.deal.id),
                            data={
                                "dealStage": DEAL_STAGES.WON.value,
                                "dealPipeline": DEAL_PIPELINE.WON.value,
                            },
                            session=session,
                        )
                        
                    elif new_status == QuotationStatus.REJECTED:
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
                    
                    await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE)
                    await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE_BY_ID)
                    
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

                    isAdmin = validate_admin(user["userRole"])

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

                    isAdmin = validate_admin(user["userRole"])

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

                    await FastAPICache.get_backend().clear(
                        namespace=DEAL_CACHE_NAMESPACE
                    )
                    await FastAPICache.get_backend().clear(
                        namespace=DEAL_CACHE_NAMESPACE_BY_ID
                    )
                    await FastAPICache.get_backend().clear(
                        namespace=LEAD_CACHE_NAMESPACE
                    )

                    return True

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
