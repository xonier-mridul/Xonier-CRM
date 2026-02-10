from typing import Dict, Any
from fastapi.encoders import jsonable_encoder
from app.utils.custom_exception import AppException
from app.repositories.invoice_repository import InvoiceRepository
from beanie import PydanticObjectId
from app.core.constants import SUPER_ADMIN_CODE
from app.utils.get_team_members import GetTeamMembers
from app.utils.validate_admin import validate_admin
from app.core.crypto import Encryption

class InvoiceService:
    def __init__(self):
        self.repo = InvoiceRepository()
        self.getTeamMem = GetTeamMembers()
        self.encryption = Encryption()

    async def getAll(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page") or 1)
            limit = int(filters.get("limit") or 10)

            query = {}


            is_super_admin = False

            for role in user.get("userRole", []):
                if role.get("code") == SUPER_ADMIN_CODE:
                    is_super_admin = True
                    break

            if not is_super_admin:

                members = await self.getTeamMem.get_team_members(user["_id"])

                if members:
                    query.update({
                        "createdBy.$id": {
                            "$in": [PydanticObjectId(m) for m in members]
                        }
                    })
                else:
                    
                    query.update({
                        "createdBy.$id": PydanticObjectId(user["_id"])
                    })

            if "invoiceId" in filters:
                query.update({"invoiceId": filters["invoiceId"]})

            if "status" in filters:
                query.update({"status": filters["status"]})

            if "dealId" in filters:
                query.update({"deal": PydanticObjectId(filters["dealId"])})

            if "createdBy" in filters and is_super_admin:
                query.update({
                    "createdBy.$id": PydanticObjectId(filters["createdBy"])
                })

            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["createdBy", "deal_id", "updatedBy"],
            )

            if not result:
                raise AppException(404, "Invoice data not found")

            result = jsonable_encoder(
                result,
                exclude={
                    "createdBy": {"password"},
                    "updatedBy": {"password"},
                },
            )

            return result

        except AppException:
            raise

        except Exception as e:
            print("Invoice getAll error:", e)
            raise AppException(
                status_code=500,
                message="Internal server error"
            )


    async def get_by_id(self, id: str, user: Dict[str, Any]):
            try:
                invoice_id = PydanticObjectId(id)

                is_super_admin = validate_admin(user.get("userRole", []))


                access_query = {"_id": invoice_id}

                if not is_super_admin:
                    members = await self.getTeamMem.get_team_members(user["_id"])

                    allowed_user_ids = []

                    if members:
                        allowed_user_ids.extend(
                            [PydanticObjectId(m) for m in members]
                        )

                    allowed_user_ids.append(PydanticObjectId(user["_id"]))

                    access_query.update({
                        "createdBy.$id": {"$in": allowed_user_ids}
                    })


                invoice = await self.repo.find_one(
                    filter=access_query,
                    populate=["createdBy", "updatedBy", "deal", "quotation"],
                )

                if not invoice:
                    raise AppException(
                        403,
                        "You are not authorized to access this invoice or it does not exist"
                    )


                invoice = jsonable_encoder(
                    invoice,
                    exclude={
                        "createdBy": {"password"},
                        "updatedBy": {"password"},
                    },
                )

                invoice["customerEmail"] = self.encryption.decrypt_data(invoice["customerEmail"])
                invoice["customerPhone"] = self.encryption.decrypt_data(invoice["customerPhone"])

                return invoice

            except AppException:
                raise

            except Exception as e:
                print("Invoice get_by_id error:", e)
                raise AppException(
                    status_code=500,
                    message="Internal server error"
                )
