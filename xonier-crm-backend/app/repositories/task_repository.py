
from app.repositories.base_repository import BaseRepository
from app.db.models.task_model import TaskModel

class TaskRepository(BaseRepository):
    def __init__(self):
        super().__init__(TaskModel)