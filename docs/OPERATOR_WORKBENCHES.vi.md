# Các Workbench Operator Của CRM Admin

Tài liệu này gom hành vi workbench cho các module CRM admin đang live.

## Matching

- giao diện hiện tại là lead-triage, không phải formal candidate matching
- dùng `POST /api/matching/triage`
- phải hiển thị eligibility, conclusion, score breakdown, missing signals, warnings, suggested next action

Phân biệt rõ:

- lead triage: `POST /api/matching/triage`
- candidate formal matching: `POST /api/matching/evaluate-candidate`
- candidate suggestions: `GET /api/matching/suggest/:candidateId`

## Lead qualification

- dùng `GET/PATCH /api/leads/:id/qualification`
- purpose: staff xác minh dữ liệu còn thiếu từ nguồn sparse như CNV
- thay đổi ở panel này phải ảnh hưởng tới lead score và matching behavior

## Applications

- hỗ trợ list, detail, lifecycle updates
- broad creation flow qua search/picker riêng vẫn chưa có
- hiện còn phụ thuộc candidate context từ lead workbench

## Documents

- hỗ trợ list/filter, checklist summaries, metadata/status updates
- data model hiện metadata-first:
  - `docType`
  - `status`
  - `fileUrl`
  - `storageBucket`
  - `issueDate`
  - `expiryDate`

## Training and finance

- hỗ trợ list/filter, tạo và cập nhật milestone
- tập trung vào readiness tracking, không phải full finance system
- visa/departure updates có thể kéo theo downstream state changes

## Pipeline

- render case rows theo lead
- tóm tắt lead stage, candidate linkage, latest application, document blockers, latest training-finance milestone, next action
- dùng dedicated aggregated backend endpoint

## Admin

- hỗ trợ user list/filter/create/update
- role/activation management
- readonly backend/CNV status
- CNV token test và webhook registration lifecycle actions
- audit log entries và auth session review/revocation

## Xác minh

```bash
npm run lint --workspace @social-crm/crm-admin
npm run build
```
