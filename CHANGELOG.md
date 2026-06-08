# Changelog

## 2026-06-07

### AI snapshot panel — field policy from a single source

- the AI snapshot card (`features/leads/lead-ai-snapshot-card.tsx`) now imports `SUGGESTION_ROUTING`, `FIELD_DISPLAY_ALIASES`, `TRACKED_AI_FIELDS`, and `REVIEWABLE_AI_FIELDS` from `field-policy.generated.ts` — generated from the backend field manifest — instead of hand-maintained copies that had to be kept in sync by review
- fixed phantom "Đã lưu" rows: the JSONB sweep now renders only `REVIEWABLE_AI_FIELDS`, so non-reviewable scoring/merge inputs (age, dateOfBirth, address, jobNeeds, interests) no longer appear in the review surface as dead, never-actionable rows
- `field-policy.generated.ts` is an auto-generated artifact (do not hand-edit); the backend `test:field-policy-codegen` guard fails if it drifts from the manifest

### Candidate dossier — generated from the field registry

- the read-only candidate dossier (`features/leads/candidate-dossier-panel.tsx`) now renders `DOSSIER_FIELD_ROWS` from `dossier-fields.generated.ts` (generated from the backend registry) instead of a hand-maintained 30-row list
- new dossier fields now shown: `languages`, `alcohol`, `smoking`, `surgery`, `birthDefect`, `referrer`
- the form verify/confirm screen (`features/applications/application-detail-page.tsx`) gains the same six fields so operators can confirm/enter them; its commit-contract field list stays hand-maintained for now (different key shape: extraction `name` vs CandidateProfile `fullName`)

## 2026-06-02

### UI text — in-context editing (v2)

- added an admin-only **Edit text** mode (header toggle) that turns editable copy into clickable, highlighted spans on the real CRM screens, replacing the table-only editor as the primary surface
- added `<UiText id="…">` as the editable render seam: renders a bare string in normal mode (zero wrapper / no layout shift), a highlighted gear-affordanced span in edit mode
- added an anchored inline editor popover with EN/VI fields, a live word-level diff vs the code default, length + required-`{variable}` guards, and Preview / Save / Reset wired to the existing override mutations
- added edit-mode highlight states: amber = unsaved draft, indigo = saved override, rose = stale/unknown key
- extended `UiTextProvider` with `isEditMode`, `activeEditKey`/anchor, `openEditor`/`closeEditor`, and `statusFor` (session-persisted)
- converted the first in-context nodes: Journey board "Open journey" button + cohort title, candidate dossier titles, lead workbench dossier title (string-prop usages like `SectionHeader` eyebrow stay on `text()`)
- added a word-level diff utility with unit tests (word-boundary diff avoids Vietnamese diacritic noise)
- widened `SectionHeader` `title`/`eyebrow`/`description` to `ReactNode` so page-level titles can be edited in context
- expanded in-context coverage to page titles on Dashboard, Journey board, Leads inbox, and Orders catalog
- made all primary sidebar nav labels + hints in-context editable (Dashboard, Leads, Conversations, Journey, Orders, Import, Extract)
- widened `EmptyState` `title`/`description` to `ReactNode`
- fully converted the Journey workbench as a template: panel title, form Manage/Upload buttons, View dossier, Close, both phase helper texts, the candidate-not-found empty state, and the workbench links — leaving data-bound values, dynamic counts, phase-nav labels, and `aria-label`s on `copy()` by design
- expanded structural-text coverage across Conversations, Order detail, Orders list, Training-Finance detail, Leads inbox, and the full Lead workbench (page titles/eyebrows/descriptions, panel titles + subtitles, helper texts, empty/loading states)
- converted Import + Extract admin screens and the core user-facing modals: form-intake modal header + the full form-intake content (ApplicationDetailPage panels: upload, staged file, confirm fields, phone/name matches, create/apply/replace) and the dossier modal eyebrow — registry now ~137 editable keys (confirmation dialogs intentionally excluded)

### UI text — Phase 2 hardening

- added registry guard tests (run under `npm test`): every `<UiText id>` / `text("key")` referenced in source must exist in the registry; no duplicate keys; non-empty EN+VI defaults; default text within its own maxLength; plus a warning for unreferenced keys
- added a **Review drafts** sheet (opened from the preview strip) to see every staged draft with a per-language diff and Save all / Discard all in one step
- repositioned the `/ui-text-overrides` admin page as the bulk "manage all / cleanup" view; in-context "Edit text" is now the primary editing path

