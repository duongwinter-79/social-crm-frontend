# Known Limitations And Follow-ups

This document tracks intentional limits that remain after the core CRM flow is implemented in stages. It is the place to pick up deferred work later without rediscovering gaps from code inspection.

## Frontend Limits

### 1. True E2E automation is deferred

Current state:

- build, lint, and business-rule verification exist
- internal CRM E2E guidance exists
- GitHub workflow templates exist for verification

Missing later work:

- browser-driven E2E suite
- backend API smoke suite coordinated with frontend flows
- manual-dispatch integration workflow for seeded environments

Related docs:

- `docs/OPERATOR_WORKBENCHES.md`
- `social_crm_backend/docs/E2E_VALIDATION_AND_CI.md`

### 2. Recruitment browsing is still narrow

Current state:

- the lead workbench can resolve a linked candidate through the recruitment API
- suggested orders can create applications from that context
- the `/applications` page supports list/detail/update plus candidate-search-based creation
- applications and matching reuse a shared candidate picker component

Missing later work:

- broader recruitment browsing UI

### 3. Documents workflow is metadata-first

Current state:

- document records, checklist views, and status updates are live
- operators can store `fileUrl`, `storageBucket`, issue date, and expiry date

Missing later work:

- binary upload/download flow
- storage-provider UI integration
- richer audit trail for document handling

Related doc:

- `docs/OPERATOR_WORKBENCHES.md`

### 4. Admin is only at the identity layer

Current state:

- live user list/create/update is available
- role and activation management are backend-backed
- readonly backend/CNV status and webhook-admin controls are available
- admin audit history and session revocation are available
- `/admin` nav and route are now role-aware for admin users only

Missing later work:

- readonly runtime/system status rollup
- policy/configuration controls where genuinely needed

Related doc:

- `docs/OPERATOR_WORKBENCHES.md`

### 5. True runtime settings remain intentionally absent

Current state:

- the admin workspace does not expose raw env editing or unsafe settings toggles

Missing later work:

- audited, backend-enforced settings only where product operations actually require runtime control

### 6. Pipeline board could still grow into ownership/SLA operations

Current state:

- cross-stage aggregated pipeline UI exists
- current view focuses on stage, blockers, and next action

Missing later work:

- ownership assignment
- SLA / aging indicators
- richer grouped board behavior

## Rule And Data Quality Limits

### 7. CNV remains a sparse intake source

Current state:

- CNV creates or updates leads
- the integrations UI can read and display CNV customers for SSO/API verification
- qualification overlay completes rule-critical fields

Missing later work:

- richer upstream profile capture if desired
- automatic enrichment from CNV customer payloads into full recruiting profiles
- clearer automated vs verified signal provenance in UI

### 8. Some business-sensitive signals remain human-confirmed

Still intentionally operator-driven:

- tattoo assessment
- returnee history quality
- health-fit confirmation
- verified cancellation/no-show counts
- inconsistency confirmation

This is by design for now and should not be treated as a defect unless the product later requires stronger automation.
