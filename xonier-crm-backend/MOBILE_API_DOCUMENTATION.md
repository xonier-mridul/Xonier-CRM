# Trakeroo CRM - Mobile Application API Documentation (Agent / User)

This document describes the APIs designed specifically for the **Agent / Mobile App User** role. 
All data returned by these endpoints is **strictly scoped** to the authenticated agent (personalized data; non-admin view).

---

## 1. General & Authentication

### Base URL
```
http://<SERVER_HOST>:<PORT>/api
```
*(Example local URL: `http://localhost:8000/api` or LAN IP `http://192.168.x.x:8000/api`)*

### Headers Required for All Mobile APIs
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Standard Response Structure
Every endpoint returns a standard JSON envelope:
```json
{
  "success": true,
  "status_code": 200,
  "message": "Operation successful",
  "data": { ... }
}
```
In case of errors (400, 401, 403, 404, 500):
```json
{
  "success": false,
  "status_code": 403,
  "message": "You can only update the status of your own leads",
  "error": { ... }
}
```

---

## 2. Authentication Flow

### 2.1 Agent Login
**Endpoint:** `POST /api/auth/login`
```json
// Request Body
{
  "email": "agent@example.com",
  "password": "Password123"
}
```
*Note: Sends OTP to the agent's registered email.*

### 2.2 Verify Login OTP
**Endpoint:** `POST /api/auth/verify-login-otp`
```json
// Request Body
{
  "email": "agent@example.com",
  "otp": "123456"
}
```
**Response Data:** Contains `accessToken`, `refreshToken`, and user details. Save `accessToken` for subsequent calls.

### 2.3 Refresh Token
**Endpoint:** `POST /api/auth/refresh`
```json
// Request Body
{
  "refreshToken": "<refreshToken>"
}
```

---

## 3. Home Screen API

### `GET /api/mobile/home`
Fetches personalized top cards & quick metrics for the logged-in agent.

#### Query Parameters
None.

#### Response Example
```json
{
  "success": true,
  "status_code": 200,
  "message": "Home fetched successfully",
  "data": {
    "user": {
      "id": "66f1234567890abcdef12345",
      "name": "Tester New"
    },
    "leads": {
      "total": 13,
      "byConnectStatus": {
        "not_reached": 5,
        "connected": 4,
        "interested": 3,
        "call_back": 1
      }
    },
    "campaigns": {
      "total": 6,
      "active": 4,
      "paused": 2
    }
  }
}
```

---

## 4. Insights & Analytics API

### `GET /api/mobile/insights`
Provides time-filtered metrics for the agent with delta/comparison against the previous period.

#### Query Parameters
| Parameter | Type | Default | Options | Description |
|---|---|---|---|---|
| `period` | string | `month` | `today`, `week`, `month`, `quarter` | Date filter period |
| `tz` | string | `Asia/Kolkata` | Any IANA timezone (e.g., `UTC`) | Timezone for day/week boundaries |

#### Response Example
```json
{
  "success": true,
  "status_code": 200,
  "message": "Insights fetched successfully",
  "data": {
    "period": "month",
    "timezone": "Asia/Kolkata",
    "range": {
      "start": "2026-10-01T00:00:00Z",
      "end": "2026-11-01T00:00:00Z"
    },
    "stats": {
      "totalLeads": 13,
      "activeLeads": 9,
      "wonLeads": 3,
      "lostLeads": 1,
      "bySalesStatus": {
        "new": 4,
        "contacted": 5,
        "won": 3,
        "lost": 1
      },
      "byConnectStatus": {
        "not_reached": 6,
        "connected": 4,
        "interested": 3
      },
      "bySource": {
        "Meta Ads": 6,
        "Google Ads": 4,
        "Linkedin": 3
      }
    },
    "previous": {
      "totalLeads": 10,
      "activeLeads": 7,
      "wonLeads": 2,
      "lostLeads": 1
    },
    "change": {
      "totalLeads": 3,
      "activeLeads": 2,
      "wonLeads": 1,
      "lostLeads": 0
    }
  }
}
```

---

## 5. My Leads Module (Total Leads Card click)

