from app.repositories.base_repository import BaseRepository
from app.db.models.task_status_model import TaskStatusModel

class TaskStatusRepository(BaseRepository):
    def __init__(self):
        super().__init__(TaskStatusModel)