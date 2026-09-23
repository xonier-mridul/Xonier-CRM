from fastapi import Request
from app.utils.custom_response import successResponse
from app.services.user_service import RatingService


class UserController:
    def __init__(self, rating_service: RatingService):
        self.rating_service = rating_service

    async def get_all_rating(self, request: Request):
        query_params = request.query_params

        page = int(query_params.get("page", 1))
        limit = int(query_params.get("limit", 10))
        search = query_params.get("search", "")
        role = query_params.get("role", "")
        rating = query_params.get("rating", "")
        department = query_params.get("department", "")
        designation = query_params.get("designation", "")

        companyId = str(request.state.company.id)

        result = await self.rating_service.get_all_ratings(
            companyId=companyId,
            page=page,
            limit=limit,
            search=search,
            role=role,
            rating=rating,
            department=department,
            designation=designation,
        )

        return successResponse(200, "Ratings fetched successfully", result)