# Mobile developer handoff: Campaigns, Leads and Deals

Source review: 30 October 2026, current local checkout. This checkout contains existing uncommitted service changes. This is a source-verified inventory, not a verification of the deployed production version or live account responses. No application code was changed for this handoff.

## Why the company-admin sees fewer records on mobile

- Web calls `GET /api/lead/all`, `GET /api/campaign/all`, and `GET /api/deal/all` (verified in frontend services).
- `GET /api/mobile/leads` always filters global lead `assignedTo.$id` by the logged-in user. It does not switch to company-wide scope for company admins.
- `GET /api/mobile/campaigns` only includes agent membership, manager membership, or campaign-lead assignment to the current user. Company-admin status alone does not include every company campaign. Campaign creator alone is also not included by this mobile query.
- Mobile campaign detail access uses membership or assigned campaign leads; no company-admin bypass exists there.
- Mobile campaign-lead listing unconditionally restricts campaign assignment to the current user or unassigned. `ownership=all` still means only that restricted set; `ownership=other` currently intersects with the restriction and returns no other-owner rows. Company admins are restricted too.
- Shared campaign APIs have explicit admin/company-admin branches; regular users remain scoped. Global lead assignment and campaign-lead assignment are separate fields and must not be treated as interchangeable.
- No dedicated `/api/mobile/deals` endpoint is registered in the inspected routes. Use the shared `/api/deal/*` routes.

These are concrete code-level reasons for different counts. The exact production discrepancy still requires comparing live responses with the same user, backend origin, company, filters and all pages.

## Which list API to use

| Screen / intent | API |
|---|---|
| Company-admin leads matching web Leads | `GET /api/lead/all` with the same filters as web |
| Company-admin campaigns matching web Campaigns | `GET /api/campaign/all` |
| Company-admin campaign lead rows matching web | `GET /api/campaign/{campaign_id}/leads` |
| Deals matching web | `GET /api/deal/all` |
| Agent My Leads | `GET /api/mobile/leads` |
| Agent My Campaigns | `GET /api/mobile/campaigns` |
| Leads created by current user | `GET /api/lead/leads-by-user/all` (not all assigned leads) |
| Campaign pipeline metric drill-down | `GET /api/campaign/pipeline-leads` |

Mobile can call shared APIs using the same authentication; `/api/mobile` is not mandatory for a mobile client. Shared APIs enforce their own permissions and role scopes. If the intended design requires company-wide records through `/api/mobile/*`, backend role-aware changes are required; removing a client filter cannot broaden server scope.

## Authentication and response handling

Use the production backend origin already configured for web/mobile. Every path below includes `/api`; avoid duplicating it if your client base URL already ends in `/api`.

HTTP header: `Authorization: Bearer <access_token>`. JSON writes use `Content-Type: application/json`. HTTP auth also accepts the `accessToken` cookie. Company context is derived by backend authentication/company dependencies, not an arbitrary company ID query argument. Company must be active and feature access enabled.

Shared campaign, lead and deal routes require their module permission in addition to auth/company/CRM checks. Company-admin scope does not automatically bypass the permission dependency; only SUPER_ADMIN has the explicit permission bypass. Mobile data routes use auth/company/CRM checks without module permission dependencies, but constrain the returned records to the user.

Common wrapped response: `{ "success": true, "status_code": 200, "message": "...", "data": ... }`. For wrapped list responses the rows are at JSON `data.data` (Axios: `response.data.data.data`). Metadata is alongside the inner row array. Mobile lists include `page`, `limit`, `total`, `totalPages`; shared list metadata may omit `total`. Do not assume identical object shapes. This is a source-derived description, not a captured live response.

Fetch all pages according to `totalPages`; page length is not the total count. Default limits: mobile lists 20 (maximum 100), shared campaign lists 20, shared lead/deal lists 10.

## List filters and count semantics

