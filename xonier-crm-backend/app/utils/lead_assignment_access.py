from app.utils.custom_exception import AppException

ROLE_RANK = {"SUPER_ADMIN": 100, "COMPANY_ADMIN": 90, "ADMIN": 80, "MANAGER": 50, "USER": 10}


def role_rank(roles):
    return max((ROLE_RANK.get(r.get("code"), int(r.get("power") or 10)) for r in roles), default=0)


def can_assign_leads(roles):
    return any(r.get("code") in {"SUPER_ADMIN", "COMPANY_ADMIN", "ADMIN", "MANAGER"}
               or (r.get("code") != "USER" and r.get("canManageBelow") is True) for r in roles)


def require_lead_assigner(user):
    if not can_assign_leads(user.get("userRole", [])):
        raise AppException(403, "Only admins and managers can assign or revoke leads")


def require_lower_assignee(user, target):
    require_lead_assigner(user)
    if str(user.get("_id") or user.get("id")) == str(target.get("_id") or target.get("id")):
        raise AppException(403, "Leads can only be assigned to lower roles")
    roles = target.get("userRole", [])
    if not roles or role_rank(user.get("userRole", [])) <= role_rank(roles):
        raise AppException(403, "Leads can only be assigned to lower roles")
