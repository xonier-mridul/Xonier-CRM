import re
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from bson import ObjectId
from fastapi import APIRouter, Depends, Query, Request

from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.core.security import hash_value
from app.db.models.deal_model import DealModel
from app.db.models.lead_model import LeadsModel
from app.db.models.organization_model import OrganizationModel
from app.db.models.person_model import PersonModel
from app.schemas.organization_schema import (
    OrganizationCreateSchema,
    OrganizationUpdateSchema,
    PersonCreateSchema,
    PersonUpdateSchema,
)
from app.services.commercial_relationship_service import (
    CommercialRelationshipService,
    decrypt_safe,
    encrypt_safe,
    serialize_organization,
    serialize_person,
)
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.utils.get_team_members import GetTeamMembers
from app.utils.validate_admin import validate_admin_company_admin

deps = Dependencies()

read_deps = [
    Depends(deps.authorized),
    Depends(deps.company_active),
    Depends(deps.company_context),
    Depends(deps.feature_access(FEATURE.CRM)),
    Depends(deps.permissions(["client:read", "lead:read", "deal:read"])),
]

write_deps = [
    Depends(deps.authorized),
    Depends(deps.company_active),
    Depends(deps.company_context),
    Depends(deps.feature_access(FEATURE.CRM)),
    Depends(deps.permissions(["client:read", "lead:create", "lead:update", "deal:create", "deal:update"])),
]

organization_router = APIRouter(dependencies=read_deps)
person_router = APIRouter(dependencies=read_deps)


def _oid(value: str, label: str = "id") -> PydanticObjectId:
    if not ObjectId.is_valid(value):
        raise AppException(400, f"Invalid {label}")
    return PydanticObjectId(value)


async def _accessible_lead_scope(user: dict) -> Optional[dict]:
    if validate_admin_company_admin(user.get("userRole", [])):
        return None
    is_manager = await GetTeamMembers().validate_manager(user["_id"])
    if is_manager:
        members = await GetTeamMembers().get_team_members(user["_id"])
        member_oids = [PydanticObjectId(m) for m in members] if members else [PydanticObjectId(user["_id"])]
        return {
            "$or": [
                {"createdBy.$id": {"$in": member_oids}},
                {"assignedTo.$id": {"$in": member_oids}},
            ]
        }
    uid = PydanticObjectId(user["_id"])
    return {
        "$or": [
            {"createdBy.$id": uid},
            {"assignedTo.$id": uid},
        ]
    }


async def _accessible_deal_scope(user: dict) -> Optional[dict]:
    if validate_admin_company_admin(user.get("userRole", [])):
        return None
    members = await GetTeamMembers().get_team_members(user["_id"])
    if members:
        member_oids = [PydanticObjectId(m) for m in members]
        return {
            "$or": [
                {"createdBy.$id": {"$in": member_oids}},
                {"assignedTo.$id": {"$in": member_oids}},
            ]
        }
    uid = PydanticObjectId(user["_id"])
    return {
        "$or": [
            {"createdBy.$id": uid},
            {"assignedTo.$id": uid},
        ]
    }


def _serialize_related_lead(lead: LeadsModel) -> dict:
    return {
        "id": str(lead.id),
        "lead_id": lead.lead_id,
        "fullName": lead.fullName,
        "email": decrypt_safe(lead.email),
        "phone": decrypt_safe(lead.phone),
        "status": lead.status,
        "source": lead.source,
        "priority": lead.priority.value if hasattr(lead.priority, "value") else lead.priority,
        "inDeal": lead.inDeal,
        "personId": str(lead.personId) if lead.personId else None,
        "organizationId": str(lead.organizationId) if lead.organizationId else None,
        "createdAt": lead.createdAt.isoformat() if lead.createdAt else None,
    }


def _serialize_related_deal(deal: DealModel) -> dict:
    return {
        "id": str(deal.id),
        "deal_id": deal.deal_id,
        "dealName": deal.dealName,
        "dealStage": deal.dealStage,
        "dealPipeline": deal.dealPipeline,
        "amount": deal.amount,
        "closeDate": deal.closeDate.isoformat() if deal.closeDate else None,
        "personId": str(deal.personId) if deal.personId else None,
        "organizationId": str(deal.organizationId) if deal.organizationId else None,
        "createdAt": deal.createdAt.isoformat() if deal.createdAt else None,
    }


