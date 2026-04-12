# Frontend Architecture Notes

## Workspace Structure

- `apps/crm-admin`
  - Staff-facing CRM console
- `apps/candidate-portal`
  - Separate candidate-facing surface
- `packages/ui`
  - Shared visual primitives
- `packages/api`
  - Shared API client, hooks, session handling, and frontend types

## Admin Shell

`crm-admin` uses a shared shell with:

- Persistent left sidebar for workspace navigation
- Top header for current module context and backend health
- Route-loaded content area

The shell is designed to preserve source CRM UX while staying reusable across active CRM modules and later follow-up admin phases.

## Shared UI Strategy

The frontend uses `packages/ui` for:

- buttons
- inputs
- selects
- panels
- badges
- toolbars
- shell frame
- description lists
- data table wrappers

Page-specific layout is still kept local when the screen needs stronger workflow identity.

## Routing Strategy

`crm-admin` now uses route-level lazy loading for heavy screens:

- dashboard
- leads
- lead workbench
- matching
- orders
- integrations
- applications
- documents
- training-finance
- pipeline
- admin

Login remains eager-loaded.

## Backend Boundary Rules

Frontend modules must fall into one of two categories:

### Backend-backed

The UI reads and mutates real backend state.

### Capability-gated

The UI shows the intended future workspace but does not simulate records, mutations, or process state.

## Matching and Orders

Matching and orders rely on current backend endpoints instead of frontend-only heuristics.

- Orders page uses real order payloads
- Matching page uses backend lead triage
- Lead workbench uses backend order suggestions when available
- Applications page uses real backend application records and live lifecycle updates
- Documents page uses backend checklist summaries and document metadata CRUD
- Training-finance page uses backend milestone records for deposit, training, visa, and departure progression
- Pipeline page uses an aggregated backend case-flow endpoint rather than composing a fake board from unrelated module calls
- Admin page uses real backend user-management APIs for identity and activation control

## Qualification Overlay Boundary

Sparse intake may come from CNV or other integrations, but staff-verified data is edited inside the lead workbench through `GET/PATCH /api/leads/:id/qualification`.

The frontend intentionally keeps raw extracted data and verified qualification data visible side by side. Lead score and matching should be interpreted as outputs of merged intake plus verified data, not intake data alone.

## Documentation Rule

Frontend implementation notes should live inside `social_crm_frontend/docs`. Do not use root-level planning documents as the source of truth for current frontend behavior.
