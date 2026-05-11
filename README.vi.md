# Social CRM Frontend

Monorepo frontend cho hệ thống Social CRM.

## Apps

- `apps/crm-admin`: giao diện nội bộ cho staff và admin
- `apps/candidate-portal`: shell cho candidate-facing flows trong tương lai

## Packages

- `packages/api`: typed API client, session handling, query hooks
- `packages/ui`: UI primitives và layout components dùng chung

## Trạng thái align với backend

Admin app hiện đã nối với các backend APIs đủ ổn định để dùng trong UI:

- auth và refresh flow
- dashboard stats
- leads và lead transitions
- lead qualification update
- orders
- AI extraction query
- matching triage
- CNV integration admin actions
- applications
- documents
- training-finance
- pipeline
- admin identity và audit/session surfaces

Không còn capability-gated module nào trong luồng operator CRM nội bộ chính.

## Operator workbenches

Tài liệu hành vi chi tiết của các module live:

- [docs/OPERATOR_WORKBENCHES.vi.md](C:/Users/Admin/Desktop/CRM/social_crm_frontend/docs/OPERATOR_WORKBENCHES.vi.md)

## Xác minh

```bash
npm run lint --workspace @social-crm/crm-admin
npm run build
```