# ─── Organizations CRUD ───────────────────────────────────────────────────────


@organization_router.get("/all")
async def list_organizations(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
):
    if page == 1 and not search and not industry and not country:
        org_count = await OrganizationModel.find({"deletedAt": None}).count()
        if org_count == 0:
            lead_count = await LeadsModel.find(
                {"deletedAt": None, "status": {"$ne": "delete"}}
            ).count()
            if lead_count > 0:
                await CommercialRelationshipService().sync_company_records(
                    request.state.user["_id"]
                )

    query: dict = {"deletedAt": None}
    if search and search.strip():
        pattern = re.escape(search.strip())
        query["$or"] = [
            {"name": {"$regex": pattern, "$options": "i"}},
            {"cnpj": {"$regex": pattern, "$options": "i"}},
            {"industry": {"$regex": pattern, "$options": "i"}},
            {"city": {"$regex": pattern, "$options": "i"}},
            {"country": {"$regex": pattern, "$options": "i"}},
            {"website": {"$regex": pattern, "$options": "i"}},
        ]
    if industry and industry.strip():
        query["industry"] = {"$regex": f"^{re.escape(industry.strip())}$", "$options": "i"}
    if country and country.strip():
        query["country"] = {"$regex": f"^{re.escape(country.strip())}$", "$options": "i"}

    total = await OrganizationModel.find(query).count()
    total_pages = max(1, (total + limit - 1) // limit)
    orgs = (
        await OrganizationModel.find(query)
        .sort([("updatedAt", -1), ("_id", -1)])
        .skip((page - 1) * limit)
        .limit(limit)
        .to_list()
    )

    org_ids = [org.id for org in orgs]
    people_counts: dict[str, int] = {}
    lead_counts: dict[str, int] = {}
    deal_counts: dict[str, int] = {}
    deal_values: dict[str, float] = {}

    if org_ids:
        people_rows = await PersonModel.get_pymongo_collection().aggregate([
            {"$match": PersonModel._inject_scope({"organizationId": {"$in": org_ids}, "deletedAt": None})},
            {"$group": {"_id": "$organizationId", "count": {"$sum": 1}}},
        ]).to_list(length=None)
        people_counts = {str(r["_id"]): r["count"] for r in people_rows}

        lead_rows = await LeadsModel.get_pymongo_collection().aggregate([
            {"$match": LeadsModel._inject_scope({"organizationId": {"$in": org_ids}, "deletedAt": None, "status": {"$ne": "delete"}})},
            {"$group": {"_id": "$organizationId", "count": {"$sum": 1}}},
        ]).to_list(length=None)
        lead_counts = {str(r["_id"]): r["count"] for r in lead_rows}

        deal_rows = await DealModel.get_pymongo_collection().aggregate([
            {"$match": DealModel._inject_scope({"organizationId": {"$in": org_ids}, "deletedAt": None, "status": {"$ne": "delete"}})},
            {"$group": {"_id": "$organizationId", "count": {"$sum": 1}, "totalAmount": {"$sum": {"$ifNull": ["$amount", 0]}}}},
        ]).to_list(length=None)
        deal_counts = {str(r["_id"]): r["count"] for r in deal_rows}
        deal_values = {str(r["_id"]): r["totalAmount"] for r in deal_rows}

    total_orgs_all = await OrganizationModel.find({"deletedAt": None}).count()
    total_people_all = await PersonModel.find({"deletedAt": None}).count()
    linked_leads_all = await LeadsModel.find(
        {"deletedAt": None, "status": {"$ne": "delete"}, "organizationId": {"$ne": None}}
    ).count()
    linked_deals_all = await DealModel.find(
        {"deletedAt": None, "status": {"$ne": "delete"}, "organizationId": {"$ne": None}}
    ).count()

    items = []
    for org in orgs:
        oid_str = str(org.id)
        item = serialize_organization(org)
        item["peopleCount"] = people_counts.get(oid_str, 0)
        item["leadsCount"] = lead_counts.get(oid_str, 0)
        item["dealsCount"] = deal_counts.get(oid_str, 0)
        item["totalDealAmount"] = deal_values.get(oid_str, 0)
        items.append(item)

    return successResponse(
        200,
        "Organizations fetched successfully",
        {
            "data": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
                "hasNextPage": page < total_pages,
                "hasPrevPage": page > 1,
            },
            "summary": {
                "totalOrganizations": total_orgs_all,
                "totalPeople": total_people_all,
                "linkedLeads": linked_leads_all,
                "linkedDeals": linked_deals_all,
            },
        },
    )


