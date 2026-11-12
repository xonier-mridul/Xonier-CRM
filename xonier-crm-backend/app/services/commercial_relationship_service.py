from datetime import datetime, timezone

from beanie import PydanticObjectId

from app.core.security import hash_value
from app.db.models.organization_model import OrganizationModel
from app.db.models.person_model import PersonModel


class CommercialRelationshipService:
    async def ensure_for_lead(self, lead, user_id: str, session=None) -> tuple[object | None, object | None]:
        company_id = PydanticObjectId(lead.companyId) if lead.companyId else None
        organization = None
        if lead.companyName and lead.companyName.strip():
            normalized = " ".join(lead.companyName.lower().split())
            organization = await OrganizationModel.find_one({"normalizedName": normalized})
            if not organization:
                organization = OrganizationModel(
                    companyId=company_id, name=lead.companyName.strip(), normalizedName=normalized,
                    industry=lead.industry, city=lead.city, country=lead.country,
                    createdById=PydanticObjectId(user_id),
                )
                await organization.insert(session=session)

        email_hash = lead.hashedEmail or (hash_value(lead.email.lower()) if lead.email else None)
        phone_hash = lead.hashedPhone or (hash_value(lead.phone) if lead.phone else None)
        person = None
        if lead.fullName and lead.fullName.strip() and (email_hash or phone_hash):
            matches = []
            if email_hash:
                matches.append({"hashedEmail": email_hash})
            if phone_hash:
                matches.append({"hashedPhone": phone_hash})
            person = await PersonModel.find_one({"$or": matches})
            if not person:
                person = PersonModel(
                    companyId=company_id, fullName=lead.fullName.strip(),
                    organizationId=organization.id if organization else None,
                    title=lead.employeeRole, hashedEmail=email_hash, hashedPhone=phone_hash,
                    linkedin=lead.linkedin, createdById=PydanticObjectId(user_id),
                )
                await person.insert(session=session)
            elif organization and not person.organizationId:
                person.organizationId = organization.id
                person.updatedAt = datetime.now(timezone.utc)
                await person.save(session=session)
        return organization, person
