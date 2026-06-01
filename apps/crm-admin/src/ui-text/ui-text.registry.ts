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
