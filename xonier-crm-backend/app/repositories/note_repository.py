from app.repositories.base_repository import BaseRepository
from app.db.models.notes_model import NoteModel

class NoteRepository(BaseRepository):
    def __init__(self):
        super().__init__(NoteModel)