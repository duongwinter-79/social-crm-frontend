import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, Link } from "react-router-dom";
import { Badge, Button, ShellFrame } from "@social-crm/ui";
import { useHealthQuery, useSessionStore } from "@social-crm/api";
import { LoginPage } from "@/features/auth/login-page";
import "./admin-shell.css";

const DashboardPage = lazy(() => import("@/features/dashboard/dashboard-page").then((m) => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import("@/features/leads/leads-page").then((m) => ({ default: m.LeadsPage })));
const PipelinePage = lazy(() => import("@/features/pipeline/pipeline-page").then((m) => ({ default: m.PipelinePage })));
const LeadWorkbenchPage = lazy(() => import("@/features/leads/lead-workbench-page").then((m) => ({ default: m.LeadWorkbenchPage })));
const MatchingPage = lazy(() => import("@/features/matching/matching-page").then((m) => ({ default: m.MatchingPage })));
const OrdersPage = lazy(() => import("@/features/orders/orders-page").then((m) => ({ default: m.OrdersPage })));
const ApplicationsPage = lazy(() => import("@/features/applications/applications-page").then((m) => ({ default: m.ApplicationsPage })));
const DocumentsPage = lazy(() => import("@/features/documents/documents-page").then((m) => ({ default: m.DocumentsPage })));
const TrainingFinancePage = lazy(() => import("@/features/training-finance/training-finance-page").then((m) => ({ default: m.TrainingFinancePage })));
const IntegrationsPage = lazy(() => import("@/features/integrations/integrations-page").then((m) => ({ default: m.IntegrationsPage })));
const AdminPage = lazy(() => import("@/features/admin/admin-page").then((m) => ({ default: m.AdminPage })));

type NavItem = { to: string; label: string; hint: string };

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", hint: "Overview and triage" },
  { to: "/leads", label: "Leads", hint: "Inbox and workbench" },
  { to: "/pipeline", label: "Pipeline", hint: "Cross-stage flow" },
  { to: "/matching", label: "Matching", hint: "Rules and fit" },
  { to: "/orders", label: "Orders", hint: "Demand catalog" },
  { to: "/applications", label: "Applications", hint: "Placement progress" },
  { to: "/documents", label: "Documents", hint: "Candidate files" },
  { to: "/training-finance", label: "Training & Finance", hint: "Deposits and visa" },
  { to: "/integrations", label: "Integrations", hint: "Health and webhooks" },
  { to: "/admin", label: "Admin", hint: "System controls" }
];

function titleForPath(pathname: string) {
  if (pathname.startsWith("/leads/")) return "Lead workbench";
  return navItems.find((item) => pathname === item.to)?.label ?? "Workspace";
}

function ProtectedLayout() {
  const location = useLocation();
  const { user, clearSession } = useSessionStore();
  const health = useHealthQuery();
  const pageTitle = titleForPath(location.pathname);
  const visibleNavItems = navItems.filter((item) => item.to !== "/admin" || user?.roles?.includes("admin"));
  const primaryItems = visibleNavItems.slice(0, 9);
  const secondaryItems = visibleNavItems.slice(9);

  return (
    <ShellFrame
      sidebar={
        <div className="admin-shell-sidebar">
          <div className="admin-shell-brand">
            <div className="admin-shell-brand-mark">SC</div>
            <div className="admin-shell-brand-copy">
              <div className="admin-shell-brand-kicker">Social CRM</div>
              <div className="admin-shell-brand-title">Admin Console</div>
              <p className="admin-shell-brand-text">
                Recruitment operations, matching control, and backend-backed workflow execution.
              </p>
            </div>
          </div>

          <div className="admin-shell-system">
            <div>
              <div className="admin-shell-system-label">System</div>
              <div className="admin-shell-system-value">
                <span className="admin-shell-system-dot" />
                {health.data?.status === "ok" ? "Backend online" : "Backend check pending"}
              </div>
            </div>
            <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>
              {health.data?.status === "ok" ? "Live" : "Check"}
            </Badge>
          </div>

          <div className="admin-shell-navsection">
            <div className="admin-shell-navlabel">Core workspace</div>
            <nav className="admin-shell-navrow">
              {primaryItems.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`admin-shell-navitem ${active ? "is-active" : ""}`}
                  >
                    <div className="admin-shell-navtitle">{item.label}</div>
                    <div className="admin-shell-navhint">{item.hint}</div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="admin-shell-navsection">
            <div className="admin-shell-navlabel">Future modules</div>
            <nav className="admin-shell-navrow">
              {secondaryItems.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`admin-shell-navitem ${active ? "is-active" : ""}`}
                  >
                    <div className="admin-shell-navtitle">{item.label}</div>
                    <div className="admin-shell-navhint">{item.hint}</div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="admin-shell-status">
            <div className="admin-shell-status-top">
              <div>
                <div className="admin-shell-status-name">{user?.username ?? "Operator"}</div>
                <div className="admin-shell-status-role">{(user?.roles ?? []).join(", ") || "No role"}</div>
              </div>
              <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>
                {health.data?.status === "ok" ? "API" : "Check"}
              </Badge>
            </div>
            <div className="admin-shell-status-note">Live backend status and operator session context for the current workspace.</div>
            <Button className="mt-3 w-full" variant="secondary" size="sm" onClick={clearSession}>
              Sign out
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
                <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>
                  {health.data?.status === "ok" ? "Backend healthy" : "Backend status unknown"}
                </Badge>
                <span>{user?.username ?? "Operator"}</span>
              </div>
            </div>
            <div className="admin-shell-header-strip">
              <span>Backend-backed modules are being brought into the source CRM visual system first.</span>
              <strong>Capability-gated areas stay read-safe until their APIs mature.</strong>
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
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Loading module</div>
      <div className="mt-3 text-lg font-semibold text-slate-900">Preparing workspace</div>
      <div className="mt-2 text-sm text-slate-500">Route-level code splitting is active. The selected CRM module is being loaded.</div>
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
        <Route path="/pipeline" element={<LazyRoute><PipelinePage /></LazyRoute>} />
        <Route path="/matching" element={<LazyRoute><MatchingPage /></LazyRoute>} />
        <Route path="/orders" element={<LazyRoute><OrdersPage /></LazyRoute>} />
        <Route path="/applications" element={<LazyRoute><ApplicationsPage /></LazyRoute>} />
        <Route path="/documents" element={<LazyRoute><DocumentsPage /></LazyRoute>} />
        <Route path="/training-finance" element={<LazyRoute><TrainingFinancePage /></LazyRoute>} />
        <Route path="/integrations" element={<LazyRoute><IntegrationsPage /></LazyRoute>} />
        <Route path="/admin" element={<RequireAdmin><LazyRoute><AdminPage /></LazyRoute></RequireAdmin>} />
      </Route>
    </Routes>
  );
}
