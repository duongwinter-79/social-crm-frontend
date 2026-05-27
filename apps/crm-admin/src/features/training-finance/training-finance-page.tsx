import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  FieldGroup,
  InfoStrip,
  Input,
  MetricCard,
  PaginationFooter,
  SectionHeader,
  Toolbar,
  ToolbarActions,
} from "@social-crm/ui";
import { usePermissions, useTrainingFinanceQuery, type TrainingFinanceRecord } from "@social-crm/api";
import { useI18n } from "../../i18n";
import { getLeadDisplayName } from "@/lib/lead-display";

const PAGE_SIZE = 20;

function milestoneKey(record: TrainingFinanceRecord) {
  if (record.departureDate) return "departure scheduled";
  if (record.visaDate) return "visa ready";
  if (record.trainingStartDate || record.trainingProgress) return "training in progress";
  if (record.depositStatus || record.amountPaid) return "deposit tracked";
  return "not started";
}

function toneForMilestone(record: TrainingFinanceRecord) {
  if (record.departureDate || record.visaDate) return "success" as const;
  if (record.trainingStartDate || record.trainingProgress) return "warning" as const;
  if (record.depositStatus || record.amountPaid) return "accent" as const;
  return "neutral" as const;
}

function leadName(record: TrainingFinanceRecord) {
  return record.lead ? getLeadDisplayName(record.lead) : record.lead_id;
}

