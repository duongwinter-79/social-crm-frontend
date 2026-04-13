# Trạng Thái Triển Khai CRM Admin

## Trạng thái hiện tại

Admin frontend đã được refactor thành operator UI chạy trên `social_crm_backend`.

## Các phase đã hoàn thành

### Phase 1

- shell redesign
- shared visual primitives update
- dashboard redesign
- lead inbox redesign

### Phase 2

- lead workbench redesign
- orders workbench redesign
- dùng order suggestion và triage thật từ backend

### Phase 3

- các module từng là shell được nâng lên thành workspaces có chủ đích hơn
- pipeline, applications, documents, training-finance và admin đã có surface rõ ràng

### Phase 4

- matching được redesign thành operator workbench dày đặc hơn
- integrations và login được align cùng visual system

## Các module đang live và backend-backed

- Dashboard
- Leads
- Pipeline
- Lead workbench
- Matching
- Orders
- Applications
- Documents
- Training & Finance
- Integrations
- Admin
- Login/auth shell
- Lead qualification overlay

## Technical debt

- bundle warning vẫn còn
- manual chunking có thể vẫn đáng làm nếu startup size quan trọng
- còn một số UI duplication nhỏ

## Next work

1. tối ưu bundle nếu cần
2. mở rộng backend coverage cho các workflow quan trọng
3. tiếp tục cập nhật tài liệu này khi trạng thái module thay đổi
