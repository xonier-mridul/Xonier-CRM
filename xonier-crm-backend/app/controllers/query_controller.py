
from fastapi import Request
from fastapi.encoders import jsonable_encoder
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.services.query_service import QueryService
from app.utils.custom_response import successResponse


class QueryController:
    def __init__(self):
        self.service = QueryService()

    
    async def create(self, request: Request, payload: Dict[str, Any]):
        try:
            print("err")
            result = await self.service.create(payload=payload)

            return successResponse(201, "Query submitted successfully", result)

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    # ─── Get All ──────────────────────────────────────────────────────────────
    async def get_all(self, request: Request):
        try:
            user    = request.state.user
            filters = dict(request.query_params)
            result  = await self.service.get_all(filters=filters, user=user)

            return successResponse(200, "Queries fetched successfully", result)

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    #---- Get By Id-------------------------------------------------------------
    
    async def getBy_id(self,request:Request,query_id:str):
        try:
            user=request.state.user
            result = await self.service.getBy_id(query_id=query_id,user=user)
            
            return successResponse(200,"Query featched successfully",result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
            

    # ─── Delete ───────────────────────────────────────────────────────────────
    async def delete(self, request: Request, query_id: str):
        try:
            user   = request.state.user
            result = await self.service.delete(query_id=query_id, user=user)

            return successResponse(200, "Query deleted successfully", result)

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    # ─── Bulk Delete ──────────────────────────────────────────────────────────
    async def bulk_delete(self, request: Request, payload: Dict[str, Any]):
        try:
            print("hii")
            user   = request.state.user
            ids    = payload.get("ids", [])
            
            
            result = await self.service.bulk_delete(ids=ids, user=user)

            return successResponse(200, "Queries deleted successfully", result)

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")