### 5.1 Get My Leads List
### `GET /api/mobile/leads`
Fetches **all leads assigned to the logged-in agent** across all campaigns and direct imports. Phone and email are automatically decrypted for calling/messaging.

#### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Max items per page (up to 100) |
| `search` | string | - | Searches name, company name, lead ID, or phone number |
| `status` | string | - | Filter by Connect Status (e.g. `connected`, `not_reached`, `interested`) |
| `priority` | string | - | Filter by priority: `low`, `medium`, `high` |
| `source` | string | - | Filter by source channel: `Meta Ads`, `Google Ads`, `Linkedin`, etc. |
| `salesStatus` | string | - | Filter by sales status: `new`, `contacted`, `qualified`, `proposal`, `won`, `lost` |
| `campaignId` | string | - | Filter leads originating from a specific campaign |

#### Response Example
```json
{
  "success": true,
  "status_code": 200,
  "message": "Leads fetched successfully",
  "data": {
    "data": [
      {
        "id": "670bf139be65819ad17a7801",
        "leadId": "LEAD-10023",
        "fullName": "Ayaan Dara",
        "companyName": "Vertex Process Solutions",
        "phone": "+919876543210",
        "email": "ayaan.dara@vertexprocess.com",
        "priority": "medium",
        "source": "Linkedin",
        "projectType": "Commercial",
        "city": "Mumbai",
        "country": "India",
        "industry": "IT",
        "salesStatus": "new",
        "connectStatus": "not_reached",
        "meetingScheduled": "no",
        "meetingStart": null,
        "inDeal": false,
        "message": "Looking for CRM demo",
        "createdAt": "2026-10-10T09:30:00Z",
        "assignedAt": "2026-10-10T10:00:00Z",
        "campaign": {
          "id": "670be969be65819ad17a77e0",
          "campaignId": "CAMP-00042",
          "name": "Q4 Meta Lead Generation",
          "status": "active",
          "distributionMode": "on_demand"
        },
        "campaignLeadId": "670bf139be65819ad17a7899",
        "lastContactedAt": null,
        "notes": null
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 13,
    "totalPages": 1,
    "statusCounts": {
      "connected": 4,
      "interested": 3,
      "not_reached": 6
    }
  }
}
```
*Note: Use `statusCounts` to render dynamic badges/chips at the top of your leads screen.*

---

### 5.2 Update Lead Connect Status
### `PATCH /api/mobile/leads/{lead_id}/status`
Allows an agent to change the communication/connect status (e.g. from the dropdown menu in the UI card).

#### Path Parameter
- `lead_id`: The ID of the lead (`lead.id`).

#### Request Body
```json
{
  "status": "connected"
}
```

#### Allowed `status` Values:
- `connected`
- `not_connected`
- `interested`
- `not_interested`
- `not_reached`
- `call_back`
- `wrong_number`
- `meeting_scheduled`
- `meeting_completed`

#### Security & Permissions:
- **Enforced Ownership:** The logged-in agent can **only** update leads assigned to them.
- If an agent tries to modify another agent's lead, the server returns `403 Forbidden` (`"You can only update the status of your own leads"`).

#### Response Example
```json
{
  "success": true,
  "status_code": 200,
  "message": "Lead status updated to connected",
  "data": {
    "id": "670bf139be65819ad17a7801",
    "leadId": "LEAD-10023",
    "fullName": "Ayaan Dara",
    "connectStatus": "connected"
  }
}
```

---

## 6. My Campaigns Module

### 6.1 Get Campaigns List
### `GET /api/mobile/campaigns`
Lists all campaigns where the current agent is an assigned team member.

#### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Max items per page |
| `status` | string | - | Filter campaign status: `active`, `paused`, `completed` |
| `search` | string | - | Search campaign name |

