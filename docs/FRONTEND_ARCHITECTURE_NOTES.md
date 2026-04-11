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

The shell is designed to preserve source CRM UX while staying reusable across active and gated modules.

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
- capability-gated modules

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

## Documentation Rule

Frontend implementation notes should live inside `social_crm_frontend/docs`. Do not use root-level planning documents as the source of truth for current frontend behavior.
