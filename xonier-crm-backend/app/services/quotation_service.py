from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from typing import Dict, Any
from app.repositories.deal_repository import DealRepository
from bson import ObjectId
from app.db.db import Client
from app.utils.validate_admin import validate_admin
from beanie import PydanticObjectId
from app.utils.get_team_members import GetTeamMembers
from app.repositories.enquiry_repository import EnquiryRepository
from app.repositories.quotation_repository import QuotationRepository
from app.utils.email_manager import EmailManager
from app.utils.enquiry_id_generator import generate_enquiry_id
from app.core.constants import COMPANY_ADDRESS, COMPANY_LOGO_LINK
from fastapi.encoders import jsonable_encoder
from app.core.crypto import Encryption
from app.core.enums import DEAL_STAGES, QuotationStatus, QuotationEventType
from app.repositories.quotation_history_repository import QuotationHistoryRepository
from app.repositories.invoice_repository import InvoiceRepository
from datetime import datetime, timezone


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

    async def create(self, user:Dict[str, Any], payload: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(payload["deal"]):
                        raise AppException(400, "Invalid deal Id")
                    
                    deal = await self.dealRepo.find_by_id(PydanticObjectId(payload["deal"]), populate=["createdBy"])
                    
                    if not deal:
                            raise AppException(404, "Deal not found against deal id")
                    

                    
                    deal = deal.model_dump(mode="json")

                    if deal["inQuotation"]:
                        raise AppException(400, "Action stopped, Already created quotation against this deal")

                    isAdmin = False
                    isCreator = False
                    isManager = False

                   
                    isAdmin = validate_admin(user["userRole"])

                    if not isAdmin:


                        if deal["createdBy"]["id"] == user["_id"]:
                            isCreator = True
                            

                        if not isCreator:
                             members = await self.getTeamMem.get_team_members(user["_id"])
                             
                             if members:
                                 isManager = deal["createdBy"]["id"] in members

                    if not isAdmin and not isCreator and not isManager:
                        raise AppException(403, "Permission denied, Only Admin, Creator or Manager can perform this")
                    
                    quote_id = generate_enquiry_id(prefix="QUT")
                    

                    new_payload:Dict[str, Any] = {
                        **payload,
                        "createdBy": user["_id"],
                        "quoteId": quote_id
                    }

                    if new_payload.get("valid") is None:
                        new_payload.pop("valid")

            

                    await self.emailManager.send_quotation_email(to=payload["customerEmail"], quote_id=quote_id, title=[payload["title"]], customer_name=payload["customerName"], customer_email=payload["customerEmail"], customer_phone=payload["customerPhone"], company_name=payload["companyName"], issue_date=payload["issueDate"], valid_until=payload["valid"], sub_total=payload["subTotal"], total=payload["total"], description=payload["description"], company_logo= COMPANY_LOGO_LINK, company_address=COMPANY_ADDRESS)
                    

                    create = await self.repo.create(data=new_payload, session=session)


                    if not create:
                        raise AppException(400, "Quotation creation failed")   

                    update_deal  = await self.dealRepo.update(id=PydanticObjectId(payload["deal"]), data={"inQuotation": True, "dealStage": DEAL_STAGES.PROPOSAL}, session=session)

                    if not update_deal:
                        raise AppException(400, "Deal field not updated")

                    return create.model_dump(mode="json")



                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                

    async def getAll(self, filters:Dict[str, Any], user:Dict[str, Any]):
        try:
            isAdmin = False
            
            page = filters.get("page") or 1
            limit = filters.get("limit") or 10
   
            isAdmin = validate_admin(user["userRole"])

            query = {}

            if not isAdmin:
                members = await self.getTeamMem.get_team_members(user["_id"])
                
                if members:
                    query.update({"createdBy.$id": {"$in": members}})

                if not members:
                    query.update({"createdBy.$id": PydanticObjectId(user["_id"])})

            if "title" in filters:
                 query["title"] = filters["title"]

            if "dealId" in filters:
                 query.update({"deal.$id": PydanticObjectId(filters["dealId"])})

            
            result = await self.repo.get_all(page=int(page), limit=int(limit), filters=query, populate=["lead", "createdBy", "updatedBy"])

            if not result:
                 raise AppException(404, "Quotations data not found")
            
            result = jsonable_encoder(result)

            return result


        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_by_id(self, quoteId: str, user: Dict[str, Any]):
        try:
            
            isAdmin = validate_admin(user["userRole"])

            
            quotation = await self.repo.find_by_id(
                id=PydanticObjectId(quoteId),
                populate=["deal", "createdBy", "updatedBy"]
            )

            if not quotation:
                raise AppException(404, "Quotation not found")

            
            quotation = quotation.model_dump(mode="json")

            quotation["customerEmail"] = self.encryption.decrypt_data(quotation["customerEmail"])

            quotation["customerPhone"] = self.encryption.decrypt_data(quotation["customerPhone"])

            quotation["createdBy"]["email"] = self.encryption.decrypt_data(quotation["createdBy"]["email"])
           
            if isAdmin:
                return quotation


            if str(quotation["createdBy"]["id"]) == str(user["_id"]):
                return quotation


            members = await self.getTeamMem.get_team_members(user["_id"])

            if members and quotation["createdBy"]["id"] in members:
                return quotation


            raise AppException(
                403,
                "Permission denied. Only Admin, Creator, or Manager can access this quotation"
            )

        except AppException:
            raise

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
                        session=session
                    )

                    if not quotation:
                        raise AppException(404, "Quotation not found")
                    
                    if quotation.quotationStatus == QuotationStatus.DELETE:
                        raise AppException(400, "Quotation deleted, quotation updation failed")
                    
                    if quotation.quotationStatus == QuotationStatus.ACCEPTED:
                        raise AppException(400, "Quotation accepted, quotation updation failed")

                    
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

                  
                    old_data = quotation.model_dump()

                   
                    delta = {}

                    for field, new_value in payload.items():
                        old_value = getattr(quotation, field, None)

                        if new_value != old_value:
                            delta[field] = {
                                "old": old_value,
                                "new": new_value
                            }
                            setattr(quotation, field, new_value)

                    if not delta:
                        raise AppException(400, "No changes detected")
                    
                    updated_payload = {**payload, "quotationStatus": QuotationStatus.UPDATED ,"updatedBy": PydanticObjectId(user["_id"])}



                    await self.repo.update(id=PydanticObjectId(quoteId), data=updated_payload, session=session)

            
                    
                    await self.historyRepo.create(
                        data={
                            "quotation": quotation.id,
                            "eventType": "updated",
                            "delta": delta,
                            "performedBy": user["_id"]
                        },
                        session=session
                    )

                    return quotation.model_dump(mode="json")
                    

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                

    async def update_status(self, quoteId: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(quoteId):
                        raise AppException(400, "Invalid quotation id")

                    quotation = await self.repo.find_by_id(
                        id=PydanticObjectId(quoteId),
                        populate=["deal", "createdBy"],
                        session=session
                    )

                    if not quotation:
                        raise AppException(404, "Quotation not found")
                    
                    if quotation.quotationStatus == QuotationStatus.DELETE:
                        raise AppException(400, "Quotation deleted, quotation updation failed")
                    
                    if quotation.quotationStatus == QuotationStatus.ACCEPTED:
                        raise AppException(400, "Quotation accepted, quotation updation failed")
                    
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
                            delta[field] = {
                                "old": old_value,
                                "new": new_value
                            }
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
                            "performedBy": user["_id"]
                        },
                        session=session
                    )

                    if quotation.quotationStatus == QuotationStatus.ACCEPTED:
                        invoice_id = generate_enquiry_id("INV")
                        
                        invoice_payload = {
                             'invoiceId': invoice_id,
                             "deal": quotation.deal.id,
                             "quotation": quotation.id,
                             "customerName": quotation.customerName,
                             "customerEmail": quotation.customerEmail,
                             "customerPhone": quotation.customerPhone,
                             "companyName": quotation.companyName,
                             "subTotal": quotation.subTotal,
                             "total": quotation.total,
                             "issueDate": quotation.issueDate,
                             "createdBy": user["_id"],


                        }
                        await self.invoiceRepo.create(data=invoice_payload, session=session)

                    return quotation.model_dump(mode="json")



                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")




    async def resend(self, quoteId: str, user: Dict[str, Any])->bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(quoteId):
                        raise AppException(400, "Invalid quotation id")

                    quotation = await self.repo.find_by_id(
                        id=PydanticObjectId(quoteId),
                        populate=["deal", "createdBy"],
                        session=session
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
                        QuotationStatus.EXPIRED
                    ]:
                        raise AppException(
                            400,
                            f"Cannot resend quotation in '{quotation.quotationStatus}' status"
                        )
                    



                    customer_email = self.encryption.decrypt_data(quotation.customerEmail)
                    customer_phone = (
                        self.encryption.decrypt_data(quotation.customerPhone)
                        if quotation.customerPhone else None
                    )

                    await self.emailManager.send_quotation_email(
                        to=customer_email,
                        quote_id=quotation.quoteId,
                        title=[quotation.title],
                        customer_name=quotation.customerName,
                        customer_email=customer_email,
                        customer_phone=customer_phone,
                        company_name=quotation.companyName,
                        issue_date=quotation.issueDate,
                        valid_until=quotation.valid,
                        sub_total=quotation.subTotal,
                        total=quotation.total,
                        description=quotation.description,
                        company_logo=COMPANY_LOGO_LINK,
                        company_address=COMPANY_ADDRESS
                    )

                    await self.repo.update(
                        id=quotation.id,
                        data={
                            "quotationStatus": QuotationStatus.RESEND,
                            "updatedBy": PydanticObjectId(user["_id"])
                        },
                        session=session
                    )

                    
                    await self.historyRepo.create(
                        data={
                            "quotation": quoteId,
                            "eventType": QuotationEventType.RESEND,
                            "previousStatus": quotation.quotationStatus,
                            "newStatus": QuotationStatus.RESEND,
                            "performedBy": quotation.updatedBy
                        },
                        session=session
                    )

                    return True

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                


    async def delete(self, quoteId: str, user: Dict[str, Any])->bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(quoteId):
                        raise AppException(400, "Invalid quotation id")

                    quotation = await self.repo.find_by_id(
                        id=PydanticObjectId(quoteId),
                        populate=["deal", "createdBy"],
                        session=session
                    )

                    if not quotation:
                        raise AppException(404, "Quotation not found")
                    
                    
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
                        QuotationStatus.DELETE,
                      
                    ]:
                        raise AppException(
                            400,
                            f"{quotation.quoteId} already deleted"
                        )
                    
                    await self.repo.update(id=PydanticObjectId(quoteId), data={"quotationStatus": QuotationStatus.DELETE, "deletedAt": datetime.now(timezone.utc), "deletedBy": PydanticObjectId(user["_id"])}, session=session)

                    await self.historyRepo.create(
                        data={
                            "quotation": quoteId,
                            "eventType": QuotationEventType.DELETE,
                            "previousStatus": quotation.quotationStatus,
                            "newStatus": QuotationStatus.DELETE,
                            "performedBy": user["_id"]
                        },
                        session=session
                    )

                    return True



                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")


        

