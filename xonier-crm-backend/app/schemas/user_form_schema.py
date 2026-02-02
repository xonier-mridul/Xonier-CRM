from pydantic import BaseModel, field_validator
from typing import List
from app.core.enums import FORM_FIELD_MODULES

class CreateFormSchema(BaseModel):
    selectedFormFields: List[str]
    module: FORM_FIELD_MODULES


    @field_validator("selectedFormFields")
    @classmethod
    def min_len(cls, item):
        if(len(item)<=0):
            raise ValueError(f"{cls.__name__}: at least one field required")
        
        return item