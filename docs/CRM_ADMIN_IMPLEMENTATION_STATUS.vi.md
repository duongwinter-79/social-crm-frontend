# Trang Thai Trien Khai CRM Admin

## Trang thai hien tai

Admin frontend da duoc refactor thanh operator UI chay tren `social_crm_backend`.

## Cac phase da hoan thanh

### Phase 1

- shell redesign
- shared visual primitives update
- dashboard redesign
- lead inbox redesign

### Phase 2

- lead workbench redesign
- orders workbench redesign
- dung order suggestion va triage that tu backend

### Phase 3

- cac module tung la shell duoc nang len thanh workspaces co chu dich hon
- pipeline, applications, documents, training-finance va admin da co surface ro rang

### Phase 4

- matching duoc redesign thanh operator workbench day dac hon
- integrations va login duoc align cung visual system
- da rollout toggle EN/VN cho shell, auth va cac man hinh van hanh
- da mo rong shared UI primitives de giam lap lai cac metric, field va meta block

## Cac module dang live va backend-backed

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

- bundle warning van con
- manual chunking co the van dang lam neu startup size quan trong
- van con mot it UI duplication nho o mot so guidance/content panel

## Next work

1. toi uu bundle neu can
2. mo rong backend coverage cho cac workflow quan trong
3. tiep tuc cap nhat tai lieu nay khi trang thai module thay doi

## Cap nhat localization gan day

- CRM admin shell da ho tro toggle EN/VN co luu trang thai bang local storage
- login, dashboard, leads, lead workbench, pipeline, matching, orders, applications, documents, training-finance, integrations va admin da dung chung lop i18n
- dot rollout nay dong thoi loai bo text separator loi va dua cac pattern field/stat lap lai vao shared UI primitives