| API | Supported query parameters / semantics |
|---|---|
| `/api/lead/all` | `page`, `limit`, `status` (sales), `connectStatus`, `engagementStatus` (alias, overrides connectStatus), `leadid`, `tag`, `name`, `priority`, `source`, `type`, `assignee`, `search`, `fromDate`, `toDate`, `userid` (admin/manager creator filter), `isAssigned` (true adds assigned-only filtering). Default sales statuses: new/contacted/qualified/proposal; won/lost excluded unless explicitly requested. |
| `/api/lead/leads-by-user/all` | `page`, `limit`, `status`, `leadid` (exact), `priority`, `source` (exact), `type` (exact). Current-user creator scope. Do not substitute this for `/lead/all` or My Leads. |
| `/api/lead/all-won` | `page`, `limit`, `leadid`, `priority`, `source`, `type`. Won sales leads; service requires admin/company-admin. |
| `/api/mobile/leads` | `page`, `limit`, `search`, `status` (CONNECT status), `priority`, `source`, `salesStatus`, `campaignId`. Always assigned-to-self. Default excludes delete/deleted, so won/lost can differ from web defaults. `statusCounts` ignores the selected connect-status filter but respects the other base filters. |
| `/api/campaign/all` | `page`, `limit`, `status`, `search`, `sortField` (default createdAt), `sortOrder` (default desc). |
| `/api/campaign/{campaign_id}/leads` | `page`, `limit`, `campaignStatus`. This is campaign workflow status, not global sales or connect status. |
| `/api/campaign/pipeline-leads` | `page`, `limit` (max 100), `filter`, `search`. Filters include all, in_progress, fresh_enquiry, contacted, interested, meetings_scheduled, meetings_done, follow_ups, engaged, meetings, closed_won. Uses unique global leads across campaigns. |
| `/api/mobile/campaigns` | `page`, `limit`, `status`, `search`. Summary strip uses the unfiltered accessible campaign set, so summary need not equal filtered total. |
| `/api/mobile/campaigns/{campaign_id}/leads` | `page`, `limit`, `search`, `status` (CONNECT status), `priority`, `source`, `ownership=all/mine/other/unassigned`. Server restricts to own/unassigned regardless of role; see issue above. |
| `/api/mobile/insights` | `period=today/week/month/quarter` (default month), `tz` (default Asia/Kolkata). User-scoped insights. |
| `/api/deal/all` | `page`, `limit`, `dealId`, `name`, `pipeline`, `stage`, `createdBy`, `assignedTo`, `userid` (admin), `fromDate`, `toDate`. Default active deals. Non-admin listing uses creator/team-creator scope; do not assume assignedTo alone grants list visibility. |

## IDs and status values

Use database ObjectId strings for route placeholders. Mobile `id` is the database ID; `leadId` / `campaignId` on cards can be human-facing codes. `campaignLeadId` identifies the campaign-link record and is different from the global lead ID. Shared response fields may use `id`, `_id`, `lead_id`, or `campaign_id`; map each response explicitly.

- Sales status: new, contacted, qualified, proposal, won, lost, delete.
- Connect status: connected, not_connected, interested, not_interested, not_reached, call_back, wrong_number, meeting_scheduled, meeting_completed, follow_up.
- Campaign status: active, paused, completed, archived, deleted (legacy draft normalizes to active).
- Campaign-lead status: unassigned, assigned, in_progress, completed, skipped.
- Distribution mode: on_demand, equal, conditional.

## Complete core endpoint inventory

Permissions below are route requirements; service-level ownership checks also apply. A dash means no additional module permission dependency at that route, not unauthenticated access.

