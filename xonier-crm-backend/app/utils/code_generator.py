import re
from app.utils.custom_exception import AppException

ROLE_NAME_PATTERN = re.compile(r"^[A-Za-z]+(?:[ _][A-Za-z]+)*$")

def validate_role_name(name: str) -> None:
    if not name or not name.strip():
        raise AppException(400, "Role name is required")
    if not ROLE_NAME_PATTERN.match(name.strip()):
        raise AppException(
            400,
            "Role name can only contain letters and spaces (no numbers or special characters)"
        )

def code_generator(name: str) -> str:
    return "_".join(name.split()).upper()