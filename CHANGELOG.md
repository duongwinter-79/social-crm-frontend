# Changelog

## 2026-05-11

### Unified lead qualification form

- removed the separate Lead Workbench profile workspace panel and profile save mutation
- moved experience field, desired industry, preferred region, and desired salary into the qualification overlay
- removed frontend API client/hooks/types for the legacy `/leads/:id/profile` endpoint so operator edits now flow through `useUpdateLeadQualificationMutation`

## 2026-05-10

### Lead workbench extraction feedback

- Added explicit background status for `Refresh structured extraction`: starting, running, completed, timeout, and failed.
- Kept the refresh button disabled while extraction is active so operators do not submit duplicate background runs.
- Changed post-trigger polling to fetch both lead/thread state and AI suggestions, then refresh related lead workbench queries when extraction completes or times out.
- Documented that manual AI questions are read-only and separate from saved structured extraction.

## 2026-05-07

### Zalo conversation inbox

- Added frontend API types, client methods, and React Query hooks for CRM interaction threads and messages.
- Added `/conversations` to the admin shell as a backend-backed Zalo OA conversation inbox.
- The page supports thread search/filtering, pagination, lead linkage, extraction status, recent message review, raw webhook payload inspection, and extracted/verified lead data review.
- Kept CNV resource inspection under Integrations as a deprecated read source rather than mixing it into the Zalo OA conversation workflow.

## 2026-04-27

### Order matching criteria visibility

- Added frontend API typing for persisted order `heightMin` and `acceptsReturnees` criteria.
- Updated the order catalog and lead workbench suggested-order cards to display minimum height and returnee acceptance policy.
- Added frontend API client methods and query/mutation hooks for order detail, create, and update endpoints.
- Added an admin-only order create/edit panel to the orders workspace for maintaining matching criteria.
- Added a formal candidate matching mode beside preliminary lead triage in the matching workspace.
- Added application creation from the applications workspace with candidate search, order selection, and status-required field validation.
- Tightened lead workbench order suggestions so no-candidate leads show qualification guidance instead of disabled formal order actions.
- Extracted a shared candidate picker for the applications and matching workspaces.

## 2026-04-21

### CNV resource verification UI

- Added frontend API support for `GET /api/cnv/webhook-admin/customers`.
- Added a CNV customer-read panel to the integrations admin page with refresh state, customer count, top customer rows, and raw payload output.
- Documented the customer-read panel as read-only CNV SSO/API verification, not automatic CRM lead import or matching.