### Campaigns

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/api/campaign/agents` | Get agent breakdown | user:read, lead:read |
| POST | `/api/campaign/create` | Create campaign | campaign:create |
| GET | `/api/campaign/all` | Get all campaigns | campaign:read |
| GET | `/api/campaign/pipeline-leads` | Get pipeline leads | campaign:read |
| GET | `/api/campaign/get-by-id/{campaign_id}` | Get campaign by id | campaign:read |
| PUT | `/api/campaign/update/{campaign_id}` | Update campaign | campaign:update |
| PATCH | `/api/campaign/update/{campaign_id}/status` | Update campaign status | campaign:update |
| DELETE | `/api/campaign/delete/{campaign_id}` | Delete campaign | campaign:delete |
| POST | `/api/campaign/{campaign_id}/leads/import` | Import leads | campaign:manage |
| GET | `/api/campaign/{campaign_id}/leads` | Get campaign leads | campaign:read |
| PATCH | `/api/campaign/{campaign_id}/leads/{campaign_lead_id}/status` | Update lead status | campaign:manage |
| PATCH | `/api/campaign/{campaign_id}/leads/{campaign_lead_id}/assign` | Assign lead | campaign:manage |
| POST | `/api/campaign/{campaign_id}/distribute/equal` | Distribute equal | campaign:manage |
| POST | `/api/campaign/{campaign_id}/distribute/claim` | Claim next lead | campaign:read |
| POST | `/api/campaign/{campaign_id}/leads/{campaign_lead_id}/claim` | Claim lead | campaign:read |
| GET | `/api/campaign/engagement-stats` | Get engagement stats | campaign:read |

### Leads

| Method | Path | Purpose | Permission |
|---|---|---|---|
| POST | `/api/lead/create` | Create | lead:create |
| POST | `/api/lead/create/bulk` | Bulk create | lead:create |
| PATCH | `/api/lead/assign/bulk` | Bulk lead assign | lead:assign |
| PATCH | `/api/lead/reassign/bulk` | Bulk reassign lead | lead:reassign |
| PATCH | `/api/lead/clear-assign/bulk` | Bulk clear assign | lead:assign |
| GET | `/api/lead/all` | Get all | lead:read |
| GET | `/api/lead/leads-by-user/all` | Leads created by logged-in user | lead:read |
| GET | `/api/lead/all-won` | Won sales leads (admin/company-admin) | lead:read |
| GET | `/api/lead/get-by-id/{id}` | Get by id | lead:read |
| PUT | `/api/lead/update/{id}` | Update | lead:update |
| PATCH | `/api/lead/update/{id}/status` | Update status | lead:update |
| PATCH | `/api/lead/update/{id}/connect-status` | Update connect status | lead:update |
| DELETE | `/api/lead/delete/{id}` | Delete | lead:delete |
| DELETE | `/api/lead/delete/bulk` | Bulk delete | lead:delete |

### Deals

| Method | Path | Purpose | Permission |
|---|---|---|---|
| POST | `/api/deal/create` | Create | deal:create |
| GET | `/api/deal/all` | Get all | deal:read |
| GET | `/api/deal/get-by-id/{id}` | Get by id | deal:read |
| PUT | `/api/deal/update/{id}` | Update | deal:update |
| DELETE | `/api/deal/delete/{id}` | Delete | deal:delete |
| PATCH | `/api/deal/bulk-assign` | Bulk assign | deal:update |

### Mobile data

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/api/mobile/home` | Mobile home | — |
| GET | `/api/mobile/insights` | Mobile insights | — |
| GET | `/api/mobile/leads` | Query: page, limit, search, status (connectStatus), priority, source, salesStatus, campaignId. | — |
| PATCH | `/api/mobile/leads/{lead_id}/status` | Mobile update lead status | — |
| GET | `/api/mobile/campaigns` | Query: page, limit, status, search. | — |
| GET | `/api/mobile/campaigns/{campaign_id}` | Mobile campaign detail | — |
| GET | `/api/mobile/campaigns/{campaign_id}/leads` | Query: page, limit, search, status, priority, source, ownership=all/mine/other/unassigned. | — |
| POST | `/api/mobile/campaigns/{campaign_id}/leads/{campaign_lead_id}/claim` | ON_DEMAND only: take an unassigned lead (it becomes yours). | — |
| POST | `/api/mobile/campaigns/{campaign_id}/claim-next` | ON_DEMAND only: take the next available unassigned lead. | — |

### Calling and mobile realtime

| Method | Path | Purpose | Permission |
|---|---|---|---|
| POST | `/api/call/request` | Ask the logged-in user's mobile app to dial a lead. | lead:read |
| GET | `/api/call/presence` | Is the user's mobile app currently connected? | lead:read |
| GET | `/api/call/lead/{lead_id}/history` | Mobile call events shown in the lead activity timeline. | lead:read |
| GET | `/api/call/session/{session_id}` | Get call session | lead:read |
| POST | `/api/call/session/{session_id}/cancel` | Cancel call session | lead:read |
| POST | `/api/call/session/{session_id}/dispose` | 'Was call connected?' -> connected=true / false. | lead:read |
| GET | `/api/mobile/calls/pending` | Polling fallback: returns the newest call request waiting for this phone (or null). | — |
| POST | `/api/mobile/calls/{session_id}/status` | Mobile reports progress: received -> dialing -> ended (with durationSec) / failed (with reason). | — |
| WEBSOCKET | `/api/mobile/ws` | Realtime channel for the mobile app. | — |

