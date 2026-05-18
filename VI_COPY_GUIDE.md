# Vietnamese CRM/XKLĐ Copy Guide

Use this guide when adding or changing Vietnamese copy in the CRM frontend.

## Source Of Truth

- Use `Bản dịch CRM tiếng Việt chuẩn.pdf` as the primary wording source.
- Keep the existing `copy({ en, vi })` pattern. Do not introduce a new i18n framework without a separate architecture decision.
- English copy may stay unchanged unless it is part of a shared component that is visible in Vietnamese mode.

## Approved Terms

| English concept | Vietnamese UI term |
| --- | --- |
| Lead | Ứng viên tiềm năng |
| Candidate | Ứng viên |
| Matching | Ghép đơn |
| Order | Đơn hàng |
| Application | Hồ sơ ứng tuyển |
| Pipeline | Tiến trình hồ sơ |
| Triage | Sàng lọc sơ bộ |
| Operator / Staff user | Nhân sự |
| Backend | API, hệ thống, máy chủ |
| Thread | Luồng hội thoại |
| Snapshot | Tóm tắt, dữ liệu đã lưu |
| Query | Câu hỏi, bộ lọc, yêu cầu |
| Engine | Hệ thống, quy tắc |
| Metadata | Thông tin mô tả |

## Copy Rules

- Do not leave English terms such as `triage`, `workspace`, `operator`, `candidate`, `query`, `snapshot`, `engine`, `payload`, or `endpoint` in Vietnamese user-facing copy.
- Use `ứng viên tiềm năng` before qualification and `ứng viên` after a candidate record exists.
- Prefer operator-action language: `Chọn`, `Lưu`, `Chạy sàng lọc`, `Xác minh`, `Tạo hồ sơ ứng tuyển`.
- Prefer process language over technical language: use `API` or `hệ thống` instead of `backend`, and `dữ liệu API` instead of `payload`.
- Keep sentence copy short enough for badges, tables, and sidebar hints.

## Review Checklist

- Vietnamese mode contains no mojibake or broken accents.
- Shared components have Vietnamese copy, not hardcoded English.
- Lead/candidate wording follows the recruitment stage.
- Copy explains what the operator can do, not implementation details.