#### Response Example
```json
{
  "success": true,
  "status_code": 200,
  "message": "Campaigns fetched successfully",
  "data": {
    "data": [
      {
        "id": "670be969be65819ad17a77e0",
        "campaignId": "CAMP-00042",
        "name": "Q4 Meta Lead Generation",
        "description": "Meta outreach for Q4",
        "status": "active",
        "distributionMode": "on_demand",
        "managers": [
          { "id": "66f1234567890abcdef12340", "name": "Admin User" }
        ],
        "agents": [
          { "id": "66f1234567890abcdef12345", "name": "Tester New" },
          { "id": "66f1234567890abcdef12349", "name": "Mohit Kumar" }
        ],
        "createdBy": { "id": "66f1234567890abcdef12340", "name": "Admin User" },
        "createdAt": "2026-10-10T08:00:00Z",
        "stats": {
          "totalLeads": 100,
          "myLeads": 25,
          "otherLeads": 45,
          "unassignedLeads": 30
        }
      }
    ],
    "summary": {
      "totalCampaigns": 6,
      "activeCampaigns": 4,
      "myLeads": 25
    },
    "page": 1,
    "limit": 20,
    "total": 6,
    "totalPages": 1
  }
}
```

---

### 6.2 Get Single Campaign Details
### `GET /api/mobile/campaigns/{campaign_id}`
Returns full campaign details for the campaign dashboard/header view.

#### Path Parameter
- `campaign_id`: Campaign ObjectId.

#### Response Example
```json
{
  "success": true,
  "status_code": 200,
  "message": "Campaign fetched successfully",
  "data": {
    "id": "670be969be65819ad17a77e0",
    "campaignId": "CAMP-00042",
    "name": "Q4 Meta Lead Generation",
    "description": "Meta outreach for Q4",
    "status": "active",
    "distributionMode": "on_demand",
    "managers": [...],
    "agents": [...],
    "createdBy": { ... },
    "createdAt": "2026-10-10T08:00:00Z",
    "stats": {
      "totalLeads": 100,
      "myLeads": 25,
      "otherLeads": 45,
      "unassignedLeads": 30
    },
    "myLeadsByStatus": {
      "not_reached": 15,
      "connected": 7,
      "interested": 3
    },
    "isPaused": false
  }
}
```

---

