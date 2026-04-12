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
- AI extraction query
- matching triage
- CNV integration admin actions

Modules without stable backend CRUD remain capability-gated or read-only in the UI.

## Matching Workbench

The current matching page in `crm-admin` is a lead-triage screen, not a final candidate-matching screen.

Current backend route used by the UI:

- `POST /api/matching/triage`

The UI currently shows:

- eligibility and conclusion
- score breakdown
- data quality
- missing requirements
- warnings
- preliminary fit
- suggested next action
- flags and reject reason

Formal candidate matching exists in the backend as:

- `POST /api/matching/evaluate-candidate`

That route is intended for qualified candidate evaluation, not the current lead-stage workbench.

See [docs/ADMIN_MATCHING_WORKBENCH.md](C:\Users\Admin\Desktop\CRM\social_crm_frontend\docs\ADMIN_MATCHING_WORKBENCH.md).

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