### Activity and call history

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/api/activity/user/{id}` | Get user activity | — |
| GET | `/api/activity/user/{id}/summary` | Get user activity summary | — |
| GET | `/api/activity/lead/{lead_id}/call-history` | Get lead call history | lead:read |
| POST | `/api/activity/call/made` | Call activity | call:call |
| PATCH | `/api/activity/call/{id}/activity-update` | Update call activity | call:call |

### Related lead/deal follow-ups

| Method | Path | Purpose | Permission |
|---|---|---|---|
| PATCH | `/api/follow-up/deal/{record_id}` | Update deal follow up | deal:update |
| GET | `/api/follow-up/count/lead` | Count lead follow ups | lead:read |
| GET | `/api/follow-up/count/deal` | Count deal follow ups | deal:read |

### Related notes

| Method | Path | Purpose | Permission |
|---|---|---|---|
| POST | `/api/note/create` | Create | note:create |
| GET | `/api/note/all/active` | Get all active | note:read |
| GET | `/api/note/all/private` | Get private notes by creator | note:read |
| PATCH | `/api/note/update/pinned/{id}` | Update pinned status | note:update |
| PATCH | `/api/note/soft-delete/{id}` | Soft delete | note:delete |

## Request body quick reference

- Global lead sales status: `{"status":"qualified"}`.
- Global lead connect status: `{"status":"follow_up","followUpIn":"1d"}`. Shared connect-status update forwards the payload; mobile status route currently forwards only `status`, so do not rely on `followUpIn` being applied there.
- Campaign state: `{"status":"paused"}`.
- Campaign-lead workflow state: `{"campaignStatus":"in_progress"}`.
- Campaign assignment: `{"agentId":"<user-object-id>"}`.
- Bulk assign/reassign global leads: `{"userId":"<user-object-id>","leadsId":["<lead-object-id>"]}`.
- Bulk clear assignment / bulk delete: `{"leadsIds":["<lead-object-id>"]}` (different key spelling).
- Bulk global create / campaign import: `{"leads":[{...}],"dataTag":"optional"}`. These accept JSON records, not a multipart file upload.
- Bulk deals assignment: `{"deal_ids":["<deal-object-id>"],"assigned_to":"<user-object-id>"}`.
- Claim and equal distribution routes have no declared request body.
- Call request: `{"leadId":"<global-lead-id>","campaignId":"<optional-campaign-id>","campaignLeadId":"<optional-link-id>"}`.
- Mobile call report: `{"status":"ended","durationSec":42}`; accepted states: received, dialing, ended, failed; optional failure `reason`.
- Call disposal: `{"connected":true}`.
- Deal follow-up: `{"followUpIn":"1h"}` / `6h` / `1d` / ISO datetime / null.

Create/update schemas below are copied from the inspected source for exact field names and validators. In particular, lead update and deal update are not simple arbitrary partial patches: their schemas have required fields. The frontend defines `PATCH /api/deal/update/{id}/stage`, but no matching backend route is registered in the inspected deal router. Use the implemented PUT update with the required deal payload, or implement the missing route separately.

Potential route issue: `/api/lead/delete/{id}` is declared before `/api/lead/delete/bulk` with the same DELETE method. The dynamic route may capture `bulk`; verify/correct registration order before using bulk delete. It is listed because it exists in source, not because successful runtime execution was verified.

## Comparison requests for the mobile developer

Use the SAME company-admin access token and backend origin. Compare response metadata and every page, with no saved search/assignee/campaign filters:

```http
GET /api/lead/all?page=1&limit=20
GET /api/mobile/leads?page=1&limit=20
GET /api/campaign/all?page=1&limit=20
GET /api/mobile/campaigns?page=1&limit=20
GET /api/campaign/<campaign-id>/leads?page=1&limit=20
GET /api/mobile/campaigns/<campaign-id>/leads?page=1&limit=20&ownership=all
GET /api/deal/all?page=1&limit=20
```

Record the method/path, query, HTTP status, totalPages/total and returned IDs; redact tokens and personal lead data. Match sales-status defaults before comparing global lead counts. Compare list counts with list counts: mobile home, campaign summaries and pipeline metrics have different scopes/counting rules.

## Source references

- Backend registration: `xonier-crm-backend/app/main.py`.
- Route/permission definitions: `xonier-crm-backend/app/routes/` files named in this inventory.
- Role/filter behavior: `app/services/mobile_service.py`, `lead_service.py`, `campaign_service.py`, `deal_service.py`.
- Frontend calls: `xonier-crm-frontend/src/services/campaign.service.ts`, `lead.service.ts`, `deal.service.ts`.
- Auth/company scope: `app/core/dependencies.py`; wrapper: `app/utils/custom_response.py`.

## Schema appendix (source, not live OpenAPI)

### lead_schema.py

```python
from pydantic import BaseModel, field_validator, Field, EmailStr, model_validator
from typing import Optional, List
import phonenumbers
from app.core.enums import (
    PROJECT_TYPES,
    SALES_STATUS,
    PRIORITY,
    SOURCE,
    LANGUAGE_CODE,
    COUNTRY_CODE,
    INDUSTRIES,
    EMPLOYEE_SENIORITY, CONTACT_STATUS, MEETING_SCHEDULED
)
from app.utils.custom_exception import AppException
from datetime import datetime

