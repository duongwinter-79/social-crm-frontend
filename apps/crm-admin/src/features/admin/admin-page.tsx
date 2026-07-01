import { useEffect, useRef, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  useAiExtractionWorkerStatusQuery,
  useCreateUserMutation,
  useHealthQuery,
  useRevokeAdminSessionMutation,
  useTriggerAiExtractionWorkerMutation,
  useZaloEnrichmentWorkerStatusQuery,
  useTriggerZaloEnrichmentWorkerMutation,
  useUpdateUserMutation,
  useUserDetailQuery,
  useUsersQuery
} from "@social-crm/api";
import { useI18n } from "../../i18n";

const ROLE_OPTIONS = ["", "admin", "recruiter", "document_staff", "finance_staff", "user"] as const;
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
    role: "recruiter",
    isActive: "true"
  });
  const [editForm, setEditForm] = useState({
    username: "",
    password: "",
    role: "recruiter",
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
  const aiWorkerStatus = useAiExtractionWorkerStatusQuery({ pollWhileRunning: true });
  const triggerAiWorker = useTriggerAiExtractionWorkerMutation();
  const zaloEnrichStatus = useZaloEnrichmentWorkerStatusQuery({ pollWhileRunning: true });
  const triggerZaloEnrich = useTriggerZaloEnrichmentWorkerMutation();

  // Toast notification: detect running → idle transition and show result
  const [enrichToast, setEnrichToast] = useState<{ updated: number; skipped: number; errors: number } | null>(null);
  const wasRunning = useRef(false);
  useEffect(() => {
    const running = Boolean(zaloEnrichStatus.data?.running);
    if (wasRunning.current && !running && zaloEnrichStatus.data?.lastRunEndedAt) {
      setEnrichToast({
        updated: zaloEnrichStatus.data.lastRunUpdated,
        skipped: zaloEnrichStatus.data.lastRunSkipped,
        errors: zaloEnrichStatus.data.lastRunErrors,
      });
    }
    wasRunning.current = running;
  }, [zaloEnrichStatus.data?.running, zaloEnrichStatus.data?.lastRunEndedAt]);
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
          vi: "Quản lý tài khoản nhân sự CRM, phân quyền, xem phiên đăng nhập và kiểm tra nhật ký quản trị gần đây."
        })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {copy({
              en: "This workspace stays limited to backend-enforced admin controls.",
              vi: "Khu vực này chỉ bao gồm các điều khiển quản trị do hệ thống thực thi."
            })}
          </span>
          <Badge tone="warning">{copy({ en: "No raw policy editing", vi: "Không chỉnh sửa chính sách trực tiếp" })}</Badge>
        </div>
      </InfoStrip>

      <Panel
        title={copy({ en: "Admin tools", vi: "Công cụ quản trị" })}
        subtitle={copy({
          en: "Open dedicated admin workspaces without crowding the identity and access control page.",
          vi: "Mở các khu vực quản trị riêng để trang tài khoản và phân quyền không bị quá tải."
        })}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            to="/ui-text-overrides"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {copy({ en: "UI text overrides", vi: "Tùy chỉnh chữ hiển thị" })}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {copy({
                    en: "Preview and publish approved wording changes for CRM screens.",
                    vi: "Xem thử và lưu các thay đổi câu chữ đã được cho phép trên màn hình CRM."
                  })}
                </div>
              </div>
              <Badge tone="accent">{copy({ en: "Open", vi: "Mở" })}</Badge>
            </div>
          </Link>
          <Link
            to="/region-groups"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {copy({ en: "Region groups", vi: "Nhóm khu vực" })}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {copy({
                    en: "Manage named province groups (e.g. \"Miền Trung\") used by orders to exclude candidates from a region.",
                    vi: "Quản lý các nhóm tỉnh/thành có tên gọi (vd. \"Miền Trung\") để đơn hàng loại trừ ứng viên theo khu vực."
                  })}
                </div>
              </div>
              <Badge tone="accent">{copy({ en: "Open", vi: "Mở" })}</Badge>
            </div>
          </Link>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label={copy({ en: "Visible users", vi: "Người dùng hiển thị" })} value={String(rows.length)} />
        <MetricCard label={copy({ en: "Admins", vi: "Quản trị viên" })} value={String(summary.admins)} tone="accent" />
        <MetricCard label={copy({ en: "Active accounts", vi: "Tài khoản hoạt động" })} value={`${summary.active} / ${rows.length || 0}`} tone="success" />
        <MetricCard
          label={copy({ en: "Backend", vi: "API" })}
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
          <Badge tone="neutral">{copy({ en: `${usersQuery.data?.total ?? 0} total in backend`, vi: `${usersQuery.data?.total ?? 0} tài khoản trong hệ thống` })}</Badge>
        </ToolbarActions>
      </Toolbar>

      {/* Operator list + Selected account editor — same row, heights match. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={copy({ en: "Operator accounts", vi: "Tài khoản nhân sự" })}
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
                vi: "Điều chỉnh bộ lọc hoặc tạo tài khoản nhân sự đầu tiên."
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
            vi: "Cập nhật vai trò và trạng thái hoạt động cho tài khoản đang chọn."
          })}
        >
          {selected ? (
            <div className="space-y-4">
              <DescriptionList
                items={[
                  { label: copy({ en: "User ID", vi: "Mã người dùng" }), value: selected.id },
                  { label: copy({ en: "Username", vi: "Tên đăng nhập" }), value: selected.username },
                  { label: copy({ en: "Role", vi: "Vai trò" }), value: formatEnum(selected.role) },
                  { label: copy({ en: "Status", vi: "Trạng thái" }), value: selected.isActive ? copy({ en: "Active", vi: "Hoạt động" }) : copy({ en: "Inactive", vi: "Ngừng hoạt động" }) }
                ]}
              />
              <Input label={copy({ en: "Username", vi: "Tên đăng nhập" })} value={editForm.username} onChange={(e) => setEditForm((s) => ({ ...s, username: e.target.value }))} />
              <Input label={copy({ en: "Reset password (optional)", vi: "Đặt lại mật khẩu (tùy chọn)" })} type="password" value={editForm.password} onChange={(e) => setEditForm((s) => ({ ...s, password: e.target.value }))} />
              <FieldGroup columns={2}>
                <Select label={copy({ en: "Role", vi: "Vai trò" })} value={editForm.role} onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value }))}>
                  <option value="recruiter">{formatEnum("recruiter")}</option>
                  <option value="document_staff">{formatEnum("document_staff")}</option>
                  <option value="finance_staff">{formatEnum("finance_staff")}</option>
                  <option value="admin">{formatEnum("admin")}</option>
                  <option value="user">{formatEnum("user")}</option>
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
              description={copy({ en: "Select an operator account to review or update.", vi: "Chọn tài khoản nhân sự để xem hoặc cập nhật." })}
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
                <option value="recruiter">{formatEnum("recruiter")}</option>
                <option value="document_staff">{formatEnum("document_staff")}</option>
                <option value="finance_staff">{formatEnum("finance_staff")}</option>
                <option value="admin">{formatEnum("admin")}</option>
                <option value="user">{formatEnum("user")}</option>
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
                      setCreateForm({ username: "", password: "", role: "recruiter", isActive: "true" });
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
            vi: "Thông tin chỉ đọc về tình trạng API và phiên đăng nhập đang hoạt động."
          })}
        >
          <DescriptionList
            items={[
              {
                label: copy({ en: "Backend", vi: "API" }),
                value: <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>{health.data?.status ?? copy({ en: "Unknown", vi: "Chưa rõ" })}</Badge>
              },
              {
                label: copy({ en: "Active sessions", vi: "Phiên đăng nhập đang hoạt động" }),
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

      {/* AI extraction worker — manual "Run now" + status snapshot. */}
      <Panel
        title={copy({ en: "AI extraction worker", vi: "Worker AI trích xuất" })}
        subtitle={copy({
          en: "Background process that scans new Zalo messages and imported lead notes. Trigger manually right after a big import to drain the backlog without waiting for the next scheduled tick.",
          vi: "Tiến trình nền quét tin nhắn Zalo mới và ghi chú ứng viên đã nhập. Chạy thủ công ngay sau khi nhập dữ liệu lớn để xử lý hết tồn đọng mà không phải chờ tick kế tiếp."
        })}
        action={
          <Button
            onClick={() => triggerAiWorker.mutate()}
            disabled={
              triggerAiWorker.isPending ||
              !aiWorkerStatus.data?.enabled ||
              Boolean(aiWorkerStatus.data?.running)
            }
          >
            {triggerAiWorker.isPending
              ? copy({ en: "Triggering...", vi: "Đang kích hoạt..." })
              : aiWorkerStatus.data?.running
                ? copy({ en: "Already running", vi: "Đang chạy" })
                : copy({ en: "Run now", vi: "Chạy ngay" })}
          </Button>
        }
      >
        {!aiWorkerStatus.data?.enabled ? (
          <InfoStrip className="border-amber-300 bg-amber-50 text-amber-900">
            <span>
              {copy({
                en: "Worker is disabled via AI_EXTRACTION_WORKER_ENABLED. Re-enable in backend.env and recreate the API container before triggering.",
                vi: "Worker đang tắt qua AI_EXTRACTION_WORKER_ENABLED. Bật lại trong backend.env và khởi động lại container API trước khi kích hoạt."
              })}
            </span>
          </InfoStrip>
        ) : null}
        <DescriptionList
          className="mt-1"
          columns={3}
          items={[
            {
              label: copy({ en: "State", vi: "Trạng thái" }),
              value: aiWorkerStatus.data?.running ? (
                <Badge tone="warning">{copy({ en: "Running", vi: "Đang chạy" })}</Badge>
              ) : aiWorkerStatus.data?.enabled ? (
                <Badge tone="success">{copy({ en: "Idle", vi: "Sẵn sàng" })}</Badge>
              ) : (
                <Badge tone="danger">{copy({ en: "Disabled", vi: "Đã tắt" })}</Badge>
              )
            },
            {
              label: copy({ en: "Tick interval", vi: "Chu kỳ tick" }),
              value: aiWorkerStatus.data
                ? formatDurationMs(aiWorkerStatus.data.tickMs)
                : "—"
            },
            {
              label: copy({ en: "Batch size", vi: "Kích thước batch" }),
              value: String(aiWorkerStatus.data?.batchSize ?? "—")
            },
            {
              label: copy({ en: "Last tick started", vi: "Tick cuối bắt đầu" }),
              value: aiWorkerStatus.data?.lastTickStartedAt
                ? new Date(aiWorkerStatus.data.lastTickStartedAt).toLocaleString()
                : copy({ en: "Never since restart", vi: "Chưa chạy kể từ khi khởi động" })
            },
            {
              label: copy({ en: "Last tick ended", vi: "Tick cuối kết thúc" }),
              value: aiWorkerStatus.data?.lastTickEndedAt
                ? new Date(aiWorkerStatus.data.lastTickEndedAt).toLocaleString()
                : "—"
            },
            {
              label: copy({ en: "Processed last tick", vi: "Đã xử lý lần trước" }),
              value: aiWorkerStatus.data
                ? `${aiWorkerStatus.data.lastTickThreadsProcessed} threads · ${aiWorkerStatus.data.lastTickImportedLeadsProcessed} ${copy({ en: "imported leads", vi: "Ứng viên nhập" })}`
                : "—"
            }
          ]}
        />
      </Panel>

      {/* Zalo name enrichment worker */}
      <Panel
        title={copy({ en: "Zalo name enrichment worker", vi: "Worker cập nhật tên Zalo" })}
        subtitle={copy({
          en: "Fetches the real display name from Zalo OA API for all leads that still show a placeholder. Streams through all records automatically — no need to click multiple times.",
          vi: "Lấy tên hiển thị thực từ Zalo OA API cho tất cả ứng viên vẫn hiển thị placeholder. Tự động xử lý toàn bộ — không cần bấm nhiều lần."
        })}
        action={
          <Button
            onClick={() => { setEnrichToast(null); triggerZaloEnrich.mutate(); }}
            disabled={triggerZaloEnrich.isPending || Boolean(zaloEnrichStatus.data?.running)}
          >
            {triggerZaloEnrich.isPending
              ? copy({ en: "Triggering...", vi: "Đang kích hoạt..." })
              : zaloEnrichStatus.data?.running
                ? copy({ en: "Running...", vi: "Đang chạy..." })
                : copy({ en: "Run now", vi: "Chạy ngay" })}
          </Button>
        }
      >
        {/* Completion toast */}
        {enrichToast && (
          <InfoStrip className="border-green-300 bg-green-50 text-green-900 mb-3">
            <div className="flex items-center justify-between gap-4 w-full">
              <span>
                ✅ {copy({ en: "Enrichment complete", vi: "Hoàn tất cập nhật" })} — {" "}
                <strong>{enrichToast.updated}</strong> {copy({ en: "updated", vi: "cập nhật" })} · {" "}
                <strong>{enrichToast.skipped}</strong> {copy({ en: "skipped", vi: "bỏ qua" })}
                {enrichToast.errors > 0 && (
                  <> · <strong className="text-red-700">{enrichToast.errors} {copy({ en: "errors", vi: "lỗi" })}</strong></>
                )}
              </span>
              <button onClick={() => setEnrichToast(null)} className="text-green-700 hover:text-green-900 text-lg leading-none">×</button>
            </div>
          </InfoStrip>
        )}

        {/* Live progress while running */}
        {zaloEnrichStatus.data?.running && (
          <InfoStrip className="border-blue-300 bg-blue-50 text-blue-900 mb-3">
            <span>
              ⏳ {copy({ en: "Running", vi: "Đang chạy" })}… {" "}
              {copy({ en: "batch", vi: "batch" })} {zaloEnrichStatus.data.currentBatches} · {" "}
              <strong>{zaloEnrichStatus.data.currentUpdated}</strong> {copy({ en: "updated so far", vi: "đã cập nhật" })}
              {zaloEnrichStatus.data.currentErrors > 0 && (
                <> · <span className="text-red-700">{zaloEnrichStatus.data.currentErrors} {copy({ en: "errors", vi: "lỗi" })}</span></>
              )}
            </span>
          </InfoStrip>
        )}

        {zaloEnrichStatus.data && !zaloEnrichStatus.data.enabled ? (
          <InfoStrip className="border-amber-300 bg-amber-50 text-amber-900">
            <span>
              {copy({
                en: "Scheduled ticks are disabled (ZALO_NAME_ENRICHMENT_WORKER_ENABLED=false). You can still run manually with the button above.",
                vi: "Tick tự động đang tắt. Bạn vẫn có thể chạy thủ công bằng nút bên trên."
              })}
            </span>
          </InfoStrip>
        ) : null}

        <DescriptionList
          className="mt-1"
          columns={3}
          items={[
            {
              label: copy({ en: "State", vi: "Trạng thái" }),
              value: zaloEnrichStatus.data?.running ? (
                <Badge tone="warning">{copy({ en: "Running", vi: "Đang chạy" })}</Badge>
              ) : zaloEnrichStatus.data?.enabled ? (
                <Badge tone="success">{copy({ en: "Idle (scheduled)", vi: "Sẵn sàng (lên lịch)" })}</Badge>
              ) : (
                <Badge tone="neutral">{copy({ en: "Idle (manual only)", vi: "Sẵn sàng (thủ công)" })}</Badge>
              )
            },
            {
              label: copy({ en: "Batch size", vi: "Kích thước batch" }),
              value: String(zaloEnrichStatus.data?.batchSize ?? "—")
            },
            {
              label: copy({ en: "Tick interval", vi: "Chu kỳ tick" }),
              value: zaloEnrichStatus.data?.tickMs
                ? formatDurationMs(zaloEnrichStatus.data.tickMs)
                : copy({ en: "Manual only", vi: "Thủ công" })
            },
            {
              label: copy({ en: "Last run started", vi: "Lần chạy cuối bắt đầu" }),
              value: zaloEnrichStatus.data?.lastRunStartedAt
                ? new Date(zaloEnrichStatus.data.lastRunStartedAt).toLocaleString()
                : copy({ en: "Never since restart", vi: "Chưa chạy kể từ khi khởi động" })
            },
            {
              label: copy({ en: "Last run ended", vi: "Lần chạy cuối kết thúc" }),
              value: zaloEnrichStatus.data?.lastRunEndedAt
                ? new Date(zaloEnrichStatus.data.lastRunEndedAt).toLocaleString()
                : "—"
            },
            {
              label: copy({ en: "Last run result", vi: "Kết quả lần chạy cuối" }),
              value: zaloEnrichStatus.data?.lastRunStartedAt
                ? `${zaloEnrichStatus.data.lastRunUpdated} ${copy({ en: "updated", vi: "cập nhật" })} · ${zaloEnrichStatus.data.lastRunSkipped} ${copy({ en: "skipped", vi: "bỏ qua" })} · ${zaloEnrichStatus.data.lastRunErrors} ${copy({ en: "errors", vi: "lỗi" })} · ${zaloEnrichStatus.data.lastRunBatches} ${copy({ en: "batches", vi: "batch" })}`
                : "—"
            }
          ]}
        />
      </Panel>

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
          title={copy({ en: "Recent sessions", vi: "Phiên đăng nhập gần đây" })}
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

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)}d`;
}
