# Admin Matching Workbench

## Purpose

The current admin matching screen is a lead-triage interface.

It is designed for operator screening before a lead has become a fully qualified candidate with a structured profile.

It should not be treated as the final recruitment matching decision.

## Current Backend Contract

The admin app uses:

- `POST /api/matching/triage`

Request body:

```json
{
  "leadId": "<lead-uuid>",
  "orderId": "<order-uuid>"
}
```

Response shape:

```json
{
  "mode": "lead_triage",
  "leadId": "...",
  "orderId": "...",
  "dataQuality": {
    "completeness": 75,
    "presentSignals": ["gender", "age", "height"],
    "source": "lead_ai_extracted_data"
  },
  "missingRequirements": ["healthMeetsCriteria"],
  "warnings": ["HEIGHT_UNKNOWN"],
  "preliminaryFit": "needs_review",
  "suggestedAction": "request_profile_completion",
  "matching": {
    "conclusion": "conditional",
    "totalScore": 62,
    "breakdown": {
      "foundation": 32,
      "experience": 20,
      "risk": 10,
      "penalties": 0
    },
    "flags": [],
    "isEligible": true,
    "requiresManagerApproval": true
  }
}
```

## UI Responsibilities

The matching page should surface:

- eligibility and conclusion
- score breakdown
- missing required signals
- warnings
- preliminary fit
- suggested next action
- flags and reject reason

The operator should understand whether the next step is:

- qualify the lead for candidate matching
- request more profile data
- request risk review
- stop or reconfirm the lead

## Important Distinction

Do not confuse these two backend surfaces:

### Lead triage

- `POST /api/matching/triage`
- lead-stage, partial data, operator screening

### Candidate formal matching

- `POST /api/matching/evaluate-candidate`
- candidate-stage, structured profile, formal recruitment decision

## Suggestion Flow

The backend also exposes:

- `GET /api/matching/suggest/:candidateId`

This suggestion flow now uses the formal matching engine rather than the older heuristic scoring path.

## Verification

Relevant frontend verification commands:

```bash
npm run lint --workspace @social-crm/crm-admin
npm run build
```

Runtime check:

```bash
VITE_API_BASE_URL=http://localhost:3000
npm run dev:admin
```