export function TrainingFinancePage() {
  const { copy, formatApplicationStatus, formatTrainingMilestone } = useI18n();
  const { canManageFinance } = usePermissions();
  const [filters, setFilters] = useState({ leadId: "", orderId: "", search: "" });
  const [page, setPage] = useState(0);

  const recordsQuery = useTrainingFinanceQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    leadId: filters.leadId || undefined,
    orderId: filters.orderId || undefined,
  });

  const records = recordsQuery.data?.data ?? [];
  const filteredRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const term = filters.search.trim().toLowerCase();
    return records.filter((record) =>
      [
        record.id,
        record.lead_id,
        record.order_id,
        record.application_id,
        record.orderType,
        record.depositStatus,
        record.trainingProgress,
        record.lead ? getLeadDisplayName(record.lead) : "",
        record.order?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [filters.search, records]);

  const stats = useMemo(() => {
    return {
      total: recordsQuery.data?.total ?? 0,
      deposit: records.filter((record) => record.depositStatus || record.amountPaid).length,
      training: records.filter((record) => record.trainingStartDate || record.trainingProgress).length,
      visa: records.filter((record) => record.visaDate).length,
      departure: records.filter((record) => record.departureDate).length,
    };
  }, [records, recordsQuery.data?.total]);

  useEffect(() => {
    setPage(0);
  }, [filters.leadId, filters.orderId, filters.search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Training & Finance", vi: "Đào tạo & tài chính" })}
        title={copy({ en: "Milestone ledger", vi: "Sổ theo dõi tiến độ" })}
        description={copy({
          en: "Track downstream milestones after an application moves into payment, training, visa, and departure work.",
          vi: "Theo dõi các mốc sau khi ứng tuyển chuyển sang đặt cọc, đào tạo, visa và xuất cảnh.",
        })}
        action={
          canManageFinance ? (
            <Link
              to="/training-finance/new"
              className="inline-flex items-center justify-center rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white no-underline shadow-[0_10px_24px_rgba(79,70,229,0.22)] transition-colors hover:border-indigo-500 hover:bg-indigo-500"
            >
              {copy({ en: "New milestone record", vi: "Tạo bản ghi tiến độ" })}
            </Link>
          ) : (
            <Badge tone="neutral">{copy({ en: "Finance role required to create records", vi: "Cần quyền tài chính để tạo bản ghi" })}</Badge>
          )
        }
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {copy({
              en: "Training-finance records should stay linked to the application they continue from.",
              vi: "Bản ghi đào tạo/tài chính nên liên kết với ứng tuyển mà nó tiếp tục xử lý.",
            })}
          </span>
          <Badge tone="warning">{copy({ en: "Application is the parent workflow", vi: "Ứng tuyển là luồng cha" })}</Badge>
        </div>
      </InfoStrip>

      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard label={copy({ en: "Total", vi: "Tổng" })} value={stats.total} />
        <MetricCard label={copy({ en: "Deposit", vi: "Đặt cọc" })} value={stats.deposit} />
        <MetricCard label={copy({ en: "Training", vi: "Đào tạo" })} value={stats.training} />
        <MetricCard label={copy({ en: "Visa", vi: "Visa" })} value={stats.visa} />
        <MetricCard label={copy({ en: "Departure", vi: "Xuất cảnh" })} value={stats.departure} />
      </div>

      <Toolbar compact className="border-slate-200/90">
        <FieldGroup columns={3}>
          <Input label={copy({ en: "Lead ID", vi: "Mã lead" })} value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
          <Input label={copy({ en: "Order ID", vi: "Order ID" })} value={filters.orderId} onChange={(e) => setFilters((s) => ({ ...s, orderId: e.target.value }))} />
          <Input label={copy({ en: "Search", vi: "Tìm kiếm" })} value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </FieldGroup>
        <ToolbarActions>
          <Badge tone="neutral">{copy({ en: `${filteredRecords.length} visible records`, vi: `${filteredRecords.length} bản ghi hiển thị` })}</Badge>
        </ToolbarActions>
      </Toolbar>

      {filteredRecords.length ? (
        <DataTable>
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{copy({ en: "Lead", vi: "Lead" })}</th>
                <th className="px-4 py-3">{copy({ en: "Application / order", vi: "Ứng tuyển / đơn" })}</th>
                <th className="px-4 py-3">{copy({ en: "Milestone", vi: "Mốc" })}</th>
                <th className="px-4 py-3">{copy({ en: "Money / training", vi: "Tiền / đào tạo" })}</th>
                <th className="px-4 py-3">{copy({ en: "Visa / departure", vi: "Visa / xuất cảnh" })}</th>
                <th className="px-4 py-3">{copy({ en: "Action", vi: "Thao tác" })}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{leadName(record)}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">{record.lead_id}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">{record.order?.name || record.order_id || copy({ en: "No order", vi: "Chưa có đơn" })}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {record.application ? (
                        <Badge tone="accent">{formatApplicationStatus(record.application.status)}</Badge>
                      ) : (
                        <Badge tone="warning">{copy({ en: "No linked application", vi: "Chưa liên kết ứng tuyển" })}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={toneForMilestone(record)}>{formatTrainingMilestone(milestoneKey(record))}</Badge>
                    <div className="mt-2 text-xs text-slate-500">{record.orderType || copy({ en: "No order type", vi: "Chưa có loại đơn" })}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <div>{record.depositStatus || copy({ en: "No deposit status", vi: "Chưa có trạng thái cọc" })}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {copy({ en: "Paid", vi: "Đã đóng" })}: {record.amountPaid ?? 0}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{record.trainingProgress || record.trainingStartDate || copy({ en: "Training not started", vi: "Chưa đào tạo" })}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <div>{copy({ en: "Visa", vi: "Visa" })}: {record.visaDate || copy({ en: "Pending", vi: "Chờ" })}</div>
                    <div className="mt-1">{copy({ en: "Departure", vi: "Xuất cảnh" })}: {record.departureDate || copy({ en: "Pending", vi: "Chờ" })}</div>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to={`/training-finance/${record.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 no-underline transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      {canManageFinance ? copy({ en: "View / edit", vi: "Xem / sửa" }) : copy({ en: "View details", vi: "Xem chi tiết" })}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={recordsQuery.data?.total ?? 0}
            isFetching={recordsQuery.isFetching}
            itemLabel={copy({ en: "records", vi: "bản ghi" })}
            pageLabel={copy({ en: "Page", vi: "Trang" })}
            previousLabel={copy({ en: "Previous", vi: "Trước" })}
            nextLabel={copy({ en: "Next", vi: "Sau" })}
            onPrevious={() => setPage((current) => Math.max(0, current - 1))}
            onNext={() => setPage((current) => current + 1)}
          />
        </DataTable>
      ) : (
        <EmptyState
          title={copy({ en: "No training-finance records found", vi: "Không tìm thấy bản ghi đào tạo/tài chính" })}
          description={copy({
            en: "Create the first milestone record from an application once downstream processing begins.",
            vi: "Tạo bản ghi tiến độ đầu tiên từ một ứng tuyển khi quy trình hậu kỳ bắt đầu.",
          })}
        />
      )}
    </div>
  );
}
