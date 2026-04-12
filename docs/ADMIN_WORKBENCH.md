# Admin Workbench

The CRM admin workspace is now backend-backed for the first identity-and-access slice.

## Current Scope

- list operator accounts
- filter by username, role, and activation state
- create admin or staff users
- update username, role, activation state, and password reset
- readonly backend/CNV system status
- CNV token test and webhook registration lifecycle actions
- recent admin audit log entries
- recent auth session review and revocation

## Backend APIs Used

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PATCH /api/users/:id`

All of these routes are protected by JWT auth plus admin-only role enforcement.

## Current Boundaries

This workspace is intentionally limited to user management.

It does not yet include:

- broader integration/system policy editing
- runtime configuration controls

Those remain follow-up admin phases after the identity layer is stable.
