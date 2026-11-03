# Lead workbench redesign — the form is the record

**Status:** proposed, not implemented · **Date:** 2026-11-03
**Surface:** `apps/crm-admin/src/features/leads/lead-workbench-page.tsx` (1135 lines),
`features/candidate-workbench/candidate-workbench.tsx` (180),
`features/leads/form-chuan-entry-panel.tsx` (782)

---

## 1. What the screen costs an operator today

Before a single field is reachable, the page presents:

| Chrome | Count |
|---|---|
| Sidebar sections across 3 groups | 8 |
| Group headers (HỒ SƠ / QUY TRÌNH / KHÁC) | 3 |
| Step chips inside FORM CHUẨN | 6 |
| Header badges + info strips | 6 |
| **Total navigational targets** | **~23** |

An operator filling one worker's form has to know that "Họ tên" lives in two of
those places and that only one of them prints.

## 2. Measured problems

Every item below was read out of the source, not inferred.

**2.1 `basic` and `formStandard` edit the same fields.**
Eight fields are editable on both screens with different labels and different
save buttons: `fullName`, `phone`, `birthYear`, `age`, `gender`, `heightCm`,
`weightKg`, `experienceField`. FORM CHUẨN calls them *Họ tên* / *Năm sinh*;
`basic` calls them *Họ và tên* / *Năm sinh đã xác minh*.

**2.2 `basic` is redundant as a write path.**
`form-chuan-entry-panel.tsx:245-248` already holds all three mutations —
`useUpdateLeadMutation`, `useUpdateLeadQualificationMutation`,
`useUpdateLeadDossierMutation` — and sequences them deliberately
(`:314` *"One after another, never in parallel"*). It already writes identity
including `fullName`/`phone`, and already honours `canViewPii` (`:282`).
FORM CHUẨN is strictly more capable than `basic`. The only thing `basic`
uniquely owns is five **inputs**, not plumbing.

**2.3 FORM CHUẨN sends the operator elsewhere for part of the record.**
`form-chuan-entry-panel.tsx:643`: *"Passport, criminal record and health check
print from the Form & documents section."*

**Corrected 2026-11-04, during phase C.** That sentence is *true* and must
stay. The printed Hộ chiếu / Tư pháp / Sức khỏe boxes are driven by uploaded
`Document` rows and their status/expiry
(`form-standard-export.service.ts:115-117` → `docState`), and the export never
reads the qualification flags `hasPassport` / `healthMeetsCriteria` /
`hasRiskHistory` at all. Those flags are a *different thing* — operator
verification answers that feed matching and scoring, not document status. The
two must not be conflated in labels or in the field map below.

**2.4 `departure` is a read-only view of `progressFinance`'s record.**
Lines 943–962 render three fields off `tf` — `departureDate`, `visaDate`,
`status`. `progressFinance` (line 937) mounts `TrainingFinanceDetailPage`,
which owns that record outright. 20 lines of section for zero new data.

**2.5 `history` ships developer output.**
Line ~995 renders `<pre>{JSON.stringify(qualificationQuery.data?.verifiedData …)}</pre>`
— a raw JSON dump on an operator screen. Its Summary panel also repeats Lead ID,
source, phone, region, created and updated, all shown elsewhere.

**2.6 The header prints the same warning twice.**
Lines 487 and 489 render two `Badge`s that both resolve to
*"Chưa tạo hồ sơ ứng viên"* when no candidate exists — visible as the duplicate
chip in the screenshot.

**2.7 `skills` is dead.**
Declared in `SECTION_META` (`candidate-workbench.tsx:55`), never passed by any
consumer. `CandidateWorkbench` has exactly one caller — the comment claiming it
is shared with the order-side modal is stale.

**2.8 Two ways to accept the same AI value.**
`extraction` is a 125-line section, while FORM CHUẨN already offers per-field
*"Chưa xác minh: … Dùng"* inline. The operator can accept a suggestion from
either place.

## 3. Target information architecture

Four sections, no group headers. The form stops being one of eight tabs and
becomes the screen.

| New section | Absorbs | Job |
|---|---|---|
| **Hồ sơ lao động** *(renamed FORM CHUẨN)* | `formStandard` + `basic` + `extraction` | Fill and verify every field that prints |
| **Giấy tờ** | `documents` | Files and evidence only |
| **Ứng tuyển & Tiến độ** | `application` + `progressFinance` + `departure` | Matching, money, dates |
| **Lịch sử** | `history` + conversation viewer | Chronology, cleaned |

Sidebar targets drop 8 → 4; group headers 3 → 0; the 6 step chips stay, because
they now navigate the only thing on the screen.

### The rename

The panel's own heading already reads *"Hồ sơ lao động — FORM CHUẨN"*.
Recommendation: **`Hồ sơ lao động`** for the section, with the export button
reading **`Xuất phiếu đăng ký (.docx)`** to match the real document title
(*PHIẾU ĐĂNG KÝ HỒ SƠ VÀ CAM KẾT*). Alternatives: `Phiếu đăng ký`
(names the output, not the record) or `Hồ sơ ứng viên` (collides with the
existing *hồ sơ ứng viên* = candidate record).

`SECTION_META` labels are hardcoded today. They should move into
`ui-text.registry.ts` like every other operator-facing string, so the customer
can rename sections without a deploy.

## 4. Field migration map — nothing is lost

The five fields `basic` uniquely owns all have a home:

