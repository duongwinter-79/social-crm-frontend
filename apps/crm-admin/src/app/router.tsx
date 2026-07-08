import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useParams, Link } from "react-router-dom";
import { Badge, ShellFrame } from "@social-crm/ui";
import { apiClient, hasPermission, startSessionLifecycle, useHealthQuery, useSessionStore, type Permission } from "@social-crm/api";
import { LoginPage } from "@/features/auth/login-page";
import { useI18n } from "@/i18n";
import { useUiText } from "@/ui-text/ui-text-provider";
import { UiText } from "@/ui-text/ui-text";
import { UiTextInlineEditor } from "@/ui-text/ui-text-inline-editor";
import { UiTextReviewDrafts } from "@/ui-text/ui-text-review-drafts";
import "./admin-shell.css";

const DashboardPage = lazy(() => import("@/features/dashboard/dashboard-page").then((m) => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import("@/features/leads/leads-page").then((m) => ({ default: m.LeadsPage })));
const ConversationsPage = lazy(() => import("@/features/conversations/conversations-page").then((m) => ({ default: m.ConversationsPage })));
const LeadWorkbenchPage = lazy(() => import("@/features/leads/lead-workbench-page").then((m) => ({ default: m.LeadWorkbenchPage })));
const CandidateDossierPage = lazy(() => import("@/features/leads/candidate-dossier-page").then((m) => ({ default: m.CandidateDossierPage })));
const OrdersPage = lazy(() => import("@/features/orders/orders-page").then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import("@/features/orders/order-detail-page").then((m) => ({ default: m.OrderDetailPage })));
const TrainingFinanceDetailPage = lazy(() => import("@/features/training-finance/training-finance-detail-page").then((m) => ({ default: m.TrainingFinanceDetailPage })));
const AdminPage = lazy(() => import("@/features/admin/admin-page").then((m) => ({ default: m.AdminPage })));
const UiTextOverridesPage = lazy(() => import("@/features/admin/ui-text-overrides-page").then((m) => ({ default: m.UiTextOverridesPage })));
const RegionGroupsPage = lazy(() => import("@/features/admin/region-groups-page").then((m) => ({ default: m.RegionGroupsPage })));
const AuditPage = lazy(() => import("@/features/admin/audit-page").then((m) => ({ default: m.AuditPage })));
const ImportPage = lazy(() => import("@/features/imports/import-page").then((m) => ({ default: m.ImportPage })));
const ExtractPage = lazy(() => import("@/features/imports/extract-page").then((m) => ({ default: m.ExtractPage })));

type IconName =
  | "dashboard"
  | "leads"
  | "conversations"
  | "matching"
  | "orders"
  | "documents"
  | "import"
  | "extract"
  | "admin"
  | "settings"
  | "help";

type NavItem = {
  to: string;
  icon: IconName;
  label: { en: string; vi: string };
  hint: { en: string; vi: string };
  labelKey?: string;
  hintKey?: string;
};

const navItems: NavItem[] = [
  { to: "/dashboard", icon: "dashboard", label: { en: "Dashboard", vi: "Tổng quan" }, hint: { en: "Overview and triage", vi: "Tổng quan và sàng lọc" } },
  { to: "/leads", icon: "leads", label: { en: "Leads", vi: "Ứng viên tiềm năng" }, hint: { en: "Inbox and workbench", vi: "Hộp tiếp nhận và xử lý hồ sơ" } },
  { to: "/conversations", icon: "conversations", label: { en: "Conversations", vi: "Hội thoại" }, hint: { en: "Zalo threads and messages", vi: "Luồng và tin nhắn Zalo" } },
  { to: "/orders", icon: "orders", label: { en: "Orders", vi: "Đơn hàng" }, hint: { en: "Demand & order-first matching", vi: "Đơn hàng & ghép ứng viên" } },
  { to: "/import", icon: "import", label: { en: "Import", vi: "Nhập dữ liệu" }, hint: { en: "Bulk import from XLSX", vi: "Nhập hàng loạt từ XLSX" } },
  { to: "/extract", icon: "extract", label: { en: "Extract notes", vi: "Trích xuất ghi chú" }, hint: { en: "Operator-gated AI extraction", vi: "AI trích xuất, nhân sự duyệt" } },
  { to: "/region-groups", icon: "settings", label: { en: "Region groups", vi: "Nhóm khu vực" }, hint: { en: "Province groups for order exclusions", vi: "Nhóm tỉnh để loại trừ theo đơn" } },
  { to: "/audit", icon: "admin", label: { en: "Audit & sessions", vi: "Nhật ký & phiên" }, hint: { en: "Read-only oversight", vi: "Giám sát chỉ đọc" } },
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
    case "matching":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h4v4H7zM13 13h4v4h-4z" {...common} /><path d="M11 9h2l2 2v2" {...common} /><path d="M9 13H7v4h4v-2" {...common} /></svg>;
    case "orders":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h13l-1.5 8h-10z" {...common} /><path d="M7 7 6 4H3" {...common} /><circle cx="10" cy="19" r="1.2" fill="currentColor" stroke="none" /><circle cx="17" cy="19" r="1.2" fill="currentColor" stroke="none" /></svg>;
    case "documents":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l4 4v12H4V4z" {...common} /><path d="M12 4v5h5" {...common} /><path d="M8 12h8M8 16h8" {...common} /></svg>;
    case "import":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10" {...common} /><path d="m8 10 4 4 4-4" {...common} /><path d="M5 17h14" {...common} /></svg>;
    case "extract":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h6l4 4v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" {...common} /><path d="M15 5v4h4" {...common} /><path d="m9 14 2 2 4-4" {...common} /></svg>;
    case "admin":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 9.5 4-1.2 7-5 7-9.5V6l-7-3Z" {...common} /><path d="M9.5 12.2 11.2 14l3.6-4" {...common} /></svg>;
    case "settings":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" {...common} /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6Z" {...common} /></svg>;
    case "help":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.1 9a3 3 0 1 1 5.8 1c-.5 1-1.8 1.4-2.4 2.2-.3.4-.4.8-.4 1.3" {...common} /><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="9" {...common} /></svg>;
  }
}