class LeadBaseSchema(BaseModel):
    fullName: str
    email: EmailStr
    phone: Optional[str] = None

    priority: Optional[PRIORITY] = PRIORITY.MEDIUM.value
    source: Optional[str] = SOURCE.OTHER.value 
    projectType:Optional[str] = None

    companyName: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postalCode: Optional[int] = None
    language: Optional[LANGUAGE_CODE] = None
    dataTag: Optional[str] = None

    #meeting
    meetingScheduled: MEETING_SCHEDULED = MEETING_SCHEDULED.NO.value
    meetingTitle: Optional[str] = None
    meetingDescription: Optional[str] = None
    meetingStart: Optional[datetime] = None
    meetingEnd: Optional[datetime] = None
    meetingLink: Optional[str] = None
    meetingPriority: Optional[PRIORITY] = None

    industry: Optional[str] = None
    employeeRole: Optional[str] = None
    employeeSeniority: Optional[EMPLOYEE_SENIORITY] = None
    extraFields: Optional[dict[str, str | int | float | bool | None]] = Field(default=None)
    message: Optional[str] = None
    membershipNotes: Optional[str] = None

    @field_validator("fullName", mode="before")
    @classmethod
    def name_min_length(cls, v: Optional[str]):
        if v and len(v.strip()) < 1:
            raise AppException(422, "Full name must be at least 1 characters long")
        return v

    # @field_validator("phone")
    # @classmethod
    # def validate_phone(cls, v: Optional[str]):
    #     if not v:
    #         return v
    #     try:
    #         phone_number = phonenumbers.parse(v, None)
    #         if not phonenumbers.is_valid_number(phone_number):
    #             raise AppException(422, "Invalid phone number format. Use country code, e.g. +919876543210")
    #     except Exception:
    #         raise AppException(422,
    #             "Invalid phone number format. Use country code, e.g. +919876543210"
    #         )
    #     return v
    
    @field_validator("postalCode")
    @classmethod
    def validate_zip(cls, v):
        if not v:
            return v
        
        if (v < 1000) or (v > 999999):
            raise AppException(422, "Postal code must be between 4 and 6 digits (e.g., 1234–123456)")
        
        return v

    @model_validator(mode="before")
    @classmethod
    def validate_meeting(cls, value):
            priority = value.get("priority")
            valid_priorities = [p.value for p in PRIORITY]
            if not priority or priority not in valid_priorities:
                raise AppException(422, "Priority should be low, medium or high")
            isMeetingScheduled = value.get("meetingScheduled")
    
            if isMeetingScheduled != MEETING_SCHEDULED.YES.value:
                return value
    
            meetingTitle = value.get("meetingTitle")
            meetingDescription = value.get("meetingDescription")
            meetingStart = value.get("meetingStart")
            meetingEnd = value.get("meetingEnd")
            meetingLink = value.get("meetingLink")
            meetingPriority = value.get("meetingPriority")
    
            if not meetingTitle or not meetingStart or not meetingEnd or not meetingLink or not meetingPriority:
                raise AppException(422, f"{'Meeting Title' if not meetingTitle else 'Meeting Start Date' if not meetingStart else "Meeting End Date" if not meetingEnd else "Meeting Link" if not meetingLink else "Meeting Priority" if not meetingPriority else "unknown"} field is required" )
    
            return value


