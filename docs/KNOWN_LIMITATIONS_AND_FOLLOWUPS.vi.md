# Giới Hạn Đã Biết Và Việc Theo Dõi Tiếp Theo

## Frontend limits

### True E2E automation đang defer

Đã có build/lint/baseline verification, nhưng vẫn thiếu:

- browser-driven E2E suite
- API smoke phối hợp chặt với frontend flows
- integration workflow thủ công cho seeded environments

### Applications creation vẫn phụ thuộc candidate context

- lead workbench có thể resolve candidate và tạo application từ suggested orders
- `/applications` chưa có broad candidate search/picker riêng

### Documents workflow hiện metadata-first

- checklist views và status updates đã live
- binary upload/download và storage-provider integration vẫn chưa có đầy đủ

### Admin mới ở lớp identity

- user management, audit history, session revocation, CNV status đã có
- runtime policy/configuration controls rộng hơn vẫn là phase sau

### Pipeline còn có thể mở rộng

- ownership assignment
- SLA indicators
- grouped board behavior phong phú hơn

## Rule/data quality limits

### CNV vẫn là nguồn intake sparse

- qualification overlay vẫn là lớp bổ sung bắt buộc cho business-rule-critical data

### Một số tín hiệu nhạy cảm vẫn cần con người xác nhận

- tattoo assessment
- returnee history quality
- health-fit confirmation
- verified cancellation/no-show counts
- inconsistency confirmation