const navTextKeys: Record<string, { label: string; hint: string }> = {
  "/dashboard": { label: "shell.nav.dashboard.label", hint: "shell.nav.dashboard.hint" },
  "/leads": { label: "shell.nav.leads.label", hint: "shell.nav.leads.hint" },
  "/conversations": { label: "shell.nav.conversations.label", hint: "shell.nav.conversations.hint" },
  "/orders": { label: "shell.nav.orders.label", hint: "shell.nav.orders.hint" },
  "/import": { label: "shell.nav.import.label", hint: "shell.nav.import.hint" },
  "/extract": { label: "shell.nav.extract.label", hint: "shell.nav.extract.hint" }
};

function SidebarNavItem(props: { item: NavItem; active: boolean; copy: (value: { en: string; vi: string }) => string }) {
  const keys = navTextKeys[props.item.to];
  return (
    <Link to={props.item.to} className={`admin-shell-navitem ${props.active ? "is-active" : ""}`}>
      <span className="admin-shell-navicon" aria-hidden="true">
        <NavIcon name={props.item.icon} />
      </span>
      <span className="admin-shell-navcopy">
        <span className="admin-shell-navtitle">{keys ? <UiText id={keys.label} /> : props.copy(props.item.label)}</span>
        <span className="admin-shell-navhint">{keys ? <UiText id={keys.hint} /> : props.copy(props.item.hint)}</span>
      </span>
    </Link>
  );
}

function titleForPath(pathname: string, copy: (value: { en: string; vi: string }) => string) {
  if (pathname.match(/^\/leads\/[^/]+\/dossier$/)) return copy({ en: "Candidate dossier", vi: "Hồ sơ ứng viên" });
  if (pathname.startsWith("/leads/")) return copy({ en: "Lead workbench", vi: "Bàn xử lý ứng viên tiềm năng" });
  if (pathname === "/ui-text-overrides") return copy({ en: "UI text overrides", vi: "Tùy chỉnh chữ hiển thị" });
  if (pathname === "/region-groups") return copy({ en: "Region groups", vi: "Nhóm khu vực" });
  if (pathname === "/audit") return copy({ en: "Audit & sessions", vi: "Nhật ký & phiên" });
  if (pathname === "/applications/detail") return copy({ en: "Application file detail", vi: "Chi tiết hồ sơ ứng tuyển" });
  if (pathname.match(/^\/applications\/[^/]+\/edit$/)) return copy({ en: "Form editor", vi: "Chỉnh sửa hồ sơ ứng tuyển" });
  return navItems.find((item) => pathname === item.to)?.label
    ? copy(navItems.find((item) => pathname === item.to)!.label)
    : copy({ en: "Workspace", vi: "Khu vực làm việc" });
}