class LeadsCreateSchema(LeadBaseSchema):
    fullName: str
    email: EmailStr
    phone: Optional[str] = None

    priority: Optional[PRIORITY] = PRIORITY.MEDIUM.value
    source: Optional[str] = SOURCE.OTHER.value
    projectType:Optional[str] = None
    dataTag: Optional[str] = None

    companyName: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] =None
    postalCode: Optional[int] = Field(None, ge=1000, le=999999)
    language: Optional[LANGUAGE_CODE] =None

    industry: Optional[str] = None
    employeeRole: Optional[str] = None
    employeeSeniority: Optional[EMPLOYEE_SENIORITY] = None
    extraFields: Optional[dict[str, str | int | float | bool | None]] = Field(default=None)

    message: Optional[str] = None
    membershipNotes: Optional[str] = None

    # @model_validator(mode="before")
    # @classmethod
    # def validate_fields(cls, value):
    #     sourcef = value.get("source")

    #     if not sourcef:
    #         raise AppException(422, "source field must required")
        
    #     return value


class CreateBulkLeadSchema(BaseModel):
    
    leads: List[LeadsCreateSchema]
    dataTag: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def data_tag_lowercase(cls, value):
        tag = value.get("dataTag")
        
        if tag:
            value["dataTag"] = tag.strip().lower()

        return value


class BulkAssignLeadSchema(BaseModel):
    userId: str
    leadsId: List[str] 

    
class LeadUpdateSchema(LeadBaseSchema):
    status: Optional[SALES_STATUS] = None

class LeadStatusUpdateSchema(BaseModel):
    status: SALES_STATUS

class LeadConnectStatusUpdateSchema(BaseModel):
    status: CONTACT_STATUS
    # Mobile and web clients send the same presets (1h, 6h, 1d) or an ISO datetime.
    followUpIn: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        try:
            return CONTACT_STATUS(v)
        except ValueError:
            raise AppException(
                422,
                "Invalid status. Use: connected, not_connected, interested, not_interested, not_reached"
            )


