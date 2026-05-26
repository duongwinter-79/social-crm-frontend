# Changelog

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
