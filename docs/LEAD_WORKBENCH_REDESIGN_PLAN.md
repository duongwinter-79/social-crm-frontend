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

**2.3 FORM CHUẨN is deliberately incomplete, and says so.**
`form-chuan-entry-panel.tsx:643`: *"Passport, criminal record and health check
print from the Form & documents section."* The core form sends the operator to
another section to finish the document it exports.

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
| `hasPassport` | Step 3 · Học vấn & giấy tờ | Already a printed cell (*Hộ chiếu*) |
| `hasWorkedAbroad` | Step 5 · Nguyện vọng | Sits with the previous-contract block |
| `healthMeetsCriteria` | Step 3 · Học vấn & giấy tờ | Printed cell (*Sức khỏe · Tiêm*) |
| `hasRiskHistory` | Step 3 · Học vấn & giấy tờ | Printed cell (*Tư pháp*) |

`displayName` (channel handle) is not form data — it becomes read-only text in
the page header.

Moving these three into step 3 lets the hint at `:643` be deleted and makes the
export self-sufficient from one screen.

## 5. Phases

Each phase ships on its own and leaves the app working.

**A · Delete what is already dead** *(~1h, no behaviour change)*
Remove the duplicate badge (`:487`/`:489`), drop `skills` from `SECTION_META`,
delete the `<pre>` JSON dump, fix the stale "shared shell" comment.

**B · Fold `departure` into `progressFinance`** *(~1h)*
Delete lines 943–962 and the `departure` key. If the three dates are wanted at a
glance, they belong in the page header, not a section.

**C · Make the form self-sufficient** *(~3h)*
Add the five inputs from §4 to `form-chuan-entry-panel.tsx` using the existing
`FieldWithProvenance` wrapper so the verified/extracted state and the *Dùng*
affordance keep working. Delete the `:643` hint. **Verify the export fills the
Hộ chiếu / Tư pháp / Sức khỏe cells and that the FORM_STANDARD pipeline gate
still computes** — this is the one step that can silently break the gate.

**D · Delete `basic`** *(~2h)*
Remove lines 636–856 and the `basic` key. No new mutation work: §2.2 shows the
plumbing already exists. One save button for the whole record.

**E · Demote `extraction` to a banner** *(~3h)*
Replace the section with a strip at the top of the form — *"N giá trị AI chưa
xác minh · Dùng tất cả"* — since per-field accept already exists inline. Move
the conversation viewer and the ask-AI panel into **Lịch sử**.

**F · Regroup and rename** *(~2h)*
Collapse to the four sections in §3, drop `GROUP_LABEL`/`GROUP_ORDER`, move
section labels into `ui-text.registry.ts`.

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
