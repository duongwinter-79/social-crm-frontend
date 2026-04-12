# Documents Workbench

The CRM admin documents workspace is now backend-backed.

## Current Scope

The page supports:

- document listing and filtering
- lead-scoped checklist summaries
- candidate-scoped checklist summaries
- document record creation
- document metadata and status updates

## Current Data Model

The backend document module currently treats files as metadata-driven records:

- `docType`
- `status`
- `fileUrl`
- `storageBucket`
- `issueDate`
- `expiryDate`

This means the current operator flow is ready for checklist management and readiness tracking even before full binary upload and download handling is implemented.

## Context Resolution

The workspace can operate in either:

- lead-only mode
- candidate-linked mode

If only `leadId` is provided, the frontend attempts to resolve the linked candidate via the recruitment API so the candidate checklist can be shown when available.

## UX Intent

The module is designed as a readiness and compliance workspace, not a generic file browser.

The checklist is the primary operational view:

- what is required
- what is missing
- what is verified
- what is expired

## Deferred Enhancement

Binary upload/download, storage-provider integration, and richer audit trails are intentionally deferred. The current module is meant to support real workflow progress without pretending that full file-management infrastructure is already complete.
