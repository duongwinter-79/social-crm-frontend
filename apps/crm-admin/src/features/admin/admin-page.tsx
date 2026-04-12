import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  InfoStrip,
  Input,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useAdminAuditLogsQuery,
  useAdminSessionsQuery,
  useAdminSystemStatusQuery,
  useCnvActionMutations,
  useCnvConnectionStatusQuery,
  useCnvInfoQuery,
  useCreateUserMutation,
  useHealthQuery,
  useRevokeAdminSessionMutation,
  useUpdateUserMutation,
  useUserDetailQuery,
  useUsersQuery
} from "@social-crm/api";

const ROLE_OPTIONS = ["", "admin", "staff"] as const;

function toneForRole(role: string) {
  return role === "admin" ? ("accent" as const) : ("neutral" as const);
}

function toneForStatus(isActive: boolean) {
  return isActive ? ("success" as const) : ("danger" as const);
}

export function AdminPage() {
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: ""
  });
  const [selectedId, setSelectedId] = useState<string>("");
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    role: "staff",
    isActive: "true"
  });
  const [editForm, setEditForm] = useState({
    username: "",
    password: "",
    role: "staff",
    isActive: "true"
  });

  const usersQuery = useUsersQuery({
    offset: 0,
    limit: 50,
    search: filters.search || undefined,
    role: filters.role || undefined,
    isActive: filters.status === "" ? undefined : filters.status === "active"
  });
  const health = useHealthQuery();
  const systemStatus = useAdminSystemStatusQuery();
  const auditLogs = useAdminAuditLogsQuery({ limit: 8 });
  const sessions = useAdminSessionsQuery({ limit: 8, includeRevoked: false });
  const cnvConnectionStatus = useCnvConnectionStatusQuery();
  const cnvInfo = useCnvInfoQuery();
  const cnvActions = useCnvActionMutations();
  const revokeSession = useRevokeAdminSessionMutation();
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const rows = usersQuery.data?.data ?? [];
  const selectedIdResolved = selectedId || rows[0]?.id || "";
  const detailQuery = useUserDetailQuery(selectedIdResolved);
  const selected = detailQuery.data;

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      username: selected.username,
      password: "",
      role: selected.role,
      isActive: selected.isActive ? "true" : "false"
    });
  }, [selected]);

  const summary = useMemo(() => {
    const admins = rows.filter((row) => row.role === "admin").length;
    const active = rows.filter((row) => row.isActive).length;
    return {
      admins,
      active
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin"
        title="Identity and access control"
        description="Manage internal CRM operators, assign admin versus staff roles, and control which accounts remain active in the system."
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>This admin workspace is intentionally limited to identity management, CNV integration control, and safe operational visibility backed by the real API.</span>
          <Badge tone="warning">Only backend-enforced controls should live here</Badge>
        </div>
      </InfoStrip>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetric label="Visible users" value={String(rows.length)} tone="neutral" />
        <AdminMetric label="Admins" value={String(summary.admins)} tone="accent" />
        <AdminMetric label="Active accounts" value={`${summary.active} / ${rows.length || 0}`} tone="success" />
        <AdminMetric label="Backend" value={health.data?.status ?? "Unknown"} tone={health.data?.status === "ok" ? "success" : "neutral"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <div className="space-y-6">
          <Toolbar compact className="border-slate-200/90">
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Search username" value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
              <Select label="Role" value={filters.role} onChange={(e) => setFilters((s) => ({ ...s, role: e.target.value }))}>
                <option value="">All roles</option>
                {ROLE_OPTIONS.filter(Boolean).map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </Select>
              <Select label="Account state" value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
                <option value="">All accounts</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <ToolbarActions>
              <Badge tone="neutral">{usersQuery.data?.total ?? 0} total in backend</Badge>
            </ToolbarActions>
          </Toolbar>

          <Panel title="Operator accounts" subtitle="Select an account to inspect or update role and activation state.">
            {rows.length ? (
              <div className="space-y-3">
                {rows.map((user) => {
                  const active = user.id === selectedIdResolved;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? "border-indigo-500 bg-indigo-50/60" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{user.username}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{user.id}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={toneForRole(user.role)}>{user.role}</Badge>
                          <Badge tone={toneForStatus(user.isActive)}>{user.isActive ? "active" : "inactive"}</Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No users found" description="Adjust the filters or create the first operator account from the admin panel." />
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Create user" subtitle="Create admin or staff accounts with an initial password.">
              <div className="space-y-4">
                <Input label="Username" value={createForm.username} onChange={(e) => setCreateForm((s) => ({ ...s, username: e.target.value }))} />
                <Input label="Initial password" type="password" value={createForm.password} onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Select label="Role" value={createForm.role} onChange={(e) => setCreateForm((s) => ({ ...s, role: e.target.value }))}>
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                  </Select>
                  <Select label="Active" value={createForm.isActive} onChange={(e) => setCreateForm((s) => ({ ...s, isActive: e.target.value }))}>
                    <option value="true">active</option>
                    <option value="false">inactive</option>
                  </Select>
                </div>
                <Button
                  onClick={() =>
                    createUser.mutate(
                      {
                        username: createForm.username,
                        password: createForm.password,
                        role: createForm.role,
                        isActive: createForm.isActive === "true"
                      },
                      {
                        onSuccess: () => {
                          setCreateForm({ username: "", password: "", role: "staff", isActive: "true" });
                        }
                      }
                    )
                  }
                  disabled={createUser.isPending || !createForm.username.trim() || !createForm.password.trim()}
                >
                  {createUser.isPending ? "Creating user..." : "Create user"}
                </Button>
              </div>
            </Panel>

            <Panel title="Selected account" subtitle="Live role and activation updates for the chosen operator.">
              {selected ? (
                <div className="space-y-4">
                  <DescriptionList
                    items={[
                      { label: "User ID", value: selected.id },
                      { label: "Username", value: selected.username },
                      { label: "Role", value: selected.role },
                      { label: "Status", value: selected.isActive ? "active" : "inactive" }
                    ]}
                  />
                  <Input label="Username" value={editForm.username} onChange={(e) => setEditForm((s) => ({ ...s, username: e.target.value }))} />
                  <Input label="Reset password (optional)" type="password" value={editForm.password} onChange={(e) => setEditForm((s) => ({ ...s, password: e.target.value }))} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select label="Role" value={editForm.role} onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value }))}>
                      <option value="staff">staff</option>
                      <option value="admin">admin</option>
                    </Select>
                    <Select label="Active" value={editForm.isActive} onChange={(e) => setEditForm((s) => ({ ...s, isActive: e.target.value }))}>
                      <option value="true">active</option>
                      <option value="false">inactive</option>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      updateUser.mutate({
                        id: selected.id,
                        patch: {
                          username: editForm.username,
                          password: editForm.password || undefined,
                          role: editForm.role,
                          isActive: editForm.isActive === "true"
                        }
                      })
                    }
                    disabled={updateUser.isPending}
                  >
                    {updateUser.isPending ? "Saving user..." : "Save user update"}
                  </Button>
                </div>
              ) : (
                <EmptyState title="No user selected" description="Select an operator account from the queue to review or update its live backend state." />
              )}
            </Panel>
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="System status" subtitle="Readonly operational context for backend and CNV connectivity.">
            <DescriptionList
              items={[
                { label: "Backend", value: <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>{health.data?.status ?? "Unknown"}</Badge> },
                { label: "Active sessions", value: String(systemStatus.data?.auth.activeSessions ?? "—") },
                { label: "Active users", value: String(systemStatus.data?.auth.activeUsers ?? "—") },
                { label: "CNV OAuth", value: <Badge tone={cnvConnectionStatus.data?.connected ? "success" : "warning"}>{cnvConnectionStatus.data?.connected ? "Connected" : "Not connected"}</Badge> },
                { label: "CNV webhook info", value: cnvInfo.data?.result ? "Loaded" : "Not loaded yet" },
                { label: "Token check", value: cnvActions.testToken.data?.tokenPrefix ? `Token ${cnvActions.testToken.data.tokenPrefix}` : "Not tested yet" }
              ]}
            />
            <pre className="mt-4 overflow-auto rounded-[22px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {JSON.stringify(
                {
                  health: health.data ?? {},
                  status: systemStatus.data ?? {},
                  cnvConnection: cnvConnectionStatus.data ?? {}
                },
                null,
                2
              )}
            </pre>
          </Panel>

          <Panel title="CNV integration controls" subtitle="Use the stored CNV OAuth connection before testing tokens or changing webhook registration.">
            <div className="space-y-4">
              {cnvConnectionStatus.isError ? (
                <InfoStrip className="border-amber-300 bg-amber-50 text-amber-900">
                  <span>CRM could not load CNV connection status from the backend. The connect action is still available, but test/register/remove may stay disabled until the status endpoint succeeds.</span>
                </InfoStrip>
              ) : null}
              <div className="grid gap-3 md:grid-cols-4">
                <ActionState label="SSO" state={cnvConnectionStatus.data?.connected ? "Connected" : "Not connected"} />
                <ActionState label="Token test" state={cnvActions.testToken.isSuccess ? "Completed" : cnvActions.testToken.isPending ? "Running" : "Idle"} />
                <ActionState label="Register" state={cnvActions.register.isSuccess ? "Completed" : cnvActions.register.isPending ? "Running" : "Idle"} />
                <ActionState label="Remove" state={cnvActions.remove.isSuccess ? "Completed" : cnvActions.remove.isPending ? "Running" : "Idle"} />
              </div>
              <DescriptionList
                items={[
                  { label: "SSO host", value: cnvConnectionStatus.data?.ssoBaseUrl ?? "Unknown" },
                  { label: "API host", value: cnvConnectionStatus.data?.apiBaseUrl ?? "Unknown" },
                  { label: "Redirect URI configured", value: cnvConnectionStatus.data?.redirectUriConfigured ? "yes" : "no" },
                  { label: "Scope", value: cnvConnectionStatus.data?.scope || "(empty)" },
                  { label: "Connected user", value: cnvConnectionStatus.data?.connection?.verifiedUsername ?? cnvConnectionStatus.data?.connection?.verifiedUserId ?? "Not connected" }
                ]}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    cnvActions.connectLink.mutate(undefined, {
                      onSuccess: (result) => {
                        window.open(result.url, "_blank", "noopener,noreferrer");
                      }
                    })
                  }
                  disabled={cnvActions.connectLink.isPending}
                >
                  {cnvActions.connectLink.isPending ? "Opening SSO..." : cnvConnectionStatus.data?.connected ? "Reconnect CNV SSO" : "Connect CNV SSO"}
                </Button>
                <Button onClick={() => cnvActions.testToken.mutate()} disabled={cnvActions.testToken.isPending || !cnvConnectionStatus.data?.connected}>
                  {cnvActions.testToken.isPending ? "Testing token..." : "Test token"}
                </Button>
                <Button variant="secondary" onClick={() => cnvActions.register.mutate()} disabled={cnvActions.register.isPending || !cnvConnectionStatus.data?.connected}>
                  {cnvActions.register.isPending ? "Registering..." : "Register webhook"}
                </Button>
                <Button variant="danger" onClick={() => cnvActions.remove.mutate()} disabled={cnvActions.remove.isPending || !cnvConnectionStatus.data?.connected}>
                  {cnvActions.remove.isPending ? "Removing..." : "Remove webhook"}
                </Button>
                <Button variant="danger" onClick={() => cnvActions.disconnect.mutate()} disabled={cnvActions.disconnect.isPending || !cnvConnectionStatus.data?.connected}>
                  {cnvActions.disconnect.isPending ? "Disconnecting..." : "Disconnect CNV"}
                </Button>
              </div>
              <pre className="overflow-auto rounded-[22px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                {JSON.stringify(
                  {
                    status: cnvConnectionStatus.data ?? {},
                    webhookInfo: cnvInfo.data?.result ?? {}
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </Panel>

          <Panel title="Admin phase boundary" subtitle="What this phase intentionally does and does not include.">
            <div className="space-y-3 text-sm leading-7 text-slate-600">
              <p>
                This phase adds readonly system visibility, audit history, session safety controls, and safe integration actions to the admin surface without exposing raw environment editing or unaudited policy toggles.
              </p>
              <p>
                Any true runtime policy settings remain later phases and should only be opened when the backend can enforce and record them end to end.
              </p>
            </div>
          </Panel>

          <Panel title="Recent admin actions" subtitle="Append-only audit trail for user and integration control actions.">
            {auditLogs.data?.data?.length ? (
              <div className="space-y-3">
                {auditLogs.data.data.map((entry) => (
                  <div key={entry.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{entry.summary}</div>
                        <div className="mt-1 text-xs text-slate-500">{entry.actorUsername} · {entry.action}</div>
                      </div>
                      <Badge tone="neutral">{entry.targetType}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Unknown time"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No admin actions yet" description="Audit entries will appear here as user management and CNV control actions are executed." />
            )}
          </Panel>

          <Panel title="Recent sessions" subtitle="Review active operator sessions and revoke them when needed.">
            {sessions.data?.data?.length ? (
              <div className="space-y-3">
                {sessions.data.data.map((session) => (
                  <div key={session.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{session.username ?? session.userId}</div>
                        <div className="mt-1 text-xs text-slate-500">{session.userRole ?? "unknown role"} · {session.ipAddress ?? "unknown IP"}</div>
                        <div className="mt-1 text-xs text-slate-500">{session.userAgent ?? "Unknown user agent"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge tone={session.revokedAt ? "danger" : "success"}>{session.revokedAt ? "revoked" : "active"}</Badge>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => revokeSession.mutate(session.id)}
                          disabled={revokeSession.isPending || Boolean(session.revokedAt)}
                        >
                          {revokeSession.isPending ? "Revoking..." : "Revoke"}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Last used: {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : "Unknown"} · Expires: {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : "Unknown"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No sessions found" description="Active auth sessions will appear here for safety review and revocation." />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function AdminMetric(props: { label: string; value: string; tone: "neutral" | "accent" | "success" }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{props.label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{props.value}</div>
        </div>
        <Badge tone={props.tone}>{props.label}</Badge>
      </div>
    </div>
  );
}

function ActionState(props: { label: string; state: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{props.state}</div>
    </div>
  );
}
