import { Navigate, Outlet, Route, Routes, useLocation, Link } from "react-router-dom";
import { Badge, Button, ShellFrame } from "@social-crm/ui";
import { useHealthQuery, useSessionStore } from "@social-crm/api";
import { LoginPage } from "@/features/auth/login-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { LeadsPage } from "@/features/leads/leads-page";
import { LeadWorkbenchPage } from "@/features/leads/lead-workbench-page";
import { MatchingPage } from "@/features/matching/matching-page";
import { OrdersPage } from "@/features/orders/orders-page";
import { IntegrationsPage } from "@/features/integrations/integrations-page";
import { CapabilityPage } from "@/components/capability-page";
import "./admin-shell.css";

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

  return (
    <ShellFrame
      sidebar={
        <div className="admin-shell-topbar">
          <div className="admin-shell-topbar-left">
            <div className="admin-shell-brand">
              <div className="admin-shell-brand-mark">SC</div>
              <div className="admin-shell-brand-copy">
                <div className="admin-shell-brand-kicker">Social CRM</div>
                <div className="admin-shell-brand-title">Admin Console</div>
                <p className="admin-shell-brand-text">
                  Recruitment operations and matching control.
                </p>
              </div>
            </div>

            <div className="admin-shell-navgroup">
              <div className="admin-shell-navlabel">Workspace</div>
              <nav className="admin-shell-navrow">
                {navItems.map((item) => {
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
            <Button className="mt-3 w-full" variant="secondary" onClick={clearSession}>
              Sign out
            </Button>
          </div>
        </div>
      }
      header={
        <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
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
              Modules with incomplete APIs remain capability-gated so the active CRM surfaces stay reliable.
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

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:leadId" element={<LeadWorkbenchPage />} />
        <Route path="/pipeline" element={<CapabilityPage title="Pipeline workspace" description="Build a richer cross-stage pipeline after applications and training-finance APIs expose more operational endpoints." />} />
        <Route path="/matching" element={<MatchingPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/applications" element={<CapabilityPage title="Applications workspace" description="Backend controller exists, but CRUD endpoints are not implemented yet. Keep this zone read-only until the API expands." />} />
        <Route path="/documents" element={<CapabilityPage title="Documents workspace" description="Backend document entity exists, but the controller does not expose usable CRUD. Candidate-facing upload should wait for real endpoints." />} />
        <Route path="/training-finance" element={<CapabilityPage title="Training & Finance workspace" description="Backend entity exists, but UI should remain capability-gated until operational endpoints land." />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/admin" element={<CapabilityPage title="Admin settings" description="User management, role administration, and system settings should expand here once more admin APIs are exposed." />} />
      </Route>
    </Routes>
  );
}
