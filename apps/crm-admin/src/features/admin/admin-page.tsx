import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  FieldGroup,
  InfoStrip,
  Input,
  MetricCard,
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
import { useI18n } from "../../i18n";

const ROLE_OPTIONS = ["", "admin", "staff"] as const;

function toneForRole(role: string) {
  return role === "admin" ? ("accent" as const) : ("neutral" as const);
}

function toneForStatus(isActive: boolean) {
  return isActive ? ("success" as const) : ("danger" as const);
}

export function AdminPage() {
  const { copy, formatEnum } = useI18n();
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
  const cnvInfo = useCnvInfoQuery(Boolean(cnvConnectionStatus.data?.connected));
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
    return { admins, active };
  }, [rows]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Admin", vi: "Quản trị" })}
        title={copy({ en: "Identity and access control", vi: "Quản lý danh tính và quyền truy cập" })}
        description={copy({
          en: "Manage CRM operators, assign roles, review sessions, and control safe CNV integration actions.",
          vi: "Quản lý tài khoản vận hành CRM, phân quyền, xem session và điều khiển an toàn các kết nối CNV."
        })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {copy({
              en: "This workspace stays limited to backend-enforced admin controls.",
              vi: "Không gian này chỉ bao gồm các điều khiển quản trị do backend thực thi."
            })}
          </span>
          <Badge tone="warning">{copy({ en: "No raw policy editing", vi: "Không chỉnh sửa chính sách trực tiếp" })}</Badge>
        </div>
      </InfoStrip>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label={copy({ en: "Visible users", vi: "Người dùng hiển thị" })} value={String(rows.length)} />
        <MetricCard label={copy({ en: "Admins", vi: "Quản trị viên" })} value={String(summary.admins)} tone="accent" />
        <MetricCard label={copy({ en: "Active accounts", vi: "Tài khoản hoạt động" })} value={`${summary.active} / ${rows.length || 0}`} tone="success" />
        <MetricCard
          label={copy({ en: "Backend", vi: "Backend" })}
          value={health.data?.status ?? copy({ en: "Unknown", vi: "Chưa rõ" })}
          tone={health.data?.status === "ok" ? "success" : "neutral"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <div className="space-y-6">
          <Toolbar compact className="border-slate-200/90">
            <FieldGroup columns={3}>
              <Input label={copy({ en: "Search username", vi: "Tìm tên đăng nhập" })} value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
              <Select label={copy({ en: "Role", vi: "Vai trò" })} value={filters.role} onChange={(e) => setFilters((s) => ({ ...s, role: e.target.value }))}>
                <option value="">{copy({ en: "All roles", vi: "Tất cả vai trò" })}</option>
                {ROLE_OPTIONS.filter(Boolean).map((role) => (
                  <option key={role} value={role}>
                    {formatEnum(role)}
                  </option>
                ))}
              </Select>
              <Select label={copy({ en: "Account state", vi: "Trạng thái tài khoản" })} value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
                <option value="">{copy({ en: "All accounts", vi: "Tất cả tài khoản" })}</option>
                <option value="active">{copy({ en: "Active", vi: "Hoạt động" })}</option>
                <option value="inactive">{copy({ en: "Inactive", vi: "Ngừng hoạt động" })}</option>
              </Select>
            </FieldGroup>
            <ToolbarActions>
              <Badge tone="neutral">{copy({ en: `${usersQuery.data?.total ?? 0} total in backend`, vi: `${usersQuery.data?.total ?? 0} tổng trong backend` })}</Badge>
            </ToolbarActions>
          </Toolbar>

          <Panel
            title={copy({ en: "Operator accounts", vi: "Tài khoản vận hành" })}
            subtitle={copy({
              en: "Select an account to inspect or update role and activation state.",
              vi: "Chọn tài khoản để xem và cập nhật vai trò hoặc trạng thái hoạt động."
            })}
          >
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
                          <Badge tone={toneForRole(user.role)}>{formatEnum(user.role)}</Badge>
                          <Badge tone={toneForStatus(user.isActive)}>
                            {user.isActive ? copy({ en: "Active", vi: "Hoạt động" }) : copy({ en: "Inactive", vi: "Ngừng hoạt động" })}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No users found", vi: "Không tìm thấy người dùng" })}
                description={copy({
                  en: "Adjust filters or create the first operator account.",
                  vi: "Điều chỉnh bộ lọc hoặc tạo tài khoản vận hành đầu tiên."
                })}
              />
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title={copy({ en: "Create user", vi: "Tạo người dùng" })}
              subtitle={copy({
                en: "Create admin or staff accounts with an initial password.",
                vi: "Tạo tài khoản admin hoặc nhân viên với mật khẩu ban đầu."
              })}
            >
              <div className="space-y-4">
                <Input label={copy({ en: "Username", vi: "Tên đăng nhập" })} value={createForm.username} onChange={(e) => setCreateForm((s) => ({ ...s, username: e.target.value }))} />
                <Input label={copy({ en: "Initial password", vi: "Mật khẩu ban đầu" })} type="password" value={createForm.password} onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))} />
                <FieldGroup columns={2}>
                  <Select label={copy({ en: "Role", vi: "Vai trò" })} value={createForm.role} onChange={(e) => setCreateForm((s) => ({ ...s, role: e.target.value }))}>
                    <option value="staff">{copy({ en: "Staff", vi: "Nhân viên" })}</option>
                    <option value="admin">{copy({ en: "Admin", vi: "Quản trị" })}</option>
                  </Select>
                  <Select label={copy({ en: "Active", vi: "Hoạt động" })} value={createForm.isActive} onChange={(e) => setCreateForm((s) => ({ ...s, isActive: e.target.value }))}>
                    <option value="true">{copy({ en: "Active", vi: "Hoạt động" })}</option>
                    <option value="false">{copy({ en: "Inactive", vi: "Ngừng hoạt động" })}</option>
                  </Select>
                </FieldGroup>
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
                  {createUser.isPending ? copy({ en: "Creating user...", vi: "Đang tạo người dùng..." }) : copy({ en: "Create user", vi: "Tạo người dùng" })}
                </Button>
              </div>
            </Panel>

            <Panel
              title={copy({ en: "Selected account", vi: "Tài khoản được chọn" })}
              subtitle={copy({
                en: "Live role and activation updates for the chosen operator.",
                vi: "Cập nhật vai trò và trạng thái cho tài khoản đang chọn."
              })}
            >
              {selected ? (
                <div className="space-y-4">
                  <DescriptionList
                    items={[
                      { label: copy({ en: "User ID", vi: "User ID" }), value: selected.id },
                      { label: copy({ en: "Username", vi: "Tên đăng nhập" }), value: selected.username },
                      { label: copy({ en: "Role", vi: "Vai trò" }), value: formatEnum(selected.role) },
                      { label: copy({ en: "Status", vi: "Trạng thái" }), value: selected.isActive ? copy({ en: "Active", vi: "Hoạt động" }) : copy({ en: "Inactive", vi: "Ngừng hoạt động" }) }
                    ]}
                  />
                  <Input label={copy({ en: "Username", vi: "Tên đăng nhập" })} value={editForm.username} onChange={(e) => setEditForm((s) => ({ ...s, username: e.target.value }))} />
                  <Input label={copy({ en: "Reset password (optional)", vi: "Đặt lại mật khẩu (tùy chọn)" })} type="password" value={editForm.password} onChange={(e) => setEditForm((s) => ({ ...s, password: e.target.value }))} />
                  <FieldGroup columns={2}>
                    <Select label={copy({ en: "Role", vi: "Vai trò" })} value={editForm.role} onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value }))}>
                      <option value="staff">{copy({ en: "Staff", vi: "Nhân viên" })}</option>
                      <option value="admin">{copy({ en: "Admin", vi: "Quản trị" })}</option>
                    </Select>
                    <Select label={copy({ en: "Active", vi: "Hoạt động" })} value={editForm.isActive} onChange={(e) => setEditForm((s) => ({ ...s, isActive: e.target.value }))}>
                      <option value="true">{copy({ en: "Active", vi: "Hoạt động" })}</option>
                      <option value="false">{copy({ en: "Inactive", vi: "Ngừng hoạt động" })}</option>
                    </Select>
                  </FieldGroup>
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
                    {updateUser.isPending ? copy({ en: "Saving user...", vi: "Đang lưu người dùng..." }) : copy({ en: "Save user update", vi: "Lưu cập nhật người dùng" })}
                  </Button>
                </div>
              ) : (
                <EmptyState
                  title={copy({ en: "No user selected", vi: "Chưa chọn người dùng" })}
                  description={copy({ en: "Select an operator account to review or update.", vi: "Chọn tài khoản vận hành để xem hoặc cập nhật." })}
                />
              )}
            </Panel>
          </div>
        </div>

        <div className="space-y-6">
          <Panel title={copy({ en: "System status", vi: "Trạng thái hệ thống" })} subtitle={copy({ en: "Readonly operational context for backend and CNV connectivity.", vi: "Thông tin chỉ đọc cho backend và kết nối CNV." })}>
            <DescriptionList
              items={[
                { label: copy({ en: "Backend", vi: "Backend" }), value: <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>{health.data?.status ?? copy({ en: "Unknown", vi: "Chưa rõ" })}</Badge> },
                { label: copy({ en: "Active sessions", vi: "Session đang hoạt động" }), value: String(systemStatus.data?.auth.activeSessions ?? "-") },
                { label: copy({ en: "Active users", vi: "Người dùng đang hoạt động" }), value: String(systemStatus.data?.auth.activeUsers ?? "-") },
                {
                  label: copy({ en: "CNV OAuth", vi: "CNV OAuth" }),
                  value: (
                    <Badge tone={cnvConnectionStatus.data?.connected ? "success" : "warning"}>
                      {cnvConnectionStatus.data?.connected ? copy({ en: "Connected", vi: "Đã kết nối" }) : copy({ en: "Not connected", vi: "Chưa kết nối" })}
                    </Badge>
                  )
                },
                { label: copy({ en: "CNV webhook info", vi: "Thông tin webhook CNV" }), value: cnvInfo.data?.result ? copy({ en: "Loaded", vi: "Đã tải" }) : copy({ en: "Not loaded yet", vi: "Chưa tải" }) },
                { label: copy({ en: "Token check", vi: "Kiểm tra token" }), value: cnvActions.testToken.data?.tokenPrefix ? `Token ${cnvActions.testToken.data.tokenPrefix}` : copy({ en: "Not tested yet", vi: "Chưa kiểm tra" }) }
              ]}
            />
            <pre className="mt-4 overflow-auto rounded-[22px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {JSON.stringify({ health: health.data ?? {}, status: systemStatus.data ?? {}, cnvConnection: cnvConnectionStatus.data ?? {} }, null, 2)}
            </pre>
          </Panel>

          <Panel
            title={copy({ en: "CNV integration controls", vi: "Điều khiển tích hợp CNV" })}
            subtitle={copy({
              en: "Use the stored CNV OAuth connection before testing tokens or changing webhook registration.",
              vi: "Sử dụng kết nối CNV OAuth hiện có trước khi kiểm tra token hoặc thay đổi webhook."
            })}
          >
            <div className="space-y-4">
              {cnvConnectionStatus.isError ? (
                <InfoStrip className="border-amber-300 bg-amber-50 text-amber-900">
                  <span>{copy({ en: "CRM could not load CNV connection status from the backend.", vi: "CRM không tải được trạng thái kết nối CNV từ backend." })}</span>
                </InfoStrip>
              ) : null}
              <div className="grid gap-3 md:grid-cols-4">
                <MetricCard label="SSO" value={cnvConnectionStatus.data?.connected ? copy({ en: "Connected", vi: "Đã kết nối" }) : copy({ en: "Not connected", vi: "Chưa kết nối" })} />
                <MetricCard label={copy({ en: "Token test", vi: "Kiểm tra token" })} value={cnvActions.testToken.isSuccess ? copy({ en: "Completed", vi: "Hoàn tất" }) : cnvActions.testToken.isPending ? copy({ en: "Running", vi: "Đang chạy" }) : copy({ en: "Idle", vi: "Chờ" })} />
                <MetricCard label={copy({ en: "Register", vi: "Đăng ký" })} value={cnvActions.register.isSuccess ? copy({ en: "Completed", vi: "Hoàn tất" }) : cnvActions.register.isPending ? copy({ en: "Running", vi: "Đang chạy" }) : copy({ en: "Idle", vi: "Chờ" })} />
                <MetricCard label={copy({ en: "Remove", vi: "Gỡ bỏ" })} value={cnvActions.remove.isSuccess ? copy({ en: "Completed", vi: "Hoàn tất" }) : cnvActions.remove.isPending ? copy({ en: "Running", vi: "Đang chạy" }) : copy({ en: "Idle", vi: "Chờ" })} />
              </div>
              <DescriptionList
                items={[
                  { label: copy({ en: "SSO host", vi: "Máy chủ SSO" }), value: cnvConnectionStatus.data?.ssoBaseUrl ?? copy({ en: "Unknown", vi: "Chưa rõ" }) },
                  { label: copy({ en: "API host", vi: "Máy chủ API" }), value: cnvConnectionStatus.data?.apiBaseUrl ?? copy({ en: "Unknown", vi: "Chưa rõ" }) },
                  { label: copy({ en: "Redirect URI configured", vi: "Đã cấu hình Redirect URI" }), value: cnvConnectionStatus.data?.redirectUriConfigured ? copy({ en: "Yes", vi: "Có" }) : copy({ en: "No", vi: "Không" }) },
                  { label: copy({ en: "Scope", vi: "Phạm vi" }), value: cnvConnectionStatus.data?.scope || copy({ en: "(empty)", vi: "(rỗng)" }) },
                  {
                    label: copy({ en: "Connected user", vi: "Người dùng đã kết nối" }),
                    value:
                      cnvConnectionStatus.data?.connection?.verifiedUsername ??
                      cnvConnectionStatus.data?.connection?.verifiedUserId ??
                      copy({ en: "Not connected", vi: "Chưa kết nối" })
                  }
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
                  {cnvActions.connectLink.isPending
                    ? copy({ en: "Opening SSO...", vi: "Đang mở SSO..." })
                    : cnvConnectionStatus.data?.connected
                      ? copy({ en: "Reconnect CNV SSO", vi: "Kết nối lại CNV SSO" })
                      : copy({ en: "Connect CNV SSO", vi: "Kết nối CNV SSO" })}
                </Button>
                <Button onClick={() => cnvActions.testToken.mutate()} disabled={cnvActions.testToken.isPending || !cnvConnectionStatus.data?.connected}>
                  {cnvActions.testToken.isPending ? copy({ en: "Testing token...", vi: "Đang kiểm tra token..." }) : copy({ en: "Test token", vi: "Kiểm tra token" })}
                </Button>
                <Button variant="secondary" onClick={() => cnvActions.register.mutate()} disabled={cnvActions.register.isPending || !cnvConnectionStatus.data?.connected}>
                  {cnvActions.register.isPending ? copy({ en: "Registering...", vi: "Đang đăng ký..." }) : copy({ en: "Register webhook", vi: "Đăng ký webhook" })}
                </Button>
                <Button variant="danger" onClick={() => cnvActions.remove.mutate()} disabled={cnvActions.remove.isPending || !cnvConnectionStatus.data?.connected}>
                  {cnvActions.remove.isPending ? copy({ en: "Removing...", vi: "Đang gỡ..." }) : copy({ en: "Remove webhook", vi: "Gỡ webhook" })}
                </Button>
                <Button variant="danger" onClick={() => cnvActions.disconnect.mutate()} disabled={cnvActions.disconnect.isPending || !cnvConnectionStatus.data?.connected}>
                  {cnvActions.disconnect.isPending ? copy({ en: "Disconnecting...", vi: "Đang ngắt kết nối..." }) : copy({ en: "Disconnect CNV", vi: "Ngắt kết nối CNV" })}
                </Button>
              </div>
            </div>
          </Panel>

          <Panel
            title={copy({ en: "Recent admin actions", vi: "Hành động quản trị gần đây" })}
            subtitle={copy({
              en: "Append-only audit trail for user and integration control actions.",
              vi: "Nhật ký bất biến cho thao tác người dùng và tích hợp."
            })}
          >
            {auditLogs.data?.data?.length ? (
              <div className="space-y-3">
                {auditLogs.data.data.map((entry) => (
                  <div key={entry.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{entry.summary}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {entry.actorUsername} · {entry.action}
                        </div>
                      </div>
                      <Badge tone="neutral">{entry.targetType}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : copy({ en: "Unknown time", vi: "Chưa rõ thời gian" })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No admin actions yet", vi: "Chưa có hành động quản trị" })}
                description={copy({
                  en: "Audit entries will appear here as actions are executed.",
                  vi: "Nhật ký sẽ xuất hiện tại đây khi có thao tác được thực hiện."
                })}
              />
            )}
          </Panel>

          <Panel
            title={copy({ en: "Recent sessions", vi: "Session gần đây" })}
            subtitle={copy({
              en: "Review active operator sessions and revoke them when needed.",
              vi: "Xem các session đang hoạt động và thu hồi khi cần."
            })}
          >
            {sessions.data?.data?.length ? (
              <div className="space-y-3">
                {sessions.data.data.map((session) => (
                  <div key={session.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{session.username ?? session.userId}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {session.userRole ?? copy({ en: "unknown role", vi: "không rõ vai trò" })} · {session.ipAddress ?? copy({ en: "unknown IP", vi: "không rõ IP" })}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {session.userAgent ?? copy({ en: "Unknown user agent", vi: "Không rõ user agent" })}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge tone={session.revokedAt ? "danger" : "success"}>
                          {session.revokedAt ? copy({ en: "Revoked", vi: "Đã thu hồi" }) : copy({ en: "Active", vi: "Hoạt động" })}
                        </Badge>
                        <Button size="sm" variant="danger" onClick={() => revokeSession.mutate(session.id)} disabled={revokeSession.isPending || Boolean(session.revokedAt)}>
                          {revokeSession.isPending ? copy({ en: "Revoking...", vi: "Đang thu hồi..." }) : copy({ en: "Revoke", vi: "Thu hồi" })}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {copy({ en: "Last used", vi: "Sử dụng lần cuối" })}: {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : copy({ en: "Unknown", vi: "Chưa rõ" })} · {copy({ en: "Expires", vi: "Hết hạn" })}: {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : copy({ en: "Unknown", vi: "Chưa rõ" })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No sessions found", vi: "Không tìm thấy session" })}
                description={copy({
                  en: "Active auth sessions will appear here for safety review.",
                  vi: "Các session xác thực đang hoạt động sẽ hiển thị tại đây để rà soát an toàn."
                })}
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
