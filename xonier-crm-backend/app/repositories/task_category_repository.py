from app.repositories.base_repository import BaseRepository
from app.db.models.task_category_model import TaskCategoryModel


class TaskCategoryRepository(BaseRepository):
    def __init__(self):
        super().__init__(TaskCategoryModel)