@organization_router.post("/sync", dependencies=write_deps)
async def sync_organizations(request: Request):
    result = await CommercialRelationshipService().sync_company_records(
        request.state.user["_id"]
    )
    return successResponse(200, "Organizations and contacts synced from leads and deals", result)


@organization_router.post("/create", status_code=201, dependencies=write_deps)
async def create_organization(request: Request, payload: OrganizationCreateSchema):
    data = payload.model_dump()
    normalized = " ".join(data["name"].lower().split())
    now = datetime.now(timezone.utc)
    creator_oid = PydanticObjectId(request.state.user["_id"])

    existing = await OrganizationModel.find_one({"normalizedName": normalized})
    if existing:
        if existing.deletedAt is None:
            raise AppException(409, "A company with this name already exists")
        existing.deletedAt = None
        existing.name = data["name"]
        existing.cnpj = data.get("cnpj")
        existing.industry = data.get("industry")
        existing.size = data.get("size")
        existing.email = encrypt_safe(data.get("email"))
        existing.phone = encrypt_safe(data.get("phone"))
        existing.website = data.get("website")
        existing.city = data.get("city")
        existing.country = data.get("country")
        existing.address = data.get("address")
        existing.notes = data.get("notes")
        existing.updatedAt = now
        await existing.save()
        return successResponse(201, "Company created successfully", serialize_organization(existing))

    org = OrganizationModel(
        name=data["name"],
        normalizedName=normalized,
        cnpj=data.get("cnpj"),
        industry=data.get("industry"),
        size=data.get("size"),
        email=encrypt_safe(data.get("email")),
        phone=encrypt_safe(data.get("phone")),
        website=data.get("website"),
        city=data.get("city"),
        country=data.get("country"),
        address=data.get("address"),
        notes=data.get("notes"),
        createdById=creator_oid,
        createdAt=now,
        updatedAt=now,
    )
    await org.insert()
    return successResponse(201, "Company created successfully", serialize_organization(org))


@organization_router.get("/{organization_id}")
async def organization_detail(request: Request, organization_id: str):
    org_oid = _oid(organization_id, "organization id")
    organization = await OrganizationModel.find_one({"_id": org_oid, "deletedAt": None})
    if not organization:
        raise AppException(404, "Organization not found")

    people = (
        await PersonModel.find({"organizationId": org_oid, "deletedAt": None})
        .sort([("createdAt", -1)])
        .to_list()
    )

    lead_query: dict = {
        "organizationId": org_oid,
        "deletedAt": None,
        "status": {"$ne": "delete"},
    }
    lead_scope = await _accessible_lead_scope(request.state.user)
    if lead_scope:
        lead_query.update(lead_scope)
    leads = await LeadsModel.find(lead_query).sort([("createdAt", -1)]).to_list()

    deal_query: dict = {
        "organizationId": org_oid,
        "deletedAt": None,
        "status": {"$ne": "delete"},
    }
    deal_scope = await _accessible_deal_scope(request.state.user)
    if deal_scope:
        deal_query.update(deal_scope)
    deals = await DealModel.find(deal_query).sort([("createdAt", -1)]).to_list()

    return successResponse(
        200,
        "Organization fetched successfully",
        {
            "organization": serialize_organization(organization),
            "people": [serialize_person(p, organization) for p in people],
            "leads": [_serialize_related_lead(l) for l in leads],
            "deals": [_serialize_related_deal(d) for d in deals],
        },
    )


