import { useState } from "react";
import { Badge, Button, FieldGroup, Input, Panel, Select } from "@social-crm/ui";
import {
  apiClient,
  useDeleteLeadDocumentMutation,
  useDocumentsQuery,
  useUploadLeadDocumentMutation,
  useVerifyDocumentMutation,
  usePermissions,
  type DocumentRecord,
} from "@social-crm/api";
import { useI18n } from "../../i18n";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

// Kept in sync manually with LEAD_DOCUMENT_TYPES / REQUIRED_DOCUMENT_TYPES in
// the backend's document-rules.ts. work_permit is uploadable here but is not
// required — it's obtained after departure, so it never blocks the
// VISA_PROCESSING -> DEPARTED gate.
const LEAD_DOC_TYPES = ["passport", "criminal_record", "criminal_record_2", "health_check", "diploma", "work_permit"] as const;
const LEAD_DOC_REQUIRED = new Set<string>(["passport", "criminal_record", "criminal_record_2", "health_check", "diploma"]);

function toneForDocStatus(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "submitted") return "warning" as const;
  return "neutral" as const;
}

export function LeadDocumentsPanel(props: { leadId: string }) {
  const { copy, formatDocumentType, formatDocumentStatus } = useI18n();
  const { canEditLeads, canVerifyDocuments } = usePermissions();
  const docsQuery = useDocumentsQuery({ leadId: props.leadId, offset: 0, limit: 50 });
  const uploadDoc = useUploadLeadDocumentMutation();
  const deleteDoc = useDeleteLeadDocumentMutation();
  const verifyDoc = useVerifyDocumentMutation();

  const [addDocType, setAddDocType] = useState<string>(LEAD_DOC_TYPES[0]);
  const [addIssueDate, setAddIssueDate] = useState("");
  const [addExpiryDate, setAddExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");

  // Documents come back ordered updatedAt DESC (see findAll) — the first row
  // per docType is always the current one, matching the backend's upsert
  // (re-upload replaces rather than duplicates).
  const docs: DocumentRecord[] = docsQuery.data?.data ?? [];
  const byType = new Map<string, DocumentRecord>();
  for (const doc of docs) {
    if (!byType.has(doc.docType)) byType.set(doc.docType, doc);
  }

  const requiredVerified = [...LEAD_DOC_REQUIRED].filter((t) => byType.get(t)?.status === "verified").length;

  function handleUpload() {
    if (!canEditLeads || !file) return;
    setUploadError("");
    uploadDoc.mutate(
      { leadId: props.leadId, file, docType: addDocType, issueDate: addIssueDate || undefined, expiryDate: addExpiryDate || undefined },
      {
        onSuccess: () => { setFile(null); setAddIssueDate(""); setAddExpiryDate(""); },
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setUploadError(message ?? copy({ en: "Upload failed.", vi: "Tải lên thất bại." }));
        },
      },
    );
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    deleteDoc.mutate(
      { id: deleteTarget.id, leadId: props.leadId },
      {
        onSuccess: () => setDeleteTarget(null),
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setDeleteError(message ?? copy({ en: "Delete failed.", vi: "Xoá thất bại." }));
        },
      },
    );
  }

  async function handleOpen(doc: DocumentRecord) {
    setOpeningId(doc.id);
    try {
      const { url, isObjectUrl } = await apiClient.getDocumentUrl(doc.id);
      window.open(url, "_blank", "noopener,noreferrer");
      if (isObjectUrl) window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      setActionError(copy({ en: "Could not open this file.", vi: "Không mở được file này." }));
    } finally {
      setOpeningId(null);
    }
  }

  function handleApprove(doc: DocumentRecord) {
    setActionError("");
    verifyDoc.mutate(
      { id: doc.id, action: "approve" },
      {
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setActionError(message ?? copy({ en: "Approve failed.", vi: "Duyệt thất bại." }));
        },
      },
    );
  }

  function handleConfirmReject() {
    if (!rejectingId) return;
    setActionError("");
    verifyDoc.mutate(
      { id: rejectingId, action: "reject", rejectionReason: rejectReason.trim() },
      {
        onSuccess: () => { setRejectingId(null); setRejectReason(""); },
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setActionError(message ?? copy({ en: "Reject failed.", vi: "Từ chối thất bại." }));
        },
      },
    );
  }

  return (
    <Panel
      title={copy({ en: "Candidate documents", vi: "Giấy tờ ứng viên" })}
      subtitle={copy({
        en: `Passport, judicial record, health check, diploma, work permit — ${requiredVerified}/${LEAD_DOC_REQUIRED.size} required verified.`,
        vi: `Hộ chiếu, lý lịch tư pháp, khám sức khỏe, bằng cấp, giấy phép lao động — đã xác minh ${requiredVerified}/${LEAD_DOC_REQUIRED.size} giấy tờ bắt buộc.`,
      })}
    >
      <div className="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {LEAD_DOC_TYPES.map((docType) => {
          const doc = byType.get(docType);
          const required = LEAD_DOC_REQUIRED.has(docType);
          const isRejecting = rejectingId === doc?.id;
          return (
            <div key={docType} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">{formatDocumentType(docType)}</span>
              <Badge tone={required ? "neutral" : "accent"}>
                {required ? copy({ en: "Required", vi: "Bắt buộc" }) : copy({ en: "Optional", vi: "Tùy chọn" })}
              </Badge>
              {doc ? (
                <>
                  <Badge tone={toneForDocStatus(doc.status)}>{formatDocumentStatus(doc.status)}</Badge>
                  {doc.issueDate ? <span className="text-slate-500">{copy({ en: "Issued", vi: "Phát hành" })}: {doc.issueDate}</span> : null}
                  {doc.expiryDate ? <span className="text-slate-500">{copy({ en: "Expires", vi: "Hết hạn" })}: {doc.expiryDate}</span> : null}
                  <div className="ml-auto flex flex-wrap items-center gap-3">
                    {doc.fileUrl || doc.fileKey ? (
                      <button
                        type="button"
                        className="font-semibold text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-700 disabled:opacity-50"
                        onClick={() => handleOpen(doc)}
                        disabled={openingId === doc.id}
                      >
                        {openingId === doc.id ? copy({ en: "Opening...", vi: "Đang mở..." }) : copy({ en: "Open file", vi: "Mở file" })}
                      </button>
                    ) : null}
                    {canVerifyDocuments && doc.status === "submitted" ? (
                      <>
                        <button
                          type="button"
                          className="font-semibold text-green-600 underline decoration-green-300 underline-offset-4 hover:text-green-700"
                          onClick={() => handleApprove(doc)}
                          disabled={verifyDoc.isPending}
                        >
                          {copy({ en: "Approve", vi: "Duyệt" })}
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-amber-600 underline decoration-amber-300 underline-offset-4 hover:text-amber-700"
                          onClick={() => { setActionError(""); setRejectingId(doc.id); setRejectReason(""); }}
                        >
                          {copy({ en: "Reject", vi: "Từ chối" })}
                        </button>
                      </>
                    ) : null}
                    {canEditLeads ? (
                      <button
                        type="button"
                        className="font-semibold text-red-600 underline decoration-red-300 underline-offset-4 hover:text-red-700"
                        onClick={() => { setDeleteError(""); setDeleteTarget(doc); }}
                      >
                        {copy({ en: "Delete", vi: "Xoá" })}
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <Badge tone="warning">{copy({ en: "Not uploaded", vi: "Chưa có" })}</Badge>
                  <span className="ml-auto text-xs text-slate-400">
                    {copy({ en: "Select this type below to upload", vi: "Chọn loại này bên dưới để tải lên" })}
                  </span>
                </>
              )}
              {isRejecting ? (
                <div className="mt-2 flex w-full flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                  <Input
                    label={copy({ en: "Rejection reason", vi: "Lý do từ chối" })}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={copy({ en: "e.g. blurry scan, wrong document, expired", vi: "VD: ảnh mờ, sai giấy tờ, đã hết hạn" })}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={verifyDoc.isPending || rejectReason.trim().length === 0}
                      onClick={handleConfirmReject}
                    >
                      {verifyDoc.isPending ? copy({ en: "Rejecting...", vi: "Đang từ chối..." }) : copy({ en: "Confirm reject", vi: "Xác nhận từ chối" })}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setRejectingId(null)} disabled={verifyDoc.isPending}>
                      {copy({ en: "Cancel", vi: "Hủy" })}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {actionError ? <p className="mb-4 text-sm text-red-600">{actionError}</p> : null}

      {canEditLeads ? (
        <>
          <FieldGroup columns={4}>
            <Select label={copy({ en: "Document type", vi: "Loại tài liệu" })} value={addDocType} onChange={(e) => setAddDocType(e.target.value)}>
              {LEAD_DOC_TYPES.map((t) => (
                <option key={t} value={t}>{formatDocumentType(t)}</option>
              ))}
            </Select>
            <Input label={copy({ en: "Issue date", vi: "Ngày phát hành" })} type="date" value={addIssueDate} onChange={(e) => setAddIssueDate(e.target.value)} />
            <Input label={copy({ en: "Expiry date", vi: "Ngày hết hạn" })} type="date" value={addExpiryDate} onChange={(e) => setAddExpiryDate(e.target.value)} />
            <div className="flex flex-col justify-end gap-1">
              <label className="text-xs font-medium text-slate-600">{copy({ en: "File", vi: "Tệp" })}</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>
          </FieldGroup>
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={handleUpload} disabled={!file || uploadDoc.isPending}>
              {uploadDoc.isPending
                ? copy({ en: "Uploading...", vi: "Đang tải lên..." })
                : byType.has(addDocType)
                  ? copy({ en: "Replace document", vi: "Thay thế giấy tờ" })
                  : copy({ en: "Upload document", vi: "Tải lên giấy tờ" })}
            </Button>
            {uploadError ? <span className="text-sm text-red-600">{uploadError}</span> : null}
          </div>
        </>
      ) : null}

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title={copy({ en: "Delete document?", vi: "Xoá tài liệu?" })}
        description={copy({
          en: "This permanently removes the file and its record. This cannot be undone.",
          vi: "Thao tác này sẽ xoá vĩnh viễn tệp và bản ghi. Không thể hoàn tác.",
        })}
        details={deleteTarget ? [{ label: copy({ en: "Type", vi: "Loại" }), value: formatDocumentType(deleteTarget.docType) }] : []}
        warning={deleteError || undefined}
        confirmLabel={copy({ en: "Delete", vi: "Xoá" })}
        cancelLabel={copy({ en: "Cancel", vi: "Hủy" })}
        pendingLabel={copy({ en: "Deleting...", vi: "Đang xoá..." })}
        isPending={deleteDoc.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Panel>
  );
}