## 2026-06-01

### UI text overrides

- added a controlled UI text override layer for approved CRM admin strings: frontend registry, runtime provider, API hooks, and an Admin -> UI Text editor
- added session-local preview mode so admins can stage draft text, open affected screens, and exit preview before saving
- moved the editor to a dedicated admin-protected `/ui-text-overrides` screen and added a navigation tile from `/admin`
- polished the UI Text editor with clearer Vietnamese copy and route-based screen labels instead of technical component names
- corrected the default Vietnamese text for UI override registry keys and dashboard workflow fallbacks
- wired initial editable keys for app-shell navigation, selected Journey board labels, and dossier titles
- documented how to register new editable keys in `docs/UI_TEXT_OVERRIDES.md`

## 2026-05-30

### Journey consolidation

- collapsed the candidate lifecycle into a single **Journey** module: cohort board (`/journey`, one horizontal 5-phase track per candidate, fed by `/pipeline`) + single-candidate workbench (`/journey/:leadId`)
- retired the standalone Pipeline, Applications (list/create/status), form-intake, and Training & Finance screens — routes now redirect into Journey; deleted `applications-page.tsx`, `form-editor-page.tsx`, `matching-page.tsx`
- removed the standalone Matching console (`/matching` → `/orders`); matching is now order-first on Orders and candidate-first in Journey
- sidebar is now: Dashboard · Leads · Conversations · Journey · Orders · Import · Extract · Admin
- repointed dashboard + lead-workbench CTAs to `/journey/:leadId`

### Journey workbench UX

- workbench renders the five phases as an **accordion** — only the active phase shows its body, so the page no longer grows long; it opens on the candidate's current phase
- §1 Form intake now opens in a **popup modal** (staged upload → verify → commit) instead of inline
- §3 Application hosts the create-gate + status transitions inline (shared `application-logic` state machine); §4 embeds the training-finance milestone editor
- application delete is hidden for advanced applications (mirrors the backend guard); use Withdraw/Reject to close
- phase rail + shared candidate-workbench nav made responsive

### Order-first matching

- Orders rows gain an expandable **suggested candidates** panel (`GET /matching/suggest-candidates/:orderId` via `useOrderSuggestedCandidatesQuery`)
- "Open & link" opens the **Journey workbench as a modal** (the same `JourneyWorkbench` component the page renders), pre-targeted to that order and opening on the Application phase — so form upload / dossier / linking all happen in-context. (The earlier bespoke candidate-link-modal was a partial duplicate and was removed.)

### Lead workbench restructure

