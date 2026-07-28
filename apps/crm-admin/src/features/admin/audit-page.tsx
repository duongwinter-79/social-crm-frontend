import { Badge, Button, DescriptionList, EmptyState, Panel, SectionHeader } from "@social-crm/ui";
import {
  useAdminAuditLogsQuery,
  useAdminSessionsQuery,
  useAdminSystemStatusQuery,
  useHealthQuery,
  useRevokeAdminSessionMutation,
  usePermissions,
} from "@social-crm/api";
import { useI18n } from "../../i18n";

/**
 * Read-only oversight page gated by the `view_audit` capability — system
 * health, the append-only admin audit trail, and active auth sessions.
 *
 * Purpose-built for the partial-admin (ops_manager) role, which holds
 * `view_audit` but not user management or system config. Full admins reach the
 * same data (plus user management + workers) via /admin; here the session
 * revoke action is shown ONLY to full admins, since it is a hard-admin action.
 */
export function AuditPage() {
  const { copy } = useI18n();
  const { isAdmin } = usePermissions();
  const health = useHealthQuery();
  const systemStatus = useAdminSystemStatusQuery();
  const auditLogs = useAdminAuditLogsQuery({ limit: 20 });
  const sessions = useAdminSessionsQuery({ limit: 20, includeRevoked: false });
  const revokeSession = useRevokeAdminSessionMutation();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Oversight", vi: "Giám sát" })}
        title={copy({ en: "Audit & sessions", vi: "Nhật ký & phiên đăng nhập" })}
        description={copy({
          en: "Read-only view of backend health, recent admin actions, and active operator sessions.",
          vi: "Chế độ chỉ xem về tình trạng hệ thống, hành động quản trị gần đây và các phiên đăng nhập đang hoạt động.",
        })}
      />

      <Panel
        title={copy({ en: "System status", vi: "Trạng thái hệ thống" })}
        subtitle={copy({
          en: "Read-only operational context for backend health and active sessions.",
          vi: "Thông tin chỉ đọc về tình trạng API và phiên đăng nhập đang hoạt động.",
        })}
      >
        <DescriptionList
          columns={3}
          items={[
            {
              label: copy({ en: "Backend", vi: "API" }),
              value: <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>{health.data?.status ?? copy({ en: "Unknown", vi: "Chưa rõ" })}</Badge>,
            },
            {
              label: copy({ en: "Active sessions", vi: "Phiên đang hoạt động" }),
              value: String(systemStatus.data?.auth.activeSessions ?? "-"),
            },
            {
              label: copy({ en: "Active users", vi: "Người dùng đang hoạt động" }),
              value: String(systemStatus.data?.auth.activeUsers ?? "-"),
            },
          ]}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={copy({ en: "Recent admin actions", vi: "Hành động quản trị gần đây" })}
          subtitle={copy({
            en: "Append-only audit trail for user and integration control actions.",
            vi: "Nhật ký bất biến cho thao tác người dùng và tích hợp.",
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
                vi: "Nhật ký sẽ xuất hiện tại đây khi có thao tác được thực hiện.",
              })}
            />
          )}
        </Panel>

        <Panel
          title={copy({ en: "Recent sessions", vi: "Phiên đăng nhập gần đây" })}
          subtitle={copy({
            en: "Active operator sessions.",
            vi: "Các phiên đăng nhập đang hoạt động.",
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
                      {isAdmin ? (
                        <Button size="sm" variant="danger" onClick={() => revokeSession.mutate(session.id)} disabled={revokeSession.isPending || Boolean(session.revokedAt)}>
                          {revokeSession.isPending ? copy({ en: "Revoking...", vi: "Đang thu hồi..." }) : copy({ en: "Revoke", vi: "Thu hồi" })}
                        </Button>
                      ) : null}
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
                vi: "Các session xác thực đang hoạt động sẽ hiển thị tại đây để rà soát an toàn.",
              })}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
