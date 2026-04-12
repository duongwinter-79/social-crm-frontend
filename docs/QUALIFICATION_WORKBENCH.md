# Qualification Workbench

The CRM admin lead workbench includes a qualification overlay for staff-verified profile data.

## Why It Exists

CNV customer data is treated as sparse intake data. It is enough to create or update a lead, but it is not enough to drive full Lead Score and formal Matching by itself.

The qualification overlay lets staff fill or verify the fields that the business rules require but CNV does not reliably provide.

## Backend Contract

The frontend uses:

- `GET /api/leads/:id/qualification`
- `PATCH /api/leads/:id/qualification`

These endpoints store verified data separately from raw intake data.

## Operator-Owned Inputs

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

## UX Intent

The overlay is the operator review layer between sparse CNV intake and downstream lead score and matching behavior.

The page deliberately keeps both snapshots visible:

- raw extracted data
- verified qualification data

## Validation Expectation

When this panel changes:

1. the backend qualification endpoint should persist the overlay
2. lead score should be recalculated from merged data
3. matching suggestions and evaluations should reflect the verified values

This flow is now part of the expected CRM E2E validation path.

## Recruitment Linkage

The lead workbench now also resolves the linked candidate record through the recruitment API.

That allows suggested orders to create real applications without asking operators to paste raw candidate IDs.

## Deferred Automation Note

A true browser E2E suite for this workbench is intentionally deferred for a later implementation phase.

When resumed, automation should cover:

- lead appears after intake
- operator opens workbench
- operator saves qualification overlay
- updated score and matching behavior appear after refresh
