# Trakeroo CRM requirements gap report

**Source** — Marcos’s 12-page Nov 8, 2026 assessment for Conceito 4.0, including the data-model and roadmap diagrams. **Review baseline** — repository `main` at `3831bfdb`. This is a source-code assessment. The client’s counts, role settings, locale and workflows still need validation in their live tenant.

## What we can reuse

- Leads, campaigns, CSV intake, agent assignment, tenant-configurable Lead statuses, and the Lead board.
- Deals, Lead-to-Deal linkage, a separate Deal status field, Deal Kanban, custom fields, amount, close date, probability and close-reason fields.
- Activity logging, notes, lead and deal follow-up fields, in-app follow-up infrastructure and optional mobile lead push. These cover parts of the requested activity workflow.
- Calendar and Google Calendar integration, Tasks for internal work, Quotations with a Deal link, Invoices, and connected-mailbox outbound email. WhatsApp chat exists separately from the sales-record timeline.
- Company currency settings already offer BRL. Portuguese translation resources exist. Conceito 4.0 settings and end-to-end screen coverage need a live check.

## Acceptance script and implementation gaps

| # | Client action | Current coverage | Work to pass |
|---|---|---|---|
| 1 | Create or import a lead | Partial. Manual and CSV flows exist. | Match and reuse Organization and Person on intake, deduplicate by agreed keys, and return row-level conflicts. |
| 2 | Identify company and contact | Gap in the sales workflow. Company metadata is not a complete Organization/Person relationship. | Tenant-owned Organization and Person records with CNPJ, industry, size, title, email and phone. Link people to companies and both to Leads and Deals. Show related people and deals on the organization page. |
| 3 | Record source | Partial. Lead and campaign source data exist. | One source taxonomy with friendly labels, attribution to campaign, and Enquiry mapped to a source in the unified intake. |
| 4 | Log interaction | Partial. Notes, call/activity records, email and WhatsApp exist in separate flows. | Quick logging from the record for call, meeting, email, task, WhatsApp and LinkedIn. Store channel, outcome and first-reply date. Clarify which channels require automatic capture. |
| 5 | Create next action and date | Partial. Follow-up dates and next-step fields exist. | Schedulable Activity with type, linked record, due date, owner and completion. Prompt for the next activity on completion. |
| 6 | Assign an owner | Partial. Lead, Deal and campaign assignment exist. | Enforce owner scope and handoff from SDR to AE. Give each activity and post-sale follow-up its own owner. |
| 7 | Get a reminder | Partial. Existing follow-up service and optional lead mobile push. | In-app and email reminders tied to dated Activities, with Overdue, Today and Upcoming views. |
| 8 | View history | Partial. Activity records and histories exist. | Unified record timeline for notes, calls, meetings, tasks, emails and stage changes. Preserve historical links and authors. |
| 9 | Move a deal | Partial. Deal Kanban and drag-stage route exist, with recent drag fixes on main. | Tenant-configurable pipelines and rename/reorder/archive stages. Show every matching card through per-column loading, plus full counts and BRL totals. |
| 10 | Log a meeting | Partial. Calendar and Google sync exist. | Link meeting to Lead or Deal, capture date, attendees and AE, and show it on the timeline. Confirm sync direction and update behavior. |
| 11 | Log a proposal | Partial. Quotations and a Deal link exist in the data model. | Make the action usable from the Deal and record amount, version, sent date, file and next follow-up. |
| 12 | Record won/lost and reason | Partial. Deal status and close-reason fields exist. | Keep outcomes outside active columns, require configured reasons where agreed, record closed date and report by reason. Remove duplicate Won filter. |
| 13 | Disqualify with a reason | Partial. Configurable Lead statuses and final-state foundations exist. | Explicit qualification outcome and mandatory configurable reason, with reporting and guarded conversion. |
| 14 | Track follow-up and aging | Partial. Follow-up dates/owners exist. | Show next activity on cards, track stage-entry dates and flag stalled deals, and provide post-sale follow-up and onboarding milestones. |

## Cross-cutting work and quick fixes

| Area | Classification | Scope |
|---|---|---|
| Lead base and dashboard totals | Structural plus quick fix | Verify the reported 24 Dashboard, 10 Leads and 3 Pipeline counts against permissions, date filters and campaign/manual sources. Label existing metrics immediately. Reconcile the same scoped total after migration. |
| Pipeline menu | Configuration/UI | Verify the current campaign-report route, label it Campaigns, and make Pipeline open the Deals Kanban. |
| Deal amount | Validation change | Current Deal model requires positive amount. Make it optional at creation and enforce it from Proposal through backend transitions, including drag/drop. |
| Stage requirements | New scope | Enforce meeting date/attendees/AE, qualification criteria, scoping details, proposal fields and closure rules. Capture negotiation terms, objections, decision maker and next step. |
| Brazil localization | Configuration plus bugs | Enable BRL for the tenant. Audit Deal amounts, totals, exports, dd/mm/yyyy dates, Brazilian phone masking and PT-BR strings across screens. Fix raw keys including `try_adjusting_your_filters` and rename Calender to Agenda in PT-BR. |
| Lead cards and detail | Bug/UI checks | Preserve LinkedIn URL casing and make it clickable. Use friendly source labels, count Final/Ongoing across the complete filtered result, fix truncated labels and resolve the empty Update Lead button. Verify each in the client account. |
| People and Companies lists | UI plus new scope | Verify the translation issue and replace person columns on Organizations with name, CNPJ, industry and deal count. Keep customer Organizations separate from CRM tenant settings. |
| Roles | Configuration plus enforcement | Define SDR, AE and Manager permissions and own/team/all visibility. Reuse existing role checks and assignments. Verify lists, detail, writes, reports and linked records with each role. |
| Imports and external intake | New scope | Extend CSV to organizations, people and deals. Expose authenticated, idempotent intake for Redrive, Linked Helper and forms. Validate source attribution, matching and retries. Existing lead APIs are a starting point. |
| Forecast and reporting | Partial plus new scope | Reuse close-date and probability fields. Add stage probability, weighted totals, close month/owner views, conversion, cycle time, aging and reasons. Agree how reopened and archived records count. |
| Automation and email timeline | Later scope | Manager-configurable activity triggers and advanced forecasts. Outbound connected email can seed the timeline, while inbound email sync, matching and permissions require separate work. |

