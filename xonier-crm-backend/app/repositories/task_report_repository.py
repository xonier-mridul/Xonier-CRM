from app.repositories.base_repository import BaseRepository
from app.db.models.task_report_model import TaskReportModel

class TaskReportRepository(BaseRepository):
    def __init__(self):
        super().__init__(TaskReportModel)