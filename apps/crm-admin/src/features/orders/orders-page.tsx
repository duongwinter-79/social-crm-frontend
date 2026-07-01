import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, DataTable, EmptyState, MetricCard, PaginationFooter, SectionHeader, Toolbar } from "@social-crm/ui";
import {
  apiClient,
  triggerBlobDownload,
  useLeadsQuery,
  useOrderSuggestedCandidatesQuery,
  useOrdersQuery,
  useSessionStore,
  type Order,
  type OrderSuggestedCandidate,
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import { UiText } from "@/ui-text/ui-text";
import { JourneyWorkbenchModal } from "@/features/journey/journey-workbench-modal";

const ORDER_PAGE_SIZE = 10;

type LinkTarget = { leadId: string; orderId: string };

export function OrdersPage() {
  const { copy, lang } = useI18n();
  const user = useSessionStore((state) => state.user);
  const ordersQuery = useOrdersQuery();
  const leadsQuery = useLeadsQuery({ offset: 0, limit: 50 });
  const [page, setPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);
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
        eyebrow={<UiText id="orders.catalog.eyebrow" />}
        title={<UiText id="orders.catalog.title" />}
        description={<UiText id="orders.catalog.desc" />}
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
                <OrderRow
                  key={order.id}
                  order={order}
                  copy={copy}
                  canEdit={isAdmin}
                  onOpenLink={(leadId, orderId) => setLinkTarget({ leadId, orderId })}
                />
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
          title={<UiText id="orders.catalog.empty.title" />}
          description={<UiText id="orders.catalog.empty.desc" />}
        />
      )}

      {linkTarget ? (
        <JourneyWorkbenchModal
          leadId={linkTarget.leadId}
          orderId={linkTarget.orderId}
          onClose={() => setLinkTarget(null)}
        />
      ) : null}
    </div>
  );
}

function conclusionTone(conclusion: string) {
  if (conclusion === "high_priority") return "success" as const;
  if (conclusion === "conditional") return "warning" as const;
  if (conclusion === "limited") return "neutral" as const;
  return "danger" as const;
}

function OrderRow(props: {
  order: Order;
  copy: (value: { en: string; vi: string }) => string;
  canEdit: boolean;
  onOpenLink: (leadId: string, orderId: string) => void;
}) {
  const { order, copy } = props;
  const [expanded, setExpanded] = useState(false);
  const age = order.ageRange ? `${order.ageRange.min}-${order.ageRange.max}` : copy({ en: "Any age", vi: "Không giới hạn tuổi" });
  const height = order.heightMin ? `${order.heightMin} cm+` : copy({ en: "No minimum", vi: "Không yêu cầu" });

  return (
    <>
      <tr className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/70">
        <td className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/orders/${order.id}`} className="font-semibold text-indigo-700 hover:underline">
              {order.name}
            </Link>
            {order.recruitmentStatus ? (
              <Badge tone={order.recruitmentStatus === "recruiting" ? "success" : order.recruitmentStatus === "cancelled" ? "danger" : "neutral"}>
                {order.recruitmentStatus === "recruiting"
                  ? copy({ en: "Recruiting", vi: "Đang tuyển" })
                  : order.recruitmentStatus === "cancelled"
                    ? copy({ en: "Cancelled", vi: "Đã hủy" })
                    : copy({ en: "Recruitment complete", vi: "Đã tuyển xong" })}
              </Badge>
            ) : null}
          </div>
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
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                expanded
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/60"
              }`}
            >
              {copy({ en: "Suggested candidates", vi: "Ứng viên gợi ý" })}
              <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
            </button>
            <Link
              to={`/orders/${order.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 no-underline transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {props.canEdit ? copy({ en: "View / edit", vi: "Xem / sửa" }) : copy({ en: "View details", vi: "Xem chi tiết" })}
            </Link>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-slate-50/70">
          <td colSpan={5} className="px-4 py-4">
            <OrderSuggestedCandidates orderId={order.id} copy={copy} onOpenLink={props.onOpenLink} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function OrderSuggestedCandidates(props: {
  orderId: string;
  copy: (value: { en: string; vi: string }) => string;
  onOpenLink: (leadId: string, orderId: string) => void;
}) {
  const { orderId, copy } = props;
  const query = useOrderSuggestedCandidatesQuery(orderId, 8);
  const candidates = query.data ?? [];

  if (query.isLoading) {
    return <div className="text-sm text-slate-500">{copy({ en: "Ranking candidates…", vi: "Đang xếp hạng ứng viên…" })}</div>;
  }

  if (!candidates.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        {copy({
          en: "No matching candidates yet. Candidates appear once they have a verified standard form.",
          vi: "Chưa có ứng viên phù hợp. Ứng viên xuất hiện khi đã có form lao động chuẩn được xác minh.",
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {copy({ en: `Suggested candidates (${candidates.length})`, vi: `Ứng viên gợi ý (${candidates.length})` })}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {candidates.map((candidate) => (
          <SuggestedCandidateCard
            key={candidate.candidateId}
            candidate={candidate}
            copy={copy}
            onOpen={() => props.onOpenLink(candidate.leadId, orderId)}
          />
        ))}
      </div>
    </div>
  );
}

function SuggestedCandidateCard(props: {
  candidate: OrderSuggestedCandidate;
  copy: (value: { en: string; vi: string }) => string;
  onOpen: () => void;
}) {
  const { candidate, copy } = props;
  const meta = [
    candidate.age ? `${candidate.age}${copy({ en: "y", vi: "t" })}` : null,
    candidate.gender,
    candidate.height ? `${candidate.height}cm` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border bg-white p-4 transition-colors ${
        candidate.isEligible ? "border-slate-200 hover:border-indigo-300" : "border-rose-200/70 bg-rose-50/30"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{candidate.name}</span>
          <Badge tone={conclusionTone(candidate.conclusion)}>{candidate.matchScore} {copy({ en: "pts", vi: "điểm" })}</Badge>
          {candidate.requiresManagerApproval ? (
            <Badge tone="warning">{copy({ en: "Approval", vi: "Cần duyệt" })}</Badge>
          ) : null}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {candidate.candidateCode}
          {meta ? ` · ${meta}` : ""}
        </div>
        {candidate.leadClassification ? (
          <div className="mt-1 text-xs text-slate-500">{candidate.leadClassification}</div>
        ) : null}
        {!candidate.isEligible && candidate.rejectReason ? (
          <div className="mt-1.5 text-xs text-rose-600">{candidate.rejectReason}</div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={props.onOpen}
        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
      >
        {copy({ en: "Open & link", vi: "Mở & ghép" })}
      </button>
    </div>
  );
}
