from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.utils.response_sanitizer import sanitize_api_response

class ApiResponse(BaseModel):  
    success: bool = True
    status_code: int
    message: str
    data: Optional[dict | List | str] = None

def successResponse(
    status_code: int = 200,
    message: str = "Operation successful",
    data=None,
    *,
    include_session_tokens: bool = False,
):
    return ApiResponse(
        success=True,
        status_code=status_code,
        message=message,
        data=sanitize_api_response(data, include_session_tokens=include_session_tokens),
        
    )
