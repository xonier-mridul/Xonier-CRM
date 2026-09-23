from fastapi import APIRouter, Request, Depends
from app.core.dependencies import Dependencies
from app.controllers.user_controller import UserController
from app.services.user_service import RatingService

router = APIRouter()
dependencies = Dependencies()

rating_service = RatingService()
user_controller = UserController(rating_service)


@router.get(
    "/all-rating",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.company_active),
        Depends(dependencies.company_context),
    ],
)
async def getAll(request: Request):
    return await user_controller.get_all_rating(request)