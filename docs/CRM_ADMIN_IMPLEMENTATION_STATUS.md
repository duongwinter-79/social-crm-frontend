# CRM Admin Implementation Status

## Current State

The admin frontend has been refactored into a source-aligned operator UI backed by `social_crm_backend`.

## Completed Phases

### Phase 1

- Shell redesign
- Shared visual primitives update
- Dashboard redesign
- Lead inbox redesign

### Phase 2

- Lead workbench redesign
- Orders workbench redesign
- Backend-backed order suggestion and triage usage

### Phase 3

- Capability-gated modules converted from generic placeholders to roadmap shells
- Pipeline, applications, documents, training-finance, and admin now present intentional future-state surfaces

### Phase 4

- Matching redesigned into a denser operator workbench
- Integrations aligned to the same layout language
- Login aligned with the current admin visual system

## Active Backend-Backed Modules

- Dashboard
- Leads
- Pipeline
- Lead workbench
- Matching
- Orders
- Applications
- Documents
- Training & Finance
- Integrations
- Admin
- Login/auth shell
- Lead qualification overlay

## Capability-Gated Modules

None in the main CRM operator flow.

## Technical Cleanup Completed

- Tailwind workspace config fixed for per-app builds
- Route-level lazy loading added to `crm-admin`
- stale capability-registry flags corrected for applications, documents, and training-finance

## Known Technical Debt

- `crm-admin` still emits a large bundle warning even after lazy loading
- Further manual chunking may still be worthwhile if startup performance becomes an issue
- Some UI duplication still exists across operator guidance and stat-card patterns

## Recommended Next Work

1. If bundle size matters, add manual chunking or isolate heavier libraries further.
2. Expand backend coverage for capability-gated modules before opening those workspaces.
3. Keep this document updated when a gated module becomes backend-backed.
4. Track deferred product gaps in `docs/KNOWN_LIMITATIONS_AND_FOLLOWUPS.md`.

## Recent Qualification Update

- the lead workbench now includes a staff-verified qualification overlay backed by `/api/leads/:id/qualification`
- this overlay bridges sparse CNV intake and downstream lead score and matching behavior
- CI workflow template added at `.github/workflows/frontend-verify.yml`
- detailed operator workspace notes now live in `docs/OPERATOR_WORKBENCHES.md`

## Recent Applications Update

- `/applications` is now a live backend-backed workspace instead of a gated shell
- the page supports real application list, filter, detail, and status/interview/rejection updates
- the lead workbench now resolves candidate context from the recruitment API and can create applications from suggested orders without manual UUID entry

## Recent Documents Update

- `/documents` is now a live backend-backed workspace instead of a gated shell
- the page supports backend checklist summaries, document list/filtering, and metadata/status create-update flows
- file handling is currently metadata-first; binary upload/download remains a later enhancement

## Recent Training-Finance Update

- `/training-finance` is now a live backend-backed workspace instead of a gated shell
- the page supports milestone record list/create/update flows for deposit, training, visa, and departure tracking
- the current scope is operational milestone management, not full accounting or payment-infrastructure coverage

## Recent Pipeline Update

- `/pipeline` is now a real backend-backed cross-stage workspace
- the page is powered by an aggregated pipeline endpoint instead of stitching module pages in the browser
- each row summarizes lead stage, candidate linkage, application state, document blockers, and downstream milestone readiness

## Recent Admin Update

- `/admin` is now a live backend-backed identity-and-access workspace
- the page supports real operator list/filter/create/update flows against the backend `users` module
- the page now also includes readonly backend/CNV status plus safe CNV webhook-admin controls
- the page now also includes admin audit history and auth-session review/revocation
- broader system-policy controls remain later admin phases
