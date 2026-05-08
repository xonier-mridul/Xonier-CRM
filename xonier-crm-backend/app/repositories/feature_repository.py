from app.db.models.feature_model import FeatureModel
from app.repositories.base_repository import BaseRepository

class FeatureRepository(BaseRepository):
    def __init__(self):
        super().__init__(FeatureModel)