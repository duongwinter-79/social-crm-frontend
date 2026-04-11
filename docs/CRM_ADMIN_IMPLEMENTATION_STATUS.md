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
- Lead workbench
- Matching
- Orders
- Integrations
- Login/auth shell

## Capability-Gated Modules

- Pipeline
- Applications
- Documents
- Training & Finance
- Admin settings

These remain intentionally non-interactive until backend endpoints are ready for real operator actions.

## Technical Cleanup Completed

- Tailwind workspace config fixed for per-app builds
- Route-level lazy loading added to `crm-admin`

## Known Technical Debt

- `crm-admin` still emits a large bundle warning even after lazy loading
- Further manual chunking may still be worthwhile if startup performance becomes an issue
- Some UI duplication still exists across operator guidance and stat-card patterns

## Recommended Next Work

1. If bundle size matters, add manual chunking or isolate heavier libraries further.
2. Expand backend coverage for capability-gated modules before opening those workspaces.
3. Keep this document updated when a gated module becomes backend-backed.