### 6.3 Get Campaign Leads (View All Leads in Campaign)
### `GET /api/mobile/campaigns/{campaign_id}/leads`
Displays leads in a campaign. The agent can **view all leads** (including other agents' leads or unassigned ones), but **interactive actions are restricted based on ownership flags**.

#### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Max items per page |
| `ownership` | string | `all` | Filter by `all`, `mine`, `other`, `unassigned` |
| `status` | string | - | Filter by connect status (`connected`, `not_reached`, etc.) |
| `priority` | string | - | Filter by priority (`low`, `medium`, `high`) |
| `source` | string | - | Filter by source |
| `search` | string | - | Search lead name, company, or phone |

#### UI Logic Driven by Response Flags:
1. `ownership`:
   - `"mine"`: Assigned to the logged-in agent.
   - `"other"`: Assigned to another agent (View-only; displays who it is assigned to).
   - `"unassigned"`: Pool lead (applicable for `on_demand` campaigns).
2. `canUpdateStatus`: `true` ONLY if `ownership === "mine"`. The mobile app can disable or hide the status dropdown if `false`.
3. `canClaim`: `true` ONLY if `ownership === "unassigned"` and campaign is `on_demand` and not paused. The mobile app can render a **"Claim / Start Calling"** button.

#### Response Example
```json
{
  "success": true,
  "status_code": 200,
  "message": "Campaign leads fetched successfully",
  "data": {
    "campaign": {
      "id": "670be969be65819ad17a77e0",
      "campaignId": "CAMP-00042",
      "name": "Q4 Meta Lead Generation",
      "status": "active",
      "distributionMode": "on_demand"
    },
    "data": [
      {
        "id": "670bf139be65819ad17a7801",
        "leadId": "LEAD-10023",
        "fullName": "Ayaan Dara",
        "companyName": "Vertex Process Solutions",
        "phone": "+919876543210",
        "email": "ayaan.dara@vertexprocess.com",
        "priority": "medium",
        "source": "Linkedin",
        "connectStatus": "not_reached",
        "salesStatus": "new",
        "campaignLeadId": "670bf139be65819ad17a7899",
        "campaignStatus": "assigned",
        "ownership": "mine",
        "assignedTo": {
          "id": "66f1234567890abcdef12345",
          "name": "Tester New"
        },
        "canUpdateStatus": true,
        "canClaim": false
      },
      {
        "id": "670bf139be65819ad17a7802",
        "leadId": "LEAD-10024",
        "fullName": "Rohan Malhotra",
        "companyName": "Apex Logistics Ltd",
        "phone": "+919812345678",
        "email": "rohan.m@apexlogistics.in",
        "priority": "high",
        "source": "Meta Ads",
        "connectStatus": "connected",
        "salesStatus": "contacted",
        "campaignLeadId": "670bf139be65819ad17a7898",
        "campaignStatus": "assigned",
        "ownership": "other",
        "assignedTo": {
          "id": "66f1234567890abcdef12349",
          "name": "Vikram Rathore"
        },
        "canUpdateStatus": false,
        "canClaim": false
      },
      {
        "id": "670bf139be65819ad17a7803",
        "leadId": "LEAD-10025",
        "fullName": "Priya Sharma",
        "companyName": "TechCorp",
        "phone": "+919811122233",
        "email": "priya@techcorp.com",
        "priority": "low",
        "source": "Google Ads",
        "connectStatus": "not_reached",
        "salesStatus": "new",
        "campaignLeadId": "670bf139be65819ad17a7897",
        "campaignStatus": "unassigned",
        "ownership": "unassigned",
        "assignedTo": null,
        "canUpdateStatus": false,
        "canClaim": true
      }
    ],
    "summary": {
      "all": 100,
      "mine": 25,
      "other": 45,
      "unassigned": 30
    },
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### 6.4 Claim a Specific Lead (On-Demand Mode)
### `POST /api/mobile/campaigns/{campaign_id}/leads/{campaign_lead_id}/claim`
When an agent clicks "Claim" or "Start Calling" on an unassigned lead, this endpoint assigns the lead to the agent atomically.

#### Path Parameters
- `campaign_id`: Campaign ObjectId
- `campaign_lead_id`: The `campaignLeadId` value from the lead card

#### Response Example
```json
{
  "success": true,
  "status_code": 200,
  "message": "Lead claimed successfully",
  "data": {
    "claimed": true,
    "leadId": "670bf139be65819ad17a7803",
    "campaignLeadId": "670bf139be65819ad17a7897"
  }
}
```
*Note: If another agent claimed the lead at the same millisecond, this returns `409 Conflict` (`"This lead has already been taken by someone else"`).*

---

### 6.5 Claim Next Lead (FIFO Queue)
### `POST /api/mobile/campaigns/{campaign_id}/claim-next`
Fetches and claims the oldest available unassigned lead in the campaign. Perfect for a "Start Calling Next Lead" button.

#### Response Example
```json
{
  "success": true,
  "status_code": 200,
  "message": "Lead claimed successfully",
  "data": {
    "lead": {
      "id": "670bf139be65819ad17a7803",
      "fullName": "Priya Sharma",
      "phone": "+919811122233",
      ...
    }
  }
}
```
*(If no more leads are left to claim, returns `404` with `"No unassigned leads available in this campaign"`).*

---

## 7. Status Reference & Enums

### Lead Connect Status (`connectStatus`)
Values for dropdowns and filters:
- `connected`
- `not_connected`
- `interested`
- `not_interested`
- `not_reached`
- `call_back`
- `wrong_number`
- `meeting_scheduled`
- `meeting_completed`

### Distribution Mode (`distributionMode`)
- `equal`: Leads were auto-distributed equally among agents during bulk import.
- `on_demand`: Leads remain unassigned in a shared pool; agents claim them on the fly.


## Campaign status behavior

New campaigns default to `active`. Pausing sets `status: "paused"`; resuming
sets `status: "active"`. Campaign list/detail responses and campaign references
inside mobile lead responses use the same status. Mobile clients should display
Active or Paused using this API field, and refresh campaign data after a change.
Existing `completed`, `archived`, and `deleted` lifecycle values are unchanged.

`draft` is retired. Backend startup migrates existing Draft campaigns to Active.
Legacy clients sending `draft` in campaign creation/status updates or status
filters are treated as requesting `active`; responses return `active`.
