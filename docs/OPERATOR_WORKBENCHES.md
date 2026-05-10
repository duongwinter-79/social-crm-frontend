# CRM Admin Operator Workbenches

This document consolidates the current operator-facing frontend workbench behavior for the live CRM admin modules.

## Conversations

### Purpose

The conversations workspace is the Zalo OA operator inbox for stored CRM interaction data. It lets staff inspect the inbound thread/message history that the webhook has already received and saved.

### Current Backend Contract

The admin app uses:

- `GET /api/interactions/threads`
- `GET /api/interactions/threads/:id`
- `GET /api/interactions/threads/:id/messages`
- `GET /api/interactions/leads/:leadId/threads`

Thread queues support pagination and filters for channel, lead id, analyze status, and search. Message lists support pagination plus optional direction and message type filters.

### UI Responsibilities

The conversations page should surface:

- recent Zalo thread queue and pagination
- linked lead identity, phone, source, and current lead status
- last message, total message count, and unscanned inbound text count
- extraction/analyze status so operators can spot delayed AI processing
- recent stored messages with inbound/outbound direction and AI scan state
- raw webhook payload panels for debugging Zalo event shape

### Important Boundary

The page reads CRM database records only. It does not fetch historical Zalo OA messages directly and it does not replace the lead workbench for qualification edits or status transitions.

## Matching

### Purpose

The admin matching screen supports two distinct workflows:

- preliminary lead triage before a lead has become a fully qualified candidate
- formal candidate matching after a structured candidate/profile exists

Lead triage should not be treated as the final recruitment matching decision. Formal candidate matching is the candidate-stage evaluation operators use for recruitment fit review, manager approval needs, and application decisions.

### Current Backend Contract

The admin app uses:

- `POST /api/matching/triage`
- `POST /api/matching/evaluate-candidate`

Lead-triage request body:

```json
{
  "leadId": "<lead-uuid>",
  "orderId": "<order-uuid>"
}
```

Candidate-matching request body:

```json
{
  "candidateId": "<candidate-uuid>",
  "orderId": "<order-uuid>"
}
```

Lead-triage response shape includes:

- `mode`
- `dataQuality`
- `missingRequirements`
- `warnings`
- `preliminaryFit`
- `suggestedAction`
- nested `matching` result with conclusion, total score, breakdown, flags, eligibility, and approval state

Candidate-matching response shape includes:

- `mode`
- `candidateId`
- `orderId`
- nested `matching` result with conclusion, total score, breakdown, flags, eligibility, reject reason, and approval state

### UI Responsibilities

The matching page should surface:

- eligibility and conclusion
- score breakdown
- missing required signals for lead triage
- warnings, preliminary fit, and suggested next action for lead triage
- flags and reject reason
- manager approval state
- selected lead/candidate context beside selected order criteria

### Important Distinction

Do not confuse these backend surfaces:

- lead triage: `POST /api/matching/triage`
- candidate formal matching: `POST /api/matching/evaluate-candidate`
- candidate suggestions: `GET /api/matching/suggest/:candidateId`

## Lead Qualification

The CRM admin lead workbench includes a qualification overlay for staff-verified profile data.

## Lead AI Snapshot And Structured Extraction

The lead workbench AI snapshot shows saved extraction data from the backend, not a live-only client calculation.

### Refresh Behavior

The `Refresh structured extraction` action calls:

- `POST /api/ai-extraction/process-thread`

The backend returns `202 Accepted` and continues extraction in the background. The UI therefore shows an explicit background status:

- starting
- running
- completed
- timeout
- failed

While extraction is starting or running, the refresh button is disabled and the card explains that the operator can keep working. The frontend polls fresh lead/thread state and AI suggestions every 3 seconds for up to 60 seconds, then refreshes lead detail, qualification, profile, transitions, order suggestions, thread messages, and lead list data.

### Data Boundary

The snapshot displays persisted backend data:

- `lead.aiExtractedData`
- `GET /api/leads/:id/ai-suggestions`
- lead thread `analyzeStatus` and `lastAiExtractedAt`

It does not directly call Gemini or parse messages in the browser.

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

### Suggested Orders Boundary

The lead workbench only shows formal suggested orders after `GET /api/recruitment/candidates/by-lead/:leadId` returns a candidate.

When no candidate exists, the suggested-order panel shows qualification guidance instead of catalog fallback rows or disabled application buttons. Operators should complete the qualification overlay and use backend lead transitions so the backend can create the candidate record before formal matching.

## Applications

### Current Scope

The applications workspace supports:

- real application list and detail retrieval
- application creation from candidate search and order selection
- lifecycle updates for application status and interview metadata
- queue visibility for live backend records

### Creation Rules

Application creation uses:

- `GET /api/recruitment/candidates`
- `GET /api/orders`
- `POST /api/applications`

The frontend validates the same status-specific fields enforced by the backend:

- `interview_scheduled` requires `interviewDate`
- `interview_failed`, `rejected`, and `withdrawn` require `rejectReason`

The lead workbench can still create applications from resolved candidate context when operators are working directly from suggested orders.

The applications workspace and matching workspace share the same candidate picker component for candidate search by code, linked lead name, or phone.

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
