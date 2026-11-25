from typing import Any


_USER_REFERENCE_KEYS = {
    "assignedto", "assignedby", "assignee", "assignTo", "assignBy",
    "createdby", "updatedby", "deletedby", "disqualifiedby", "reviewedby",
    "performedby", "completedby", "acknowledgedby", "sentby", "sent_by",
    "owner", "owneruser", "user", "userid", "user_id", "members", "managers",
    "agents", "mentions", "primary_admin", "uploadedby", "approvedby",
}
_NORMALIZED_USER_REFERENCE_KEYS = {
    str(name).replace("_", "").lower() for name in _USER_REFERENCE_KEYS
}
_SAFE_POPULATED_USER_FIELDS = {
    "id", "_id", "firstName", "lastName", "email", "phone", "status",
}
_SENSITIVE_FIELD_NAMES = {
    "password", "passwordhash", "hashedpassword", "refreshtoken",
    "refreshtokenhash", "hashedrefreshtoken", "accesstoken",
    "hashedemail", "hashedphone",
}


def sanitize_api_response(value: Any, *, include_session_tokens: bool = False) -> Any:
    """Remove credential material and minimize populated user records in API data."""
    return _sanitize(value, include_session_tokens=include_session_tokens, root=True)


def _sanitize(value: Any, *, include_session_tokens: bool, root: bool = False) -> Any:
    if not isinstance(value, (dict, list)) and hasattr(value, "model_dump"):
        value = value.model_dump(mode="json")
    if isinstance(value, list):
        return [_sanitize(item, include_session_tokens=include_session_tokens) for item in value]
    if not isinstance(value, dict):
        return value

    cleaned = {}
    for key, item in value.items():
        normalized_key = str(key).replace("_", "").lower()
        if normalized_key in _SENSITIVE_FIELD_NAMES:
            if not (root and include_session_tokens and normalized_key in {"refreshtoken", "accesstoken"}):
                continue

        is_user_reference = normalized_key in _NORMALIZED_USER_REFERENCE_KEYS
        if is_user_reference:
            if isinstance(item, list):
                cleaned[key] = [_safe_user_reference(entry) for entry in item]
            else:
                cleaned[key] = _safe_user_reference(item)
        else:
            cleaned[key] = _sanitize(item, include_session_tokens=include_session_tokens)
    return cleaned


def _safe_user_reference(value: Any) -> Any:
    if not isinstance(value, (dict, list)) and hasattr(value, "model_dump"):
        value = value.model_dump(mode="json")
    if isinstance(value, dict):
        return {
            field: value[field]
            for field in _SAFE_POPULATED_USER_FIELDS
            if field in value
        }
    return value
