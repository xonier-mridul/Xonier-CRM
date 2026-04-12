
from app.db.models.sub_task_model import SubTaskModel
from app.repositories.base_repository import BaseRepository

class SubTaskRepository(BaseRepository):
    def __init__(self):
        super().__init__(SubTaskModel)


    