| Field | Moves to | Why there |
|---|---|---|
| `region` | Step 1 · Cá nhân, beside `address` | It is an address field |
| `hasPassport` | Step 3, under *Thông tin xác minh* | Verification answer about papers |
| `healthMeetsCriteria` | Step 3, under *Thông tin xác minh* | Verification answer about papers |
| `hasRiskHistory` | Step 3, under *Thông tin xác minh* | Verification answer about papers |
| `hasWorkedAbroad` | Step 5 · Nguyện vọng | Sits with the previous-contract block |

`displayName` (channel handle) is not form data — it becomes read-only text in
the page header.

These four are **not** the printed Hộ chiếu / Tư pháp / Sức khỏe cells (§2.3),
so they sit under their own *Thông tin xác minh* heading and the hint at `:643`
stays, reworded to say which side drives the print. Done 2026-11-04.

## 5. Phases

Each phase ships on its own and leaves the app working.

**A · Delete what is already dead** *(~1h, no behaviour change)*
Remove the duplicate badge (`:487`/`:489`), drop `skills` from `SECTION_META`,
delete the `<pre>` JSON dump, fix the stale "shared shell" comment.

**B · Fold `departure` into `progressFinance`** *(~1h)*
Delete lines 943–962 and the `departure` key. If the three dates are wanted at a
glance, they belong in the page header, not a section.

**C · Move the five orphan fields onto the form** *(done 2026-11-04)*
Added the five inputs from §4 to `form-chuan-entry-panel.tsx`. They join the
panel's existing save path: `region` rides the identity patch (`updateLead`),
the other four the qualification patch (`updateQualification`), as tri-state
`"" | "true" | "false"` so an unanswered question stays distinct from a "no".

Verified against a local stack (Postgres in Docker, backend on :3000, seeded
test lead): set all five in the UI, saved, reloaded, and read them back out of
the database — `region='Nghệ An'`, `hasPassport=true`, `healthMeetsCriteria=true`,
`hasRiskHistory='none'`, `hasWorkedAbroad=true`.

**The gate is unaffected**, and this was checked rather than assumed: the
required set comes from the field manifest (`getRequiredFields()` →
`lead-completeness.util.ts`), and none of the four qualification fields carries
`required: true`. The required list is still exactly fullName, phone, birthYear,
gender, heightCm, weightKg, experienceField — the banner is unchanged after the
save.

**D · Delete `basic`** *(done 2026-11-04)*
**Scope was wrong in §4.** That section listed five fields as `basic`'s own;
enumerating every field it actually edited gave twenty-four, of which
**fourteen** had no home on the form. Worse, the four risk counters
(`lateCancellationCount`, `noShowCount`, `unreasonableCancellationCount`,
`inconsistentInfoCount`) existed in **no other file in the app** — deleting
`basic` as written would have removed the only way to record them.

So D became "move nine more, then delete": `experienceYears` → step 4,
`readyToDepartInMonths` → step 5, `tattooStatus` → step 1 (shown only when the
printed Hình xăm answer is "Có"; it is the scoring enum, not the printed
yes/no), the four counters → step 3's verification block, `note` and
`displayName` → step 6. Then the 221-line section went, along with the state
only it read (`identityForm`, `savedQualification`, `suggestionsByField`,
`isFieldVerified`) and four now-unused imports.

Verified by save round-trip on the local stack: `experienceYears=3`,
`noShowCount=2`, `readyToDepartInMonths=6`, `note='Kiểm tra phase D'` — the
note matters because it round-trips through `verifiedData._qualificationMeta`,
not a column.

**E · Demote `extraction` to a banner** *(done 2026-11-04)*
The AI block (progress + snapshot card) moved onto the worker-profile section
as a collapsed strip reading *"N giá trị AI chưa xác minh"*, or *"Dữ liệu AI"*
when the count is zero. Deliberately **not** reimplemented as a bare banner
with its own verify-all: the snapshot card computes that patch itself, and
rebuilding it would have risked the AI write boundary for a cosmetic gain.
Conversation and ask-AI moved into **Lịch sử**; a line of copy pointing at the
AI block "above" was corrected, since it is no longer above anything.

**F · Regroup and rename** *(done 2026-11-04)*
Four flat sections, no group headers: **Hồ sơ lao động**, **Giấy tờ**,
**Ứng tuyển & Tiến độ** (the old Ứng tuyển and Tiến độ & Tài chính, which read
the same records), **Lịch sử**. `GROUP_LABEL`, `GROUP_ORDER` and `SectionGroup`
are gone; `SECTION_META` now carries only a `uiTextId` and an icon, with the
labels in `ui-text.registry.ts` under `lead.section.*`, so the customer can
rename a section without a deploy.

Sidebar entries: 8 → 4. Group headers: 3 → 0.

Roughly 12 hours. Phases A and B are safe to land immediately; C is the one
needing real verification.

## 6. Risks

- **The pipeline gate reads verified fields.** Moving a field between panels
  must preserve its `lead_field_state` provenance wiring, or the FORM_STANDARD
  gate changes behaviour silently. Verify after phase C, before D.
- **Export regression.** The export pulls passport / criminal record / health
  from the documents side today. Re-render a .docx after phase C and diff it
  against one produced before.
- **`canViewPii` masking.** `basic` and FORM CHUẨN both guard phone. Deleting
  `basic` must not drop the guard — `:282` shows FORM CHUẨN already has it.
- **Operator muscle memory.** Staff trained on "Thông tin cơ bản" will look for
  it. The rename is customer-facing and should be confirmed before phase F.
