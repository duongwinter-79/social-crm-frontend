# Pipeline Workbench

The CRM admin pipeline workspace is now backend-backed.

## Current Scope

The page renders case rows keyed by lead and summarizes:

- current lead stage
- linked candidate
- latest application state
- document blockers
- latest training-finance milestone
- next recommended action

## Why It Uses A Dedicated Endpoint

The pipeline is intentionally not composed by the frontend from separate module pages. The backend provides an aggregated pipeline contract so operators can work from one queue instead of stitching together:

- leads
- applications
- documents
- training-finance

This reduces duplication and keeps the stage summary logic centralized.

## Current UX Model

The workspace is a case-centric queue, not a kanban board yet.

That is deliberate for the first version:

- reliable aggregated data first
- richer board interactions later if needed

## Deferred Enhancement

Later improvements can include:

- ownership assignment
- SLA indicators
- board or lane view
- manager exception queue
- stage-specific bulk actions
