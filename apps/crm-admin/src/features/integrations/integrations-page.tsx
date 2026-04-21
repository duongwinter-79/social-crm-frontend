import {
  Badge,
  Button,
  DescriptionList,
  InfoCard,
  MetricCard,
  Panel,
  SectionHeader,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useCnvActionMutations,
  useCnvConnectionStatusQuery,
  useCnvCustomersQuery,
  useCnvInfoQuery,
  useHealthQuery
} from "@social-crm/api";
import { useI18n } from "../../i18n";

export function IntegrationsPage() {
  const health = useHealthQuery();
  const connectionStatus = useCnvConnectionStatusQuery();
  const actions = useCnvActionMutations();
  const info = useCnvInfoQuery(Boolean(connectionStatus.data?.connected));
  const customers = useCnvCustomersQuery(Boolean(connectionStatus.data?.connected));
  const { copy } = useI18n();
  const cnvCustomers = customers.data?.result.customers ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Integration control", vi: "Dieu khien tich hop" })}
        title={copy({ en: "Platform and CNV connectivity", vi: "Ket noi nen tang va CNV" })}
        description={copy({
          en: "Use these controls for operator-level verification, customer-read checks, and webhook lifecycle management.",
          vi: "Su dung cac cong cu nay de kiem tra van hanh, doc khach hang CNV va quan ly vong doi webhook."
        })}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label={copy({ en: "Backend", vi: "Backend" })}
          value={health.data?.status ?? copy({ en: "Unknown", vi: "Chua ro" })}
          tone={health.data?.status === "ok" ? "success" : "warning"}
        />
        <MetricCard
          label={copy({ en: "Token test", vi: "Kiem tra token" })}
          value={actions.testToken.data?.tokenPrefix ? copy({ en: "Ready", vi: "San sang" }) : copy({ en: "Pending", vi: "Cho xu ly" })}
          tone={actions.testToken.data?.tokenPrefix ? "accent" : "neutral"}
        />
        <MetricCard
          label={copy({ en: "Webhook info", vi: "Thong tin webhook" })}
          value={info.data?.result ? copy({ en: "Loaded", vi: "Da tai" }) : copy({ en: "Pending", vi: "Cho xu ly" })}
        />
        <MetricCard
          label={copy({ en: "CNV customers", vi: "Khach hang CNV" })}
          value={customers.isLoading ? copy({ en: "Loading", vi: "Dang tai" }) : cnvCustomers.length}
          tone={cnvCustomers.length ? "success" : "neutral"}
        />
      </div>

      <Toolbar compact className="border-slate-200/90">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <DescriptionList
            className="flex-1"
            columns={3}
            items={[
              {
                label: copy({ en: "Backend status", vi: "Trang thai backend" }),
                value: <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>{health.data?.status ?? copy({ en: "Unknown", vi: "Chua ro" })}</Badge>
              },
              {
                label: copy({ en: "CNV token check", vi: "Kiem tra token CNV" }),
                value: actions.testToken.data?.tokenPrefix
                  ? copy({ en: `Token ${actions.testToken.data.tokenPrefix}`, vi: `Token ${actions.testToken.data.tokenPrefix}` })
                  : copy({ en: "Not tested yet", vi: "Chua kiem tra" })
              },
              {
                label: copy({ en: "CNV customer read", vi: "Doc khach hang CNV" }),
                value: customers.isError
                  ? copy({ en: "Failed", vi: "Loi" })
                  : customers.data
                    ? copy({ en: `${cnvCustomers.length} loaded`, vi: `${cnvCustomers.length} da tai` })
                    : copy({ en: "Not loaded yet", vi: "Chua tai" })
              }
            ]}
          />
          <ToolbarActions className="lg:justify-end">
            <Button onClick={() => actions.testToken.mutate()} disabled={actions.testToken.isPending}>
              {actions.testToken.isPending ? copy({ en: "Testing token...", vi: "Dang kiem tra token..." }) : copy({ en: "Test token", vi: "Kiem tra token" })}
            </Button>
            <Button variant="secondary" onClick={() => actions.register.mutate()} disabled={actions.register.isPending || !connectionStatus.data?.connected}>
              {actions.register.isPending ? copy({ en: "Registering...", vi: "Dang dang ky..." }) : copy({ en: "Register webhook", vi: "Dang ky webhook" })}
            </Button>
            <Button variant="danger" onClick={() => actions.remove.mutate()} disabled={actions.remove.isPending || !connectionStatus.data?.connected}>
              {actions.remove.isPending ? copy({ en: "Removing...", vi: "Dang go..." }) : copy({ en: "Remove webhook", vi: "Go webhook" })}
            </Button>
          </ToolbarActions>
        </div>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Operator guidance", vi: "Huong dan van hanh" })}
            subtitle={copy({ en: "Use this panel before taking webhook lifecycle actions.", vi: "Xem phan nay truoc khi thao tac voi vong doi webhook." })}
          >
            <div className="space-y-3">
              <InfoCard
                label={copy({ en: "Health first", vi: "Uu tien suc khoe he thong" })}
                value={copy({
                  en: "Verify backend health before registration or removal actions.",
                  vi: "Kiem tra backend on dinh truoc khi dang ky hoac go webhook."
                })}
              />
              <InfoCard
                label={copy({ en: "Token before webhook", vi: "Kiem tra token truoc" })}
                value={copy({
                  en: "Run token verification first to avoid noisy setup failures.",
                  vi: "Kiem tra token truoc de tranh loi cau hinh khong can thiet khi dang ky webhook."
                })}
              />
              <InfoCard
                label={copy({ en: "Customer read scope", vi: "Scope doc khach hang" })}
                value={copy({
                  en: "The customer panel verifies the stored CNV SSO token can call the v2 read_customers API.",
                  vi: "Bang khach hang xac minh token SSO CNV da luu co the goi API read_customers v2."
                })}
              />
            </div>
          </Panel>

          <Panel
            title={copy({ en: "Backend health", vi: "Suc khoe backend" })}
            subtitle={copy({ en: "Public health endpoint snapshot from `/api/health`.", vi: "Anh chup trang thai tu endpoint `/api/health`." })}
          >
            <pre className="mt-4 overflow-auto rounded-[22px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {JSON.stringify(health.data ?? {}, null, 2)}
            </pre>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title={copy({ en: "CNV webhook controls", vi: "Dieu khien webhook CNV" })}
            subtitle={copy({
              en: "Admin actions for CNV token verification and webhook registration lifecycle.",
              vi: "Cac thao tac quan tri de kiem tra token va quan ly vong doi dang ky webhook CNV."
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard
                label={copy({ en: "Latest token check", vi: "Lan kiem tra token gan nhat" })}
                value={
                  actions.testToken.data
                    ? copy({
                        en: `Token prefix: ${actions.testToken.data.tokenPrefix ?? "Unavailable"}`,
                        vi: `Tien to token: ${actions.testToken.data.tokenPrefix ?? "Khong co"}`
                      })
                    : copy({ en: "Run a token test to confirm CNV auth setup.", vi: "Chay kiem tra token de xac nhan cau hinh xac thuc CNV." })
                }
                className="bg-slate-50"
              />
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{copy({ en: "Webhook registration info", vi: "Thong tin dang ky webhook" })}</div>
                  <Badge tone="accent">CNV</Badge>
                </div>
                <pre className="overflow-auto rounded-[18px] border border-slate-200 bg-white p-3 text-xs text-slate-600">
                  {JSON.stringify(info.data?.result ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </Panel>

          <Panel
            title={copy({ en: "CNV customer read check", vi: "Kiem tra doc khach hang CNV" })}
            subtitle={copy({
              en: "Read-only sample from `/cnv/webhook-admin/customers` using the stored SSO access token.",
              vi: "Mau chi doc tu `/cnv/webhook-admin/customers` bang access token SSO da luu."
            })}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone={customers.isError ? "danger" : cnvCustomers.length ? "success" : "neutral"}>
                  {customers.isError
                    ? copy({ en: "Read failed", vi: "Doc that bai" })
                    : cnvCustomers.length
                      ? copy({ en: "Read successful", vi: "Doc thanh cong" })
                      : copy({ en: "No customers loaded", vi: "Chua tai khach hang" })}
                </Badge>
                <span className="text-sm text-slate-500">
                  {copy({ en: `${cnvCustomers.length} customer records`, vi: `${cnvCustomers.length} ban ghi khach hang` })}
                </span>
              </div>
              <Button variant="secondary" onClick={() => customers.refetch()} disabled={customers.isFetching || !connectionStatus.data?.connected}>
                {customers.isFetching ? copy({ en: "Refreshing...", vi: "Dang tai lai..." }) : copy({ en: "Refresh customers", vi: "Tai lai khach hang" })}
              </Button>
            </div>

            {customers.isError ? (
              <InfoCard
                label={copy({ en: "Customer API error", vi: "Loi API khach hang" })}
                value={copy({
                  en: "The backend could not read CNV customers. Check token scope, CNV API availability, and backend logs.",
                  vi: "Backend khong doc duoc khach hang CNV. Kiem tra scope token, API CNV va log backend."
                })}
                className="bg-rose-50"
              />
            ) : cnvCustomers.length ? (
              <div className="overflow-hidden rounded-[22px] border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">{copy({ en: "Customer", vi: "Khach hang" })}</th>
                      <th className="px-4 py-3">{copy({ en: "Phone", vi: "SDT" })}</th>
                      <th className="px-4 py-3">{copy({ en: "Created", vi: "Ngay tao" })}</th>
                      <th className="px-4 py-3">{copy({ en: "Points", vi: "Diem" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cnvCustomers.slice(0, 10).map((customer) => (
                      <tr key={customer.id} className="bg-white">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{[customer.last_name, customer.first_name].filter(Boolean).join(" ") || `CNV #${customer.id}`}</div>
                          <div className="text-xs text-slate-500">ID {customer.id}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{customer.phone || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{customer.points ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <InfoCard
                label={copy({ en: "No CNV customers", vi: "Chua co khach hang CNV" })}
                value={copy({
                  en: "Connect CNV SSO first, then refresh customer data to verify the read scope.",
                  vi: "Ket noi CNV SSO truoc, sau do tai lai du lieu khach hang de xac minh scope doc."
                })}
                className="bg-slate-50"
              />
            )}

            <pre className="mt-4 max-h-80 overflow-auto rounded-[18px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {JSON.stringify(customers.data?.result ?? {}, null, 2)}
            </pre>
          </Panel>

          <Panel
            title={copy({ en: "Action outcomes", vi: "Ket qua thao tac" })}
            subtitle={copy({ en: "Latest mutation feedback from the available CNV admin controls.", vi: "Trang thai moi nhat cua cac thao tac quan tri CNV kha dung." })}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label={copy({ en: "Token test", vi: "Kiem tra token" })}
                value={actions.testToken.isSuccess ? copy({ en: "Completed", vi: "Hoan tat" }) : actions.testToken.isPending ? copy({ en: "Running", vi: "Dang chay" }) : copy({ en: "Idle", vi: "Cho" })}
              />
              <MetricCard
                label={copy({ en: "Register", vi: "Dang ky" })}
                value={actions.register.isSuccess ? copy({ en: "Completed", vi: "Hoan tat" }) : actions.register.isPending ? copy({ en: "Running", vi: "Dang chay" }) : copy({ en: "Idle", vi: "Cho" })}
              />
              <MetricCard
                label={copy({ en: "Remove", vi: "Go bo" })}
                value={actions.remove.isSuccess ? copy({ en: "Completed", vi: "Hoan tat" }) : actions.remove.isPending ? copy({ en: "Running", vi: "Dang chay" }) : copy({ en: "Idle", vi: "Cho" })}
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