- lead-workbench now renders inside the shared section-nav shell with a real pipeline **status line** (grounded in the actual 11-state lead machine)
- removed the lead→orders suggestion panel from the workbench (backend engine kept, reused for order→candidates)
- **Basic info** now opens with an editable **Identity** block (full name, display name, phone, region) saved via the lead update — staff can correct core fields directly (important because extraction suggestions can be wrong and weren't rejectable). Duplicate phone shows the backend's 409 conflict in a toast
- **Open dossier / Xem hồ sơ** now opens a popup modal instead of navigating (in both lead-workbench and Journey §2)

### Reject AI extraction suggestions

- `FieldWithProvenance` and the AI snapshot card (`LeadAiSnapshotCard`) gain a **Reject / Từ chối** action next to Apply, calling `useDismissLeadAiSuggestionMutation` → `POST /leads/:id/ai-suggestions/:fieldName/dismiss`
- dismissed suggestions stop resurfacing; a success toast confirms

### Journey i18n

- localized the pipeline next-action and blocker strings on the Journey cohort board (`formatPipelineNextAction` / `formatPipelineBlocker`), including doc-type tokens in "Missing docs: …"

### Verify screen layout

- the form-intake verify screen ("Xác nhận hồ sơ ứng viên") replaced the long vertical table with a multi-column card grid (up to 3 across on desktop)
- the commit / match block (Ghi vào ứng viên đã chọn · Xác nhận & gắn hồ sơ · Huỷ và xoá file) now sits on top and the field-confirmation panel runs full width below it, so the cards have room and the modal scrolls far less

### Form intake → dossier flow

- in the form-intake modal's committed state, the action now opens the **dossier popup** ("Xem hồ sơ ứng viên →") instead of navigating to the lead workbench — the operator stays in the Journey flow

## 2026-05-27

### Training-finance workspace refactor

- split `/training-finance` into a dedicated milestone ledger plus `/training-finance/new` and `/training-finance/:recordId` create/edit detail screens
- moved the old inline `Create milestone record` panel out of the list page so the ledger stays focused on scanning records
- added a frontend API detail hook for the existing `GET /training-finance/:id` backend endpoint
- improved training-finance list metrics, filters, table readability, and application/order consistency guidance
- kept departure-date gating in the detail screen: departure still requires a linked application marked `ready_to_depart`

### Orders and confirmation UX

- split `/orders` into a paginated catalog list plus dedicated `/orders/new` and `/orders/:orderId` detail screens for create, view, and edit
- removed the duplicated create action from the Orders list and kept a single `New order` entry point
- added a reusable CRM confirmation dialog and replaced current browser confirmation boxes across application deletion, training-finance deletion, import apply/cancel, and extract apply
- changed application delete copy to `Delete record` / `Xóa bản ghi`
- disabled application row `Save` by default until the operator changes status, interview date, or reason

### Dashboard operations redesign

- replaced the old lead-window dashboard with an operations control surface backed by global dashboard aggregates and the pipeline API
- added attention cards for intake, form-ready leads, active applications, document blockers, and departure gaps
- added role queue summaries and a priority action table that links operators to the right lead, application, form, or training-finance workspace
- fixed dashboard status handling to work with lowercase backend status values instead of stale uppercase checks

### Admin correction controls

- added admin-only delete controls to the Applications table for records created by mistake
- added admin-only delete controls to the Training & Finance selected-record panel
- added correction guidance copy so normal status progression remains separate from destructive admin cleanup
- hid training-finance create/update submission from users without the finance role, matching the backend permission gate

### Training-finance application link

- added linked-application selection to training-finance create/edit forms and auto-filled the order from the selected application
- showed linked application status in the milestone ledger and selected-record summary
- blocked departure-date saves in the UI unless the linked application is `ready_to_depart`, matching the backend gate

### Application status transition UI

- limited each application row editor to the current status plus backend-valid next statuses, preventing operators from selecting invalid jumps like `matching -> ready_to_depart`
- marked terminal application statuses as read-only in the Applications table
- gated application create/update controls behind `manage_recruitment`, matching the backend role scope

### Ready-to-depart application status

- added `ready_to_depart` to the Applications table status filter and row editor
- added bilingual display text for the new application status so operators can mark an application as ready before training-finance can complete departure

### Lead workbench flow cleanup

- moved the full form-derived candidate dossier out of the lead workbench into a dedicated `/leads/:leadId/dossier` route
- replaced the embedded dossier body on the workbench with a compact dossier summary and direct links to the dossier or form upload flow
- changed the workbench conversation panel so messages are hidden by default and only mounted after the operator clicks "Show conversation"; a separate button opens the full Conversations page for the selected thread
- kept the manual AI question and lead-stage matching areas on the workbench, but reduced always-visible document/conversation weight
- added a shared contextual navigation bar between Form, Candidate dossier, and Application surfaces for a selected lead
- `/applications?tab=applications&leadId=...` now filters the application table to the selected lead so the Application workflow nav lands on a real editable application context

## 2026-05-26

### Permission helper + role-aware UI gates

- new `packages/api/src/permissions.ts` exposing `usePermissions()` hook plus pure `hasPermission(user, p)` and `hasRole(user, role)` helpers; matrix mirrors the backend `permissions.guard.ts` 1:1 (admin, recruiter, document_staff, finance_staff, user → admin_all / view_leads / edit_leads / verify_documents / manage_finance / manage_recruitment)
- exported `Role`, `Permission`, `usePermissions`, `hasPermission`, `hasRole` from the `@social-crm/api` index alongside the existing session helpers
- lead workbench gates wired through `usePermissions()`:
  - status-transition toolbar (per-status `Move to …` buttons) hidden when the operator lacks `edit_leads`
  - "Save verified qualification" button replaced with read-only hint when operator lacks `edit_leads`
  - "Upload application file →" CTA hidden entirely when operator lacks `edit_leads`
  - "Restore lead" button on the disqualified-banner hidden behind admin-only check; viewers/operators see an "Admin only" hint inline
- no other workbench affordances changed (transitions data still fetches; AI snapshot, dossier panel, lead summary all remain visible to viewers)
- frontend `vite build` clean; `lead-workbench-page` chunk grew ~2 KB (gzipped 17 kB)

### Candidate dossier panel on the lead workbench

- new `apps/crm-admin/src/features/leads/candidate-dossier-panel.tsx` rendering the form-derived dossier read-only, organised into 6 sections (Identity / Physical / Background / Family / Work / Wishes) with bilingual labels
- 30-row field metadata covering both typed columns (top-level on `candidate_profiles`) and soft keys (inside `softFields` JSONB); `readDossierValue` routes to the right source per row
- panel auto-hides when the lead has no dossier at all; within the panel, individual sections only render if at least one field is populated
- mounted on `lead-workbench-page.tsx` directly under `LeadAiSnapshotCard`
- subtitle directs operators to `/applications/detail?leadId=…` (remove file → re-upload) as the only way to edit the dossier — no in-place edit affordance

### Two-source Verify panel on the upload flow

- rewrote the Verify panel on `apps/crm-admin/src/features/applications/application-detail-page.tsx` to compare extracted form values against the current dossier with a per-field 3-state radio (**Keep** / **Use form** / **Edit**)
- 29 fields × 6 sections; form-wins default — radios initialise to `Use form` wherever the form has a value, else `Keep`
- override input adapts to field input type (text / number / select Male-Female / select Yes-No)
- new helpers in the page module: `readFieldValue`, `isNonEmpty`, `buildDossierFields` (constructs the typed + softFields payload from operator choices + overrides)
- "Reset all to form-wins" button restores the default selection
- updated `packages/api/src/types.ts`: `FormStandardExtractedFields` expanded to 15 keys; `VerifyPendingResult` now exposes `extractedSoft` and `currentSoft`; `CommitPendingFormPayload`: `applyFields` → `dossierFields`
- frontend `vite build` clean; `application-detail-page` chunk: 34.66 kB / 10.79 kB gzipped

### Applications workflow and form replacement

- rebuilt `/applications` as an operational Applications workspace with separate tabs for real candidate-to-order application records and form documents
- removed the unsafe formal suggested-order placement card from the lead workbench; operators now create applications from the Applications page by explicitly selecting both candidate and order
- added frontend creation gates that require a selected candidate, selected order, verified uploaded form, and eligible lead status before an application can be created
- added a Replace form section on the form detail page so an incorrect uploaded form can be staged, verified, and committed while the current verified form remains active
- disabled standalone Remove file when the form is already used by an application and replaced the warning copy with clearer guidance: upload a replacement so the application keeps a complete form record
- extended API types to expose active form version and application form-version evidence fields returned by the backend

## 2026-05-23

### Applications screen — hồ sơ ứng tuyển overhaul

- Renamed all display text from "standard form / form chuẩn" to "hồ sơ ứng tuyển" across the Applications page, lead workbench, and form editor.
- Replaced the free-text UUID lead input with a `LeadPicker` dropdown component (`src/components/lead-picker.tsx`). Shows `displayName · phone` and a short ID prefix; supports live search via `useLeadsSearchQuery`.
- Replaced the upload-only panel with a unified form register table (`getFormStandardRegister`) that shows all leads with an uploaded hồ sơ ứng tuyển — columns: Ứng viên, SĐT, Đơn đang ghép, Trạng thái hồ sơ.
- Added inline file actions per row: **View** (opens file in new tab), **Edit** (Word files trigger download; PDF files open inline), **Download** (direct download). Removed duplicate Open/Download buttons from the old Actions column.
- Added unlink flow with confirmation dialog: clicking "Xoá hồ sơ ứng tuyển" reveals a rose-tinted confirm/cancel block before calling `useUnlinkFormStandardMutation`.
- Right panel now shows an "Edit application fields →" primary button linking to the new form editor page.

### Form field editor (`/applications/:leadId/edit`)

- New route and page (`src/features/applications/form-editor-page.tsx`) for in-CRM editing of extracted form fields without download/re-upload.
- Pre-fills all fields from `mergedData` (verified values take priority over AI-extracted values).
- Provenance badges shown per field: green "Đã xác nhận" when the field is in `verifiedKeys`, indigo "AI đề xuất" when an AI suggestion exists.
- Fields covered: fullName, phone, gender, birthYear, height (cm), weight (kg), experienceField, experienceDetails, desiredIndustry, preferredRegion, desiredSalary, note.
- On save: name/phone written via `useUpdateLeadMutation`; all qualification fields written to `verifiedProfileData` + `verifiedKeys` via `useUpdateLeadQualificationMutation`. Returns to `/applications` on success.
- Route title registered in router as "Chỉnh sửa hồ sơ ứng tuyển" (lazy-loaded).

## 2026-05-13

### CSV export from leads and orders pages

- Added `apiClient.exportLeadsCsv` and `apiClient.exportOrdersCsv` that fetch the file as a Blob and parse `Content-Disposition` (including the RFC 5987 `filename*=UTF-8''` form) for the suggested filename.
- Added a shared `triggerBlobDownload` helper in `packages/api/src/downloads.ts` so JWT-protected endpoints can drive a real browser download via a transient anchor element.
- Added "Xuất CSV / Export CSV" buttons to the leads filter toolbar and the orders header. The leads button passes the current `search`, `status`, `source`, and `lang` so the downloaded file matches what the operator sees on screen.

### Lead disqualification UI — banner, reason form, restore button

- Replaced the immediate-patch behavior on the "Move to disqualified" toolbar button with an inline reason form. The operator types a reason and confirms; the backend rejects the patch when the reason is missing.
- Added a red `InfoStrip` that renders on the lead workbench whenever `lead.status === "disqualified"`, showing the recorded reason, the user who triggered it, the timestamp, and the previous pipeline state.
- Added a "Khôi phục về …" button inside the banner that calls the new `POST /leads/:id/restore` endpoint via `useRestoreLeadMutation`, reverting the lead to its `previousStatus` in one click. Disabled (with tooltip) when `previousStatus` is null — protects against legacy disqualifications recorded before metadata capture existed.
- Extended the `Lead` frontend type with `disqualifiedAt`, `disqualifiedByUserId`, `disqualifiedByUsername`, `disqualifiedReason`, `previousStatus`, and `verifiedKeys`.

### Triage chip vocabulary cleanup

- Renamed the suggested-orders rejection chip from "Bị loại / Rejected" to "Không hợp đơn này" so it stops colliding with the lead-pipeline state "Đã bị loại / Disqualified".
- Routed `preliminaryFit` and `conclusion` badges in suggested-orders through `formatEnum` so values like `insufficient_data` / `not_fit` / `high_priority` render as "Chưa đủ dữ liệu xác minh" / "Không phù hợp" / "Ưu tiên cao" in VN mode.
- Added enum labels for `promising`, `needs_review`, `insufficient_data`, `not_fit`, `high_priority`, `conditional`, `limited` to `i18n/index.tsx`.

### i18n field-label refactor (Vietnamese coverage)

- Centralised field labels, enum-valued field detection, boolean field detection, and numeric unit suffixes in `i18n/index.tsx`. Added four new helpers on the `useI18n()` context: `formatFieldLabel`, `formatFieldValue`, `formatChannel`, `formatConfidence`, `formatExtractionSource`.
- Removed the raw mono field-name line (`jobNeeds`, `heightCm`, etc.) from each row in the AI snapshot card; the human label is enough and the raw key is preserved as a `title` tooltip.
- Updated `lead-ai-snapshot-card.tsx` and `field-with-provenance.tsx` to use the new helpers — confidence badges (`high`/`medium`/`low`), source badges (`deterministic`/`ai_llm`/`webhook`), array values like `["labor_export","consultation"]`, booleans, and numbers with units now all render in the active language.
- Added enum labels for `labor_export`, `consultation`, `domestic_job`, `visa_only`, the four channel values (`zalo`, `facebook`, `miniapp`, `tiktok`, `website`, `gioi_thieu`), and the three region values (`north`, `central`, `south`).
- Updated `leads-page.tsx` to translate the channel filter dropdown, the table source cell, and known enum tag badges via `formatChannel` / `formatEnum`.

### CNV removed from the operator UI

- Deleted the `/integrations` route, sidebar nav entry, icon variant, and admin-only filter branch in `apps/crm-admin/src/app/router.tsx`.
- Deleted `apps/crm-admin/src/features/integrations/integrations-page.tsx` along with its directory.
- Removed the "CNV remains available under Integrations" sentence from the conversations page subtitle and the "Integrations live under the Integrations tab" badge from the admin page.
- Removed `integrations: CapabilityState` from `CapabilityRegistry` and `capabilityRegistry` since nothing consumes it any longer.
- Kept the CNV API client methods (`testCnvToken`, `listCnvCustomers`, etc.) and React Query hooks intact behind a "do not add new UI callers" comment so the backend integration code can be re-enabled later without a rewrite. Backend `cnv-integration` module is untouched.

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
