from app.utils.custom_exception import AppException

ROLE_RANK = {"SUPER_ADMIN": 100, "COMPANY_ADMIN": 90, "ADMIN": 80, "MANAGER": 50, "USER": 10}


def role_rank(roles):
    return max((ROLE_RANK.get(r.get("code"), int(r.get("power") or 10)) for r in roles), default=0)


def is_active_role(role):
    return bool(role.get("code")) and role.get("status") is not False and not role.get("deletedAt")


def can_assign_leads(roles):
    return any(
        is_active_role(r)
        and (r["code"] in {"SUPER_ADMIN", "COMPANY_ADMIN", "ADMIN", "MANAGER"}
             or (r["code"] != "USER" and r.get("canManageBelow") is True))
        for r in roles
    )


def require_lead_assigner(user):
    if not can_assign_leads(user.get("userRole", [])):
        raise AppException(403, "Only admins and managers can assign or revoke leads")


def require_lower_assignee(user, target):
    require_lead_assigner(user)
    if str(user.get("_id") or user.get("id")) == str(target.get("_id") or target.get("id")):
        raise AppException(403, "Leads can only be assigned to lower roles")
    roles = target.get("userRole", [])
    actor_roles = [role for role in user.get("userRole", []) if is_active_role(role)]
    if not roles or any(not role.get("code") for role in roles) or role_rank(actor_roles) <= role_rank(roles):
        raise AppException(403, "Leads can only be assigned to lower roles")
