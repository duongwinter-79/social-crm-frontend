import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, DataTable, EmptyState, MetricCard, PaginationFooter, SectionHeader, Toolbar } from "@social-crm/ui";
import {
  apiClient,
  triggerBlobDownload,
  useLeadsQuery,
  useOrdersQuery,
  useSessionStore,
  type Order,
} from "@social-crm/api";
import { useI18n } from "@/i18n";

const ORDER_PAGE_SIZE = 10;

export function OrdersPage() {
  const { copy, lang } = useI18n();
  const user = useSessionStore((state) => state.user);
  const ordersQuery = useOrdersQuery();
  const leadsQuery = useLeadsQuery({ offset: 0, limit: 50 });
  const [page, setPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const isAdmin = user?.roles?.includes("admin") ?? false;

  const orders = ordersQuery.data ?? [];
  const visibleOrders = orders.slice(page * ORDER_PAGE_SIZE, (page + 1) * ORDER_PAGE_SIZE);
  const activeLeadPool = leadsQuery.data?.data.filter((lead) => ["qualified", "matching", "matched"].includes(lead.status)).length ?? 0;

  const stats = useMemo(() => {
    return {
      total: orders.length,
      regions: new Set(orders.map((order) => order.region).filter(Boolean)).size,
      experienceRequired: orders.filter((order) => order.experienceRequired).length,
      returneesAccepted: orders.filter((order) => order.acceptsReturnees === true).length,
    };
  }, [orders]);

  async function exportCsv() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { blob, filename } = await apiClient.exportOrdersCsv({ lang });
      triggerBlobDownload(blob, filename);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Demand", vi: "Nhu cầu" })}
        title={copy({ en: "Orders catalog", vi: "Danh mục đơn hàng" })}
        description={copy({
          en: "Maintain the demand catalog used by matching. Open an order to inspect or edit the full requirement profile.",
          vi: "Quản lý danh mục đơn hàng dùng cho ghép đơn. Mở một đơn để xem hoặc chỉnh đầy đủ hồ sơ yêu cầu.",
        })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={exportCsv} disabled={isExporting}>
              {isExporting ? copy({ en: "Exporting...", vi: "Đang xuất..." }) : copy({ en: "Export CSV", vi: "Xuất CSV" })}
            </Button>
            {isAdmin ? (
              <Link
                to="/orders/new"
                className="inline-flex items-center justify-center rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white no-underline shadow-[0_10px_24px_rgba(79,70,229,0.22)] transition-colors hover:border-indigo-500 hover:bg-indigo-500"
              >
                {copy({ en: "New order", vi: "Tạo đơn" })}
              </Link>
            ) : (
              <Badge tone="neutral">{copy({ en: "Order edits are admin-only", vi: "Chỉ admin được sửa đơn" })}</Badge>
            )}
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard label={copy({ en: "Orders", vi: "Đơn hàng" })} value={stats.total} />
        <MetricCard label={copy({ en: "Regions", vi: "Khu vực" })} value={stats.regions} />
        <MetricCard label={copy({ en: "Experience req.", vi: "YC kinh nghiệm" })} value={stats.experienceRequired} />
        <MetricCard label={copy({ en: "Returnees accepted", vi: "Nhận lao động về" })} value={stats.returneesAccepted} />
        <MetricCard label={copy({ en: "Active lead pool", vi: "Nguồn ứng viên" })} value={activeLeadPool} />
      </div>

      <Toolbar compact className="border-slate-200/90">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {copy({ en: "Demand records", vi: "Bản ghi đơn hàng" })}
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              {copy({
                en: "List view is intentionally read-focused. Creation and editing now happen in the order detail screen.",
                vi: "Màn hình danh sách tập trung để đọc nhanh. Tạo và chỉnh sửa được chuyển sang màn hình chi tiết đơn hàng.",
              })}
            </p>
          </div>
          <Badge tone="neutral">{copy({ en: `${orders.length} total orders`, vi: `${orders.length} đơn hàng` })}</Badge>
        </div>
      </Toolbar>

      {visibleOrders.length ? (
        <DataTable>
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{copy({ en: "Order", vi: "Đơn hàng" })}</th>
                <th className="px-4 py-3">{copy({ en: "Region / industry", vi: "Khu vực / ngành" })}</th>
                <th className="px-4 py-3">{copy({ en: "Requirements", vi: "Yêu cầu" })}</th>
                <th className="px-4 py-3">{copy({ en: "Compensation", vi: "Thu nhập" })}</th>
                <th className="px-4 py-3">{copy({ en: "Action", vi: "Thao tác" })}</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <OrderRow key={order.id} order={order} copy={copy} canEdit={isAdmin} />
              ))}
            </tbody>
          </table>
          <PaginationFooter
            page={page}
            pageSize={ORDER_PAGE_SIZE}
            total={orders.length}
            isFetching={ordersQuery.isFetching}
            itemLabel={copy({ en: "orders", vi: "đơn hàng" })}
            pageLabel={copy({ en: "Page", vi: "Trang" })}
            previousLabel={copy({ en: "Previous", vi: "Trước" })}
            nextLabel={copy({ en: "Next", vi: "Sau" })}
            onPrevious={() => setPage((current) => Math.max(0, current - 1))}
            onNext={() => setPage((current) => current + 1)}
          />
        </DataTable>
      ) : (
        <EmptyState
          title={copy({ en: "No orders returned", vi: "Không có đơn hàng trả về" })}
          description={copy({
            en: "Create the first order from the detail screen when admin access is available.",
            vi: "Tạo đơn hàng đầu tiên từ màn hình chi tiết khi có quyền admin.",
          })}
        />
      )}
    </div>
  );
}

