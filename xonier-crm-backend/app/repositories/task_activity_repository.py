from app.repositories.base_repository import BaseRepository
from app.db.models.task_activity_model import TaskActivityModel

class TaskActivityRepository(BaseRepository):
    def __init__(self):
        super().__init__(TaskActivityModel)