import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  FieldGroup,
  InfoCard,
  InfoStrip,
  Input,
  PaginationFooter,
  Panel,
  SectionHeader,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useCreateTrainingFinanceMutation,
  useTrainingFinanceQuery,
  useUpdateTrainingFinanceMutation
} from "@social-crm/api";
import type { TrainingFinanceRecord } from "@social-crm/api";
import { useI18n } from "../../i18n";

const PAGE_SIZE = 25;

function toneForMilestone(record: TrainingFinanceRecord) {
  if (record.departureDate) return "success" as const;
  if (record.visaDate) return "success" as const;
  if (record.trainingStartDate || record.trainingProgress) return "warning" as const;
  if (record.depositStatus || record.amountPaid) return "accent" as const;
  return "neutral" as const;
}

function milestoneLabel(record: TrainingFinanceRecord) {
  if (record.departureDate) return "departure scheduled";
  if (record.visaDate) return "visa ready";
  if (record.trainingStartDate || record.trainingProgress) return "training in progress";
  if (record.depositStatus || record.amountPaid) return "deposit tracked";
  return "not started";
}

export function TrainingFinancePage() {
  const { copy, formatTrainingMilestone } = useI18n();
  const [filters, setFilters] = useState({
    leadId: "",
    orderId: "",
    search: ""
  });
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [createForm, setCreateForm] = useState({
    leadId: "",
    orderId: "",
    orderType: "",
    depositStatus: "",
    amountPaid: "",
    trainingStartDate: "",
    trainingProgress: "",
    visaDate: "",
    departureDate: ""
  });
  const [editForm, setEditForm] = useState({
    orderId: "",
    orderType: "",
    depositStatus: "",
    amountPaid: "",
    trainingStartDate: "",
    trainingProgress: "",
    visaDate: "",
    departureDate: ""
  });

  const recordsQuery = useTrainingFinanceQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    leadId: filters.leadId || undefined,
    orderId: filters.orderId || undefined
  });
  const createTrainingFinance = useCreateTrainingFinanceMutation();
  const updateTrainingFinance = useUpdateTrainingFinanceMutation();

  const records = recordsQuery.data?.data ?? [];
  const filteredRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const term = filters.search.trim().toLowerCase();
    return records.filter((record: TrainingFinanceRecord) =>
      [record.id, record.lead_id, record.order_id, record.orderType, record.depositStatus, record.trainingProgress]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [records, filters.search]);

  const selected =
    filteredRecords.find((record: TrainingFinanceRecord) => record.id === selectedId) ?? filteredRecords[0] ?? null;

  useEffect(() => {
    setPage(0);
  }, [filters.leadId, filters.orderId, filters.search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Training & Finance", vi: "Đào tạo & tài chính" })}
        title={copy({ en: "Commitment, training, visa, and departure tracking", vi: "Theo dõi đặt cọc, đào tạo, visa và xuất cảnh" })}
        description={copy({
          en: "Track downstream milestones after matching and application progression with real backend records.",
          vi: "Theo dõi các mốc vận hành sau khi ghép đơn và xử lý hồ sơ bằng dữ liệu thực từ API."
        })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {copy({
              en: "This module is milestone-driven rather than full accounting.",
              vi: "Phân hệ này tập trung vào các mốc vận hành, không phải hệ thống kế toán đầy đủ."
            })}
          </span>
          <Badge tone="warning">
            {copy({ en: "Operational readiness only", vi: "Chỉ phục vụ mức độ sẵn sàng vận hành" })}
          </Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <FieldGroup columns={3}>
          <Input label={copy({ en: "Lead ID", vi: "Mã ứng viên" })} value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
          <Input label={copy({ en: "Order ID", vi: "Order ID" })} value={filters.orderId} onChange={(e) => setFilters((s) => ({ ...s, orderId: e.target.value }))} />
          <Input label={copy({ en: "Search", vi: "Tìm kiếm" })} value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </FieldGroup>
        <ToolbarActions>
          <Badge tone="neutral">{copy({ en: `${filteredRecords.length} visible records`, vi: `${filteredRecords.length} bản ghi hiển thị` })}</Badge>
        </ToolbarActions>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Milestone ledger", vi: "Sổ theo dõi mốc tiến độ" })}
            subtitle={copy({
              en: "Each record ties deposit, training, visa, and departure progress back to a lead and optional order.",
              vi: "Mỗi bản ghi liên kết đặt cọc, đào tạo, visa và xuất cảnh với ứng viên và đơn hàng nếu có."
            })}
          >
            {filteredRecords.length ? (
              <div className="max-h-[calc(100vh-30rem)] min-h-[320px] space-y-3 overflow-auto pr-1">
                {filteredRecords.map((record: TrainingFinanceRecord) => {
                  const active = record.id === selected?.id;
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(record.id);
                        setEditForm({
                          orderId: record.order_id ?? "",
                          orderType: record.orderType ?? "",
                          depositStatus: record.depositStatus ?? "",
                          amountPaid: record.amountPaid != null ? String(record.amountPaid) : "",
                          trainingStartDate: record.trainingStartDate ?? "",
                          trainingProgress: record.trainingProgress ?? "",
                          visaDate: record.visaDate ?? "",
                          departureDate: record.departureDate ?? ""
                        });
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? "border-indigo-500 bg-indigo-50/60" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {record.orderType || record.order?.name || copy({ en: "Training-finance record", vi: "Bản ghi đào tạo - tài chính" })}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{record.lead?.fullName || record.lead_id}</div>
                        </div>
                        <Badge tone={toneForMilestone(record)}>{formatTrainingMilestone(milestoneLabel(record))}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <InfoCard label={copy({ en: "Deposit", vi: "Đặt cọc" })} value={record.depositStatus || copy({ en: "Not set", vi: "Chưa cập nhật" })} />
                        <InfoCard label={copy({ en: "Amount paid", vi: "Đã thanh toán" })} value={record.amountPaid != null ? String(record.amountPaid) : "0"} />
                        <InfoCard label={copy({ en: "Visa", vi: "Visa" })} value={record.visaDate || copy({ en: "Pending", vi: "Chờ xử lý" })} />
                        <InfoCard label={copy({ en: "Departure", vi: "Xuất cảnh" })} value={record.departureDate || copy({ en: "Pending", vi: "Chờ xử lý" })} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No training-finance records found", vi: "Không tìm thấy bản ghi đào tạo - tài chính" })}
                description={copy({
                  en: "Create the first milestone record once downstream processing begins.",
                  vi: "Tạo bản ghi mốc tiến độ đầu tiên khi quy trình hậu kỳ bắt đầu."
                })}
              />
            )}
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
              className="mt-4 border-slate-100 px-0 pb-0 pt-4"
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title={copy({ en: "Create milestone record", vi: "Tạo bản ghi mốc tiến độ" })}
            subtitle={copy({
              en: "First operational record for deposits, training, visa, and departure readiness.",
              vi: "Bản ghi vận hành đầu tiên cho đặt cọc, đào tạo, visa và mức độ sẵn sàng xuất cảnh."
            })}
          >
            <div className="space-y-4">
              <Input label={copy({ en: "Lead ID", vi: "Mã ứng viên" })} value={createForm.leadId} onChange={(e) => setCreateForm((s) => ({ ...s, leadId: e.target.value }))} />
              <Input label={copy({ en: "Order ID", vi: "Order ID" })} value={createForm.orderId} onChange={(e) => setCreateForm((s) => ({ ...s, orderId: e.target.value }))} />
              <Input label={copy({ en: "Order type", vi: "Loại đơn hàng" })} value={createForm.orderType} onChange={(e) => setCreateForm((s) => ({ ...s, orderType: e.target.value }))} />
              <Input label={copy({ en: "Deposit status", vi: "Trạng thái đặt cọc" })} value={createForm.depositStatus} onChange={(e) => setCreateForm((s) => ({ ...s, depositStatus: e.target.value }))} />
              <Input label={copy({ en: "Amount paid", vi: "Số tiền đã đóng" })} value={createForm.amountPaid} onChange={(e) => setCreateForm((s) => ({ ...s, amountPaid: e.target.value }))} />
              <Input label={copy({ en: "Training start", vi: "Bắt đầu đào tạo" })} type="date" value={createForm.trainingStartDate} onChange={(e) => setCreateForm((s) => ({ ...s, trainingStartDate: e.target.value }))} />
              <Input label={copy({ en: "Training progress", vi: "Tiến độ đào tạo" })} value={createForm.trainingProgress} onChange={(e) => setCreateForm((s) => ({ ...s, trainingProgress: e.target.value }))} />
              <Input label={copy({ en: "Visa date", vi: "Ngày visa" })} type="date" value={createForm.visaDate} onChange={(e) => setCreateForm((s) => ({ ...s, visaDate: e.target.value }))} />
              <Input label={copy({ en: "Departure date", vi: "Ngày xuất cảnh" })} type="date" value={createForm.departureDate} onChange={(e) => setCreateForm((s) => ({ ...s, departureDate: e.target.value }))} />
              <Button
                onClick={() =>
                  createTrainingFinance.mutate({
                    leadId: createForm.leadId,
                    orderId: createForm.orderId || undefined,
                    orderType: createForm.orderType || undefined,
                    depositStatus: createForm.depositStatus || undefined,
                    amountPaid: createForm.amountPaid ? Number(createForm.amountPaid) : undefined,
                    trainingStartDate: createForm.trainingStartDate || undefined,
                    trainingProgress: createForm.trainingProgress || undefined,
                    visaDate: createForm.visaDate || undefined,
                    departureDate: createForm.departureDate || undefined
                  })
                }
                disabled={!createForm.leadId || createTrainingFinance.isPending}
              >
                {createTrainingFinance.isPending ? copy({ en: "Creating...", vi: "Đang tạo..." }) : copy({ en: "Create milestone record", vi: "Tạo bản ghi mốc tiến độ" })}
              </Button>
            </div>
          </Panel>

          <Panel
            title={copy({ en: "Selected record", vi: "Bản ghi được chọn" })}
            subtitle={copy({
              en: "Update live milestone fields and downstream workflow state.",
              vi: "Cập nhật các trường tiến độ và trạng thái vận hành liên quan."
            })}
          >
            {selected ? (
              <div className="space-y-4">
                <DescriptionList
                  items={[
                    { label: copy({ en: "Record ID", vi: "Record ID" }), value: selected.id },
                    { label: copy({ en: "Lead", vi: "Ứng viên" }), value: selected.lead?.fullName || selected.lead_id },
                    { label: copy({ en: "Order", vi: "Đơn hàng" }), value: selected.order?.name || selected.order_id || copy({ en: "No order", vi: "Không có đơn hàng" }) },
                    { label: copy({ en: "Updated", vi: "Cập nhật" }), value: selected.updatedAt || copy({ en: "Unknown", vi: "Chưa rõ" }) }
                  ]}
                />
                <Input label={copy({ en: "Order ID", vi: "Order ID" })} value={editForm.orderId} onChange={(e) => setEditForm((s) => ({ ...s, orderId: e.target.value }))} />
                <Input label={copy({ en: "Order type", vi: "Loại đơn hàng" })} value={editForm.orderType} onChange={(e) => setEditForm((s) => ({ ...s, orderType: e.target.value }))} />
                <Input label={copy({ en: "Deposit status", vi: "Trạng thái đặt cọc" })} value={editForm.depositStatus} onChange={(e) => setEditForm((s) => ({ ...s, depositStatus: e.target.value }))} />
                <Input label={copy({ en: "Amount paid", vi: "Số tiền đã đóng" })} value={editForm.amountPaid} onChange={(e) => setEditForm((s) => ({ ...s, amountPaid: e.target.value }))} />
                <Input label={copy({ en: "Training start", vi: "Bắt đầu đào tạo" })} type="date" value={editForm.trainingStartDate} onChange={(e) => setEditForm((s) => ({ ...s, trainingStartDate: e.target.value }))} />
                <Input label={copy({ en: "Training progress", vi: "Tiến độ đào tạo" })} value={editForm.trainingProgress} onChange={(e) => setEditForm((s) => ({ ...s, trainingProgress: e.target.value }))} />
                <Input label={copy({ en: "Visa date", vi: "Ngày visa" })} type="date" value={editForm.visaDate} onChange={(e) => setEditForm((s) => ({ ...s, visaDate: e.target.value }))} />
                <Input label={copy({ en: "Departure date", vi: "Ngày xuất cảnh" })} type="date" value={editForm.departureDate} onChange={(e) => setEditForm((s) => ({ ...s, departureDate: e.target.value }))} />
                <Button
                  onClick={() =>
                    updateTrainingFinance.mutate({
                      id: selected.id,
                      patch: {
                        orderId: editForm.orderId || null,
                        orderType: editForm.orderType || null,
                        depositStatus: editForm.depositStatus || null,
                        amountPaid: editForm.amountPaid ? Number(editForm.amountPaid) : null,
                        trainingStartDate: editForm.trainingStartDate || null,
                        trainingProgress: editForm.trainingProgress || null,
                        visaDate: editForm.visaDate || null,
                        departureDate: editForm.departureDate || null
                      }
                    })
                  }
                  disabled={updateTrainingFinance.isPending}
                >
                  {updateTrainingFinance.isPending ? copy({ en: "Saving...", vi: "Đang lưu..." }) : copy({ en: "Save milestone update", vi: "Lưu cập nhật mốc tiến độ" })}
                </Button>
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No record selected", vi: "Chưa chọn bản ghi" })}
                description={copy({
                  en: "Select a record from the ledger to update milestone progress.",
                  vi: "Chọn một bản ghi trong danh sách để cập nhật tiến độ."
                })}
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
