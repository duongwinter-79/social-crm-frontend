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
  PaginationFooter,
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
  useCreateUserMutation,
  useHealthQuery,
  useRevokeAdminSessionMutation,
  useUpdateUserMutation,
  useUserDetailQuery,
  useUsersQuery
} from "@social-crm/api";
import { useI18n } from "../../i18n";

const ROLE_OPTIONS = ["", "admin", "staff"] as const;
const PAGE_SIZE = 25;

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
  const [page, setPage] = useState(0);
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
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    search: filters.search || undefined,
    role: filters.role || undefined,
    isActive: filters.status === "" ? undefined : filters.status === "active"
  });
  const health = useHealthQuery();
  const systemStatus = useAdminSystemStatusQuery();
  const auditLogs = useAdminAuditLogsQuery({ limit: 8 });
  const sessions = useAdminSessionsQuery({ limit: 8, includeRevoked: false });
  const revokeSession = useRevokeAdminSessionMutation();
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const rows = usersQuery.data?.data ?? [];
  const selectedIdResolved = selectedId || rows[0]?.id || "";
  const detailQuery = useUserDetailQuery(selectedIdResolved);
  const selected = detailQuery.data;

  useEffect(() => {
    setPage(0);
  }, [filters.search, filters.role, filters.status]);

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
          en: "Manage CRM operators, assign roles, review sessions, and audit recent admin actions.",
          vi: "Quản lý tài khoản vận hành CRM, phân quyền, xem session và kiểm tra nhật ký quản trị gần đây."
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

      {/* Operator list + Selected account editor — same row, heights match. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={copy({ en: "Operator accounts", vi: "Tài khoản vận hành" })}
          subtitle={copy({
            en: "Select an account to inspect or update role and activation state.",
            vi: "Chọn tài khoản để xem và cập nhật vai trò hoặc trạng thái hoạt động."
          })}
        >
          {rows.length ? (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
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
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={usersQuery.data?.total ?? 0}
            isFetching={usersQuery.isFetching}
            itemLabel={copy({ en: "users", vi: "người dùng" })}
            pageLabel={copy({ en: "Page", vi: "Trang" })}
            previousLabel={copy({ en: "Previous", vi: "Trước" })}
            nextLabel={copy({ en: "Next", vi: "Sau" })}
            onPrevious={() => setPage((current) => Math.max(0, current - 1))}
            onNext={() => setPage((current) => current + 1)}
            className="mt-4 border-slate-100 px-0 pb-0 pt-4"
          />
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

      {/* Create user + System status — compact pair below the editor row. */}
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
          title={copy({ en: "System status", vi: "Trạng thái hệ thống" })}
          subtitle={copy({
            en: "Read-only operational context for backend health and active sessions.",
            vi: "Thông tin chỉ đọc cho tình trạng backend và session đang hoạt động."
          })}
        >
          <DescriptionList
            items={[
              {
                label: copy({ en: "Backend", vi: "Backend" }),
                value: <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>{health.data?.status ?? copy({ en: "Unknown", vi: "Chưa rõ" })}</Badge>
              },
              {
                label: copy({ en: "Active sessions", vi: "Session đang hoạt động" }),
                value: String(systemStatus.data?.auth.activeSessions ?? "-")
              },
              {
                label: copy({ en: "Active users", vi: "Người dùng đang hoạt động" }),
                value: String(systemStatus.data?.auth.activeUsers ?? "-")
              }
            ]}
          />
        </Panel>
      </div>

      {/* Audit log + sessions — full-width, balanced row at bottom. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={copy({ en: "Recent admin actions", vi: "Hành động quản trị gần đây" })}
          subtitle={copy({
            en: "Append-only audit trail for user and integration control actions.",
            vi: "Nhật ký bất biến cho thao tác người dùng và tích hợp."
          })}
        >
          {auditLogs.data?.data?.length ? (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
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
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
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
  );
}
