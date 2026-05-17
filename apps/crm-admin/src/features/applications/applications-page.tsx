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
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useApplicationDetailQuery,
  useApplicationsQuery,
  useCreateApplicationMutation,
  useOrdersQuery,
  useUpdateApplicationMutation
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import { CandidatePicker } from "@/components/candidate-picker";

const STATUS_OPTIONS = [
  "",
  "matching",
  "referred",
  "interview_scheduled",
  "interview_passed",
  "interview_failed",
  "signing",
  "rejected",
  "withdrawn"
] as const;

const PAGE_SIZE = 25;

type ApplicationFormState = {
  candidateId: string;
  orderId: string;
  status: string;
  interviewDate: string;
  interviewResult: string;
  rejectReason: string;
};

const emptyCreateForm: ApplicationFormState = {
  candidateId: "",
  orderId: "",
  status: "matching",
  interviewDate: "",
  interviewResult: "",
  rejectReason: ""
};

function toneForApplicationStatus(status: string) {
  if (["interview_failed", "rejected", "withdrawn"].includes(status)) return "danger" as const;
  if (["interview_passed", "signing"].includes(status)) return "success" as const;
  if (["referred", "interview_scheduled"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function ApplicationsPage() {
  const { copy, formatApplicationStatus } = useI18n();
  const [filters, setFilters] = useState({
    leadId: "",
    candidateId: "",
    orderId: "",
    status: "",
    search: ""
  });
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string>("");
  const [createForm, setCreateForm] = useState<ApplicationFormState>(emptyCreateForm);
  const [detailForm, setDetailForm] = useState({
    status: "",
    interviewDate: "",
    interviewResult: "",
    rejectReason: ""
  });
  const [createError, setCreateError] = useState("");
  const [detailError, setDetailError] = useState("");

  const applicationQuery = useApplicationsQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    leadId: filters.leadId || undefined,
    candidateId: filters.candidateId || undefined,
    orderId: filters.orderId || undefined,
    status: filters.status || undefined
  });
  const ordersQuery = useOrdersQuery();
  const createApplication = useCreateApplicationMutation();
  const updateApplication = useUpdateApplicationMutation();
  const records = applicationQuery.data?.data ?? [];
  const filteredRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const term = filters.search.trim().toLowerCase();
    return records.filter((record) =>
      [record.id, record.lead?.fullName, record.lead?.phone, record.order?.name, record.candidate?.code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [records, filters.search]);

  const selectedIdResolved = selectedId || filteredRecords[0]?.id || "";
  const detailQuery = useApplicationDetailQuery(selectedIdResolved);
  const selected = detailQuery.data;

  useEffect(() => {
    setPage(0);
  }, [filters.leadId, filters.candidateId, filters.orderId, filters.status, filters.search]);

  useEffect(() => {
    if (!selected) return;
    setDetailForm({
      status: selected.status ?? "",
      interviewDate: selected.interviewDate ? selected.interviewDate.slice(0, 10) : "",
      interviewResult: selected.interviewResult ?? "",
      rejectReason: selected.rejectReason ?? ""
    });
    setDetailError("");
  }, [selected]);

  function submitCreate() {
    const error = validateApplicationForm(createForm, copy);
    if (error) {
      setCreateError(error);
      return;
    }

    setCreateError("");
    createApplication.mutate(
      {
        candidateId: createForm.candidateId,
        orderId: createForm.orderId,
        status: createForm.status || undefined,
        interviewDate: createForm.interviewDate || undefined,
        interviewResult: createForm.interviewResult.trim() || undefined,
        rejectReason: createForm.rejectReason.trim() || undefined
      },
      {
        onSuccess: (application) => {
          setSelectedId(application.id);
          setCreateForm(emptyCreateForm);
        }
      }
    );
  }

  function submitDetailUpdate() {
    if (!selected) return;
    const error = validateApplicationForm(
      {
        candidateId: selected.candidate_id || "selected",
        orderId: selected.order_id || "selected",
        status: detailForm.status,
        interviewDate: detailForm.interviewDate,
        interviewResult: detailForm.interviewResult,
        rejectReason: detailForm.rejectReason
      },
      copy
    );
    if (error) {
      setDetailError(error);
      return;
    }

    setDetailError("");
    updateApplication.mutate({
      id: selected.id,
      patch: {
        status: detailForm.status || undefined,
        interviewDate: detailForm.interviewDate || null,
        interviewResult: detailForm.interviewResult || null,
        rejectReason: detailForm.rejectReason || null
      }
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Applications", vi: "Hồ sơ ứng tuyển" })}
        title={copy({ en: "Placement progress workspace", vi: "Theo dõi tiến trình ứng tuyển" })}
        description={copy({
          en: "Create and track candidate-to-order applications with interview state, rejection context, and downstream placement readiness.",
          vi: "Tạo và theo dõi hồ sơ ứng viên theo đơn hàng, bao gồm trạng thái phỏng vấn, lý do từ chối và mức sẵn sàng cho các bước sau."
        })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy({ en: "The backend applications module is live for list, detail, create, and lifecycle updates.", vi: "Module hồ sơ ứng tuyển đã hỗ trợ danh sách, chi tiết, tạo mới và cập nhật vòng đời." })}</span>
          <Badge tone="success">{copy({ en: "Creation uses candidate and order selectors", vi: "Tạo hồ sơ bằng bộ chọn ứng viên và đơn hàng" })}</Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <FieldGroup columns={4} className="xl:grid-cols-5">
          <Input label={copy({ en: "Lead ID", vi: "Lead ID" })} value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
          <Input label={copy({ en: "Candidate ID", vi: "ID ứng viên" })} value={filters.candidateId} onChange={(e) => setFilters((s) => ({ ...s, candidateId: e.target.value }))} />
          <Input label={copy({ en: "Order ID", vi: "ID đơn hàng" })} value={filters.orderId} onChange={(e) => setFilters((s) => ({ ...s, orderId: e.target.value }))} />
          <Select label={copy({ en: "Status", vi: "Trạng thái" })} value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            <option value="">{copy({ en: "All statuses", vi: "Tất cả trạng thái" })}</option>
            {STATUS_OPTIONS.filter(Boolean).map((status) => (
              <option key={status} value={status}>{formatApplicationStatus(status)}</option>
            ))}
          </Select>
          <Input label={copy({ en: "Search", vi: "Tìm kiếm" })} value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </FieldGroup>
        <ToolbarActions>
          <Badge tone="neutral">{copy({ en: `${filteredRecords.length} visible applications`, vi: `${filteredRecords.length} hồ sơ đang hiển thị` })}</Badge>
          <Badge tone="neutral">{copy({ en: `${applicationQuery.data?.total ?? 0} total from backend`, vi: `${applicationQuery.data?.total ?? 0} tổng số từ backend` })}</Badge>
        </ToolbarActions>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_390px]">
        <Panel
          title={copy({ en: "Application queue", vi: "Danh sách hồ sơ ứng tuyển" })}
          subtitle={copy({ en: "Each record is a real candidate-to-order application from the backend workflow.", vi: "Mỗi dòng là một hồ sơ ứng viên theo đơn hàng trong luồng backend." })}
        >
          {filteredRecords.length ? (
            <div className="max-h-[calc(100vh-30rem)] min-h-[320px] space-y-3 overflow-auto pr-1">
              {filteredRecords.map((record) => {
                const active = record.id === selectedIdResolved;
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? "border-indigo-500 bg-indigo-50/60" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{record.order?.name ?? copy({ en: "Unknown order", vi: "Chưa rõ đơn hàng" })}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {record.lead?.fullName ?? copy({ en: "Unknown lead", vi: "Chưa rõ lead" })} - {record.candidate?.code ?? record.candidate_id ?? copy({ en: "No candidate code", vi: "Chưa có mã ứng viên" })}
                        </div>
                      </div>
                      <Badge tone={toneForApplicationStatus(record.status)}>{formatApplicationStatus(record.status)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <InfoCard label={copy({ en: "Lead", vi: "Lead" })} value={record.lead?.phone ?? record.lead_id} />
                      <InfoCard label={copy({ en: "Interview", vi: "Phỏng vấn" })} value={record.interviewDate ? record.interviewDate.slice(0, 10) : copy({ en: "Not set", vi: "Chưa đặt" })} />
                      <InfoCard label={copy({ en: "Updated", vi: "Cập nhật" })} value={record.updatedAt ? record.updatedAt.slice(0, 10) : copy({ en: "Unknown", vi: "Chưa rõ" })} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState title={copy({ en: "No applications found", vi: "Không tìm thấy hồ sơ ứng tuyển" })} description={copy({ en: "Adjust filters or create an application from the candidate/order panel.", vi: "Điều chỉnh bộ lọc hoặc tạo hồ sơ từ khung ứng viên/đơn hàng." })} />
          )}
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={applicationQuery.data?.total ?? 0}
            isFetching={applicationQuery.isFetching}
            itemLabel={copy({ en: "applications", vi: "hồ sơ" })}
            pageLabel={copy({ en: "Page", vi: "Trang" })}
            previousLabel={copy({ en: "Previous", vi: "Trước" })}
            nextLabel={copy({ en: "Next", vi: "Sau" })}
            onPrevious={() => setPage((current) => Math.max(0, current - 1))}
            onNext={() => setPage((current) => current + 1)}
            className="mt-4 border-slate-100 px-0 pb-0 pt-4"
          />
        </Panel>

        <div className="space-y-6">
          <Panel
            title={copy({ en: "Create application", vi: "Tạo hồ sơ ứng tuyển" })}
            subtitle={copy({ en: "Create a real candidate-to-order application without manual UUID entry.", vi: "Tạo hồ sơ ứng viên theo đơn hàng mà không cần nhập UUID thủ công." })}
          >
            <div className="space-y-4">
              <CandidatePicker
                label={copy({ en: "Candidate", vi: "Ứng viên" })}
                searchLabel={copy({ en: "Candidate search", vi: "Tìm ứng viên" })}
                placeholder={copy({ en: "Code, lead name, or phone", vi: "Mã, tên lead hoặc số điện thoại" })}
                emptyLabel={copy({ en: "Select candidate", vi: "Chọn ứng viên" })}
                noLeadDetailLabel={copy({ en: "No lead detail", vi: "Chưa có thông tin lead" })}
                value={createForm.candidateId}
                onChange={(candidateId) => setCreateForm((s) => ({ ...s, candidateId }))}
              />
              <FieldGroup>
                <Select label={copy({ en: "Order", vi: "Đơn hàng" })} value={createForm.orderId} onChange={(e) => setCreateForm((s) => ({ ...s, orderId: e.target.value }))}>
                  <option value="">{copy({ en: "Select order", vi: "Chọn đơn hàng" })}</option>
                  {(ordersQuery.data ?? []).map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.name} - {order.region || copy({ en: "No region", vi: "Chưa có khu vực" })}
                    </option>
                  ))}
                </Select>
                <Select label={copy({ en: "Initial status", vi: "Trạng thái ban đầu" })} value={createForm.status} onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value }))}>
                  {STATUS_OPTIONS.filter(Boolean).map((status) => (
                    <option key={status} value={status}>{formatApplicationStatus(status)}</option>
                  ))}
                </Select>
                <Input label={copy({ en: "Interview date", vi: "Ngày phỏng vấn" })} type="date" value={createForm.interviewDate} onChange={(e) => setCreateForm((s) => ({ ...s, interviewDate: e.target.value }))} />
                <Input label={copy({ en: "Interview result", vi: "Kết quả phỏng vấn" })} maxLength={255} value={createForm.interviewResult} onChange={(e) => setCreateForm((s) => ({ ...s, interviewResult: e.target.value }))} />
                <Input label={copy({ en: "Reject reason", vi: "Lý do từ chối" })} maxLength={255} value={createForm.rejectReason} onChange={(e) => setCreateForm((s) => ({ ...s, rejectReason: e.target.value }))} />
              </FieldGroup>
              {createError || createApplication.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {createError || copy({ en: "Application creation failed. Check selected entities and status-required fields.", vi: "Tạo hồ sơ ứng tuyển thất bại. Kiểm tra ứng viên, đơn hàng và các trường bắt buộc theo trạng thái." })}
                </div>
              ) : null}
              <ToolbarActions>
                <Button onClick={submitCreate} disabled={createApplication.isPending || ordersQuery.isLoading}>
                  {createApplication.isPending ? copy({ en: "Creating application...", vi: "Đang tạo hồ sơ..." }) : copy({ en: "Create application", vi: "Tạo hồ sơ ứng tuyển" })}
                </Button>
                <Button variant="secondary" onClick={() => setCreateForm(emptyCreateForm)} disabled={createApplication.isPending}>
                  {copy({ en: "Reset", vi: "Đặt lại" })}
                </Button>
              </ToolbarActions>
            </div>
          </Panel>

          <Panel
            title={copy({ en: "Application detail", vi: "Chi tiết hồ sơ ứng tuyển" })}
            subtitle={copy({ en: "Update live backend status, interview metadata, and rejection context.", vi: "Cập nhật trạng thái backend, thông tin phỏng vấn và lý do từ chối." })}
          >
            {selected ? (
              <div className="space-y-4">
                <DescriptionList
                  items={[
                    { label: copy({ en: "Application ID", vi: "ID hồ sơ ứng tuyển" }), value: selected.id },
                    { label: copy({ en: "Lead", vi: "Lead" }), value: selected.lead?.fullName ?? selected.lead_id },
                    { label: copy({ en: "Candidate", vi: "Ứng viên" }), value: selected.candidate?.code ?? selected.candidate_id ?? copy({ en: "Unknown", vi: "Chưa rõ" }) },
                    { label: copy({ en: "Order", vi: "Đơn hàng" }), value: selected.order?.name ?? selected.order_id },
                    { label: copy({ en: "Created", vi: "Ngày tạo" }), value: selected.createdAt ?? copy({ en: "Unknown", vi: "Chưa rõ" }) }
                  ]}
                />

                <FieldGroup>
                  <Select label={copy({ en: "Status", vi: "Trạng thái" })} value={detailForm.status} onChange={(e) => setDetailForm((s) => ({ ...s, status: e.target.value }))}>
                    {STATUS_OPTIONS.filter(Boolean).map((status) => (
                      <option key={status} value={status}>{formatApplicationStatus(status)}</option>
                    ))}
                  </Select>
                  <Input label={copy({ en: "Interview date", vi: "Ngày phỏng vấn" })} type="date" value={detailForm.interviewDate} onChange={(e) => setDetailForm((s) => ({ ...s, interviewDate: e.target.value }))} />
                  <Input label={copy({ en: "Interview result", vi: "Kết quả phỏng vấn" })} maxLength={255} value={detailForm.interviewResult} onChange={(e) => setDetailForm((s) => ({ ...s, interviewResult: e.target.value }))} />
                  <Input label={copy({ en: "Reject reason", vi: "Lý do từ chối" })} maxLength={255} value={detailForm.rejectReason} onChange={(e) => setDetailForm((s) => ({ ...s, rejectReason: e.target.value }))} />
                </FieldGroup>

                {detailError || updateApplication.error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {detailError || copy({ en: "Application update failed. Check status-required fields.", vi: "Cập nhật hồ sơ thất bại. Kiểm tra các trường bắt buộc theo trạng thái." })}
                  </div>
                ) : null}

                <Button onClick={submitDetailUpdate} disabled={updateApplication.isPending}>
                  {updateApplication.isPending ? copy({ en: "Saving application...", vi: "Đang lưu hồ sơ..." }) : copy({ en: "Save application update", vi: "Lưu cập nhật hồ sơ" })}
                </Button>
              </div>
            ) : (
              <EmptyState title={copy({ en: "No application selected", vi: "Chưa chọn hồ sơ ứng tuyển" })} description={copy({ en: "Select a queue record to inspect and update live backend application state.", vi: "Chọn một dòng trong danh sách để xem và cập nhật trạng thái backend." })} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function validateApplicationForm(form: {
  candidateId: string;
  orderId: string;
  status: string;
  interviewDate: string;
  interviewResult?: string;
  rejectReason: string;
}, copy: (value: { en: string; vi: string }) => string) {
  if (!form.candidateId) return copy({ en: "Select a candidate before creating an application.", vi: "Chọn ứng viên trước khi tạo hồ sơ ứng tuyển." });
  if (!form.orderId) return copy({ en: "Select an order before creating an application.", vi: "Chọn đơn hàng trước khi tạo hồ sơ ứng tuyển." });
  if (form.status === "interview_scheduled" && !form.interviewDate) {
    return copy({ en: "Interview date is required when status is interview scheduled.", vi: "Cần nhập ngày phỏng vấn khi trạng thái là đã lên lịch phỏng vấn." });
  }
  if (["interview_failed", "rejected", "withdrawn"].includes(form.status) && !form.rejectReason.trim()) {
    return copy({ en: "Reject reason is required when status is interview failed, rejected, or withdrawn.", vi: "Cần nhập lý do từ chối khi trạng thái là phỏng vấn trượt, từ chối hoặc rút hồ sơ." });
  }
  return "";
}
