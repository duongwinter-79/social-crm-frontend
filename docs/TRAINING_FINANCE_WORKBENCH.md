# Training & Finance Workbench

The CRM admin training-finance workspace is now backend-backed.

## Current Scope

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

## Operational Meaning

This module is currently designed as a downstream readiness workspace, not as a full finance system.

Use it to track:

- commitment and deposit progress
- training start and progress notes
- visa readiness
- departure readiness

## Backend Side Effects

When operators update visa or departure milestones, the backend may also advance:

- candidate lifecycle state
- lead progression state

This is an intended product behavior, not a UI-only convenience.

## Deferred Enhancement

The current module does not attempt to behave like:

- a full accounting ledger
- a payment processor
- a reconciliation system

Those are later follow-up concerns after the main CRM flow is complete.