function ProtectedLayout() {
  const location = useLocation();
  const { user } = useSessionStore();
  const health = useHealthQuery();
  const { lang, setLang, copy } = useI18n();
  const { previewOverrides, isPreviewing, clearPreview, isEditMode, setEditMode } = useUiText();
  const isAdmin = Boolean(user?.roles?.includes("admin"));
  const [reviewOpen, setReviewOpen] = useState(false);
  const pageTitle = titleForPath(location.pathname, copy);

  useEffect(() => {
    if (isEditMode && isAdmin) {
      document.body.setAttribute("data-uitext-editing", "");
    } else {
      document.body.removeAttribute("data-uitext-editing");
    }
    return () => document.body.removeAttribute("data-uitext-editing");
  }, [isEditMode, isAdmin]);
  const visibleNavItems = navItems.filter((item) => {
    if (item.to === "/admin" || item.to === "/import" || item.to === "/extract") {
      return user?.roles?.includes("admin");
    }
    // Partial-admin capabilities: show only to holders (admin included via ADMIN_ALL).
    if (item.to === "/region-groups") return hasPermission(user, "manage_region_groups");
    if (item.to === "/audit") return hasPermission(user, "view_audit");
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
            <div className="admin-shell-brand-mark" aria-hidden="true">
              <img src="/sao-mai-logo.png" alt="" />
            </div>
            <div className="admin-shell-brand-copy">
              <div className="admin-shell-brand-kicker">Sao Mai HR</div>
              <div className="admin-shell-brand-title">Sao Mai HR CRM</div>
              <p className="admin-shell-brand-text">{copy({ en: "Recruitment workspace", vi: "Hệ thống tuyển dụng" })}</p>
            </div>
          </div>

          <div className="admin-shell-system">
            <div>
              <div className="admin-shell-system-label">{copy({ en: "System", vi: "Hệ thống" })}</div>
              <div className="admin-shell-system-value">
                <span className="admin-shell-system-dot" />
                {health.data?.status === "ok"
                  ? copy({ en: "Backend online", vi: "API đang hoạt động" })
                  : copy({ en: "Backend check pending", vi: "Đang kiểm tra API" })}
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
            <button type="button" className="admin-shell-signout" onClick={() => apiClient.logout()}>
              {copy({ en: "Sign out", vi: "Đăng xuất" })}
            </button>
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
                {isAdmin ? (
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      isEditMode
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    onClick={() => setEditMode(!isEditMode)}
                    aria-pressed={isEditMode}
                  >
                    <span aria-hidden="true">✎</span>
                    {isEditMode
                      ? copy({ en: "Editing text", vi: "Đang sửa chữ" })
                      : copy({ en: "Edit text", vi: "Sửa chữ" })}
                  </button>
                ) : null}
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
                    ? copy({ en: "Backend healthy", vi: "API hoạt động" })
                    : copy({ en: "Backend status unknown", vi: "Chưa rõ trạng thái API" })}
                </Badge>
              </div>
            </div>
            <div className="admin-shell-header-strip">
              <span>
                {copy({
                  en: "Backend-backed modules are being brought into the source CRM visual system first.",
                  vi: "Các mô-đun đã có API đang được đưa vào cùng hệ thống giao diện CRM trước tiên."
                })}
              </span>
              <strong>
                {copy({
                  en: "Capability-gated areas stay read-safe until their APIs mature.",
                  vi: "Các khu vực còn giới hạn tính năng sẽ chỉ ở chế độ an toàn để xem cho tới khi API hoàn thiện."
                })}
              </strong>
            </div>
            {isPreviewing ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span>
                  {copy({ en: "UI text preview is active.", vi: "Đang xem thử nội dung giao diện." })}{" "}
                  <strong>{Object.keys(previewOverrides).length}</strong>{" "}
                  {copy({ en: "draft override(s) are visible only in this browser session.", vi: "bản nháp chỉ hiển thị trong phiên trình duyệt này." })}
                </span>
                <span className="flex items-center gap-3">
                  <button type="button" className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100" onClick={() => setReviewOpen(true)}>
                    {copy({ en: "Review drafts", vi: "Xem lại bản nháp" })}
                  </button>
                  <button type="button" className="font-semibold text-amber-900 underline decoration-amber-400 underline-offset-4" onClick={clearPreview}>
                    {copy({ en: "Exit preview", vi: "Thoát xem thử" })}
                  </button>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      <Outlet />
      {isAdmin ? <UiTextInlineEditor /> : null}
      {isAdmin ? <UiTextReviewDrafts open={reviewOpen} onClose={() => setReviewOpen(false)} /> : null}
    </ShellFrame>
  );
}

function RequireAuth() {
  const accessToken = useSessionStore((state) => state.accessToken);
  return accessToken ? <ProtectedLayout /> : <Navigate to="/login" replace />;
}

function RequireAdmin(props: { children: ReactNode }) {
  const user = useSessionStore((state) => state.user);
  return user?.roles?.includes("admin") ? <>{props.children}</> : <Navigate to="/dashboard" replace />;
}

function RequirePermission(props: { permission: Permission; children: ReactNode }) {
  const user = useSessionStore((state) => state.user);
  return hasPermission(user, props.permission) ? <>{props.children}</> : <Navigate to="/dashboard" replace />;
}

function RedirectToLeadWorkbench() {
  const { leadId } = useParams();
  // "new" was the Journey create-from-form mode; the leads page hosts it now.
  return <Navigate to={leadId && leadId !== "new" ? `/leads/${leadId}` : "/leads"} replace />;
}

function RouteFallback() {
  const { copy } = useI18n();
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{copy({ en: "Loading module", vi: "Đang tải mô-đun" })}</div>
      <div className="mt-3 text-lg font-semibold text-slate-900">{copy({ en: "Preparing workspace", vi: "Đang chuẩn bị khu vực làm việc" })}</div>
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
  // Cross-tab logout sync, idle timeout, visibility-aware session check.
  useEffect(() => startSessionLifecycle(), []);

  // On first load there is no in-memory access token. Try the httpOnly refresh
  // cookie once; show a tiny loading state until we know if a session exists.
  const [bootstrapping, setBootstrapping] = useState(true);
  useEffect(() => {
    let cancelled = false;
    apiClient.bootstrapSession().finally(() => {
      if (!cancelled) setBootstrapping(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Restoring session…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<RequirePermission permission="view_leads"><LazyRoute><DashboardPage /></LazyRoute></RequirePermission>} />
        <Route path="/leads" element={<RequirePermission permission="view_leads"><LazyRoute><LeadsPage /></LazyRoute></RequirePermission>} />
        <Route path="/leads/:leadId/dossier" element={<RequirePermission permission="view_leads"><LazyRoute><CandidateDossierPage /></LazyRoute></RequirePermission>} />
        <Route path="/leads/:leadId" element={<RequirePermission permission="view_leads"><LazyRoute><LeadWorkbenchPage /></LazyRoute></RequirePermission>} />
        <Route path="/conversations" element={<RequirePermission permission="view_leads"><LazyRoute><ConversationsPage /></LazyRoute></RequirePermission>} />
        {/* The Journey surface is merged into the lead workbench: form intake
            is a modal on Hồ sơ & Form, matching lives in Ứng tuyển, finance in
            Tiến độ & Tài chính, departure in Xuất cảnh. Legacy URLs redirect. */}
        <Route path="/pipeline" element={<Navigate to="/leads" replace />} />
        <Route path="/journey" element={<Navigate to="/leads" replace />} />
        <Route path="/journey/new" element={<Navigate to="/leads" replace />} />
        <Route path="/journey/:leadId" element={<RedirectToLeadWorkbench />} />
        {/* Standalone matching console retired — order-first matching lives on
            the Orders page, candidate-first inside the Journey workbench. */}
        <Route path="/matching" element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<RequirePermission permission="view_leads"><LazyRoute><OrdersPage /></LazyRoute></RequirePermission>} />
        <Route path="/orders/:orderId" element={<RequirePermission permission="view_leads"><LazyRoute><OrderDetailPage /></LazyRoute></RequirePermission>} />
        {/* Applications list, standalone form-intake, and the form-editor are
            all subsumed by the lead workbench (form intake is a modal on the
            Hồ sơ & Form section). Redirect legacy URLs. */}
        <Route path="/applications" element={<Navigate to="/leads" replace />} />
        <Route path="/applications/upload" element={<Navigate to="/leads" replace />} />
        <Route path="/applications/detail" element={<Navigate to="/leads" replace />} />
        <Route path="/applications/:leadId/edit" element={<RedirectToLeadWorkbench />} />
        <Route path="/documents" element={<Navigate to="/leads" replace />} />
        {/* Training-finance ledger is subsumed by the lead workbench Tiến độ &
            Tài chính section; the per-record detail stays reachable. */}
        <Route path="/training-finance" element={<Navigate to="/leads" replace />} />
        <Route path="/training-finance/:recordId" element={<RequirePermission permission="view_leads"><LazyRoute><TrainingFinanceDetailPage /></LazyRoute></RequirePermission>} />
        <Route path="/import" element={<RequireAdmin><LazyRoute><ImportPage /></LazyRoute></RequireAdmin>} />
        <Route path="/extract" element={<RequireAdmin><LazyRoute><ExtractPage /></LazyRoute></RequireAdmin>} />
        <Route path="/admin" element={<RequireAdmin><LazyRoute><AdminPage /></LazyRoute></RequireAdmin>} />
        <Route path="/ui-text-overrides" element={<RequireAdmin><LazyRoute><UiTextOverridesPage /></LazyRoute></RequireAdmin>} />
        <Route path="/region-groups" element={<RequirePermission permission="manage_region_groups"><LazyRoute><RegionGroupsPage /></LazyRoute></RequirePermission>} />
        <Route path="/audit" element={<RequirePermission permission="view_audit"><LazyRoute><AuditPage /></LazyRoute></RequirePermission>} />
      </Route>
    </Routes>
  );
}