class BulkReassignLeadSchema(BaseModel):
    userId: str
    leadsId: List[str]

    @field_validator("userId")
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("userId cannot be empty")
        return v.strip()

    @field_validator("leadsId")
    @classmethod
    def validate_leads_id(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("leadsId cannot be empty")
        return v
    
class BulkDeleteSchema(BaseModel):
    leadsIds: List[str]

    @field_validator("leadsIds")
    @classmethod
    def validate_leads_id(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("leadsIda cannot be empty")
        return v
    

class BulkClearAssignSchema(BaseModel):
    leadsIds: List[str]

    @field_validator("leadsIds")
    @classmethod
    def validate_leads_id(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("leadsIda cannot be empty")
        return v


```

### campaign_schema.py

```python
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from app.core.enums import (
    CAMPAIGN_DISTRIBUTION_MODE,
    CAMPAIGN_STATUS,
    CAMPAIGN_LEAD_STATUS,
)
from app.utils.custom_exception import AppException


# ─── Campaign CRUD ────────────────────────────────────────────────────────────

class CampaignCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=500)
    managers: List[str] = Field(default_factory=list)       # list of user ObjectId strings
    agents: List[str] = Field(default_factory=list)         # list of user ObjectId strings
    distributionMode: CAMPAIGN_DISTRIBUTION_MODE = CAMPAIGN_DISTRIBUTION_MODE.ON_DEMAND
    distributionConfig: Optional[Dict[str, Any]] = None
    status: CAMPAIGN_STATUS = CAMPAIGN_STATUS.ACTIVE

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise AppException(422, "Campaign name must be a string")
        v = v.strip()
        if not v:
            raise AppException(422, "Campaign name cannot be empty")
        return v

    @model_validator(mode="before")
    @classmethod
    def validate_conditional_config(cls, values):
        mode = values.get("distributionMode")
        config = values.get("distributionConfig")
        if mode == CAMPAIGN_DISTRIBUTION_MODE.CONDITIONAL and not config:
            raise AppException(
                422,
                "distributionConfig is required when distributionMode is 'conditional'"
            )
        return values


class CampaignUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=500)
    managers: Optional[List[str]] = None
    agents: Optional[List[str]] = None
    distributionMode: Optional[CAMPAIGN_DISTRIBUTION_MODE] = None
    distributionConfig: Optional[Dict[str, Any]] = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if not v:
            raise AppException(422, "Campaign name cannot be empty")
        return v


class CampaignStatusUpdateSchema(BaseModel):
    status: CAMPAIGN_STATUS

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        try:
            return CAMPAIGN_STATUS(v)
        except ValueError:
            valid = [s.value for s in CAMPAIGN_STATUS]
            raise AppException(422, f"Invalid status. Valid values: {valid}")


# ─── Campaign Lead Operations ─────────────────────────────────────────────────

class CampaignLeadImportSchema(BaseModel):
    """
    Payload for importing leads into a campaign via CSV/XLSX upload.
    Reuses existing LeadsCreateSchema for individual lead validation.
    """
    leads: List[Dict[str, Any]]   # raw lead dicts — validated in service layer
    dataTag: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalise_tag(cls, values):
        tag = values.get("dataTag")
        if tag:
            values["dataTag"] = str(tag).strip().lower()
        return values

    @field_validator("leads", mode="before")
    @classmethod
    def leads_not_empty(cls, v):
        if not v:
            raise AppException(400, "leads array cannot be empty")
        return v


class CampaignLeadStatusUpdateSchema(BaseModel):
    campaignStatus: CAMPAIGN_LEAD_STATUS

    @field_validator("campaignStatus", mode="before")
    @classmethod
    def validate_campaign_status(cls, v):
        try:
            return CAMPAIGN_LEAD_STATUS(v)
        except ValueError:
            valid = [s.value for s in CAMPAIGN_LEAD_STATUS]
            raise AppException(422, f"Invalid campaignStatus. Valid values: {valid}")


class CampaignLeadAssignSchema(BaseModel):
    agentId: str = Field(..., min_length=1)

    @field_validator("agentId", mode="before")
    @classmethod
    def strip_agent_id(cls, v: str) -> str:
        v = str(v).strip()
        if not v:
            raise AppException(422, "agentId cannot be empty")
        return v

```

### deal_schema.py

```python

from pydantic import BaseModel, Field, field_validator
from app.core.enums import DEAL_PIPELINE, DEAL_STAGES, DEAL_TYPE, FORECAST_CATEGORY, DEAL_STATUS
from typing import Optional, Dict, Any
from datetime import datetime
from app.utils.custom_exception import AppException

class DealSchema(BaseModel):
    lead_id : Optional[str] = None
    dealName : str 
    # dealPipeline: DEAL_PIPELINE
    dealStage: DEAL_STAGES
    dealOwner: Optional[str]
    dealType: DEAL_TYPE
    createDate: datetime
    closeDate: Optional[datetime] = None
    amount: int = Field(gt=0)
    dealCollaborator: Optional[str] = None
    dealDescription: Optional[str] = None
    extraFields: Dict[str, Any] = Field(default_factory=dict)
    dealProbability: Optional[int] = Field(None,gt=0, lt=100) 
    forecastProbability: Optional[int] = Field(None, gt=0, lt=100)
    nextStep: Optional[str] = None
    forecastCategory: Optional[FORECAST_CATEGORY] = None
    closedWonReason: Optional[str] = None
    closedLostReason: Optional[str] = None
    originalTrafficSource: Optional[str] = None


    @field_validator("dealName", mode="before")
    @classmethod
    def validate_deal_name(cls, value):
        if not isinstance(value, str):
            raise AppException(422, "Deal name must be a string")

        value = value.strip()

        if not value:
            raise AppException(422, "Deal name cannot be empty")

        if len(value) < 4:
            raise AppException(422 ,"Deal name must be at least 4 characters long")

        return value
    
    
    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, value):
        if not value:
            raise AppException(400, "Amount field must required or greater then 0")
        
        if value <= 0:
            raise AppException(400, "Amount must be greater then 0")
        
        return value


    
    @field_validator("dealProbability", "forecastProbability", mode="before")
    @classmethod
    def validate_percentage(cls, v):
        if v is None:
            return v
        if not 0 <= v <= 100:
            raise AppException(422, "Probabilities must be between 0 and 100")
        return v
    
