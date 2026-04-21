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
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useApplicationDetailQuery,
  useApplicationsQuery,
  useUpdateApplicationMutation
} from "@social-crm/api";
import { useI18n } from "@/i18n";

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
  const [selectedId, setSelectedId] = useState<string>("");
  const [detailForm, setDetailForm] = useState({
    status: "",
    interviewDate: "",
    interviewResult: "",
    rejectReason: ""
  });

  const applicationQuery = useApplicationsQuery({
    offset: 0,
    limit: 50,
    leadId: filters.leadId || undefined,
    candidateId: filters.candidateId || undefined,
    orderId: filters.orderId || undefined,
    status: filters.status || undefined
  });
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
    if (!selected) return;
    setDetailForm({
      status: selected.status ?? "",
      interviewDate: selected.interviewDate ? selected.interviewDate.slice(0, 10) : "",
      interviewResult: selected.interviewResult ?? "",
      rejectReason: selected.rejectReason ?? ""
    });
  }, [selected]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Applications", vi: "Hồ sơ ứng tuyển" })}
        title={copy({ en: "Placement progress workspace", vi: "Không gian tiến độ bố trí" })}
        description={copy({ en: "Track candidate-to-order progression with real backend application records, interview state, and downstream placement readiness.", vi: "Theo dõi tiến trình ứng viên tới đơn hàng bằng hồ sơ ứng tuyển thật từ backend, trạng thái phỏng vấn và mức sẵn sàng bố trí ở các bước tiếp theo." })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy({ en: "The backend applications module is now live for list, detail, and lifecycle updates.", vi: "Mô-đun hồ sơ ứng tuyển phía backend hiện đã hoạt động cho danh sách, chi tiết và cập nhật vòng đời." })}</span>
          <Badge tone="warning">{copy({ en: "Creation is deferred until candidate context is exposed cleanly in the frontend", vi: "Chức năng tạo mới được hoãn cho tới khi ngữ cảnh ứng viên được hiển thị rõ ràng ở frontend" })}</Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <FieldGroup columns={4} className="xl:grid-cols-5">
          <Input label={copy({ en: "Lead ID", vi: "ID lead" })} value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
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
          <Badge tone="neutral">{copy({ en: `${applicationQuery.data?.total ?? 0} total from backend`, vi: `${applicationQuery.data?.total ?? 0} tổng từ backend` })}</Badge>
        </ToolbarActions>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Panel
          title={copy({ en: "Application queue", vi: "Hàng đợi hồ sơ ứng tuyển" })}
          subtitle={copy({ en: "Each record is a real candidate-to-order application from the backend workflow.", vi: "Mỗi bản ghi là một hồ sơ ứng tuyển ứng viên-đơn hàng thật từ luồng backend." })}
        >
          {filteredRecords.length ? (
            <div className="space-y-3">
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
                        <div className="font-semibold text-slate-900">{record.order?.name ?? copy({ en: "Unknown order", vi: "Đơn hàng chưa rõ" })}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {(record.lead?.fullName ?? copy({ en: "Unknown lead", vi: "Lead chưa rõ" }))} · {(record.candidate?.code ?? record.candidate_id ?? copy({ en: "No candidate code", vi: "Chưa có mã ứng viên" }))}
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
            <EmptyState title={copy({ en: "No applications found", vi: "Không tìm thấy hồ sơ ứng tuyển" })} description={copy({ en: "Adjust the filters or wait until backend application records are created from the matching workflow.", vi: "Hãy điều chỉnh bộ lọc hoặc chờ backend tạo hồ sơ ứng tuyển từ luồng ghép đơn." })} />
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title={copy({ en: "Application detail", vi: "Chi tiết hồ sơ ứng tuyển" })}
            subtitle={copy({ en: "Update live backend status, interview metadata, and rejection context from the same operator surface.", vi: "Cập nhật trạng thái backend trực tiếp, dữ liệu phỏng vấn và ngữ cảnh từ chối ngay trên cùng bề mặt vận hành." })}
          >
            {selected ? (
              <div className="space-y-4">
                <DescriptionList
                  items={[
                    { label: copy({ en: "Application ID", vi: "ID hồ sơ ứng tuyển" }), value: selected.id },
                    { label: copy({ en: "Lead", vi: "Lead" }), value: selected.lead?.fullName ?? selected.lead_id },
                    { label: copy({ en: "Candidate", vi: "Ứng viên" }), value: selected.candidate?.code ?? selected.candidate_id ?? copy({ en: "Unknown", vi: "Chưa rõ" }) },
                    { label: copy({ en: "Order", vi: "Đơn hàng" }), value: selected.order?.name ?? selected.order_id },
                    { label: copy({ en: "Created", vi: "Đã tạo" }), value: selected.createdAt ?? copy({ en: "Unknown", vi: "Chưa rõ" }) }
                  ]}
                />

                <FieldGroup>
                  <Select label={copy({ en: "Status", vi: "Trạng thái" })} value={detailForm.status} onChange={(e) => setDetailForm((s) => ({ ...s, status: e.target.value }))}>
                    {STATUS_OPTIONS.filter(Boolean).map((status) => (
                      <option key={status} value={status}>{formatApplicationStatus(status)}</option>
                    ))}
                  </Select>
                  <Input label={copy({ en: "Interview date", vi: "Ngày phỏng vấn" })} type="date" value={detailForm.interviewDate} onChange={(e) => setDetailForm((s) => ({ ...s, interviewDate: e.target.value }))} />
                  <Input label={copy({ en: "Interview result", vi: "Kết quả phỏng vấn" })} value={detailForm.interviewResult} onChange={(e) => setDetailForm((s) => ({ ...s, interviewResult: e.target.value }))} />
                  <Input label={copy({ en: "Reject reason", vi: "Lý do từ chối" })} value={detailForm.rejectReason} onChange={(e) => setDetailForm((s) => ({ ...s, rejectReason: e.target.value }))} />
                </FieldGroup>

                <Button
                  onClick={() =>
                    updateApplication.mutate({
                      id: selected.id,
                      patch: {
                        status: detailForm.status || undefined,
                        interviewDate: detailForm.interviewDate || null,
                        interviewResult: detailForm.interviewResult || null,
                        rejectReason: detailForm.rejectReason || null
                      }
                    })
                  }
                  disabled={updateApplication.isPending}
                >
                  {updateApplication.isPending ? copy({ en: "Saving application...", vi: "Đang lưu hồ sơ..." }) : copy({ en: "Save application update", vi: "Lưu cập nhật hồ sơ" })}
                </Button>
              </div>
            ) : (
              <EmptyState title={copy({ en: "No application selected", vi: "Chưa chọn hồ sơ ứng tuyển" })} description={copy({ en: "Select a record from the queue to inspect and update the live backend application state.", vi: "Chọn một bản ghi trong hàng đợi để xem và cập nhật trạng thái hồ sơ trực tiếp từ backend." })} />
            )}
          </Panel>

          <Panel
            title={copy({ en: "Operator notes", vi: "Ghi chú vận hành" })}
            subtitle={copy({ en: "Current backend limitation and expected next integration step.", vi: "Giới hạn backend hiện tại và bước tích hợp dự kiến tiếp theo." })}
          >
            <div className="space-y-3 text-sm leading-7 text-slate-600">
              <p>
                {copy({ en: "The backend supports application creation, but the frontend does not yet have a clean candidate lookup surface. For now, this workspace focuses on real queue visibility and lifecycle updates instead of inventing a candidate picker.", vi: "Backend đã hỗ trợ tạo hồ sơ ứng tuyển, nhưng frontend vẫn chưa có bề mặt tra cứu ứng viên đủ sạch. Hiện tại, không gian này tập trung vào khả năng nhìn thấy hàng đợi thật và cập nhật vòng đời thay vì dựng bộ chọn ứng viên giả." })}
              </p>
              <p>
                {copy({ en: "The next upgrade should expose candidate context in the lead workbench or add a recruitment listing API so application creation can be performed without manual IDs.", vi: "Bản nâng cấp tiếp theo nên hiển thị ngữ cảnh ứng viên trong lead workbench hoặc bổ sung API danh sách tuyển dụng để việc tạo hồ sơ có thể thực hiện mà không cần nhập ID thủ công." })}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
