# Social CRM Frontend

Frontend monorepo for the Social CRM backend.

## Apps

- `apps/crm-admin`: internal operations console
- `apps/candidate-portal`: candidate-facing shell and future self-service portal

## Packages

- `packages/api`: typed API client, capability registry, auth/session helpers
- `packages/ui`: shared design system primitives and layout components

## Notes

- The admin app is wired to the currently exposed backend APIs.
- Candidate portal is intentionally lighter because external-facing backend auth and resource coverage are not complete yet.
- Modules without usable backend CRUD are surfaced as read-only or capability-gated UI.
