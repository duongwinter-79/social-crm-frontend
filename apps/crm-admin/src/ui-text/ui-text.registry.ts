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
