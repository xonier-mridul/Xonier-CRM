# Company lead statuses

Company admins open **Lead configuration** from the Leads page (`/leads`). Configuration uses the same page container and padding; Back to leads restores the mounted list state. Engagement statuses are a separate feature.

Each company starts with New, Contacted, Qualified, Proposal, Won, Lost. No client-specific pipeline is installed. These are seeded once, when the company first requests configuration, without rewriting lead records. Names and stable keys are separate: renaming New to Prospecting keeps the persisted `new` key. New stages receive opaque company-owned keys. Never infer business behavior from display names.

Won initially has type `final`; the other defaults have type `ongoing` to satisfy the single-final rule. At most one Final is permitted. Change the old Final to Ongoing before designating another Final. Keep at least one Ongoing stage; new leads with no status use the first Ongoing by display order. Kanban always places Final last.

Users with lead update access may select Final manually, without creating a deal. Creating a deal still marks its lead as the company's configured Final and sets `inDeal`. Deal deletion returns the lead to the first Ongoing stage. A Final must be configured for lead-to-deal conversion. Closing a lead and creating a deal are distinct actions.

Deletion is blocked for any status referenced by a company lead, including a soft-deleted lead. No replacement or bulk movement is performed. The internal `delete` marker remains reserved for record deletion and is excluded from configurable pipeline choices.

## API

All routes require authentication, an active company context and the CRM feature. Mutations require a company admin. Configuration is scoped by the company context, never by a client-supplied company ID.

- `GET /api/lead-status/all`: `data` is the status array. Company admins also receive `leadCount`; other users receive metadata only.
- `POST /api/lead-status/create`
- `PUT /api/lead-status/update/{key}`
- `DELETE /api/lead-status/delete/{key}`

Create/update body: `{ "name": "Response", "type": "ongoing", "color": "#0891b2", "order": 2 }`.

Lead status mutations and imports accept a configured key (preferred) or exact case-insensitive display name. Unknown keys and the internal deletion marker are rejected. Mobile clients can use the same metadata endpoint for their sales-status controls; mobile engagement-status endpoints retain their own contract. Existing mobile releases that hardcode the six statuses require a separate UI update outside this repository.

Lead status writes and configuration edits coordinate through the company's settings document in their MongoDB transaction. Aborted transient transactions retry; uncertain commits are not replayed. This relies on the existing replica-set transaction support used by lead/deal writes.

## Verification

From `xonier-crm-backend`:

```sh
venv/bin/python -m unittest discover -s tests -p 'test_lead_statuses.py' -v
venv/bin/python -m unittest discover -s tests -p 'test_pipeline_stats.py' -v
```

From `xonier-crm-frontend`: `npm run build`.

Before a production release, verify create, rename, final selection, used-deletion rejection, unused-deletion success, and isolation using two company accounts in a test database. Do not customize an onboarded company's defaults just to test CRUD.
