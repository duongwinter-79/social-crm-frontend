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
    key: "orders.catalog.title",
    namespace: "orders",
    screen: "orders",
    slot: "header",
    defaultText: { en: "Orders catalog", vi: "Danh mục đơn hàng" },
    maxLength: 60,
    description: "Orders page main title."
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
