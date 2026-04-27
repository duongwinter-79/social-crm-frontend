# Changelog

## 2026-04-27

### Order matching criteria visibility

- Added frontend API typing for persisted order `heightMin` and `acceptsReturnees` criteria.
- Updated the order catalog and lead workbench suggested-order cards to display minimum height and returnee acceptance policy.
- Added frontend API client methods and query/mutation hooks for order detail, create, and update endpoints.
- Added an admin-only order create/edit panel to the orders workspace for maintaining matching criteria.

## 2026-04-21

### CNV resource verification UI

- Added frontend API support for `GET /api/cnv/webhook-admin/customers`.
- Added a CNV customer-read panel to the integrations admin page with refresh state, customer count, top customer rows, and raw payload output.
- Documented the customer-read panel as read-only CNV SSO/API verification, not automatic CRM lead import or matching.
