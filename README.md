# Social CRM Frontend

Frontend monorepo for the Social CRM system.

## Apps

- `apps/crm-admin`: internal staff and admin console
- `apps/candidate-portal`: candidate-facing shell for future self-service flows

## Packages

- `packages/api`: typed API client, session handling, query hooks
- `packages/ui`: shared UI primitives and layout components

## Current Backend Alignment

The admin app is wired to the backend APIs that currently exist and are stable enough to use in the UI.

That includes:

- auth and refresh flow
- dashboard stats
- leads and lead transitions
- lead profile update
- orders
- AI extraction query and background structured extraction status
- matching triage
- CNV integration admin actions
- applications
- documents
- training-finance
- pipeline
- admin identity and audit/session surfaces

There are no remaining capability-gated modules in the main internal CRM operator flow.

## Architecture And UX Direction

Workspace structure:

- `apps/crm-admin`
  - staff-facing CRM console
- `apps/candidate-portal`
  - separate candidate-facing surface for later self-service flows
- `packages/ui`
  - shared visual primitives
- `packages/api`
  - shared API client, query hooks, session handling, and frontend types

Admin shell characteristics:

- persistent left sidebar for workspace navigation
- top header for page context and runtime summaries
- route-level lazy loading for heavy CRM workspaces
- light operational surfaces, compact toolbars, dense panels, and backend-truth-first workflows

The current visual direction was adapted from `taiwan-xklđ-crm-1` as a source-style reference, but the frontend only exposes flows that the current backend actually supports.

Reuse rules applied in this repo:

- reuse visual language, not source business logic
- keep backend truth first for active modules
- do not simulate unsupported workflows
- prefer shared primitives in `packages/ui` over one-off page styling where possible

## Operator Workbenches

The detailed frontend behavior for the live CRM admin modules is consolidated in:

- [docs/OPERATOR_WORKBENCHES.md](C:/Users/Admin/Desktop/CRM/social_crm_frontend/docs/OPERATOR_WORKBENCHES.md)

That document covers:

- matching
- lead qualification
- applications
- documents
- training-finance
- pipeline
- admin

## Verification

Admin app verification:

```bash
npm run lint --workspace @social-crm/crm-admin
npm run build
```

Candidate portal verification if touched:

```bash
npm run lint --workspace @social-crm/candidate-portal
npm run build
```

Runtime check:

```bash
Copy apps/crm-admin/.env.example apps/crm-admin/.env.local
VITE_API_BASE_URL=http://localhost:3000
npm run dev:admin
```

The admin app reads:

- `VITE_API_BASE_URL`

Default example file:

- [apps/crm-admin/.env.example](C:/Users/Admin/Desktop/CRM/social_crm_frontend/apps/crm-admin/.env.example)

## Notes

- candidate portal remains intentionally lighter because external-facing backend auth and resource coverage are still incomplete
- matching UI text should distinguish clearly between lead triage and formal candidate matching
- API-driven state and business rules should always come from the backend rather than being hardcoded in the UI
- use `docs/CRM_ADMIN_IMPLEMENTATION_STATUS.md` for current completion status and `docs/KNOWN_LIMITATIONS_AND_FOLLOWUPS.md` for deferred work
