import { useState } from "react";
import {
  Badge,
  Button,
  DescriptionList,
  InfoCard,
  MetricCard,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useCnvActionMutations,
  useCnvConnectionStatusQuery,
  useCnvCustomCollectionsQuery,
  useCnvCustomersQuery,
  useCnvInfoQuery,
  useCnvOrdersQuery,
  useCnvProductsQuery,
  useCnvSmartCollectionsQuery,
  useHealthQuery,
  type CnvCustomersResponse,
  type CnvResourceListResponse
} from "@social-crm/api";
import { useI18n } from "../../i18n";

const pageSizeOptions = [10, 20, 50];

type Copy = { en: string; vi: string };
type CnvRow = Record<string, unknown> & { id?: string | number };
type PagedQuery = {
  data?: CnvResourceListResponse;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
};

function formatDate(value?: unknown) {
  return typeof value === "string" && value ? new Date(value).toLocaleDateString("vi-VN") : "-";
}

function textValue(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatCustomerName(customer: { id: number; first_name?: string | null; last_name?: string | null }) {
  return [customer.last_name, customer.first_name].filter(Boolean).join(" ") || `CNV #${customer.id}`;
}

function getList(data: CnvResourceListResponse | undefined, key: string): CnvRow[] {
  const value = data?.result?.[key];
  return Array.isArray(value) ? (value as CnvRow[]) : [];
}

function usePaging(defaultLimit = 10) {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(defaultLimit);
  return {
    page,
    limit,
    offset: page * limit,
    setNextPage: () => setPage((current) => current + 1),
    setPreviousPage: () => setPage((current) => Math.max(0, current - 1)),
    setLimit: (nextLimit: number) => {
      setLimit(nextLimit);
      setPage(0);
    }
  };
}

function CnvPagedResourcePanel(props: {
  title: Copy;
  subtitle: Copy;
  emptyTitle: Copy;
  emptyDescription: Copy;
  resourceKey: string;
  query: PagedQuery;
  page: number;
  limit: number;
  offset: number;
  onPrevious: () => void;
  onNext: () => void;
  onLimitChange: (limit: number) => void;
  enabled: boolean;
  columns: Array<{
    label: Copy;
    render: (row: CnvRow) => string;
  }>;
  rawPayload?: boolean;
}) {
  const { copy } = useI18n();
  const rows = getList(props.query.data, props.resourceKey);
  const hasPrevious = props.page > 0;
  const hasNext = rows.length >= props.limit;
  const rangeStart = rows.length ? props.offset + 1 : 0;
  const rangeEnd = props.offset + rows.length;

  return (
    <Panel
      title={copy(props.title)}
      subtitle={copy(props.subtitle)}
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={props.query.isError ? "danger" : rows.length ? "success" : "neutral"}>
            {props.query.isError
              ? copy({ en: "Read failed", vi: "Đọc thất bại" })
              : rows.length
                ? copy({ en: "Read successful", vi: "Đọc thành công" })
                : copy({ en: "No records loaded", vi: "Chưa tải bản ghi" })}
          </Badge>
          <span className="text-sm text-slate-500">
            {copy({
              en: rows.length ? `Showing ${rangeStart}-${rangeEnd}. Total count is not provided by CNV.` : "No records on this page.",
              vi: rows.length ? `Đang hiển thị ${rangeStart}-${rangeEnd}. CNV không cung cấp tổng số.` : "Trang này không có bản ghi."
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Select
            label={copy({ en: "Rows per page", vi: "Số dòng mỗi trang" })}
            value={String(props.limit)}
            onChange={(event) => props.onLimitChange(Number(event.target.value))}
            className="min-w-32"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => props.query.refetch()} disabled={props.query.isFetching || !props.enabled}>
            {props.query.isFetching ? copy({ en: "Refreshing...", vi: "Đang tải lại..." }) : copy({ en: "Refresh", vi: "Tải lại" })}
          </Button>
        </div>
      </div>

      {props.query.isError ? (
        <InfoCard
          label={copy({ en: "CNV API error", vi: "Lỗi API CNV" })}
          value={copy({
            en: "The backend could not read this CNV resource. Check token scope, CNV API availability, and backend logs.",
            vi: "Backend không đọc được tài nguyên CNV này. Kiểm tra scope token, API CNV và log backend."
          })}
          className="bg-rose-50"
        />
      ) : rows.length ? (
        <div className="overflow-hidden rounded-[22px] border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-400">
              <tr>
                {props.columns.map((column) => (
                  <th key={column.label.en} className="px-4 py-3">{copy(column.label)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={textValue(row.id, `${props.resourceKey}-${props.offset + index}`)} className="bg-white">
                  {props.columns.map((column) => (
                    <td key={column.label.en} className="px-4 py-3 text-slate-700">{column.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <InfoCard
          label={copy(props.emptyTitle)}
          value={copy(props.emptyDescription)}
          className="bg-slate-50"
        />
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-500">
          {copy({
            en: `Page ${props.page + 1}, offset ${props.offset}, limit ${props.limit}`,
            vi: `Trang ${props.page + 1}, offset ${props.offset}, limit ${props.limit}`
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={props.onPrevious} disabled={!hasPrevious || props.query.isFetching}>
            {copy({ en: "Previous", vi: "Trang trước" })}
          </Button>
          <Button variant="secondary" onClick={props.onNext} disabled={!hasNext || props.query.isFetching}>
            {copy({ en: "Next", vi: "Trang sau" })}
          </Button>
        </div>
      </div>

      {props.rawPayload ? (
        <pre className="mt-4 max-h-80 overflow-auto rounded-[18px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {JSON.stringify(props.query.data?.result ?? {}, null, 2)}
        </pre>
      ) : null}
    </Panel>
  );
}

export function IntegrationsPage() {
  const customerPaging = usePaging();
  const productPaging = usePaging();
  const orderPaging = usePaging();
  const customCollectionPaging = usePaging();
  const smartCollectionPaging = usePaging();

  const health = useHealthQuery();
  const connectionStatus = useCnvConnectionStatusQuery();
  const actions = useCnvActionMutations();
  const info = useCnvInfoQuery(Boolean(connectionStatus.data?.connected));
  const customers = useCnvCustomersQuery(
    { limit: customerPaging.limit, offset: customerPaging.offset },
    Boolean(connectionStatus.data?.connected)
  );
  const products = useCnvProductsQuery(
    { limit: productPaging.limit, offset: productPaging.offset },
    Boolean(connectionStatus.data?.connected)
  );
  const orders = useCnvOrdersQuery(
    { limit: orderPaging.limit, offset: orderPaging.offset },
    Boolean(connectionStatus.data?.connected)
  );
  const customCollections = useCnvCustomCollectionsQuery(
    { limit: customCollectionPaging.limit, offset: customCollectionPaging.offset },
    Boolean(connectionStatus.data?.connected)
  );
  const smartCollections = useCnvSmartCollectionsQuery(
    { limit: smartCollectionPaging.limit, offset: smartCollectionPaging.offset },
    Boolean(connectionStatus.data?.connected)
  );
  const { copy } = useI18n();

  const cnvCustomers = (customers.data as CnvCustomersResponse | undefined)?.result.customers ?? [];
  const customerRangeStart = cnvCustomers.length ? customerPaging.offset + 1 : 0;
  const customerRangeEnd = customerPaging.offset + cnvCustomers.length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow={copy({ en: "Integration control", vi: "Điều khiển tích hợp" })}
        title={copy({ en: "Platform and CNV connectivity", vi: "Kết nối nền tảng và CNV" })}
        description={copy({
          en: "Use these controls for operator-level verification, paged CNV resource reads, and webhook lifecycle management.",
          vi: "Dùng các công cụ này để kiểm tra vận hành, đọc tài nguyên CNV theo trang và quản lý vòng đời webhook."
        })}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label={copy({ en: "Backend", vi: "Backend" })}
          value={health.data?.status ?? copy({ en: "Unknown", vi: "Chưa rõ" })}
          tone={health.data?.status === "ok" ? "success" : "warning"}
        />
        <MetricCard
          label={copy({ en: "Token test", vi: "Kiểm tra token" })}
          value={actions.testToken.data?.tokenPrefix ? copy({ en: "Ready", vi: "Sẵn sàng" }) : copy({ en: "Pending", vi: "Chờ xử lý" })}
          tone={actions.testToken.data?.tokenPrefix ? "accent" : "neutral"}
        />
        <MetricCard
          label={copy({ en: "Webhook info", vi: "Thông tin webhook" })}
          value={info.data?.result ? copy({ en: "Loaded", vi: "Đã tải" }) : copy({ en: "Pending", vi: "Chờ xử lý" })}
        />
        <MetricCard
          label={copy({ en: "CNV customers", vi: "Khách hàng CNV" })}
          value={customers.isLoading ? copy({ en: "Loading", vi: "Đang tải" }) : cnvCustomers.length}
          hint={copy({
            en: "Current page only. CNV does not return total count.",
            vi: "Chỉ tính trang hiện tại. CNV không trả về tổng số."
          })}
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
                label: copy({ en: "Backend status", vi: "Trạng thái backend" }),
                value: <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>{health.data?.status ?? copy({ en: "Unknown", vi: "Chưa rõ" })}</Badge>
              },
              {
                label: copy({ en: "CNV token check", vi: "Kiểm tra token CNV" }),
                value: actions.testToken.data?.tokenPrefix
                  ? copy({ en: `Token ${actions.testToken.data.tokenPrefix}`, vi: `Token ${actions.testToken.data.tokenPrefix}` })
                  : copy({ en: "Not tested yet", vi: "Chưa kiểm tra" })
              },
              {
                label: copy({ en: "CNV customer read", vi: "Đọc khách hàng CNV" }),
                value: customers.isError
                  ? copy({ en: "Failed", vi: "Lỗi" })
                  : customers.data
                    ? copy({
                        en: `${customerRangeStart}-${customerRangeEnd} loaded`,
                        vi: `Đã tải ${customerRangeStart}-${customerRangeEnd}`
                      })
                    : copy({ en: "Not loaded yet", vi: "Chưa tải" })
              }
            ]}
          />
          <ToolbarActions className="lg:justify-end">
            <Button onClick={() => actions.testToken.mutate()} disabled={actions.testToken.isPending}>
              {actions.testToken.isPending ? copy({ en: "Testing token...", vi: "Đang kiểm tra token..." }) : copy({ en: "Test token", vi: "Kiểm tra token" })}
            </Button>
            <Button variant="secondary" onClick={() => actions.register.mutate()} disabled={actions.register.isPending || !connectionStatus.data?.connected}>
              {actions.register.isPending ? copy({ en: "Registering...", vi: "Đang đăng ký..." }) : copy({ en: "Register webhook", vi: "Đăng ký webhook" })}
            </Button>
            <Button variant="danger" onClick={() => actions.remove.mutate()} disabled={actions.remove.isPending || !connectionStatus.data?.connected}>
              {actions.remove.isPending ? copy({ en: "Removing...", vi: "Đang gỡ..." }) : copy({ en: "Remove webhook", vi: "Gỡ webhook" })}
            </Button>
          </ToolbarActions>
        </div>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="flex flex-col gap-6">
          <Panel
            title={copy({ en: "Operator guidance", vi: "Hướng dẫn vận hành" })}
            subtitle={copy({ en: "Use this panel before taking webhook lifecycle actions.", vi: "Xem phần này trước khi thao tác với vòng đời webhook." })}
          >
            <div className="flex flex-col gap-3">
              <InfoCard
                label={copy({ en: "Health first", vi: "Ưu tiên sức khỏe hệ thống" })}
                value={copy({
                  en: "Verify backend health before registration or removal actions.",
                  vi: "Kiểm tra backend ổn định trước khi đăng ký hoặc gỡ webhook."
                })}
              />
              <InfoCard
                label={copy({ en: "Token before webhook", vi: "Kiểm tra token trước" })}
                value={copy({
                  en: "Run token verification first to avoid noisy setup failures.",
                  vi: "Kiểm tra token trước để tránh lỗi cấu hình không cần thiết khi đăng ký webhook."
                })}
              />
              <InfoCard
                label={copy({ en: "Paged resource reads", vi: "Đọc tài nguyên theo trang" })}
                value={copy({
                  en: "Each CNV list uses limit and offset. The server does not provide a total count, so Next is enabled while the current page is full.",
                  vi: "Mỗi danh sách CNV dùng limit và offset. Server không trả tổng số, nên nút Trang sau còn bật khi trang hiện tại đủ số dòng."
                })}
              />
            </div>
          </Panel>

          <Panel
            title={copy({ en: "Backend health", vi: "Sức khỏe backend" })}
            subtitle={copy({ en: "Public health endpoint snapshot from `/api/health`.", vi: "Ảnh chụp trạng thái từ endpoint `/api/health`." })}
          >
            <pre className="overflow-auto rounded-[22px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {JSON.stringify(health.data ?? {}, null, 2)}
            </pre>
          </Panel>

          <Panel
            title={copy({ en: "Action outcomes", vi: "Kết quả thao tác" })}
            subtitle={copy({ en: "Latest mutation feedback from the available CNV admin controls.", vi: "Trạng thái mới nhất của các thao tác quản trị CNV khả dụng." })}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label={copy({ en: "Token test", vi: "Kiểm tra token" })}
                value={actions.testToken.isSuccess ? copy({ en: "Completed", vi: "Hoàn tất" }) : actions.testToken.isPending ? copy({ en: "Running", vi: "Đang chạy" }) : copy({ en: "Idle", vi: "Chờ" })}
              />
              <MetricCard
                label={copy({ en: "Register", vi: "Đăng ký" })}
                value={actions.register.isSuccess ? copy({ en: "Completed", vi: "Hoàn tất" }) : actions.register.isPending ? copy({ en: "Running", vi: "Đang chạy" }) : copy({ en: "Idle", vi: "Chờ" })}
              />
              <MetricCard
                label={copy({ en: "Remove", vi: "Gỡ bỏ" })}
                value={actions.remove.isSuccess ? copy({ en: "Completed", vi: "Hoàn tất" }) : actions.remove.isPending ? copy({ en: "Running", vi: "Đang chạy" }) : copy({ en: "Idle", vi: "Chờ" })}
              />
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title={copy({ en: "CNV webhook controls", vi: "Điều khiển webhook CNV" })}
            subtitle={copy({
              en: "Admin actions for CNV token verification and webhook registration lifecycle.",
              vi: "Các thao tác quản trị để kiểm tra token và quản lý vòng đời đăng ký webhook CNV."
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard
                label={copy({ en: "Latest token check", vi: "Lần kiểm tra token gần nhất" })}
                value={
                  actions.testToken.data
                    ? copy({
                        en: `Token prefix: ${actions.testToken.data.tokenPrefix ?? "Unavailable"}`,
                        vi: `Tiền tố token: ${actions.testToken.data.tokenPrefix ?? "Không có"}`
                      })
                    : copy({ en: "Run a token test to confirm CNV auth setup.", vi: "Chạy kiểm tra token để xác nhận cấu hình xác thực CNV." })
                }
                className="bg-slate-50"
              />
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{copy({ en: "Webhook registration info", vi: "Thông tin đăng ký webhook" })}</div>
                  <Badge tone="accent">CNV</Badge>
                </div>
                <pre className="overflow-auto rounded-[18px] border border-slate-200 bg-white p-3 text-xs text-slate-600">
                  {JSON.stringify(info.data?.result ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </Panel>

          <CnvPagedResourcePanel
            title={{ en: "CNV customers", vi: "Khách hàng CNV" }}
            subtitle={{ en: "Paged read from `/cnv/webhook-admin/customers`.", vi: "Đọc phân trang từ `/cnv/webhook-admin/customers`." }}
            emptyTitle={{ en: "No CNV customers", vi: "Chưa có khách hàng CNV" }}
            emptyDescription={{ en: "Connect CNV SSO first, then refresh customer data.", vi: "Kết nối CNV SSO trước, sau đó tải lại dữ liệu khách hàng." }}
            resourceKey="customers"
            query={customers as PagedQuery}
            page={customerPaging.page}
            limit={customerPaging.limit}
            offset={customerPaging.offset}
            onPrevious={customerPaging.setPreviousPage}
            onNext={customerPaging.setNextPage}
            onLimitChange={customerPaging.setLimit}
            enabled={Boolean(connectionStatus.data?.connected)}
            rawPayload
            columns={[
              { label: { en: "Customer", vi: "Khách hàng" }, render: (row) => formatCustomerName(row as { id: number; first_name?: string | null; last_name?: string | null }) },
              { label: { en: "Phone", vi: "SĐT" }, render: (row) => textValue(row.phone) },
              { label: { en: "Created", vi: "Ngày tạo" }, render: (row) => formatDate(row.created_at) },
              { label: { en: "Points", vi: "Điểm" }, render: (row) => textValue(row.points, "0") }
            ]}
          />

          <CnvPagedResourcePanel
            title={{ en: "CNV products", vi: "Sản phẩm CNV" }}
            subtitle={{ en: "Paged read from `/cnv/webhook-admin/products`.", vi: "Đọc phân trang từ `/cnv/webhook-admin/products`." }}
            emptyTitle={{ en: "No CNV products", vi: "Chưa có sản phẩm CNV" }}
            emptyDescription={{ en: "Refresh after CNV SSO is connected to validate product scope.", vi: "Tải lại sau khi kết nối CNV SSO để xác minh scope sản phẩm." }}
            resourceKey="products"
            query={products}
            page={productPaging.page}
            limit={productPaging.limit}
            offset={productPaging.offset}
            onPrevious={productPaging.setPreviousPage}
            onNext={productPaging.setNextPage}
            onLimitChange={productPaging.setLimit}
            enabled={Boolean(connectionStatus.data?.connected)}
            columns={[
              { label: { en: "Product", vi: "Sản phẩm" }, render: (row) => textValue(row.title, `CNV #${textValue(row.id)}`) },
              { label: { en: "Type", vi: "Loại" }, render: (row) => textValue(row.product_type) },
              { label: { en: "Vendor", vi: "Nhà cung cấp" }, render: (row) => textValue(row.vendor) },
              { label: { en: "Tags", vi: "Thẻ" }, render: (row) => textValue(row.tags) }
            ]}
          />

          <CnvPagedResourcePanel
            title={{ en: "CNV ecommerce orders", vi: "Đơn hàng thương mại CNV" }}
            subtitle={{ en: "Paged read from `/cnv/webhook-admin/orders`; these are not CRM recruitment orders.", vi: "Đọc phân trang từ `/cnv/webhook-admin/orders`; đây không phải đơn tuyển dụng CRM." }}
            emptyTitle={{ en: "No CNV orders", vi: "Chưa có đơn hàng CNV" }}
            emptyDescription={{ en: "Refresh after CNV SSO is connected to validate order scope.", vi: "Tải lại sau khi kết nối CNV SSO để xác minh scope đơn hàng." }}
            resourceKey="orders"
            query={orders}
            page={orderPaging.page}
            limit={orderPaging.limit}
            offset={orderPaging.offset}
            onPrevious={orderPaging.setPreviousPage}
            onNext={orderPaging.setNextPage}
            onLimitChange={orderPaging.setLimit}
            enabled={Boolean(connectionStatus.data?.connected)}
            columns={[
              { label: { en: "Order", vi: "Đơn hàng" }, render: (row) => textValue(row.name, `CNV #${textValue(row.id)}`) },
              { label: { en: "Total", vi: "Tổng tiền" }, render: (row) => textValue(row.total_price, "0") },
              { label: { en: "Financial", vi: "Thanh toán" }, render: (row) => textValue(row.financial_status) },
              { label: { en: "Created", vi: "Ngày tạo" }, render: (row) => formatDate(row.created_at) }
            ]}
          />

          <CnvPagedResourcePanel
            title={{ en: "CNV custom collections", vi: "Bộ sưu tập tùy chỉnh CNV" }}
            subtitle={{ en: "Paged read from `/cnv/webhook-admin/custom-collections`.", vi: "Đọc phân trang từ `/cnv/webhook-admin/custom-collections`." }}
            emptyTitle={{ en: "No custom collections", vi: "Chưa có bộ sưu tập tùy chỉnh" }}
            emptyDescription={{ en: "Refresh after CNV SSO is connected to inspect manual product collections.", vi: "Tải lại sau khi kết nối CNV SSO để kiểm tra nhóm sản phẩm thủ công." }}
            resourceKey="custom_collections"
            query={customCollections}
            page={customCollectionPaging.page}
            limit={customCollectionPaging.limit}
            offset={customCollectionPaging.offset}
            onPrevious={customCollectionPaging.setPreviousPage}
            onNext={customCollectionPaging.setNextPage}
            onLimitChange={customCollectionPaging.setLimit}
            enabled={Boolean(connectionStatus.data?.connected)}
            columns={[
              { label: { en: "Collection", vi: "Bộ sưu tập" }, render: (row) => textValue(row.title, `CNV #${textValue(row.id)}`) },
              { label: { en: "Handle", vi: "Đường dẫn" }, render: (row) => textValue(row.handle) },
              { label: { en: "Published", vi: "Đã xuất bản" }, render: (row) => textValue(row.published) },
              { label: { en: "Updated", vi: "Cập nhật" }, render: (row) => formatDate(row.updated_at) }
            ]}
          />

          <CnvPagedResourcePanel
            title={{ en: "CNV smart collections", vi: "Bộ sưu tập thông minh CNV" }}
            subtitle={{ en: "Paged read from `/cnv/webhook-admin/smart-collections`.", vi: "Đọc phân trang từ `/cnv/webhook-admin/smart-collections`." }}
            emptyTitle={{ en: "No smart collections", vi: "Chưa có bộ sưu tập thông minh" }}
            emptyDescription={{ en: "Refresh after CNV SSO is connected to inspect rule-driven product collections.", vi: "Tải lại sau khi kết nối CNV SSO để kiểm tra nhóm sản phẩm theo quy tắc." }}
            resourceKey="smart_collections"
            query={smartCollections}
            page={smartCollectionPaging.page}
            limit={smartCollectionPaging.limit}
            offset={smartCollectionPaging.offset}
            onPrevious={smartCollectionPaging.setPreviousPage}
            onNext={smartCollectionPaging.setNextPage}
            onLimitChange={smartCollectionPaging.setLimit}
            enabled={Boolean(connectionStatus.data?.connected)}
            columns={[
              { label: { en: "Collection", vi: "Bộ sưu tập" }, render: (row) => textValue(row.title, `CNV #${textValue(row.id)}`) },
              { label: { en: "Handle", vi: "Đường dẫn" }, render: (row) => textValue(row.handle) },
              { label: { en: "Published", vi: "Đã xuất bản" }, render: (row) => textValue(row.published) },
              { label: { en: "Updated", vi: "Cập nhật" }, render: (row) => formatDate(row.updated_at) }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
