from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.utils.record_visibility import live_deal_filter, live_lead_filter
from app.core.crypto import encryptor
from app.core.security import hash_value
from app.db.models.deal_model import DealModel
from app.db.models.lead_model import LeadsModel
from app.db.models.organization_model import OrganizationModel
from app.db.models.person_model import PersonModel


def decrypt_safe(val: Optional[str]) -> Optional[str]:
    if not val:
        return val
    # Lead updates historically encrypted values in the service and again in
    # the Lead model save hook. Unwrap those legacy nested Fernet values too.
    while isinstance(val, str) and val.startswith("gAAAAA"):
        try:
            val = encryptor.decrypt_data(val)
        except Exception:
            break
    return val


def encrypt_safe(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    if isinstance(val, str) and val.startswith("gAAAAA"):
        return val
    return encryptor.encrypt_data(str(val))


def serialize_organization(org: Optional[OrganizationModel]) -> Optional[dict]:
    if not org:
        return None
    return {
        "id": str(org.id),
        "name": org.name,
        "cnpj": org.cnpj,
        "industry": org.industry,
        "size": org.size,
        "email": decrypt_safe(org.email),
        "phone": decrypt_safe(org.phone),
        "website": org.website,
        "city": org.city,
        "country": org.country,
        "address": org.address,
        "notes": org.notes,
        "createdAt": org.createdAt.isoformat() if org.createdAt else None,
        "updatedAt": org.updatedAt.isoformat() if org.updatedAt else None,
    }


def serialize_person(
    person: Optional[PersonModel],
    org: Optional[OrganizationModel] = None,
) -> Optional[dict]:
    if not person:
        return None
    return {
        "id": str(person.id),
        "fullName": person.fullName,
        "organizationId": str(person.organizationId) if person.organizationId else None,
        "organizationName": org.name if org else None,
        "title": person.title,
        "email": decrypt_safe(person.email),
        "phone": decrypt_safe(person.phone),
        "linkedin": person.linkedin,
        "city": person.city,
        "country": person.country,
        "notes": person.notes,
        "createdAt": person.createdAt.isoformat() if person.createdAt else None,
        "updatedAt": person.updatedAt.isoformat() if person.updatedAt else None,
    }


class CommercialRelationshipService:
    async def ensure_for_lead(
        self,
        lead,
        user_id: str,
        session=None,
        cnpj: Optional[str] = None,
    ) -> tuple[object | None, object | None]:
        company_id = PydanticObjectId(lead.companyId) if getattr(lead, "companyId", None) else None
        creator_oid = PydanticObjectId(user_id) if user_id and PydanticObjectId.is_valid(str(user_id)) else None
        now = datetime.now(timezone.utc)

        organization = None
        existing_org_id = getattr(lead, "organizationId", None)
        if existing_org_id:
            organization = await OrganizationModel.find_one(
                {"_id": PydanticObjectId(existing_org_id), "deletedAt": None},
                session=session,
            )

        if not organization and lead.companyName and lead.companyName.strip():
            normalized = " ".join(lead.companyName.lower().split())
            organization = await OrganizationModel.find_one(
                {"normalizedName": normalized},
                session=session,
            )
            if organization and organization.deletedAt is not None:
                organization.deletedAt = None
                organization.updatedAt = now
                await organization.save(session=session)
            if not organization:
                organization = OrganizationModel(
                    companyId=company_id,
                    name=lead.companyName.strip(),
                    normalizedName=normalized,
                    cnpj=cnpj.strip() if isinstance(cnpj, str) and cnpj.strip() else None,
                    industry=lead.industry,
                    city=lead.city,
                    country=lead.country,
                    createdById=creator_oid,
                )
                await organization.insert(session=session)

        if organization:
            org_dirty = False
            if cnpj and isinstance(cnpj, str) and cnpj.strip() and not organization.cnpj:
                organization.cnpj = cnpj.strip()
                org_dirty = True
            if getattr(lead, "industry", None) and not organization.industry:
                organization.industry = lead.industry
                org_dirty = True
            if getattr(lead, "city", None) and not organization.city:
                organization.city = lead.city
                org_dirty = True
            if getattr(lead, "country", None) and not organization.country:
                organization.country = lead.country
                org_dirty = True
            if org_dirty:
                organization.updatedAt = now
                await organization.save(session=session)

        plain_email = decrypt_safe(getattr(lead, "email", None))
        plain_phone = decrypt_safe(getattr(lead, "phone", None))
        email_hash = getattr(lead, "hashedEmail", None) or (hash_value(plain_email.lower()) if plain_email else None)
        phone_hash = getattr(lead, "hashedPhone", None) or (hash_value(plain_phone) if plain_phone else None)

        person = None
        existing_person_id = getattr(lead, "personId", None)
        if existing_person_id:
            person = await PersonModel.find_one(
                {"_id": PydanticObjectId(existing_person_id), "deletedAt": None},
                session=session,
            )

        if not person and lead.fullName and lead.fullName.strip() and (email_hash or phone_hash):
            matches = []
            if email_hash:
                matches.append({"hashedEmail": email_hash})
            if phone_hash:
                matches.append({"hashedPhone": phone_hash})
            person = await PersonModel.find_one({"$or": matches}, session=session)
            if not person:
                person = PersonModel(
                    companyId=company_id,
                    fullName=lead.fullName.strip(),
                    organizationId=organization.id if organization else None,
                    title=getattr(lead, "employeeRole", None),
                    email=encrypt_safe(plain_email.lower()) if plain_email else None,
                    phone=encrypt_safe(plain_phone) if plain_phone else None,
                    hashedEmail=email_hash,
                    hashedPhone=phone_hash,
                    linkedin=getattr(lead, "linkedin", None),
                    city=getattr(lead, "city", None),
                    country=getattr(lead, "country", None),
                    createdById=creator_oid,
                )
                await person.insert(session=session)

        if person:
            person_dirty = False
            if person.deletedAt is not None:
                person.deletedAt = None
                person_dirty = True
            if organization and not person.organizationId:
                person.organizationId = organization.id
                person_dirty = True
            if plain_email and not person.email:
                person.email = encrypt_safe(plain_email.lower())
                person_dirty = True
            if plain_phone and not person.phone:
                person.phone = encrypt_safe(plain_phone)
                person_dirty = True
            if getattr(lead, "employeeRole", None) and not person.title:
                person.title = lead.employeeRole
                person_dirty = True
            if getattr(lead, "linkedin", None) and not person.linkedin:
                person.linkedin = lead.linkedin
                person_dirty = True
            if getattr(lead, "city", None) and not person.city:
                person.city = lead.city
                person_dirty = True
            if getattr(lead, "country", None) and not person.country:
                person.country = lead.country
                person_dirty = True
            if person_dirty:
                person.updatedAt = now
                await person.save(session=session)

        return organization, person

    async def sync_company_records(self, user_id: str) -> dict:
        leads = await LeadsModel.find(live_lead_filter()).to_list()

        synced_leads = 0
        lead_org_map: dict[str, tuple[Optional[PydanticObjectId], Optional[PydanticObjectId]]] = {}

        for lead in leads:
            org, person = await self.ensure_for_lead(lead, user_id)
            new_org_id = org.id if org else lead.organizationId
            new_person_id = person.id if person else lead.personId
            if new_org_id != lead.organizationId or new_person_id != lead.personId:
                await LeadsModel.get_pymongo_collection().update_one(
                    {"_id": lead.id},
                    {"$set": {"organizationId": new_org_id, "personId": new_person_id}},
                )
                synced_leads += 1
            lead_org_map[str(lead.id)] = (new_org_id, new_person_id)

        deals = await DealModel.find(live_deal_filter()).to_list()

        synced_deals = 0
        for deal in deals:
            if not deal.lead_id:
                continue
            lead_ref = getattr(deal.lead_id, "ref", None)
            lead_oid = lead_ref.id if lead_ref else getattr(deal.lead_id, "id", None)
            if not lead_oid:
                continue
            mapped = lead_org_map.get(str(lead_oid))
            if not mapped:
                linked_lead = await LeadsModel.find_one(live_lead_filter({"_id": lead_oid}))
                if linked_lead:
                    mapped = (linked_lead.organizationId, linked_lead.personId)
            if not mapped:
                continue
            target_org_id, target_person_id = mapped
            updates = {}
            if not deal.organizationId and target_org_id:
                updates["organizationId"] = target_org_id
            if not deal.personId and target_person_id:
                updates["personId"] = target_person_id
            if updates:
                await DealModel.get_pymongo_collection().update_one(
                    {"_id": deal.id},
                    {"$set": updates},
                )
                synced_deals += 1

        return {
            "syncedLeads": synced_leads,
            "syncedDeals": synced_deals,
        }
