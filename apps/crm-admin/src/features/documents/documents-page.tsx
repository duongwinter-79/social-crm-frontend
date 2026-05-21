import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  FieldGroup,
  InfoCard,
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
  apiClient,
  triggerBlobDownload,
  useCandidateByLeadQuery,
  useCandidateDocumentChecklistQuery,
  useDocumentsQuery,
  useFormStandardRegisterQuery,
  useLeadDocumentChecklistQuery,
  useUploadFormStandardDocumentMutation,
  useUpdateDocumentMutation
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import type { DocumentChecklistSummary, DocumentRecord, FormStandardRegisterRow } from "@social-crm/api";

const DOC_TYPES = ["", "form_standard", "passport", "criminal_record", "health_check", "diploma", "work_permit", "other"] as const;
const DOC_STATUSES = ["", "pending", "submitted", "verified", "rejected", "expired"] as const;
const PAGE_SIZE = 25;

function toneForDocStatus(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "submitted") return "warning" as const;
  return "neutral" as const;
}

function formRegisterLeadLabel(row: FormStandardRegisterRow) {
  return row.lead.fullName || row.lead.displayName || row.lead.phone || row.lead.id;
}

export function DocumentsPage() {
  const { copy, formatDocumentType, formatDocumentStatus } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    leadId: searchParams.get("leadId") ?? "",
    candidateId: searchParams.get("candidateId") ?? "",
    docType: searchParams.get("docType") ?? "",
    status: "",
    search: ""
  }));
  const [page, setPage] = useState(0);
  const [registerPage, setRegisterPage] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [editForm, setEditForm] = useState({
    status: "",
    fileUrl: "",
    storageBucket: "",
    issueDate: "",
    expiryDate: ""
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileActionError, setFileActionError] = useState("");

  const candidateByLeadQuery = useCandidateByLeadQuery(filters.leadId || undefined);
  const resolvedCandidateId = filters.candidateId || candidateByLeadQuery.data?.id || undefined;
  const documentsQuery = useDocumentsQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    leadId: filters.leadId || undefined,
    candidateId: resolvedCandidateId,
    docType: filters.docType || undefined,
    status: filters.status || undefined
  });
  const formStandardRegisterQuery = useFormStandardRegisterQuery({
    offset: registerPage * PAGE_SIZE,
    limit: PAGE_SIZE,
    status: filters.status || undefined,
    search: filters.search || undefined
  });
  const leadChecklistQuery = useLeadDocumentChecklistQuery(filters.leadId || undefined);
  const candidateChecklistQuery = useCandidateDocumentChecklistQuery(resolvedCandidateId);
  const uploadFormStandard = useUploadFormStandardDocumentMutation();
  const updateDocument = useUpdateDocumentMutation();

  const records = documentsQuery.data?.data ?? [];
  const filteredRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const term = filters.search.trim().toLowerCase();
    return records.filter((record: DocumentRecord) =>
      [record.id, record.docType, record.status, record.fileUrl, record.storageBucket]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [records, filters.search]);

  const selected = filteredRecords.find((record: DocumentRecord) => record.id === selectedId) ?? filteredRecords[0] ?? null;
  const checklist = candidateChecklistQuery.data ?? leadChecklistQuery.data;

  useEffect(() => {
    setPage(0);
    setRegisterPage(0);
  }, [filters.leadId, filters.candidateId, filters.docType, filters.status, filters.search]);

  async function openDocumentFile(documentId: string, mode: "file" | "download") {
    setFileActionError("");
    try {
      const { blob, filename } = await apiClient.getDocumentFile(documentId, mode);
      if (mode === "download") {
        triggerBlobDownload(blob, filename);
        return;
      }
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      setFileActionError(copy({ en: "Could not open this file. Check whether it was uploaded through the CRM.", vi: "Không mở được file này. Kiểm tra file đã được tải lên qua CRM chưa." }));
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Documents", vi: "Hồ sơ giấy tờ" })}
        title={copy({ en: "Candidate document readiness", vi: "Mức sẵn sàng giấy tờ ứng viên" })}
        description={copy({ en: "Track required recruitment documents, review missing and expired items, and update document status from a real backend-backed checklist.", vi: "Theo dõi các giấy tờ tuyển dụng bắt buộc, rà soát mục còn thiếu hoặc hết hạn và cập nhật trạng thái giấy tờ từ danh sách kiểm tra của hệ thống." })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy({ en: "Standard forms can be uploaded, opened, downloaded, and used by the matching gate.", vi: "Form chuẩn có thể tải lên, mở xem, tải xuống và dùng để mở bước ghép đơn." })}</span>
          <Badge tone={resolvedCandidateId ? "success" : "warning"}>
            {resolvedCandidateId ? `${copy({ en: "Candidate", vi: "Ứng viên" })} ${resolvedCandidateId}` : copy({ en: "Lead-only checklist mode", vi: "Chế độ kiểm tra theo ứng viên tiềm năng" })}
          </Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <FieldGroup columns={4} className="xl:grid-cols-5">
          <Input label={copy({ en: "Lead ID", vi: "Mã ứng viên" })} value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
          <Input label={copy({ en: "Candidate ID", vi: "Mã hồ sơ" })} value={filters.candidateId} onChange={(e) => setFilters((s) => ({ ...s, candidateId: e.target.value }))} />
          <Select label={copy({ en: "Doc type", vi: "Loại giấy tờ" })} value={filters.docType} onChange={(e) => setFilters((s) => ({ ...s, docType: e.target.value }))}>
            <option value="">{copy({ en: "All types", vi: "Tất cả loại" })}</option>
            {DOC_TYPES.filter(Boolean).map((value) => (
              <option key={value} value={value}>{formatDocumentType(value)}</option>
            ))}
          </Select>
          <Select label={copy({ en: "Status", vi: "Trạng thái" })} value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            <option value="">{copy({ en: "All statuses", vi: "Tất cả trạng thái" })}</option>
            {DOC_STATUSES.filter(Boolean).map((value) => (
              <option key={value} value={value}>{formatDocumentStatus(value)}</option>
            ))}
          </Select>
          <Input label={copy({ en: "Search", vi: "Tìm kiếm" })} value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </FieldGroup>
        <ToolbarActions>
          <Badge tone="neutral">{copy({ en: `${filteredRecords.length} visible documents`, vi: `${filteredRecords.length} giấy tờ đang hiển thị` })}</Badge>
          <Badge tone="neutral">{copy({ en: `${checklist?.missingDocTypes?.length ?? 0} missing required docs`, vi: `Thiếu ${checklist?.missingDocTypes?.length ?? 0} giấy tờ bắt buộc` })}</Badge>
        </ToolbarActions>
      </Toolbar>

      <Panel
        title={copy({ en: "Standard form register", vi: "Danh sách form chuẩn" })}
        subtitle={copy({ en: "Each row shows the uploaded worker form and the latest placement/order context for that lead or candidate.", vi: "Mỗi dòng hiển thị form lao động đã tải lên và đơn hàng/bản ghi ghép đơn mới nhất của ứng viên." })}
      >
        {formStandardRegisterQuery.data?.data.length ? (
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">{copy({ en: "Form", vi: "Form" })}</th>
                  <th className="px-3 py-3">{copy({ en: "Lead / candidate", vi: "Ứng viên / hồ sơ" })}</th>
                  <th className="px-3 py-3">{copy({ en: "Phone", vi: "Số điện thoại" })}</th>
                  <th className="px-3 py-3">{copy({ en: "Matched order", vi: "Đơn đang ghép" })}</th>
                  <th className="px-3 py-3">{copy({ en: "Placement", vi: "Ghép đơn" })}</th>
                  <th className="px-3 py-3">{copy({ en: "Actions", vi: "Thao tác" })}</th>
                </tr>
              </thead>
              <tbody>
                {formStandardRegisterQuery.data.data.map((row) => (
                  <tr key={row.documentId} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{formatDocumentType("form_standard")}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge tone={toneForDocStatus(row.documentStatus)}>{formatDocumentStatus(row.documentStatus)}</Badge>
                        {row.hasFile ? <Badge tone="success">{copy({ en: "File", vi: "Có file" })}</Badge> : <Badge tone="warning">{copy({ en: "No file", vi: "Chưa có file" })}</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" className="font-medium text-indigo-700 hover:text-indigo-500" onClick={() => navigate(`/leads/${row.lead.id}`)}>
                        {formRegisterLeadLabel(row)}
                      </button>
                      <div className="mt-1 text-xs text-slate-500">{row.candidate?.code ?? row.candidate?.id ?? copy({ en: "No candidate record", vi: "Chưa có hồ sơ ứng viên" })}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{row.lead.phone ?? copy({ en: "Missing", vi: "Thiếu" })}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{row.order?.name ?? copy({ en: "No order yet", vi: "Chưa ghép đơn" })}</div>
                      {row.order ? <div className="mt-1 text-xs text-slate-500">{[row.order.region, row.order.industry].filter(Boolean).join(" · ")}</div> : null}
                    </td>
                    <td className="px-3 py-3">
                      {row.application ? (
                        <Badge tone="warning">{row.application.status}</Badge>
                      ) : (
                        <Badge tone="neutral">{copy({ en: "No placement", vi: "Chưa có bản ghi" })}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" disabled={!row.hasFile} onClick={() => void openDocumentFile(row.documentId, "file")}>
                          {copy({ en: "Open", vi: "Mở" })}
                        </Button>
                        <Button size="sm" variant="secondary" disabled={!row.hasFile} onClick={() => void openDocumentFile(row.documentId, "download")}>
                          {copy({ en: "Download", vi: "Tải" })}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={copy({ en: "No standard forms found", vi: "Chưa có form chuẩn" })}
            description={copy({ en: "Upload a standard worker form to see it here with matching and order context.", vi: "Tải form lao động chuẩn để xem cùng trạng thái ghép đơn và đơn hàng tại đây." })}
          />
        )}
        <PaginationFooter
          page={registerPage}
          pageSize={PAGE_SIZE}
          total={formStandardRegisterQuery.data?.total ?? 0}
          isFetching={formStandardRegisterQuery.isFetching}
          itemLabel={copy({ en: "standard forms", vi: "form chuẩn" })}
          pageLabel={copy({ en: "Page", vi: "Trang" })}
          previousLabel={copy({ en: "Previous", vi: "Trước" })}
          nextLabel={copy({ en: "Next", vi: "Sau" })}
          onPrevious={() => setRegisterPage((current) => Math.max(0, current - 1))}
          onNext={() => setRegisterPage((current) => current + 1)}
          className="mt-4 border-slate-100 px-0 pb-0 pt-4"
        />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Checklist overview", vi: "Tổng quan checklist" })}
            subtitle={copy({ en: "Required-document progress from backend rules, with lead or candidate scope depending on available context.", vi: "Tiến độ giấy tờ bắt buộc theo quy tắc hệ thống, theo phạm vi ứng viên tiềm năng hoặc hồ sơ ứng viên tùy dữ liệu hiện có." })}
          >
            {checklist ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <MetricCard label={copy({ en: "Required", vi: "Bắt buộc" })} value={String(checklist.requiredDocTypes.length)} tone="neutral" />
                  <MetricCard label={copy({ en: "Missing", vi: "Còn thiếu" })} value={String(checklist.missingDocTypes.length)} tone={checklist.missingDocTypes.length ? "danger" : "success"} />
                  <MetricCard label={copy({ en: "Verified", vi: "Đã xác minh" })} value={String(checklist.verifiedDocTypes.length)} tone="success" />
                  <MetricCard label={copy({ en: "Expired", vi: "Hết hạn" })} value={String(checklist.expiredDocTypes.length)} tone={checklist.expiredDocTypes.length ? "danger" : "neutral"} />
                </div>
                <div className="space-y-3">
                  {checklist.items.map((item: DocumentChecklistSummary["items"][number]) => (
                    <div key={item.docType} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{formatDocumentType(item.docType)}</div>
                        <Badge tone={toneForDocStatus(item.status)}>{formatDocumentStatus(item.status)}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {item.present ? copy({ en: "Document record exists", vi: "Đã có bản ghi giấy tờ" }) : copy({ en: "Missing document record", vi: "Thiếu bản ghi giấy tờ" })} · {item.isExpired ? copy({ en: "Expired", vi: "Hết hạn" }) : copy({ en: "Not expired", vi: "Chưa hết hạn" })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title={copy({ en: "Checklist not loaded", vi: "Chưa tải danh sách kiểm tra" })} description={copy({ en: "Provide a lead ID or candidate ID to load the real backend checklist summary.", vi: "Hãy cung cấp mã ứng viên tiềm năng hoặc mã hồ sơ ứng viên để tải danh sách kiểm tra từ API." })} />
            )}
          </Panel>

          <Panel
            title={copy({ en: "Document register", vi: "Sổ đăng ký giấy tờ" })}
            subtitle={copy({ en: "Metadata-driven records for passport, health, criminal record, diploma, and other required files.", vi: "Các bản ghi thông tin giấy tờ cho hộ chiếu, khám sức khỏe, lý lịch tư pháp, bằng cấp và giấy tờ bắt buộc khác." })}
          >
            {filteredRecords.length ? (
              <div className="max-h-[calc(100vh-30rem)] min-h-[320px] space-y-3 overflow-auto pr-1">
                {filteredRecords.map((record: DocumentRecord) => {
                  const active = record.id === selected?.id;
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(record.id);
                        setEditForm({
                          status: record.status,
                          fileUrl: record.fileUrl ?? "",
                          storageBucket: record.storageBucket ?? "",
                          issueDate: record.issueDate ?? "",
                          expiryDate: record.expiryDate ?? ""
                        });
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? "border-indigo-500 bg-indigo-50/60" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{formatDocumentType(record.docType)}</div>
                          <div className="mt-1 text-xs text-slate-500">{record.fileUrl || copy({ en: "No file URL yet", vi: "Chưa có URL file" })}</div>
                        </div>
                        <Badge tone={toneForDocStatus(record.status)}>{formatDocumentStatus(record.status)}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <InfoCard label={copy({ en: "Issue date", vi: "Ngày cấp" })} value={record.issueDate || copy({ en: "Unknown", vi: "Chưa rõ" })} />
                        <InfoCard label={copy({ en: "Expiry date", vi: "Ngày hết hạn" })} value={record.expiryDate || copy({ en: "Not set", vi: "Chưa đặt" })} />
                        <InfoCard label={copy({ en: "Bucket", vi: "Bucket" })} value={record.storageBucket || copy({ en: "None", vi: "Không có" })} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title={copy({ en: "No documents found", vi: "Không tìm thấy giấy tờ" })} description={copy({ en: "Create the first document record for this lead or candidate scope.", vi: "Tạo bản ghi giấy tờ đầu tiên cho ứng viên tiềm năng hoặc hồ sơ ứng viên này." })} />
            )}
            <PaginationFooter
              page={page}
              pageSize={PAGE_SIZE}
              total={documentsQuery.data?.total ?? 0}
              isFetching={documentsQuery.isFetching}
              itemLabel={copy({ en: "documents", vi: "giấy tờ" })}
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
            title={copy({ en: "Upload standard form", vi: "Tải form chuẩn" })}
            subtitle={copy({ en: "Upload the official worker form (.doc, .docx, .pdf). Once saved, the lead advances to matching automatically if currently qualified.", vi: "Tải file form lao động chuẩn (.doc, .docx, .pdf). Sau khi lưu, hệ thống tự chuyển ứng viên sang bước ghép đơn nếu đang ở trạng thái Đủ điều kiện." })}
          >
            <div className="space-y-4">
              <DescriptionList
                items={[
                  { label: copy({ en: "Lead", vi: "Ứng viên" }), value: filters.leadId || copy({ en: "Required — enter Lead ID above", vi: "Bắt buộc — nhập Mã ứng viên phía trên" }) },
                  { label: copy({ en: "Candidate", vi: "Hồ sơ" }), value: resolvedCandidateId ?? copy({ en: "Not linked yet", vi: "Chưa liên kết" }) }
                ]}
              />
              <label className="block text-sm font-medium text-slate-700">
                {copy({ en: "Form file", vi: "File form" })}
                <input
                  type="file"
                  accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />
              </label>
              {uploadFile ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                  {uploadFile.name} · {(uploadFile.size / 1024).toFixed(0)} KB
                </div>
              ) : null}
              <Button
                onClick={() => {
                  if (!uploadFile) return;
                  uploadFormStandard.mutate(
                    { leadId: filters.leadId, candidateId: resolvedCandidateId, status: "verified", file: uploadFile },
                    { onSuccess: () => setUploadFile(null) }
                  );
                }}
                disabled={!filters.leadId || uploadFormStandard.isPending || !uploadFile}
              >
                {uploadFormStandard.isPending
                  ? copy({ en: "Uploading...", vi: "Đang tải lên..." })
                  : copy({ en: "Upload standard form", vi: "Tải form chuẩn" })}
              </Button>
            </div>
          </Panel>

          <Panel
            title={copy({ en: "Selected document", vi: "Giấy tờ đã chọn" })}
            subtitle={copy({ en: "Update backend status and document metadata from the same workspace.", vi: "Cập nhật trạng thái xử lý và thông tin giấy tờ ngay trong cùng màn hình." })}
          >
            {selected ? (
              <div className="space-y-4">
                <DescriptionList
                  items={[
                    { label: copy({ en: "Document ID", vi: "ID giấy tờ" }), value: selected.id },
                    { label: copy({ en: "Type", vi: "Loại" }), value: formatDocumentType(selected.docType) },
                    { label: copy({ en: "Lead", vi: "Ứng viên" }), value: selected.lead_id },
                    { label: copy({ en: "Candidate", vi: "Hồ sơ ứng viên" }), value: selected.candidate_id ?? copy({ en: "No candidate scope", vi: "Không có phạm vi hồ sơ ứng viên" }) }
                  ]}
                />
                {selected.fileUrl ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <Button variant="secondary" size="sm" onClick={() => void openDocumentFile(selected.id, "file")}>
                      {copy({ en: "Open file", vi: "Mở file" })}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => void openDocumentFile(selected.id, "download")}>
                      {copy({ en: "Download", vi: "Tải xuống" })}
                    </Button>
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{selected.fileUrl}</span>
                  </div>
                ) : null}
                {fileActionError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{fileActionError}</div> : null}
                <FieldGroup>
                  <Select label={copy({ en: "Status", vi: "Trạng thái" })} value={editForm.status} onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value }))}>
                    {DOC_STATUSES.filter(Boolean).map((value) => (
                      <option key={value} value={value}>{formatDocumentStatus(value)}</option>
                    ))}
                  </Select>
                  <Input label={copy({ en: "File URL", vi: "URL file" })} value={editForm.fileUrl} onChange={(e) => setEditForm((s) => ({ ...s, fileUrl: e.target.value }))} />
                  <Input label={copy({ en: "Storage bucket", vi: "Bucket lưu trữ" })} value={editForm.storageBucket} onChange={(e) => setEditForm((s) => ({ ...s, storageBucket: e.target.value }))} />
                  <Input label={copy({ en: "Issue date", vi: "Ngày cấp" })} type="date" value={editForm.issueDate} onChange={(e) => setEditForm((s) => ({ ...s, issueDate: e.target.value }))} />
                  <Input label={copy({ en: "Expiry date", vi: "Ngày hết hạn" })} type="date" value={editForm.expiryDate} onChange={(e) => setEditForm((s) => ({ ...s, expiryDate: e.target.value }))} />
                </FieldGroup>
                <Button
                  onClick={() =>
                    updateDocument.mutate({
                      id: selected.id,
                      patch: {
                        status: editForm.status || undefined,
                        fileUrl: editForm.fileUrl || null,
                        storageBucket: editForm.storageBucket || null,
                        issueDate: editForm.issueDate || null,
                        expiryDate: editForm.expiryDate || null
                      }
                    })
                  }
                  disabled={updateDocument.isPending}
                >
                  {updateDocument.isPending ? copy({ en: "Saving...", vi: "Đang lưu..." }) : copy({ en: "Save document update", vi: "Lưu cập nhật giấy tờ" })}
                </Button>
              </div>
            ) : (
              <EmptyState title={copy({ en: "No document selected", vi: "Chưa chọn giấy tờ" })} description={copy({ en: "Pick a document from the register to update its status and metadata.", vi: "Chọn một giấy tờ từ sổ đăng ký để cập nhật trạng thái và thông tin giấy tờ." })} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
