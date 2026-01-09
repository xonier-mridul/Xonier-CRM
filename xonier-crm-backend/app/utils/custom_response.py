from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class ApiResponse(BaseModel):  
    success: bool = True
    status_code: int
    message: str
    data: Optional[dict | List | str] = None

def successResponse(status_code: int = 200, message: str = "Operation successful", data=None ):
    return ApiResponse(
        success=True,
        status_code=status_code,
        message=message,
        data=data,
        
    )
