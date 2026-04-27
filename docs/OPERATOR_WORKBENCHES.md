# CRM Admin Operator Workbenches

This document consolidates the current operator-facing frontend workbench behavior for the live CRM admin modules.

## Matching

### Purpose

The current admin matching screen is a lead-triage interface.

It is designed for operator screening before a lead has become a fully qualified candidate with a structured profile.

It should not be treated as the final recruitment matching decision.

### Current Backend Contract

The admin app uses:

- `POST /api/matching/triage`

Request body:

```json
{
  "leadId": "<lead-uuid>",
  "orderId": "<order-uuid>"
}
```

Response shape includes:

- `mode`
- `dataQuality`
- `missingRequirements`
- `warnings`
- `preliminaryFit`
- `suggestedAction`
- nested `matching` result with conclusion, total score, breakdown, flags, eligibility, and approval state

### UI Responsibilities

The matching page should surface:

- eligibility and conclusion
- score breakdown
- missing required signals
- warnings
- preliminary fit
- suggested next action
- flags and reject reason

### Important Distinction

Do not confuse these backend surfaces:

- lead triage: `POST /api/matching/triage`
- candidate formal matching: `POST /api/matching/evaluate-candidate`
- candidate suggestions: `GET /api/matching/suggest/:candidateId`

## Lead Qualification

The CRM admin lead workbench includes a qualification overlay for staff-verified profile data.

### Why It Exists

CNV customer data is treated as sparse intake data. It is enough to create or update a lead, but it is not enough to drive full lead score and formal matching by itself.

The qualification overlay lets staff fill or verify the fields that the business rules require but CNV does not reliably provide.

### Backend Contract

The frontend uses:

- `GET /api/leads/:id/qualification`
- `PATCH /api/leads/:id/qualification`

### Operator-Owned Inputs

The current workbench captures:

- verified age and gender
- passport presence
- height and weight
- experience level and years
- strong skill indication
- readiness timing
- job-understanding confirmation
- preferred region
- late cancellation, no-show, and unreasonable cancellation counts
- inconsistency count
- worked-abroad and clean-history indicators
- tattoo risk
- health-fit confirmation
- explicit risk-history state
- qualification note

### Validation Expectation

When this panel changes:

1. the backend qualification endpoint should persist the overlay
2. lead score should be recalculated from merged data
3. matching suggestions and evaluations should reflect the verified values

The lead workbench also resolves linked candidate context so suggested orders can create real applications without manual UUID entry.

## Applications

### Current Scope

The applications workspace supports:

- real application list and detail retrieval
- lifecycle updates for application status and interview metadata
- queue visibility for live backend records

### Current Boundary

Broad application creation is not yet exposed as a standalone search/picker flow in the applications workspace.

Application creation currently depends on candidate context resolved from the lead workbench and recruitment APIs.

## Orders

### Current Scope

The orders workspace displays the stored criteria used by matching:

- gender requirement
- age range
- minimum height
- returnee acceptance
- experience requirement

Admin users can create and edit orders directly from the orders workspace. Staff users keep a read-only demand catalog and quick lead-triage workflow.

## Documents

### Current Scope

The page supports:

- document listing and filtering
- lead-scoped checklist summaries
- candidate-scoped checklist summaries
- document record creation
- document metadata and status updates

### Current Data Model

The backend document module currently treats files as metadata-driven records:

- `docType`
- `status`
- `fileUrl`
- `storageBucket`
- `issueDate`
- `expiryDate`

The module is designed as a readiness and compliance workspace, not a generic file browser.

### Deferred Enhancement

Binary upload/download, storage-provider integration, and richer audit trails remain intentionally deferred.

## Training And Finance

### Current Scope

The page supports:

- training-finance record listing
- lead and order filtering
- milestone record creation
- milestone record updates

Tracked fields currently include:

- `orderType`
- `depositStatus`
- `amountPaid`
- `trainingStartDate`
- `trainingProgress`
- `visaDate`
- `departureDate`

### Operational Meaning

This module is a downstream readiness workspace, not a full finance system.

When operators update visa or departure milestones, the backend may also advance candidate lifecycle state and lead progression state.

## Pipeline

### Current Scope

The page renders case rows keyed by lead and summarizes:

- current lead stage
- linked candidate
- latest application state
- document blockers
- latest training-finance milestone
- next recommended action

### Why It Uses A Dedicated Endpoint

The pipeline is intentionally not composed by the frontend from separate module pages. The backend provides an aggregated pipeline contract so operators can work from one queue instead of stitching together unrelated module calls in the browser.

### Deferred Enhancement

Later improvements can include:

- ownership assignment
- SLA indicators
- board or lane view
- manager exception queue
- stage-specific bulk actions

## Admin

### Current Scope

The admin workspace currently covers:

- operator list/filter/create/update
- role and activation management
- readonly backend/CNV system status
- CNV token test and webhook registration lifecycle actions
- CNV customer-read verification with refresh, total count, top customer rows, and raw payload output
- recent admin audit log entries
- recent auth session review and revocation

### Current Boundary

This workspace is intentionally limited to the identity-and-access layer plus safe integration control surfaces. The CNV customer-read panel validates SSO scope and API connectivity; it does not create CRM leads automatically.

It does not yet include broader runtime configuration controls or general policy editing.

## Verification

Relevant frontend verification commands:

```bash
npm run lint --workspace @social-crm/crm-admin
npm run build
```