@organization_router.put("/update/{organization_id}", dependencies=write_deps)
async def update_organization(
    request: Request,
    organization_id: str,
    payload: OrganizationUpdateSchema,
):
    org_oid = _oid(organization_id, "organization id")
    org = await OrganizationModel.find_one({"_id": org_oid, "deletedAt": None})
    if not org:
        raise AppException(404, "Organization not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise AppException(400, "No fields provided to update")

    name_changed = False
    if "name" in updates and updates["name"]:
        normalized = " ".join(updates["name"].lower().split())
        conflict = await OrganizationModel.find_one(
            {"normalizedName": normalized, "_id": {"$ne": org_oid}, "deletedAt": None}
        )
        if conflict:
            raise AppException(409, "Another company with this name already exists")
        name_changed = updates["name"] != org.name
        org.name = updates["name"]
        org.normalizedName = normalized

    for field in ("cnpj", "industry", "size", "website", "city", "country", "address", "notes"):
        if field in updates:
            setattr(org, field, updates[field])

    if "email" in updates:
        org.email = encrypt_safe(updates["email"])
    if "phone" in updates:
        org.phone = encrypt_safe(updates["phone"])

    org.updatedAt = datetime.now(timezone.utc)
    await org.save()

    if name_changed:
        await LeadsModel.get_pymongo_collection().update_many(
            LeadsModel._inject_scope({"organizationId": org_oid, "deletedAt": None}),
            {"$set": {"companyName": org.name}},
        )

    return successResponse(200, "Company updated successfully", serialize_organization(org))


@organization_router.delete("/delete/{organization_id}", dependencies=write_deps)
async def delete_organization(request: Request, organization_id: str):
    org_oid = _oid(organization_id, "organization id")
    org = await OrganizationModel.find_one({"_id": org_oid, "deletedAt": None})
    if not org:
        raise AppException(404, "Organization not found")

    now = datetime.now(timezone.utc)
    org.deletedAt = now
    org.updatedAt = now
    await org.save()

    await PersonModel.get_pymongo_collection().update_many(
        PersonModel._inject_scope({"organizationId": org_oid, "deletedAt": None}),
        {"$set": {"organizationId": None, "updatedAt": now}},
    )
    await LeadsModel.get_pymongo_collection().update_many(
        LeadsModel._inject_scope({"organizationId": org_oid}),
        {"$set": {"organizationId": None}},
    )
    await DealModel.get_pymongo_collection().update_many(
        DealModel._inject_scope({"organizationId": org_oid}),
        {"$set": {"organizationId": None}},
    )

    return successResponse(200, "Company deleted successfully", {"id": organization_id})


# ─── People (Contacts) CRUD ───────────────────────────────────────────────────


@person_router.get("/all")
async def list_people(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    organizationId: Optional[str] = Query(None),
):
    query: dict = {"deletedAt": None}
    if organizationId and organizationId.strip():
        query["organizationId"] = _oid(organizationId.strip(), "organization id")

    search_term = search.strip().lower() if search and search.strip() else ""

    if not search_term:
        total = await PersonModel.find(query).count()
        total_pages = max(1, (total + limit - 1) // limit)
        people = (
            await PersonModel.find(query)
            .sort([("updatedAt", -1), ("_id", -1)])
            .skip((page - 1) * limit)
            .limit(limit)
            .to_list()
        )
    else:
        all_people = (
            await PersonModel.find(query)
            .sort([("updatedAt", -1), ("_id", -1)])
            .to_list()
        )
        org_oids_all = list({p.organizationId for p in all_people if p.organizationId})
        orgs_all = (
            await OrganizationModel.find({"_id": {"$in": org_oids_all}, "deletedAt": None}).to_list()
            if org_oids_all
            else []
        )
        org_map_all = {str(o.id): o for o in orgs_all}

        matched = []
        for person in all_people:
            org_obj = org_map_all.get(str(person.organizationId)) if person.organizationId else None
            haystack = " ".join(
                filter(
                    None,
                    [
                        person.fullName,
                        person.title,
                        decrypt_safe(person.email),
                        decrypt_safe(person.phone),
                        person.linkedin,
                        person.city,
                        person.country,
                        org_obj.name if org_obj else None,
                    ],
                )
            ).lower()
            if search_term in haystack:
                matched.append(person)

        total = len(matched)
        total_pages = max(1, (total + limit - 1) // limit)
        start = (page - 1) * limit
        people = matched[start : start + limit]

    org_oids = list({p.organizationId for p in people if p.organizationId})
    orgs = (
        await OrganizationModel.find({"_id": {"$in": org_oids}, "deletedAt": None}).to_list()
        if org_oids
        else []
    )
    org_map = {str(o.id): o for o in orgs}

    person_ids = [p.id for p in people]
    lead_counts: dict[str, int] = {}
    deal_counts: dict[str, int] = {}

    if person_ids:
        lead_rows = await LeadsModel.get_pymongo_collection().aggregate([
            {"$match": LeadsModel._inject_scope({"personId": {"$in": person_ids}, "deletedAt": None, "status": {"$ne": "delete"}})},
            {"$group": {"_id": "$personId", "count": {"$sum": 1}}},
        ]).to_list(length=None)
        lead_counts = {str(r["_id"]): r["count"] for r in lead_rows}

        deal_rows = await DealModel.get_pymongo_collection().aggregate([
            {"$match": DealModel._inject_scope({"personId": {"$in": person_ids}, "deletedAt": None, "status": {"$ne": "delete"}})},
            {"$group": {"_id": "$personId", "count": {"$sum": 1}}},
        ]).to_list(length=None)
        deal_counts = {str(r["_id"]): r["count"] for r in deal_rows}

    items = []
    for person in people:
        org = org_map.get(str(person.organizationId)) if person.organizationId else None
        item = serialize_person(person, org)
        item["organization"] = (
            {"id": str(org.id), "name": org.name, "cnpj": org.cnpj, "industry": org.industry}
            if org
            else None
        )
        item["leadsCount"] = lead_counts.get(str(person.id), 0)
        item["dealsCount"] = deal_counts.get(str(person.id), 0)
        items.append(item)

    return successResponse(
        200,
        "Contacts fetched successfully",
        {
            "data": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
                "hasNextPage": page < total_pages,
                "hasPrevPage": page > 1,
            },
        },
    )


@person_router.post("/create", status_code=201, dependencies=write_deps)
async def create_person(request: Request, payload: PersonCreateSchema):
    data = payload.model_dump()
    org_oid = None
    org = None
    if data.get("organizationId"):
        org_oid = _oid(data["organizationId"], "organization id")
        org = await OrganizationModel.find_one({"_id": org_oid, "deletedAt": None})
        if not org:
            raise AppException(404, "Selected company not found")

    email_plain = data.get("email").lower() if data.get("email") else None
    phone_plain = data.get("phone")
    email_hash = hash_value(email_plain) if email_plain else None
    phone_hash = hash_value(phone_plain) if phone_plain else None

    dup_filters = []
    if email_hash:
        dup_filters.append({"hashedEmail": email_hash})
    if phone_hash:
        dup_filters.append({"hashedPhone": phone_hash})
    if dup_filters:
        existing = await PersonModel.find_one({"$or": dup_filters, "deletedAt": None})
        if existing:
            raise AppException(409, "A contact with this email or phone already exists")

    now = datetime.now(timezone.utc)
    person = PersonModel(
        fullName=data["fullName"],
        organizationId=org_oid,
        title=data.get("title"),
        email=encrypt_safe(email_plain) if email_plain else None,
        phone=encrypt_safe(phone_plain) if phone_plain else None,
        hashedEmail=email_hash,
        hashedPhone=phone_hash,
        linkedin=data.get("linkedin"),
        city=data.get("city"),
        country=data.get("country"),
        notes=data.get("notes"),
        createdById=PydanticObjectId(request.state.user["_id"]),
        createdAt=now,
        updatedAt=now,
    )
    await person.insert()
    return successResponse(201, "Contact created successfully", serialize_person(person, org))


@person_router.get("/{person_id}")
async def person_detail(request: Request, person_id: str):
    person_oid = _oid(person_id, "person id")
    person = await PersonModel.find_one({"_id": person_oid, "deletedAt": None})
    if not person:
        raise AppException(404, "Contact not found")

    org = (
        await OrganizationModel.find_one({"_id": person.organizationId, "deletedAt": None})
        if person.organizationId
        else None
    )

    lead_query: dict = {
        "personId": person_oid,
        "deletedAt": None,
        "status": {"$ne": "delete"},
    }
    lead_scope = await _accessible_lead_scope(request.state.user)
    if lead_scope:
        lead_query.update(lead_scope)
    leads = await LeadsModel.find(lead_query).sort([("createdAt", -1)]).to_list()

    deal_query: dict = {
        "personId": person_oid,
        "deletedAt": None,
        "status": {"$ne": "delete"},
    }
    deal_scope = await _accessible_deal_scope(request.state.user)
    if deal_scope:
        deal_query.update(deal_scope)
    deals = await DealModel.find(deal_query).sort([("createdAt", -1)]).to_list()

    return successResponse(
        200,
        "Contact fetched successfully",
        {
            "person": serialize_person(person, org),
            "organization": serialize_organization(org),
            "leads": [_serialize_related_lead(l) for l in leads],
            "deals": [_serialize_related_deal(d) for d in deals],
        },
    )


@person_router.put("/update/{person_id}", dependencies=write_deps)
async def update_person(request: Request, person_id: str, payload: PersonUpdateSchema):
    person_oid = _oid(person_id, "person id")
    person = await PersonModel.find_one({"_id": person_oid, "deletedAt": None})
    if not person:
        raise AppException(404, "Contact not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise AppException(400, "No fields provided to update")

    if "organizationId" in updates:
        if updates["organizationId"]:
            org_oid = _oid(updates["organizationId"], "organization id")
            org = await OrganizationModel.find_one({"_id": org_oid, "deletedAt": None})
            if not org:
                raise AppException(404, "Selected company not found")
            person.organizationId = org_oid
        else:
            person.organizationId = None

    new_email = updates["email"].lower() if updates.get("email") else None
    new_phone = updates.get("phone")
    dup_filters = []
    if "email" in updates and new_email:
        dup_filters.append({"hashedEmail": hash_value(new_email)})
    if "phone" in updates and new_phone:
        dup_filters.append({"hashedPhone": hash_value(new_phone)})
    if dup_filters:
        conflict = await PersonModel.find_one(
            {"$or": dup_filters, "_id": {"$ne": person_oid}, "deletedAt": None}
        )
        if conflict:
            raise AppException(409, "Another contact already uses this email or phone")

    if "fullName" in updates and updates["fullName"]:
        person.fullName = updates["fullName"]
    for field in ("title", "linkedin", "city", "country", "notes"):
        if field in updates:
            setattr(person, field, updates[field])
    if "email" in updates:
        person.email = encrypt_safe(new_email) if new_email else None
        person.hashedEmail = hash_value(new_email) if new_email else None
    if "phone" in updates:
        person.phone = encrypt_safe(new_phone) if new_phone else None
        person.hashedPhone = hash_value(new_phone) if new_phone else None

    person.updatedAt = datetime.now(timezone.utc)
    await person.save()

    org = (
        await OrganizationModel.find_one({"_id": person.organizationId, "deletedAt": None})
        if person.organizationId
        else None
    )
    return successResponse(200, "Contact updated successfully", serialize_person(person, org))


@person_router.delete("/delete/{person_id}", dependencies=write_deps)
async def delete_person(request: Request, person_id: str):
    person_oid = _oid(person_id, "person id")
    person = await PersonModel.find_one({"_id": person_oid, "deletedAt": None})
    if not person:
        raise AppException(404, "Contact not found")

    now = datetime.now(timezone.utc)
    person.deletedAt = now
    person.updatedAt = now
    await person.save()

    await LeadsModel.get_pymongo_collection().update_many(
        LeadsModel._inject_scope({"personId": person_oid}),
        {"$set": {"personId": None}},
    )
    await DealModel.get_pymongo_collection().update_many(
        DealModel._inject_scope({"personId": person_oid}),
        {"$set": {"personId": None}},
    )

    return successResponse(200, "Contact deleted successfully", {"id": person_id})
