
from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.services.plan_services import PlanService
from app.utils.custom_response import successResponse


class PlanController:
    def __init__(self):
        self.service = PlanService()


    async def create(self, request:Request, payload: Dict[str, Any]):
        
                try:
                    user = request.state.user

                    result = await self.service.create(payload=payload, user=user)

                    return successResponse(201, "Plan created successfully", result)



                except AppException as e:
                    raise e
                
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                

    async def getAll(self, request: Request):
        try:
             user = request.state.user

             filters = dict(request.query_params)

             result =await self.service.getAll(filters, user)
             return successResponse(200, "Plan data fetched successfuly", result)
              
        except AppException as e:
            raise e
                
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def getById(self, request: Request, id:str):
        try:
             user = request.state.user

             result =await self.service.getById(id, user)
             return successResponse(200, "Plan data fetched successfuly", result)
              
        except AppException as e:
            raise e
                
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def update(self, request: Request, id:str, payload: Dict[str, Any]):
        try:
             user = request.state.user

             await self.service.update(id, payload, user)

             return successResponse(200, "plan data updated successfully")
             

        except AppException as e:
            raise e
                
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
        
    async def delete(self, request: Request, id:str,):
        try:
             user = request.state.user

             result = await self.service.delete(id, user)

             return successResponse(200, "plan deleted successfully", result)
             

        except AppException as e:
            raise e
                
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    
              
        