class DealUpdateSchema(BaseModel):
    dealName : str 
    # dealPipeline: DEAL_PIPELINE
    dealStage: DEAL_STAGES
    dealOwner: Optional[str]
    dealType: DEAL_TYPE
    createDate: datetime
    closeDate: Optional[datetime] = None
    amount: int 
    dealCollaborator: Optional[str] = None
    dealDescription: Optional[str] = None
    extraFields: Optional[Dict[str, Any]] = None
    dealProbability: Optional[int] = Field(None,gt=0, lt=100) 
    forecastProbability: Optional[int] = Field(None, gt=0, lt=100)
    nextStep: Optional[str] = None
    forecastCategory: Optional[FORECAST_CATEGORY] = None
    closedWonReason: Optional[str] = None
    closedLostReason: Optional[str] = None
    originalTrafficSource: Optional[str] = None


    @field_validator("dealName", mode="before")
    @classmethod
    def validate_deal_name(cls, value):
        if not isinstance(value, str):
            raise AppException(422, "Deal name must be a string")

        value = value.strip()

        if not value:
            raise AppException(422, "Deal name cannot be empty")

        if len(value) < 4:
            raise AppException(422, "Deal name must be at least 4 characters long")

        return value
        

    @field_validator("dealProbability", "forecastProbability", mode="before")
    @classmethod
    def validate_percentage(cls, v):
        if v is None:
            return v
        if not 0 <= v <= 100:
            raise AppException(422, "Probabilities must be between 0 and 100")
        return v
    
    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, v):
        if v is None:
            return AppException(422, "Amount must required")
        
        if v <= 0:
            raise AppException(422, "Amount must be grater then 0")
        
        return v
    
class UpdateDealStatusSchema(BaseModel):
    status: DEAL_STATUS


class BulkAssignDealsSchema(BaseModel):
    deal_ids: list[str]
    assigned_to: str  # User ID to assign deals to

```

### activity_schema.py

```python
from pydantic import BaseModel
from app.core.enums import ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE, CONTACT_STATUS
from typing import Optional, Literal
from beanie import PydanticObjectId

class CallActivitySchema(BaseModel):
    number: str
    entityType: ACTIVITY_ENTITY_TYPE
    entityId: Optional[PydanticObjectId] = None
    action: ACTIVITY_ACTION


class CallActivityUpdateSchema(BaseModel):
    callDuration: Optional[str] = None
    feedback: Optional[str] = None
    connectStatus: Optional[CONTACT_STATUS] = None
    # Mobile sends one of the preset options OR a custom ISO datetime string
    # Preset options: "1h" | "6h" | "1d"
    # Custom: any valid ISO-8601 datetime string e.g. "2026-10-16T10:30:00"
    followUpIn: Optional[str] = None
```

### notes_schema.py

```python

from typing import Optional, List
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.core.enums import NOTE_VISIBILITY, NOTE_STATUS, NOTES_ENTITIES
from pydantic import Field, model_validator, BaseModel


class NoteCreateSchema(BaseModel):
    title: str = Field(..., min_length=3, max_length=35)
    content: str  
    entityType: NOTES_ENTITIES 
    entityId: Optional[str] = None  

    visibility: NOTE_VISIBILITY = NOTE_VISIBILITY.PUBLIC

    isPinned: bool = False




    # @model_validator(mode="after")

    # def validate_entity_id(self):
    #     if self.entityType != NOTES_ENTITIES.GENERAL.value and not self.entityId:
    #         raise ValueError(
    #             "entityId is required when entityType is not GENERAL"
    #         )
    #     return self


    

    
```