## Answers to the client’s eight questions

1. **Data model** — MongoDB supports adding the relationships incrementally. Preserve current Lead-to-Deal links and IDs, introduce tenant-scoped Organization, Person and Activity links, then backfill. Review Enquiry and campaign consumers before switching intake and reporting to a single lead base.
2. **Stage storage** — Lead statuses already have tenant-specific configuration. Deal pipeline and stage still use backend enums. Add persisted Deal pipeline/stage IDs, map old enum values and retain compatibility during migration.
3. **Custom fields** — Reuse the form-field patterns where useful. Validate that new Organization and Person entity types have separate scopes, required-field rules, storage and import mapping.
4. **Migration** — Take a read-only inventory and reconcile whether the client’s 10 and 24 overlap. Dry-run normalized email/phone/CNPJ matches, send ambiguous matches for review, preserve original IDs in a crosswalk and preserve notes, timestamps, ownership and campaign attribution. Back up, reconcile counts and note links, then cut over with rollback.
5. **Kanban** — Leads and Deals have separate board components. Share the pagination/aggregation contract where feasible. Verify both screens independently.
6. **Profiles** — Role permissions, tenant scope, agent ownership and campaign/team membership provide a base. Define explicit SDR/AE/Manager visibility and verify enforcement on both old and new endpoints.
7. **Intake** — Internal Lead routes and CSV already exist. A dedicated Redrive, Linked Helper or forms intake contract was not verified in the reviewed source. Confirm source payloads and build an integration endpoint or adapters.
8. **Minimum release** — One migrated lead base, Organization and Person links, configurable Deal pipeline, safe Lead-to-Deal conversion, activity owner/date/reminders, timeline, terminal outcomes/reasons, BRL/PT-BR and role visibility. Include enough meeting and proposal linking, follow-up and aging to pass the 14-action script.

## Delivery phases and sign-off

| Phase | Deliverables | Exit |
|---|---|---|
| 1. Data model | Entities and links, persisted Deal stages and status, BRL/PT-BR foundations, unified migration. Run quick fixes in parallel. | Same scoped lead counts on all agreed views, with migrated history reconciled. |
| 2. Daily operations | Activities, reminders, Deal page/timeline, full Kanban, conversion, outcomes/reasons, minimum meeting/proposal and follow-up flows. | All 14 actions pass with Gustavo and the AE/manager roles. Sales stops using Tasks as its pipeline. |
| 3. Management | Reports, weighted forecast, stalled-deal alerts, fuller role setup and external lead intake. | Monthly forecast can be produced from CRM data. |
| 4. Evolution | Configurable automations, fuller email history and linked proposals, advanced forecast. | Sign off individual enhancements against agreed examples. |

**Client decisions before estimating.** Pages 3–4 describe a pre-sales Lead board, while page 6 labels Lead as an inbox with no pipeline stage. Confirm whether the existing Lead board should stay and how Prospect/Connection/Qualification/Meeting scheduled relate to New/Qualifying/Archived and Qualified/Disqualified. Confirm whether conversion happens at meeting scheduled or after the meeting, and whether reasons are required for all outcomes or only Lost/Disqualified. The Phase 2 script requires proposal linking and follow-up aging even though the roadmap places fuller proposals in Phase 4 and stalled-deal alerts in Phase 3. Agree the minimum Phase 2 behavior first.

**Effort and timeline.** Phase 1 migration and Phase 2 workflows are the largest workstreams. Calendar, proposals, reporting and permissions can reuse current modules, but dates depend on a tenant data sample, integration payloads, approved stage/role rules and delivery capacity. The report does not commit to dates. Run a short discovery and migration dry run, then estimate each phase against the signed-off acceptance script.

## Source pointers

- `xonier-crm-backend/app/db/models/deal_model.py` and `lead_model.py` for links, status, amount, forecast and follow-up fields.
- `xonier-crm-backend/app/services/lead_status_service.py`, `docs/custom-lead-statuses.md` and the separate `LeadKanbanBoard.tsx` / `DealKanbanBoard.tsx` for current pipeline coverage.
- `xonier-crm-backend/app/db/models/activity_model.py`, `calender_event_model.py`, `quotation_model.py` and `app/services/follow_up_service.py` for reusable operations.
- `xonier-crm-frontend/src/components/pages/companies/CompanyUpdateForm.tsx` and `src/locales/pt/common.json` for BRL and Portuguese foundations.
