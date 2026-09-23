import re
from app.utils.custom_exception import AppException

ROLE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9 _@#$%&*()\-+.,!]+$")

def validate_role_name(name: str) -> None:
    if not name or not name.strip():
        raise AppException(400, "Role name is required")
    if not ROLE_NAME_PATTERN.match(name.strip()):
        raise AppException(
            400,
            "Role name can must be valid"
        )

def code_generator(name: str) -> str:
    return "_".join(name.split()).upper()