

from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.query_schema import QueryInsertSchema, BulkDeleteSchema
from app.controllers.query_controller import QueryController

router       = APIRouter()
dependencies = Dependencies()
controller   = QueryController()


AUTHORIZED   = Depends(dependencies.authorized)
ADMIN_ONLY   = Depends(dependencies.onlyForAdmin)



@router.post(
    "/",
    dependencies=[]
)
async def insert_query(request: Request, payload: QueryInsertSchema):
    return await controller.create(
        request=request,
        payload=payload.model_dump(mode="json")
    )



@router.get(
    "/",
    dependencies=[AUTHORIZED, ADMIN_ONLY]
)
async def get_all_queries(request: Request):
    return await controller.get_all(request=request)



@router.delete(
    "/{query_id}",
    dependencies=[AUTHORIZED, ADMIN_ONLY]
)
async def delete_query(request: Request, query_id: str):
    return await controller.delete(request=request, query_id=query_id)



@router.delete(
    "/bulk-delete",
    dependencies=[AUTHORIZED, ADMIN_ONLY]
)
async def bulk_delete_queries(request: Request, payload: BulkDeleteSchema):
    return await controller.bulk_delete(
        request=request,
        payload=payload.model_dump(mode="json")
    )