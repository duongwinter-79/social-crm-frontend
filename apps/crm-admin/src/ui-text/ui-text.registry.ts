export type UiTextSlot =
  | "nav"
  | "header"
  | "subtitle"
  | "label"
  | "button"
  | "helper"
  | "empty_state"
  | "warning"
  | "toast";

export type UiTextEntry = {
  key: string;
  namespace: string;
  screen: string;
  slot: UiTextSlot;
  defaultText: {
    en: string;
    vi: string;
  };
  maxLength?: number;
  variables?: string[];
  description?: string;
};

export const uiTextRegistry = [
  {
    key: "shell.nav.dashboard.label",
    namespace: "shell",
    screen: "app-shell",
    slot: "nav",
    defaultText: { en: "Dashboard", vi: "Tổng quan" },
    maxLength: 40,
    description: "Main navigation label for the dashboard."
  },
  {
    key: "shell.nav.dashboard.hint",
    namespace: "shell",
    screen: "app-shell",
    slot: "helper",
    defaultText: { en: "Overview and triage", vi: "Tổng quan và sàng lọc" },
    maxLength: 80,
    description: "Main navigation hint for the dashboard."
  },
  {
    key: "shell.nav.leads.label",
    namespace: "shell",
    screen: "app-shell",
    slot: "nav",
    defaultText: { en: "Leads", vi: "Ứng viên tiềm năng" },
    maxLength: 40,
    description: "Main navigation label for leads."
  },
  {
    key: "shell.nav.leads.hint",
    namespace: "shell",
    screen: "app-shell",
    slot: "helper",
    defaultText: { en: "Inbox and workbench", vi: "Hộp tiếp nhận và xử lý hồ sơ" },
    maxLength: 80,
    description: "Main navigation hint for leads."
  },
  {
    key: "shell.nav.journey.label",
    namespace: "shell",
    screen: "app-shell",
    slot: "nav",
    defaultText: { en: "Journey", vi: "Hành trình" },
    maxLength: 40,
    description: "Main navigation label for the Journey board."
  },
  {
    key: "shell.nav.journey.hint",
    namespace: "shell",
    screen: "app-shell",
    slot: "helper",
    defaultText: { en: "Form, application, training & departure", vi: "Form, ứng tuyển, đào tạo & xuất cảnh" },
    maxLength: 100,
    description: "Main navigation hint for Journey."
  },
  {
    key: "shell.nav.conversations.label",
    namespace: "shell",
    screen: "app-shell",
    slot: "nav",
    defaultText: { en: "Conversations", vi: "Hội thoại" },
    maxLength: 40,
    description: "Main navigation label for conversations."
  },
  {
    key: "shell.nav.conversations.hint",
    namespace: "shell",
    screen: "app-shell",
    slot: "helper",
    defaultText: { en: "Zalo threads and messages", vi: "Luồng và tin nhắn Zalo" },
    maxLength: 80,
    description: "Main navigation hint for conversations."
  },
  {
    key: "shell.nav.orders.label",
    namespace: "shell",
    screen: "app-shell",
    slot: "nav",
    defaultText: { en: "Orders", vi: "Đơn hàng" },
    maxLength: 40,
    description: "Main navigation label for orders."
  },
  {
    key: "shell.nav.orders.hint",
    namespace: "shell",
    screen: "app-shell",
    slot: "helper",
    defaultText: { en: "Demand & order-first matching", vi: "Đơn hàng & ghép ứng viên" },
    maxLength: 80,
    description: "Main navigation hint for orders."
  },
  {
    key: "shell.nav.import.label",
    namespace: "shell",
    screen: "app-shell",
    slot: "nav",
    defaultText: { en: "Import", vi: "Nhập dữ liệu" },
    maxLength: 40,
    description: "Main navigation label for import."
  },
  {
    key: "shell.nav.import.hint",
    namespace: "shell",
    screen: "app-shell",
    slot: "helper",
    defaultText: { en: "Bulk import from XLSX", vi: "Nhập hàng loạt từ XLSX" },
    maxLength: 80,
    description: "Main navigation hint for import."
  },
  {
    key: "shell.nav.extract.label",
    namespace: "shell",
    screen: "app-shell",
    slot: "nav",
    defaultText: { en: "Extract notes", vi: "Trích xuất ghi chú" },
    maxLength: 40,
    description: "Main navigation label for extract."
  },
  {
    key: "shell.nav.extract.hint",
    namespace: "shell",
    screen: "app-shell",
    slot: "helper",
    defaultText: { en: "Operator-gated AI extraction", vi: "AI trích xuất, nhân sự duyệt" },
    maxLength: 80,
    description: "Main navigation hint for extract."
  },
  {
    key: "modal.form-intake.title",
    namespace: "journey",
    screen: "form-intake",
    slot: "header",
    defaultText: { en: "Form intake", vi: "Nhận form lao động" },
    maxLength: 50,
    description: "Form-intake modal header."
  },
  {
    key: "modal.dossier.eyebrow",
    namespace: "leads",
    screen: "candidate-dossier",
    slot: "subtitle",
    defaultText: { en: "Candidate dossier", vi: "Hồ sơ ứng viên" },
    maxLength: 50,
    description: "Dossier modal eyebrow."
  },
  {
    key: "appdetail.upload.title.with-lead",
    namespace: "applications",
    screen: "form-intake",
    slot: "header",
    defaultText: { en: "Upload application form", vi: "Tải hồ sơ ứng tuyển" },
    maxLength: 70,
    description: "Form intake upload panel title (lead already selected)."
  },
  {
    key: "appdetail.upload.title.no-lead",
    namespace: "applications",
    screen: "form-intake",
    slot: "header",
    defaultText: { en: "Upload a form or choose a candidate", vi: "Tải hồ sơ hoặc chọn ứng viên" },
    maxLength: 70,
    description: "Form intake upload panel title (no lead selected)."
  },
  {
    key: "appdetail.upload.subtitle",
    namespace: "applications",
    screen: "form-intake",
    slot: "subtitle",
    defaultText: {
      en: "Stage a PDF, DOC, or DOCX, then preview, edit, extract, and link it to the right candidate.",
      vi: "Lưu tạm PDF, DOC hoặc DOCX, sau đó xem, chỉnh sửa, trích xuất và gắn vào đúng ứng viên."
    },
    maxLength: 200,
    description: "Form intake upload panel subtitle."
  },
  {
    key: "appdetail.staged.title",
    namespace: "applications",
    screen: "form-intake",
    slot: "header",
    defaultText: {
      en: "Staged file — preview and edit before verifying",
      vi: "File tạm — xem và chỉnh sửa trước khi xác nhận"
    },
    maxLength: 80,
    description: "Form intake staged-file panel title."
  },
  {
    key: "appdetail.confirm.title",
    namespace: "applications",
    screen: "form-intake",
    slot: "header",
    defaultText: { en: "Confirm the dossier fields", vi: "Xác nhận hồ sơ ứng viên" },
    maxLength: 70,
    description: "Form intake confirm-fields panel title."
  },
  {
    key: "appdetail.confirm.subtitle",
    namespace: "applications",
    screen: "form-intake",
    slot: "subtitle",
    defaultText: {
      en: "Per field: keep current value, use form value, or override. Form wins by default when the form has a value. Writes land on the candidate dossier — not the lead.",
      vi: "Mỗi trường: giữ giá trị hiện tại, dùng giá trị từ form, hoặc nhập mới. Mặc định dùng form khi form có giá trị. Dữ liệu được ghi vào hồ sơ ứng viên — không ghi vào lead."
    },
    maxLength: 260,
    description: "Form intake confirm-fields panel subtitle."
  },
  {
    key: "appdetail.phone-match.title",
    namespace: "applications",
    screen: "form-intake",
    slot: "header",
    defaultText: { en: "Phone match", vi: "Khớp số điện thoại" },
    maxLength: 50,
    description: "Form intake phone-match panel title."
  },
  {
    key: "appdetail.phone-match.subtitle.found",
    namespace: "applications",
    screen: "form-intake",
    slot: "subtitle",
    defaultText: { en: "Found one lead with this phone.", vi: "Tìm thấy ứng viên có cùng SĐT." },
    maxLength: 120,
    description: "Form intake phone-match subtitle (match found)."
  },
  {
    key: "appdetail.phone-match.subtitle.none",
    namespace: "applications",
    screen: "form-intake",
    slot: "subtitle",
    defaultText: { en: "No lead matched the extracted phone.", vi: "Không có ứng viên trùng SĐT trích xuất." },
    maxLength: 120,
    description: "Form intake phone-match subtitle (no match)."
  },
  {
    key: "appdetail.name-matches.title",
    namespace: "applications",
    screen: "form-intake",
    slot: "header",
    defaultText: { en: "Name matches", vi: "Khớp theo tên" },
    maxLength: 50,
    description: "Form intake name-matches panel title."
  },
  {
    key: "appdetail.name-matches.subtitle",
    namespace: "applications",
    screen: "form-intake",
    slot: "subtitle",
    defaultText: {
      en: "Up to 10 candidates whose name resembles the extracted name.",
      vi: "Tối đa 10 ứng viên có tên tương tự."
    },
    maxLength: 140,
    description: "Form intake name-matches panel subtitle."
  },
  {
    key: "appdetail.new-lead.title",
    namespace: "applications",
    screen: "form-intake",
    slot: "header",
    defaultText: { en: "Create a new lead", vi: "Tạo ứng viên mới" },
    maxLength: 50,
    description: "Form intake create-new-lead panel title."
  },
  {
    key: "appdetail.new-lead.subtitle",
    namespace: "applications",
    screen: "form-intake",
    slot: "subtitle",
    defaultText: {
      en: "If none of the matches above are right, create a new lead and link the form in one step.",
      vi: "Nếu không có ứng viên phù hợp ở trên, tạo ứng viên mới và gắn hồ sơ trong một thao tác."
    },
    maxLength: 180,
    description: "Form intake create-new-lead panel subtitle."
  },
  {
    key: "appdetail.apply.title",
    namespace: "applications",
    screen: "form-intake",
    slot: "header",
    defaultText: { en: "Apply to selected candidate", vi: "Ghi vào ứng viên đã chọn" },
    maxLength: 60,
    description: "Form intake apply-to-candidate panel title."
  },
  {
    key: "appdetail.apply.subtitle",
    namespace: "applications",
    screen: "form-intake",
    slot: "subtitle",
    defaultText: {
      en: "The form will be linked to the candidate selected above. Only checked fields will be written.",
      vi: "Hồ sơ sẽ được gắn với ứng viên đã chọn phía trên. Chỉ các trường được tick mới được ghi."
    },
    maxLength: 180,
    description: "Form intake apply-to-candidate panel subtitle."
  },
  {
    key: "appdetail.replace.title",
    namespace: "applications",
    screen: "form-intake",
    slot: "header",
    defaultText: { en: "Replace form", vi: "Thay hồ sơ" },
    maxLength: 50,
    description: "Form intake replace-form panel title."
  },
  {
    key: "appdetail.replace.subtitle",
    namespace: "applications",
    screen: "form-intake",
    slot: "subtitle",
    defaultText: {
      en: "Use this when the uploaded form was wrong or needs correction. The current verified form stays active until the replacement is verified.",
      vi: "Dùng khi hồ sơ đã tải lên bị sai hoặc cần chỉnh lại. Hồ sơ đã xác nhận hiện tại vẫn còn hiệu lực cho đến khi bản thay thế được xác nhận."
    },
    maxLength: 240,
    description: "Form intake replace-form panel subtitle."
  },
  {
    key: "import.eyebrow",
    namespace: "import",
    screen: "import",
    slot: "subtitle",
    defaultText: { en: "Bulk import", vi: "Nhập hàng loạt" },
    maxLength: 50,
    description: "Import page eyebrow."
  },
  {
    key: "import.title",
    namespace: "import",
    screen: "import",
    slot: "header",
    defaultText: { en: "Import leads from XLSX", vi: "Nhập ứng viên từ XLSX" },
    maxLength: 60,
    description: "Import page main title."
  },
  {
    key: "import.desc",
    namespace: "import",
    screen: "import",
    slot: "subtitle",
    defaultText: {
      en: "Upload the first sheet of the customer's progress-tracking workbook. The system stages every row, checks for phone duplicates, and only writes to the database after you confirm.",
      vi: "Tải lên sheet đầu tiên của bảng theo dõi tiến độ khách hàng. Hệ thống chuẩn bị từng dòng, kiểm tra trùng số điện thoại và chỉ ghi vào cơ sở dữ liệu sau khi bạn xác nhận."
    },
    maxLength: 260,
    description: "Import page description."
  },
  {
    key: "import.upload.title",
    namespace: "import",
    screen: "import",
    slot: "header",
    defaultText: { en: "Upload", vi: "Tải lên" },
    maxLength: 40,
    description: "Import upload panel title."
  },
  {
    key: "import.upload.subtitle",
    namespace: "import",
    screen: "import",
    slot: "subtitle",
    defaultText: {
      en: "Maps columns F (Họ tên), G (Giới tính), H (Năm sinh), J (Cao), K (Kinh nghiệm), L (SĐT), D (Nguồn), M (Chương trình). Columns N + Z + AA + AD are merged into one free-text block and handed to AI extraction.",
      vi: "Lấy cột F (Họ tên), G (Giới tính), H (Năm sinh), J (Cao), K (Kinh nghiệm), L (SĐT), D (Nguồn), M (Chương trình). Cột N + Z + AA + AD gộp thành khối ghi chú và đưa vào AI trích xuất."
    },
    maxLength: 320,
    description: "Import upload panel subtitle (column map)."
  },
  {
    key: "import.preview.title",
    namespace: "import",
    screen: "import",
    slot: "header",
    defaultText: { en: "Preview", vi: "Xem trước" },
    maxLength: 40,
    description: "Import preview panel title (filename rendered separately)."
  },
  {
    key: "import.preview.subtitle",
    namespace: "import",
    screen: "import",
    slot: "subtitle",
    defaultText: {
      en: "Review what will be created. Nothing is written to the leads table until you click Apply.",
      vi: "Xem lại trước khi tạo. Chưa có gì được ghi vào bảng ứng viên cho đến khi bạn nhấn Áp dụng."
    },
    maxLength: 180,
    description: "Import preview panel subtitle."
  },
  {
    key: "import.recent.title",
    namespace: "import",
    screen: "import",
    slot: "header",
    defaultText: { en: "Recent imports", vi: "Đợt nhập gần đây" },
    maxLength: 50,
    description: "Import recent-batches panel title."
  },
  {
    key: "import.recent.subtitle",
    namespace: "import",
    screen: "import",
    slot: "subtitle",
    defaultText: { en: "Click any row to load its preview.", vi: "Bấm vào một dòng để xem lại." },
    maxLength: 120,
    description: "Import recent-batches panel subtitle."
  },
  {
    key: "extract.eyebrow",
    namespace: "extract",
    screen: "extract",
    slot: "subtitle",
    defaultText: { en: "Import → AI extraction", vi: "Nhập → Trích xuất AI" },
    maxLength: 60,
    description: "Extract page eyebrow."
  },
  {
    key: "extract.title",
    namespace: "extract",
    screen: "extract",
    slot: "header",
    defaultText: { en: "Extract imported notes", vi: "Trích xuất ghi chú đã nhập" },
    maxLength: 60,
    description: "Extract page main title."
  },
  {
    key: "extract.desc",
    namespace: "extract",
    screen: "extract",
    slot: "subtitle",
    defaultText: {
      en: "AI now scans the notes columns automatically once a batch finishes importing. Use this page to review suggestions, or re-run a batch manually (e.g. to retry after an AI provider failure). Suggestions are recorded as a preview — no field is written to the database until you tick it and click Apply selected.",
      vi: "AI hiện tự động quét các cột ghi chú ngay khi một đợt nhập hoàn tất. Dùng trang này để xem gợi ý, hoặc chạy lại thủ công cho một đợt (ví dụ khi AI gặp lỗi cần thử lại). Gợi ý được lưu để xem trước, chưa có trường nào ghi vào cơ sở dữ liệu cho đến khi bạn chọn và nhấn Áp dụng đã chọn."
    },
    maxLength: 400,
    description: "Extract page description."
  },
  {
    key: "extract.pick.title",
    namespace: "extract",
    screen: "extract",
    slot: "header",
    defaultText: { en: "1. Pick a batch", vi: "1. Chọn đợt nhập" },
    maxLength: 50,
    description: "Extract step-1 panel title."
  },
  {
    key: "extract.pick.subtitle",
    namespace: "extract",
    screen: "extract",
    slot: "subtitle",
    defaultText: {
      en: "Only completed batches appear. New imports go to /import first.",
      vi: "Chỉ hiện các đợt đã hoàn tất. Đợt nhập mới sẽ thực hiện ở mục Nhập dữ liệu."
    },
    maxLength: 160,
    description: "Extract step-1 panel subtitle."
  },
  {
    key: "extract.review.title",
    namespace: "extract",
    screen: "extract",
    slot: "header",
    defaultText: { en: "2. Review suggestions", vi: "2. Xem trước gợi ý" },
    maxLength: 50,
    description: "Extract step-2 panel title."
  },
  {
    key: "extract.review.subtitle",
    namespace: "extract",
    screen: "extract",
    slot: "subtitle",
    defaultText: {
      en: "Each row is one proposed field update. Tick the ones you accept. Verified fields are protected — AI cannot overwrite them.",
      vi: "Mỗi dòng là một đề xuất cập nhật trường. Chọn các đề xuất bạn chấp nhận. Trường đã xác minh được bảo vệ, AI không thể ghi đè."
    },
    maxLength: 220,
    description: "Extract step-2 panel subtitle."
  },
  {
    key: "dashboard.work-queue.title",
    namespace: "dashboard",
    screen: "dashboard",
    slot: "header",
    defaultText: { en: "Today’s work queue", vi: "Hàng đợi công việc hôm nay" },
    maxLength: 70,
    description: "Dashboard page main title."
  },
  {
    key: "dashboard.role-queues.title",
    namespace: "dashboard",
    screen: "dashboard",
    slot: "header",
    defaultText: { en: "Role queues", vi: "Hàng đợi theo vai trò" },
    maxLength: 60,
    description: "Dashboard panel title for the per-role work queues."
  },
  {
    key: "dashboard.application-health.title",
    namespace: "dashboard",
    screen: "dashboard",
    slot: "header",
    defaultText: { en: "Application health", vi: "Sức khoẻ ứng tuyển" },
    maxLength: 60,
    description: "Dashboard panel title for application status health."
  },
  {
    key: "dashboard.pipeline-distribution.title",
    namespace: "dashboard",
    screen: "dashboard",
    slot: "header",
    defaultText: { en: "Pipeline distribution", vi: "Phân bổ pipeline" },
    maxLength: 60,
    description: "Dashboard panel title for the pipeline status distribution."
  },
  {
    key: "dashboard.document-status.title",
    namespace: "dashboard",
    screen: "dashboard",
    slot: "header",
    defaultText: { en: "Document status", vi: "Trạng thái hồ sơ" },
    maxLength: 60,
    description: "Dashboard panel title for document status counts."
  },
  {
    key: "leads.inbox.title",
    namespace: "leads",
    screen: "leads",
    slot: "header",
    defaultText: { en: "Lead inbox", vi: "Hộp thư ứng viên" },
    maxLength: 60,
    description: "Leads page main title."
  },
  {
    key: "leads.inbox.eyebrow",
    namespace: "leads",
    screen: "leads",
    slot: "subtitle",
    defaultText: { en: "Lead operations", vi: "Vận hành ứng viên" },
    maxLength: 50,
    description: "Leads page eyebrow."
  },
  {
    key: "leads.inbox.desc",
    namespace: "leads",
    screen: "leads",
    slot: "subtitle",
    defaultText: {
      en: "Source-style triage surface: compact filters, operational metrics, and a paginated lead table driven by the backend list APIs.",
      vi: "Màn hình sàng lọc ứng viên tiềm năng: bộ lọc gọn, chỉ số vận hành và bảng ứng viên có phân trang từ API danh sách."
    },
    maxLength: 220,
    description: "Leads page description."
  },
  {
    key: "orders.catalog.title",
    namespace: "orders",
    screen: "orders",
    slot: "header",
    defaultText: { en: "Orders catalog", vi: "Danh mục đơn hàng" },
    maxLength: 60,
    description: "Orders page main title."
  },
  {
    key: "orders.catalog.eyebrow",
    namespace: "orders",
    screen: "orders",
    slot: "subtitle",
    defaultText: { en: "Demand", vi: "Nhu cầu" },
    maxLength: 50,
    description: "Orders page eyebrow."
  },
  {
    key: "orders.catalog.desc",
    namespace: "orders",
    screen: "orders",
    slot: "subtitle",
    defaultText: {
      en: "Maintain the demand catalog used by matching. Open an order to inspect or edit the full requirement profile.",
      vi: "Quản lý danh mục đơn hàng dùng cho ghép đơn. Mở một đơn để xem hoặc chỉnh đầy đủ hồ sơ yêu cầu."
    },
    maxLength: 200,
    description: "Orders page description."
  },
  {
    key: "orders.catalog.empty.title",
    namespace: "orders",
    screen: "orders",
    slot: "empty_state",
    defaultText: { en: "No orders returned", vi: "Không có đơn hàng trả về" },
    maxLength: 60,
    description: "Orders list empty-state title."
  },
  {
    key: "orders.catalog.empty.desc",
    namespace: "orders",
    screen: "orders",
    slot: "empty_state",
    defaultText: {
      en: "Create the first order from the detail screen when admin access is available.",
      vi: "Tạo đơn hàng đầu tiên từ màn hình chi tiết khi có quyền admin."
    },
    maxLength: 160,
    description: "Orders list empty-state description."
  },
  {
    key: "tf.detail.loading",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "header",
    defaultText: { en: "Loading milestone record", vi: "Đang tải bản ghi tiến độ" },
    maxLength: 60,
    description: "Training-finance detail loading-state title."
  },
  {
    key: "tf.detail.not-found.title",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "empty_state",
    defaultText: { en: "Milestone record not found", vi: "Không tìm thấy bản ghi tiến độ" },
    maxLength: 60,
    description: "Training-finance not-found title."
  },
  {
    key: "tf.detail.not-found.desc",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "empty_state",
    defaultText: {
      en: "The record may have been deleted or the backend did not return it.",
      vi: "Bản ghi có thể đã bị xóa hoặc backend không trả về dữ liệu."
    },
    maxLength: 160,
    description: "Training-finance not-found description."
  },
  {
    key: "tf.detail.eyebrow",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "subtitle",
    defaultText: { en: "Training & Finance", vi: "Đào tạo & tài chính" },
    maxLength: 50,
    description: "Training-finance detail eyebrow."
  },
  {
    key: "tf.detail.new-title",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "header",
    defaultText: { en: "New milestone record", vi: "Tạo bản ghi tiến độ" },
    maxLength: 60,
    description: "Training-finance title when creating a record."
  },
  {
    key: "tf.detail.title",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "header",
    defaultText: { en: "Milestone record detail", vi: "Chi tiết bản ghi tiến độ" },
    maxLength: 60,
    description: "Training-finance detail title."
  },
  {
    key: "tf.detail.desc",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "subtitle",
    defaultText: {
      en: "Create or update the downstream record that tracks deposit, training, visa, and departure milestones for an application.",
      vi: "Tạo hoặc cập nhật bản ghi hậu kỳ theo dõi đặt cọc, đào tạo, visa và xuất cảnh cho một ứng tuyển."
    },
    maxLength: 220,
    description: "Training-finance detail description."
  },
  {
    key: "tf.detail.back",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "button",
    defaultText: { en: "Back to ledger", vi: "Về sổ tiến độ" },
    maxLength: 40,
    description: "Training-finance back link."
  },
  {
    key: "tf.detail.best-practice",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "helper",
    defaultText: {
      en: "Best practice: select the linked application first. The order is then inherited from that application to keep downstream records consistent.",
      vi: "Nên chọn ứng tuyển liên kết trước. Đơn hàng sẽ được lấy theo ứng tuyển đó để giữ dữ liệu hậu kỳ nhất quán."
    },
    maxLength: 240,
    description: "Training-finance best-practice info strip."
  },
  {
    key: "tf.fields.title",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "header",
    defaultText: { en: "Milestone fields", vi: "Thông tin tiến độ" },
    maxLength: 60,
    description: "Training-finance milestone-fields panel title."
  },
  {
    key: "tf.fields.subtitle",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "subtitle",
    defaultText: {
      en: "Finance staff can update live operational milestones. Departure date still requires the linked application to be Ready to depart.",
      vi: "Nhân sự tài chính cập nhật các mốc vận hành. Ngày xuất cảnh vẫn yêu cầu ứng tuyển liên kết ở trạng thái Sẵn sàng xuất cảnh."
    },
    maxLength: 240,
    description: "Training-finance milestone-fields panel subtitle."
  },
  {
    key: "tf.linked.title",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "header",
    defaultText: { en: "Linked workflow", vi: "Luồng liên kết" },
    maxLength: 60,
    description: "Training-finance linked-workflow panel title."
  },
  {
    key: "tf.linked.subtitle",
    namespace: "training-finance",
    screen: "training-finance",
    slot: "subtitle",
    defaultText: {
      en: "Shows how this milestone record connects to the parent application.",
      vi: "Hiển thị cách bản ghi tiến độ liên kết với ứng tuyển cha."
    },
    maxLength: 160,
    description: "Training-finance linked-workflow panel subtitle."
  },
  {
    key: "orders.detail.loading",
    namespace: "orders",
    screen: "order-detail",
    slot: "header",
    defaultText: { en: "Loading order", vi: "Đang tải đơn hàng" },
    maxLength: 50,
    description: "Order detail loading-state title."
  },
  {
    key: "orders.detail.not-found.title",
    namespace: "orders",
    screen: "order-detail",
    slot: "empty_state",
    defaultText: { en: "Order not found", vi: "Không tìm thấy đơn hàng" },
    maxLength: 60,
    description: "Order detail not-found title."
  },
  {
    key: "orders.detail.not-found.desc",
    namespace: "orders",
    screen: "order-detail",
    slot: "empty_state",
    defaultText: {
      en: "The order may have been removed or the backend did not return it.",
      vi: "Đơn hàng có thể đã bị xoá hoặc backend không trả về dữ liệu."
    },
    maxLength: 160,
    description: "Order detail not-found description."
  },
  {
    key: "orders.detail.eyebrow",
    namespace: "orders",
    screen: "order-detail",
    slot: "subtitle",
    defaultText: { en: "Order detail", vi: "Chi tiết đơn hàng" },
    maxLength: 50,
    description: "Order detail page eyebrow."
  },
  {
    key: "orders.detail.new-title",
    namespace: "orders",
    screen: "order-detail",
    slot: "header",
    defaultText: { en: "New order", vi: "Tạo đơn hàng" },
    maxLength: 50,
    description: "Order detail title when creating a new order."
  },
  {
    key: "orders.detail.desc",
    namespace: "orders",
    screen: "order-detail",
    slot: "subtitle",
    defaultText: {
      en: "View and maintain the requirement profile used by matching and application creation.",
      vi: "Xem và chỉnh hồ sơ yêu cầu dùng cho ghép đơn và tạo ứng tuyển."
    },
    maxLength: 180,
    description: "Order detail page description."
  },
  {
    key: "orders.detail.back",
    namespace: "orders",
    screen: "order-detail",
    slot: "button",
    defaultText: { en: "Back to orders", vi: "Về danh sách đơn" },
    maxLength: 40,
    description: "Order detail back link."
  },
  {
    key: "orders.requirement.title",
    namespace: "orders",
    screen: "order-detail",
    slot: "header",
    defaultText: { en: "Requirement profile", vi: "Hồ sơ yêu cầu" },
    maxLength: 60,
    description: "Order requirement-profile panel title."
  },
  {
    key: "orders.requirement.subtitle",
    namespace: "orders",
    screen: "order-detail",
    slot: "subtitle",
    defaultText: {
      en: "Keep this page focused on real order data. Empty fields are saved as unset.",
      vi: "Màn hình này chỉ chỉnh dữ liệu thật của đơn hàng. Trường trống sẽ được lưu là chưa đặt."
    },
    maxLength: 180,
    description: "Order requirement-profile panel subtitle."
  },
  {
    key: "orders.summary.title",
    namespace: "orders",
    screen: "order-detail",
    slot: "header",
    defaultText: { en: "Order summary", vi: "Tóm tắt đơn hàng" },
    maxLength: 60,
    description: "Order summary panel title."
  },
  {
    key: "orders.summary.subtitle",
    namespace: "orders",
    screen: "order-detail",
    slot: "subtitle",
    defaultText: {
      en: "Fast read-only view of the fields that matter during matching.",
      vi: "Tóm tắt nhanh các trường quan trọng khi ghép đơn."
    },
    maxLength: 160,
    description: "Order summary panel subtitle."
  },
  {
    key: "orders.stored-record.title",
    namespace: "orders",
    screen: "order-detail",
    slot: "header",
    defaultText: { en: "Stored record", vi: "Bản ghi đã lưu" },
    maxLength: 60,
    description: "Order stored-record (metadata) panel title."
  },
  {
    key: "conversations.inbox.eyebrow",
    namespace: "conversations",
    screen: "conversations",
    slot: "subtitle",
    defaultText: { en: "Zalo OA operations", vi: "Vận hành Zalo OA" },
    maxLength: 60,
    description: "Conversations page eyebrow."
  },
  {
    key: "conversations.inbox.title",
    namespace: "conversations",
    screen: "conversations",
    slot: "header",
    defaultText: { en: "Conversation inbox", vi: "Hộp thư hội thoại" },
    maxLength: 60,
    description: "Conversations page main title."
  },
  {
    key: "conversations.inbox.desc",
    namespace: "conversations",
    screen: "conversations",
    slot: "subtitle",
    defaultText: {
      en: "Inspect Zalo threads, recent messages, lead linkage, and extraction status from the CRM database.",
      vi: "Theo dõi hội thoại Zalo, tin nhắn gần đây, ứng viên liên kết và trạng thái AI trong CRM."
    },
    maxLength: 200,
    description: "Conversations page description."
  },
  {
    key: "conversations.threads.title",
    namespace: "conversations",
    screen: "conversations",
    slot: "header",
    defaultText: { en: "Thread queue", vi: "Danh sách hội thoại" },
    maxLength: 60,
    description: "Conversations thread-list panel title."
  },
  {
    key: "conversations.threads.subtitle",
    namespace: "conversations",
    screen: "conversations",
    slot: "subtitle",
    defaultText: {
      en: "Latest active conversations from interaction storage.",
      vi: "Các hội thoại gần đây đã lưu trong CRM."
    },
    maxLength: 140,
    description: "Conversations thread-list panel subtitle."
  },
  {
    key: "conversations.threads.empty.title",
    namespace: "conversations",
    screen: "conversations",
    slot: "empty_state",
    defaultText: { en: "No conversations found", vi: "Chưa tìm thấy hội thoại" },
    maxLength: 60,
    description: "Empty state when no threads match."
  },
  {
    key: "conversations.threads.empty.desc",
    namespace: "conversations",
    screen: "conversations",
    slot: "empty_state",
    defaultText: {
      en: "Change filters or wait for new Zalo OA webhook messages to arrive.",
      vi: "Đổi bộ lọc hoặc chờ tin nhắn webhook mới từ Zalo OA."
    },
    maxLength: 160,
    description: "Empty-state description when no threads match."
  },
  {
    key: "conversations.detail.empty.title",
    namespace: "conversations",
    screen: "conversations",
    slot: "empty_state",
    defaultText: { en: "Select a conversation", vi: "Chọn một hội thoại" },
    maxLength: 60,
    description: "Empty state before a thread is selected."
  },
  {
    key: "conversations.detail.empty.desc",
    namespace: "conversations",
    screen: "conversations",
    slot: "empty_state",
    defaultText: {
      en: "Conversation detail and messages will appear here.",
      vi: "Chi tiết hội thoại và tin nhắn sẽ hiển thị tại đây."
    },
    maxLength: 160,
    description: "Empty-state description before a thread is selected."
  },
  {
    key: "conversations.messages.title",
    namespace: "conversations",
    screen: "conversations",
    slot: "header",
    defaultText: { en: "Recent messages", vi: "Tin nhắn gần đây" },
    maxLength: 60,
    description: "Conversations recent-messages panel title."
  },
  {
    key: "conversations.messages.subtitle",
    namespace: "conversations",
    screen: "conversations",
    slot: "subtitle",
    defaultText: {
      en: "Messages are loaded from the database, not from live Zalo history.",
      vi: "Tin nhắn được tải từ dữ liệu đã lưu trong CRM, không phải lịch sử trực tiếp từ Zalo."
    },
    maxLength: 180,
    description: "Conversations recent-messages panel subtitle."
  },
  {
    key: "journey.board.title",
    namespace: "journey",
    screen: "journey-board",
    slot: "header",
    defaultText: { en: "Candidate journey board", vi: "Bảng hành trình ứng viên" },
    maxLength: 80,
    description: "Main title on the Journey board."
  },
  {
    key: "journey.board.cohort.title",
    namespace: "journey",
    screen: "journey-board",
    slot: "header",
    defaultText: { en: "Cohort", vi: "Danh sách ứng viên" },
    maxLength: 60,
    description: "Title for the Journey board candidate list."
  },
  {
    key: "journey.board.open.button",
    namespace: "journey",
    screen: "journey-board",
    slot: "button",
    defaultText: { en: "Open journey", vi: "Mở hành trình" },
    maxLength: 40,
    description: "Button label for opening a candidate journey."
  },
  {
    key: "journey.workbench.title",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "header",
    defaultText: { en: "Journey", vi: "Hành trình" },
    maxLength: 40,
    description: "Journey workbench panel title (loading / not-found states)."
  },
  {
    key: "journey.workbench.open-full",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "button",
    defaultText: { en: "Open full workbench →", vi: "Mở bàn xử lý đầy đủ →" },
    maxLength: 60,
    description: "Link from the modal to the full workbench page."
  },
  {
    key: "journey.workbench.back-to-board",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "button",
    defaultText: { en: "Back to journey board", vi: "Về bảng hành trình" },
    maxLength: 60,
    description: "Link back to the Journey board (arrow is rendered separately)."
  },
  {
    key: "journey.workbench.form.manage",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "button",
    defaultText: { en: "Manage form", vi: "Quản lý form" },
    maxLength: 40,
    description: "Form intake action when a file already exists."
  },
  {
    key: "journey.workbench.form.upload",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "button",
    defaultText: { en: "Upload form", vi: "Tải form" },
    maxLength: 40,
    description: "Form intake action when no file exists yet."
  },
  {
    key: "journey.workbench.form.helper",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "helper",
    defaultText: {
      en: "Upload, verify, and commit the standard worker form in the popup.",
      vi: "Tải lên, xác minh và lưu form lao động chuẩn trong cửa sổ bật lên."
    },
    maxLength: 160,
    description: "Helper text under the form intake phase."
  },
  {
    key: "journey.workbench.dossier.view",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "button",
    defaultText: { en: "View dossier", vi: "Xem hồ sơ" },
    maxLength: 40,
    description: "Open the candidate dossier from the dossier phase."
  },
  {
    key: "journey.workbench.departure.helper",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "helper",
    defaultText: {
      en: "Set the departure date in the Training & Finance section above. It unlocks once the application is Ready to depart.",
      vi: "Đặt ngày xuất cảnh ở mục Đào tạo & tài chính phía trên. Mục này mở khi ứng tuyển ở trạng thái Sẵn sàng xuất cảnh."
    },
    maxLength: 220,
    description: "Helper text under the departure phase."
  },
  {
    key: "journey.workbench.close",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "button",
    defaultText: { en: "Close", vi: "Đóng" },
    maxLength: 30,
    description: "Close button in modal mode (footer)."
  },
  {
    key: "journey.workbench.not-found.title",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "empty_state",
    defaultText: { en: "Candidate not found", vi: "Không tìm thấy ứng viên" },
    maxLength: 60,
    description: "Empty-state title when the candidate cannot be loaded."
  },
  {
    key: "journey.workbench.not-found.desc",
    namespace: "journey",
    screen: "journey-workbench",
    slot: "empty_state",
    defaultText: {
      en: "The selected candidate could not be loaded from the backend.",
      vi: "Không tải được ứng viên đã chọn từ API."
    },
    maxLength: 160,
    description: "Empty-state description when the candidate cannot be loaded."
  },
  {
    key: "lead.workbench.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Lead workbench", vi: "Bàn xử lý ứng viên tiềm năng" },
    maxLength: 70,
    description: "Lead workbench panel title (lead-not-loaded state)."
  },
  {
    key: "lead.workbench.eyebrow",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: { en: "Lead workbench", vi: "Bàn xử lý ứng viên tiềm năng" },
    maxLength: 70,
    description: "Lead workbench page eyebrow."
  },
  {
    key: "lead.workbench.not-loaded.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "empty_state",
    defaultText: { en: "Lead not loaded", vi: "Chưa tải được ứng viên tiềm năng" },
    maxLength: 60,
    description: "Lead workbench not-loaded empty title."
  },
  {
    key: "lead.workbench.not-loaded.desc",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "empty_state",
    defaultText: {
      en: "The selected lead could not be loaded from the backend.",
      vi: "Không tải được ứng viên tiềm năng đã chọn từ API."
    },
    maxLength: 160,
    description: "Lead workbench not-loaded empty description."
  },
  {
    key: "lead.workbench.conversation.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Conversation", vi: "Hội thoại" },
    maxLength: 60,
    description: "Lead workbench conversation panel title."
  },
  {
    key: "lead.workbench.conversation.subtitle",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: {
      en: "Latest messages from this lead's primary thread. Both directions captured (inbound from candidate, outbound when admin replies via Zalo OA).",
      vi: "Tin nhắn gần nhất từ luồng hội thoại chính. Bao gồm cả hai chiều: ứng viên gửi vào và nhân sự trả lời qua Zalo OA."
    },
    maxLength: 240,
    description: "Lead workbench conversation panel subtitle."
  },
  {
    key: "lead.workbench.ai-question.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Manual AI question", vi: "Hỏi AI về hội thoại" },
    maxLength: 60,
    description: "Lead workbench manual AI question panel title."
  },
  {
    key: "lead.workbench.ai-question.subtitle",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: {
      en: "Use this for one-off questions about the conversation. It does not update verified qualification, AI suggestions, score, or matching inputs.",
      vi: "Dùng để hỏi nhanh về hội thoại. Kết quả này không cập nhật dữ liệu xác minh, gợi ý AI, điểm ứng viên hoặc dữ liệu ghép đơn."
    },
    maxLength: 240,
    description: "Lead workbench manual AI question panel subtitle."
  },
  {
    key: "lead.workbench.identity.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Identity", vi: "Thông tin nhận dạng" },
    maxLength: 60,
    description: "Lead workbench identity panel title."
  },
  {
    key: "lead.workbench.identity.subtitle",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: {
      en: "Core lead identity. Edit to correct values — including ones suggested by extraction that can't be rejected.",
      vi: "Thông tin nhận dạng cốt lõi. Sửa để chỉnh lại giá trị — kể cả giá trị do trích xuất gợi ý mà không thể từ chối."
    },
    maxLength: 200,
    description: "Lead workbench identity panel subtitle."
  },
  {
    key: "lead.workbench.qualification.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Qualification overlay", vi: "Lớp xác minh điều kiện" },
    maxLength: 60,
    description: "Lead workbench qualification overlay panel title."
  },
  {
    key: "lead.workbench.qualification.subtitle",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: {
      en: "Staff-verified fields directly influence lead score and matching.",
      vi: "Các trường đã được nhân viên xác minh ảnh hưởng trực tiếp đến điểm ứng viên và kết quả ghép đơn."
    },
    maxLength: 180,
    description: "Lead workbench qualification overlay panel subtitle."
  },
  {
    key: "lead.workbench.dossier.subtitle",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: {
      en: "Full form-derived candidate data lives on its own page, linked to the verified document record.",
      vi: "Dữ liệu ứng viên từ form nằm ở trang riêng và liên kết với hồ sơ đã xác minh."
    },
    maxLength: 180,
    description: "Lead workbench dossier panel subtitle."
  },
  {
    key: "lead.workbench.application.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Application", vi: "Ứng tuyển" },
    maxLength: 60,
    description: "Lead workbench application section panel title."
  },
  {
    key: "lead.workbench.application.subtitle",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: {
      en: "Match the candidate to an order and track interview progress.",
      vi: "Ghép ứng viên vào đơn hàng và theo dõi tiến trình phỏng vấn."
    },
    maxLength: 180,
    description: "Lead workbench application section subtitle."
  },
  {
    key: "lead.workbench.departure.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Departure", vi: "Xuất cảnh" },
    maxLength: 60,
    description: "Lead workbench departure section panel title."
  },
  {
    key: "lead.workbench.departure.subtitle",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: {
      en: "Visa and departure milestones from the progress & finance record.",
      vi: "Các mốc visa và xuất cảnh lấy từ hồ sơ tiến độ & tài chính."
    },
    maxLength: 180,
    description: "Lead workbench departure section subtitle."
  },
  {
    key: "lead.workbench.summary.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Lead summary", vi: "Tóm tắt ứng viên tiềm năng" },
    maxLength: 60,
    description: "Lead workbench history tab summary panel title."
  },
  {
    key: "lead.workbench.summary.subtitle",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: {
      en: "Fast operator snapshot before taking action.",
      vi: "Thông tin nhanh để nhân sự quyết định bước xử lý tiếp theo."
    },
    maxLength: 160,
    description: "Lead workbench summary panel subtitle."
  },
  {
    key: "lead.workbench.verified-snapshot.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Verified qualification snapshot", vi: "Dữ liệu xác minh đã lưu" },
    maxLength: 70,
    description: "Lead workbench verified-snapshot panel title."
  },
  {
    key: "lead.workbench.verified-snapshot.subtitle",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "subtitle",
    defaultText: {
      en: "Staff-confirmed fields used for scoring and matching.",
      vi: "Các trường nhân sự đã xác nhận để tính điểm và ghép đơn."
    },
    maxLength: 160,
    description: "Lead workbench verified-snapshot panel subtitle."
  },
  {
    key: "lead.workbench.dossier.title",
    namespace: "leads",
    screen: "lead-workbench",
    slot: "header",
    defaultText: { en: "Candidate dossier", vi: "Hồ sơ ứng viên" },
    maxLength: 70,
    description: "Lead workbench dossier panel title."
  },
  {
    key: "candidate.dossier.title",
    namespace: "leads",
    screen: "candidate-dossier",
    slot: "header",
    defaultText: { en: "Candidate dossier", vi: "Hồ sơ ứng viên" },
    maxLength: 70,
    description: "Candidate dossier page title."
  }
] satisfies UiTextEntry[];

export const uiTextByKey = new Map<string, UiTextEntry>(uiTextRegistry.map((entry) => [entry.key, entry]));

export const uiTextScreens = Array.from(new Set(uiTextRegistry.map((entry) => entry.screen))).sort();
export const uiTextSlots = Array.from(new Set(uiTextRegistry.map((entry) => entry.slot))).sort();