function OrderRow(props: { order: Order; copy: (value: { en: string; vi: string }) => string; canEdit: boolean }) {
  const { order, copy } = props;
  const age = order.ageRange ? `${order.ageRange.min}-${order.ageRange.max}` : copy({ en: "Any age", vi: "Không giới hạn tuổi" });
  const height = order.heightMin ? `${order.heightMin} cm+` : copy({ en: "No minimum", vi: "Không yêu cầu" });

  return (
    <tr className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/70">
      <td className="px-4 py-4">
        <Link to={`/orders/${order.id}`} className="font-semibold text-indigo-700 hover:underline">
          {order.name}
        </Link>
        <div className="mt-1 line-clamp-2 max-w-md text-xs leading-5 text-slate-500">
          {order.description || copy({ en: "No description provided.", vi: "Chưa có mô tả." })}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="font-medium text-slate-900">{order.region || copy({ en: "No region", vi: "Chưa có khu vực" })}</div>
        <div className="mt-1 text-xs text-slate-500">{order.industry || copy({ en: "No industry", vi: "Chưa có ngành" })}</div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{order.genderRequired}</Badge>
          <Badge tone={order.experienceRequired ? "warning" : "neutral"}>
            {order.experienceRequired ? copy({ en: "Experience", vi: "Kinh nghiệm" }) : copy({ en: "No experience gate", vi: "Không chặn KN" })}
          </Badge>
          <Badge tone={order.acceptsReturnees ? "success" : "neutral"}>
            {order.acceptsReturnees ? copy({ en: "Returnees OK", vi: "Nhận LĐ về" }) : copy({ en: "Returnees unset", vi: "Chưa đặt LĐ về" })}
          </Badge>
        </div>
        <div className="mt-2 text-xs text-slate-500">{age} · {height}</div>
      </td>
      <td className="px-4 py-4 text-slate-700">
        {order.salaryRange || copy({ en: "Not set", vi: "Chưa đặt" })}
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/orders/${order.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 no-underline transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {props.canEdit ? copy({ en: "View / edit", vi: "Xem / sửa" }) : copy({ en: "View details", vi: "Xem chi tiết" })}
          </Link>
        </div>
      </td>
    </tr>
  );
}
