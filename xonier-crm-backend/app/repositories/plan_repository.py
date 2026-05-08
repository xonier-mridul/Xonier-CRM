from app.repositories.base_repository import BaseRepository
from app.db.models.plan_model import PlanModel

class PlanRepository(BaseRepository):
    def __init__(self):
        super().__init__(PlanModel)