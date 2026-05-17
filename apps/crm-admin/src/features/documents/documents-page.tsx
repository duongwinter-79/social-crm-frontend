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
  MetricCard,
  PaginationFooter,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useCandidateByLeadQuery,
  useCandidateDocumentChecklistQuery,
  useCreateDocumentMutation,
  useDocumentsQuery,
  useLeadDocumentChecklistQuery,
  useUpdateDocumentMutation
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import type { DocumentChecklistSummary, DocumentRecord } from "@social-crm/api";

const DOC_TYPES = ["", "passport", "criminal_record", "health_check", "diploma", "work_permit", "other"] as const;
const DOC_STATUSES = ["", "pending", "submitted", "verified", "rejected", "expired"] as const;
const PAGE_SIZE = 25;

function toneForDocStatus(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "submitted") return "warning" as const;
  return "neutral" as const;
}

export function DocumentsPage() {
  const { copy, formatDocumentType, formatDocumentStatus } = useI18n();
  const [filters, setFilters] = useState({
    leadId: "",
    candidateId: "",
    docType: "",
    status: "",
    search: ""
  });
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [createForm, setCreateForm] = useState({
    docType: "passport",
    status: "pending",
    fileUrl: "",
    storageBucket: "",
    issueDate: "",
    expiryDate: ""
  });
  const [editForm, setEditForm] = useState({
    status: "",
    fileUrl: "",
    storageBucket: "",
    issueDate: "",
    expiryDate: ""
  });

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
  const leadChecklistQuery = useLeadDocumentChecklistQuery(filters.leadId || undefined);
  const candidateChecklistQuery = useCandidateDocumentChecklistQuery(resolvedCandidateId);
  const createDocument = useCreateDocumentMutation();
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
  }, [filters.leadId, filters.candidateId, filters.docType, filters.status, filters.search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Documents", vi: "Hồ sơ giấy tờ" })}
        title={copy({ en: "Candidate document readiness", vi: "Mức sẵn sàng giấy tờ ứng viên" })}
        description={copy({ en: "Track required recruitment documents, review missing and expired items, and update document status from a real backend-backed checklist.", vi: "Theo dõi các giấy tờ tuyển dụng bắt buộc, rà soát mục còn thiếu hoặc hết hạn và cập nhật trạng thái giấy tờ từ checklist thật chạy bằng backend." })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy({ en: "Document records are live backend entities. File handling is metadata-first for now.", vi: "Bản ghi giấy tờ là entity thật từ backend. Hiện tại việc xử lý file vẫn theo hướng metadata-first." })}</span>
          <Badge tone={resolvedCandidateId ? "success" : "warning"}>
            {resolvedCandidateId ? `${copy({ en: "Candidate", vi: "Ứng viên" })} ${resolvedCandidateId}` : copy({ en: "Lead-only checklist mode", vi: "Chế độ checklist theo lead" })}
          </Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <FieldGroup columns={4} className="xl:grid-cols-5">
          <Input label={copy({ en: "Lead ID", vi: "ID lead" })} value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
          <Input label={copy({ en: "Candidate ID", vi: "ID ứng viên" })} value={filters.candidateId} onChange={(e) => setFilters((s) => ({ ...s, candidateId: e.target.value }))} />
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Checklist overview", vi: "Tổng quan checklist" })}
            subtitle={copy({ en: "Required-document progress from backend rules, with lead or candidate scope depending on available context.", vi: "Tiến độ giấy tờ bắt buộc theo luật backend, với phạm vi theo lead hoặc theo ứng viên tùy ngữ cảnh hiện có." })}
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
              <EmptyState title={copy({ en: "Checklist not loaded", vi: "Chưa tải checklist" })} description={copy({ en: "Provide a lead ID or candidate ID to load the real backend checklist summary.", vi: "Hãy cung cấp ID lead hoặc ID ứng viên để tải checklist tổng hợp thật từ backend." })} />
            )}
          </Panel>

          <Panel
            title={copy({ en: "Document register", vi: "Sổ đăng ký giấy tờ" })}
            subtitle={copy({ en: "Metadata-driven records for passport, health, criminal record, diploma, and other required files.", vi: "Các bản ghi dựa trên metadata cho hộ chiếu, khám sức khỏe, lý lịch tư pháp, bằng cấp và các giấy tờ bắt buộc khác." })}
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
              <EmptyState title={copy({ en: "No documents found", vi: "Không tìm thấy giấy tờ" })} description={copy({ en: "Create the first document record for this lead or candidate scope.", vi: "Tạo bản ghi giấy tờ đầu tiên cho phạm vi lead hoặc ứng viên này." })} />
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
            title={copy({ en: "Create document record", vi: "Tạo bản ghi giấy tờ" })}
            subtitle={copy({ en: "This records document metadata and readiness status. Binary file upload can be added later without changing the workflow model.", vi: "Phần này ghi nhận metadata giấy tờ và trạng thái sẵn sàng. Upload file nhị phân có thể bổ sung sau mà không cần đổi mô hình luồng xử lý." })}
          >
            <div className="space-y-4">
              <DescriptionList
                items={[
                  { label: copy({ en: "Lead scope", vi: "Phạm vi lead" }), value: filters.leadId || copy({ en: "Required", vi: "Bắt buộc" }) },
                  { label: copy({ en: "Candidate scope", vi: "Phạm vi ứng viên" }), value: resolvedCandidateId ?? copy({ en: "Optional / unresolved", vi: "Tùy chọn / chưa xác định" }) }
                ]}
              />
              <FieldGroup>
                <Select label={copy({ en: "Doc type", vi: "Loại giấy tờ" })} value={createForm.docType} onChange={(e) => setCreateForm((s) => ({ ...s, docType: e.target.value }))}>
                  {DOC_TYPES.filter(Boolean).map((value) => (
                    <option key={value} value={value}>{formatDocumentType(value)}</option>
                  ))}
                </Select>
                <Select label={copy({ en: "Initial status", vi: "Trạng thái ban đầu" })} value={createForm.status} onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value }))}>
                  {DOC_STATUSES.filter(Boolean).map((value) => (
                    <option key={value} value={value}>{formatDocumentStatus(value)}</option>
                  ))}
                </Select>
                <Input label={copy({ en: "File URL", vi: "URL file" })} value={createForm.fileUrl} onChange={(e) => setCreateForm((s) => ({ ...s, fileUrl: e.target.value }))} />
                <Input label={copy({ en: "Storage bucket", vi: "Bucket lưu trữ" })} value={createForm.storageBucket} onChange={(e) => setCreateForm((s) => ({ ...s, storageBucket: e.target.value }))} />
                <Input label={copy({ en: "Issue date", vi: "Ngày cấp" })} type="date" value={createForm.issueDate} onChange={(e) => setCreateForm((s) => ({ ...s, issueDate: e.target.value }))} />
                <Input label={copy({ en: "Expiry date", vi: "Ngày hết hạn" })} type="date" value={createForm.expiryDate} onChange={(e) => setCreateForm((s) => ({ ...s, expiryDate: e.target.value }))} />
              </FieldGroup>
              <Button
                onClick={() =>
                  createDocument.mutate({
                    leadId: filters.leadId,
                    candidateId: resolvedCandidateId,
                    docType: createForm.docType,
                    status: createForm.status,
                    fileUrl: createForm.fileUrl || undefined,
                    storageBucket: createForm.storageBucket || undefined,
                    issueDate: createForm.issueDate || undefined,
                    expiryDate: createForm.expiryDate || undefined
                  })
                }
                disabled={!filters.leadId || createDocument.isPending}
              >
                {createDocument.isPending ? copy({ en: "Creating...", vi: "Đang tạo..." }) : copy({ en: "Create document", vi: "Tạo giấy tờ" })}
              </Button>
            </div>
          </Panel>

          <Panel
            title={copy({ en: "Selected document", vi: "Giấy tờ đã chọn" })}
            subtitle={copy({ en: "Update backend status and document metadata from the same workspace.", vi: "Cập nhật trạng thái backend và metadata giấy tờ ngay trong cùng không gian làm việc." })}
          >
            {selected ? (
              <div className="space-y-4">
                <DescriptionList
                  items={[
                    { label: copy({ en: "Document ID", vi: "ID giấy tờ" }), value: selected.id },
                    { label: copy({ en: "Type", vi: "Loại" }), value: formatDocumentType(selected.docType) },
                    { label: copy({ en: "Lead", vi: "Lead" }), value: selected.lead_id },
                    { label: copy({ en: "Candidate", vi: "Ứng viên" }), value: selected.candidate_id ?? copy({ en: "No candidate scope", vi: "Không có phạm vi ứng viên" }) }
                  ]}
                />
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
              <EmptyState title={copy({ en: "No document selected", vi: "Chưa chọn giấy tờ" })} description={copy({ en: "Pick a document from the register to update its status and metadata.", vi: "Chọn một giấy tờ từ sổ đăng ký để cập nhật trạng thái và metadata." })} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
