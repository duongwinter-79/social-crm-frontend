import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, Link } from "react-router-dom";
import { Badge, Button, ShellFrame } from "@social-crm/ui";
import { useHealthQuery, useSessionStore } from "@social-crm/api";
import { LoginPage } from "@/features/auth/login-page";
import { useI18n } from "@/i18n";
import "./admin-shell.css";

const DashboardPage = lazy(() => import("@/features/dashboard/dashboard-page").then((m) => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import("@/features/leads/leads-page").then((m) => ({ default: m.LeadsPage })));
const ConversationsPage = lazy(() => import("@/features/conversations/conversations-page").then((m) => ({ default: m.ConversationsPage })));
const PipelinePage = lazy(() => import("@/features/pipeline/pipeline-page").then((m) => ({ default: m.PipelinePage })));
const LeadWorkbenchPage = lazy(() => import("@/features/leads/lead-workbench-page").then((m) => ({ default: m.LeadWorkbenchPage })));
const MatchingPage = lazy(() => import("@/features/matching/matching-page").then((m) => ({ default: m.MatchingPage })));
const OrdersPage = lazy(() => import("@/features/orders/orders-page").then((m) => ({ default: m.OrdersPage })));
const ApplicationsPage = lazy(() => import("@/features/applications/applications-page").then((m) => ({ default: m.ApplicationsPage })));
const DocumentsPage = lazy(() => import("@/features/documents/documents-page").then((m) => ({ default: m.DocumentsPage })));
const TrainingFinancePage = lazy(() => import("@/features/training-finance/training-finance-page").then((m) => ({ default: m.TrainingFinancePage })));
const IntegrationsPage = lazy(() => import("@/features/integrations/integrations-page").then((m) => ({ default: m.IntegrationsPage })));
const AdminPage = lazy(() => import("@/features/admin/admin-page").then((m) => ({ default: m.AdminPage })));

type IconName =
  | "dashboard"
  | "leads"
  | "conversations"
  | "pipeline"
  | "matching"
  | "orders"
  | "applications"
  | "documents"
  | "training"
  | "integrations"
  | "admin"
  | "settings"
  | "help";

type NavItem = {
  to: string;
  icon: IconName;
  label: { en: string; vi: string };
  hint: { en: string; vi: string };
};

const navItems: NavItem[] = [
  { to: "/dashboard", icon: "dashboard", label: { en: "Dashboard", vi: "Tổng quan" }, hint: { en: "Overview and triage", vi: "Tổng quan và phân loại" } },
  { to: "/leads", icon: "leads", label: { en: "Leads", vi: "Lead" }, hint: { en: "Inbox and workbench", vi: "Hộp thư và bàn xử lý" } },
  { to: "/conversations", icon: "conversations", label: { en: "Conversations", vi: "Hội thoại" }, hint: { en: "Zalo threads and messages", vi: "Luồng và tin nhắn Zalo" } },
  { to: "/pipeline", icon: "pipeline", label: { en: "Pipeline", vi: "Pipeline" }, hint: { en: "Cross-stage flow", vi: "Luồng liên giai đoạn" } },
  { to: "/matching", icon: "matching", label: { en: "Matching", vi: "Ghép đơn" }, hint: { en: "Rules and fit", vi: "Quy tắc và độ phù hợp" } },
  { to: "/orders", icon: "orders", label: { en: "Orders", vi: "Đơn hàng" }, hint: { en: "Demand catalog", vi: "Danh mục nhu cầu" } },
  { to: "/applications", icon: "applications", label: { en: "Applications", vi: "Hồ sơ ứng tuyển" }, hint: { en: "Placement progress", vi: "Tiến độ sắp xếp" } },
  { to: "/documents", icon: "documents", label: { en: "Documents", vi: "Hồ sơ giấy tờ" }, hint: { en: "Candidate files", vi: "Giấy tờ ứng viên" } },
  { to: "/training-finance", icon: "training", label: { en: "Training & Finance", vi: "Đào tạo & tài chính" }, hint: { en: "Deposits and visa", vi: "Đặt cọc và visa" } },
  { to: "/integrations", icon: "integrations", label: { en: "Integrations", vi: "Tích hợp" }, hint: { en: "Health and webhooks", vi: "Tình trạng và webhook" } },
  { to: "/admin", icon: "admin", label: { en: "Admin", vi: "Quản trị" }, hint: { en: "System controls", vi: "Điều khiển hệ thống" } }
];

function NavIcon(props: { name: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (props.name) {
    case "dashboard":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" {...common} /><rect x="13" y="4" width="7" height="5" rx="1.5" {...common} /><rect x="13" y="11" width="7" height="9" rx="1.5" {...common} /><rect x="4" y="13" width="7" height="7" rx="1.5" {...common} /></svg>;
    case "leads":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" {...common} /><circle cx="10" cy="8" r="3" {...common} /><path d="M20 19v-1a3 3 0 0 0-2-2.82" {...common} /><path d="M15 5.2a3 3 0 0 1 0 5.6" {...common} /></svg>;
    case "conversations":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4A3.5 3.5 0 0 1 15.5 14H11l-4 3v-3A3.5 3.5 0 0 1 5 10.5z" {...common} /><path d="M9 8h6M9 11h3" {...common} /><path d="M8 18h7l3 3v-3a3 3 0 0 0 3-3v-2" {...common} /></svg>;
    case "pipeline":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h5v10H5zM14 4h5v16h-5z" {...common} /><path d="M10 12h4" {...common} /></svg>;
    case "matching":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h4v4H7zM13 13h4v4h-4z" {...common} /><path d="M11 9h2l2 2v2" {...common} /><path d="M9 13H7v4h4v-2" {...common} /></svg>;
    case "orders":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h13l-1.5 8h-10z" {...common} /><path d="M7 7 6 4H3" {...common} /><circle cx="10" cy="19" r="1.2" fill="currentColor" stroke="none" /><circle cx="17" cy="19" r="1.2" fill="currentColor" stroke="none" /></svg>;
    case "applications":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l4 4v12H4V4z" {...common} /><path d="M12 4v5h5" {...common} /><path d="M8 13h8M8 17h6" {...common} /></svg>;
    case "documents":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l4 4v12H4V4z" {...common} /><path d="M12 4v5h5" {...common} /><path d="M8 12h8M8 16h8" {...common} /></svg>;
    case "training":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16" {...common} /><path d="M7 18V8l5-3 5 3v10" {...common} /><path d="M12 11v7" {...common} /></svg>;
    case "integrations":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h8v8H8z" {...common} /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" {...common} /></svg>;
    case "admin":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 9.5 4-1.2 7-5 7-9.5V6l-7-3Z" {...common} /><path d="M9.5 12.2 11.2 14l3.6-4" {...common} /></svg>;
    case "settings":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" {...common} /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6Z" {...common} /></svg>;
    case "help":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.1 9a3 3 0 1 1 5.8 1c-.5 1-1.8 1.4-2.4 2.2-.3.4-.4.8-.4 1.3" {...common} /><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="9" {...common} /></svg>;
  }
}

function SidebarNavItem(props: { item: NavItem; active: boolean; copy: (value: { en: string; vi: string }) => string }) {
  return (
    <Link to={props.item.to} className={`admin-shell-navitem ${props.active ? "is-active" : ""}`}>
      <span className="admin-shell-navicon" aria-hidden="true">
        <NavIcon name={props.item.icon} />
      </span>
      <span className="admin-shell-navcopy">
        <span className="admin-shell-navtitle">{props.copy(props.item.label)}</span>
        <span className="admin-shell-navhint">{props.copy(props.item.hint)}</span>
      </span>
    </Link>
  );
}

function titleForPath(pathname: string, copy: (value: { en: string; vi: string }) => string) {
  if (pathname.startsWith("/leads/")) return copy({ en: "Lead workbench", vi: "Bàn xử lý lead" });
  return navItems.find((item) => pathname === item.to)?.label
    ? copy(navItems.find((item) => pathname === item.to)!.label)
    : copy({ en: "Workspace", vi: "Không gian làm việc" });
}

function ProtectedLayout() {
  const location = useLocation();
  const { user, clearSession } = useSessionStore();
  const health = useHealthQuery();
  const { lang, setLang, copy } = useI18n();
  const pageTitle = titleForPath(location.pathname, copy);
  const visibleNavItems = navItems.filter((item) => {
    if (item.to === "/admin" || item.to === "/integrations") {
      return user?.roles?.includes("admin");
    }
    return true;
  });
  const primaryItems = visibleNavItems.filter((item) => item.to !== "/admin");
  const adminItem = visibleNavItems.find((item) => item.to === "/admin");
  const profileInitials = (user?.username ?? "SM")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const profileEmail = user?.username ? `${user.username.replace(/\s+/g, ".").toLowerCase()}@saomaihr.vn` : "admin@saomaihr.vn";

  return (
    <ShellFrame
      sidebar={
        <div className="admin-shell-sidebar">
          <div className="admin-shell-brand">
            <div className="admin-shell-brand-mark">SM</div>
            <div className="admin-shell-brand-copy">
              <div className="admin-shell-brand-kicker">Sao Mai HR</div>
              <div className="admin-shell-brand-title">Sao Mai HR CRM</div>
              <p className="admin-shell-brand-text">{copy({ en: "Recruitment workspace", vi: "Không gian tuyển dụng" })}</p>
            </div>
          </div>

          <div className="admin-shell-system">
            <div>
              <div className="admin-shell-system-label">{copy({ en: "System", vi: "Hệ thống" })}</div>
              <div className="admin-shell-system-value">
                <span className="admin-shell-system-dot" />
                {health.data?.status === "ok"
                  ? copy({ en: "Backend online", vi: "Backend đang hoạt động" })
                  : copy({ en: "Backend check pending", vi: "Đang chờ kiểm tra backend" })}
              </div>
            </div>
            <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>
              {health.data?.status === "ok" ? copy({ en: "Live", vi: "Live" }) : copy({ en: "Check", vi: "Kiểm tra" })}
            </Badge>
          </div>

          <div className="admin-shell-navsection">
            <div className="admin-shell-navlabel">{copy({ en: "Core workspace", vi: "Khu vực chính" })}</div>
            <nav className="admin-shell-navrow">
              {primaryItems.map((item) => (
                <SidebarNavItem
                  key={item.to}
                  item={item}
                  active={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
                  copy={copy}
                />
              ))}
            </nav>
          </div>

          <div className="admin-shell-footer">
            <div className="admin-shell-navlabel admin-shell-footer-label">{copy({ en: "System controls", vi: "Điều khiển hệ thống" })}</div>
            <div className="admin-shell-navrow admin-shell-footer-links">
              {adminItem ? (
                <Link
                  to={adminItem.to}
                  className={`admin-shell-navitem ${location.pathname === adminItem.to || location.pathname.startsWith(`${adminItem.to}/`) ? "is-active" : ""}`}
                >
                  <span className="admin-shell-navicon" aria-hidden="true">
                    <NavIcon name="admin" />
                  </span>
                  <span className="admin-shell-navcopy">
                    <span className="admin-shell-navtitle">{copy({ en: "Dashboard", vi: "Bảng điều khiển" })}</span>
                  </span>
                </Link>
              ) : null}
              <button type="button" className="admin-shell-navitem admin-shell-footer-link">
                <span className="admin-shell-navicon" aria-hidden="true">
                  <NavIcon name="settings" />
                </span>
                <span className="admin-shell-navcopy">
                  <span className="admin-shell-navtitle">{copy({ en: "Settings", vi: "Cài đặt" })}</span>
                </span>
              </button>
              <button type="button" className="admin-shell-navitem admin-shell-footer-link">
                <span className="admin-shell-navicon" aria-hidden="true">
                  <NavIcon name="help" />
                </span>
                <span className="admin-shell-navcopy">
                  <span className="admin-shell-navtitle">{copy({ en: "Help", vi: "Trợ giúp" })}</span>
                </span>
              </button>
            </div>
            <div className="admin-shell-footer-profile-wrap">
              <div className="admin-shell-navitem admin-shell-profile">
                <span className="admin-shell-navicon admin-shell-profile-avatar" aria-hidden="true">
                  {profileInitials}
                </span>
                <div className="admin-shell-navcopy admin-shell-profile-copy">
                  <div className="admin-shell-navtitle admin-shell-profile-name">{user?.username ?? copy({ en: "Admin user", vi: "Người dùng quản trị" })}</div>
                  <div className="admin-shell-navhint admin-shell-profile-email">{profileEmail}</div>
                </div>
                <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>
                  {health.data?.status === "ok" ? "API" : copy({ en: "Check", vi: "Kiểm tra" })}
                </Badge>
              </div>
            </div>
            <Button className="w-full" variant="secondary" size="sm" onClick={clearSession}>
              {copy({ en: "Sign out", vi: "Đăng xuất" })}
            </Button>
          </div>
        </div>
      }
      header={
        <div className="flex flex-col gap-3 px-5 py-5 md:px-8">
          <div className="admin-shell-header w-full">
            <div className="admin-shell-header-top">
              <div>
                <h1 className="admin-shell-header-title">{pageTitle}</h1>
              </div>
              <div className="admin-shell-header-meta">
                <div className="admin-shell-lang-toggle" role="group" aria-label={copy({ en: "Language", vi: "Ngôn ngữ" })}>
                  <button type="button" className={`admin-shell-lang-button ${lang === "en" ? "is-active" : ""}`} onClick={() => setLang("en")}>
                    EN
                  </button>
                  <button type="button" className={`admin-shell-lang-button ${lang === "vi" ? "is-active" : ""}`} onClick={() => setLang("vi")}>
                    VN
                  </button>
                </div>
                <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>
                  {health.data?.status === "ok"
                    ? copy({ en: "Backend healthy", vi: "Backend hoạt động" })
                    : copy({ en: "Backend status unknown", vi: "Chưa rõ trạng thái backend" })}
                </Badge>
              </div>
            </div>
            <div className="admin-shell-header-strip">
              <span>
                {copy({
                  en: "Backend-backed modules are being brought into the source CRM visual system first.",
                  vi: "Các mô-đun đã có backend đang được đưa vào cùng hệ thống giao diện CRM trước tiên."
                })}
              </span>
              <strong>
                {copy({
                  en: "Capability-gated areas stay read-safe until their APIs mature.",
                  vi: "Các khu vực còn giới hạn tính năng sẽ chỉ ở chế độ an toàn để xem cho tới khi API hoàn thiện."
                })}
              </strong>
            </div>
          </div>
        </div>
      }
    >
      <Outlet />
    </ShellFrame>
  );
}

function RequireAuth() {
  const tokens = useSessionStore((state) => state.tokens);
  return tokens?.access_token ? <ProtectedLayout /> : <Navigate to="/login" replace />;
}

function RequireAdmin(props: { children: ReactNode }) {
  const user = useSessionStore((state) => state.user);
  return user?.roles?.includes("admin") ? <>{props.children}</> : <Navigate to="/dashboard" replace />;
}

function RouteFallback() {
  const { copy } = useI18n();
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{copy({ en: "Loading module", vi: "Đang tải mô-đun" })}</div>
      <div className="mt-3 text-lg font-semibold text-slate-900">{copy({ en: "Preparing workspace", vi: "Đang chuẩn bị không gian làm việc" })}</div>
      <div className="mt-2 text-sm text-slate-500">
        {copy({
          en: "Route-level code splitting is active. The selected CRM module is being loaded.",
          vi: "Tách mã theo route đang hoạt động. Mô-đun CRM đã chọn đang được tải."
        })}
      </div>
    </div>
  );
}

function LazyRoute(props: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{props.children}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<LazyRoute><DashboardPage /></LazyRoute>} />
        <Route path="/leads" element={<LazyRoute><LeadsPage /></LazyRoute>} />
        <Route path="/leads/:leadId" element={<LazyRoute><LeadWorkbenchPage /></LazyRoute>} />
        <Route path="/conversations" element={<LazyRoute><ConversationsPage /></LazyRoute>} />
        <Route path="/pipeline" element={<LazyRoute><PipelinePage /></LazyRoute>} />
        <Route path="/matching" element={<LazyRoute><MatchingPage /></LazyRoute>} />
        <Route path="/orders" element={<LazyRoute><OrdersPage /></LazyRoute>} />
        <Route path="/applications" element={<LazyRoute><ApplicationsPage /></LazyRoute>} />
        <Route path="/documents" element={<LazyRoute><DocumentsPage /></LazyRoute>} />
        <Route path="/training-finance" element={<LazyRoute><TrainingFinancePage /></LazyRoute>} />
        <Route path="/integrations" element={<RequireAdmin><LazyRoute><IntegrationsPage /></LazyRoute></RequireAdmin>} />
        <Route path="/admin" element={<RequireAdmin><LazyRoute><AdminPage /></LazyRoute></RequireAdmin>} />
      </Route>
    </Routes>
  );
}
