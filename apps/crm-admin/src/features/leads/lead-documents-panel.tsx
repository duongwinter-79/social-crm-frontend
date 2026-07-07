import { useState } from "react";
import { Badge, Button, Input, Panel } from "@social-crm/ui";
import {
  useCreateDocumentMutation,
  useDeleteLeadDocumentMutation,
  useDocumentsQuery,
  useUpdateDocumentMutation,
  usePermissions,
  type DocumentRecord,
} from "@social-crm/api";
import { useI18n } from "../../i18n";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

// Kept in sync manually with LEAD_DOCUMENT_TYPES / REQUIRED_DOCUMENT_TYPES in
// the backend's document-rules.ts. work_permit can be tracked here but is not
// required — it's obtained after departure, so it never blocks the
// VISA_PROCESSING -> DEPARTED gate.
const LEAD_DOC_TYPES = ["passport", "criminal_record", "criminal_record_2", "health_check", "diploma", "work_permit"] as const;
const LEAD_DOC_REQUIRED = new Set<string>(["passport", "criminal_record", "criminal_record_2", "health_check", "diploma"]);

function isDocExpired(doc: DocumentRecord | undefined): boolean {
  if (!doc?.expiryDate) return false;
  return new Date(doc.expiryDate).getTime() < Date.now();
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}

/**
 * Per-lead document checklist. Operators mark each paper as prepared (no
 * file upload — the physical/scanned documents live outside the CRM) and
 * record its issue and expiry dates. Marking creates a file-less document
 * record with status "verified" so the existing pipeline gates, which count
 * verified required documents, keep working unchanged.
 */
export function LeadDocumentsPanel(props: { leadId: string }) {
  const { copy, formatDocumentType, formatDocumentStatus } = useI18n();
  const { canManageDocuments } = usePermissions();
  const docsQuery = useDocumentsQuery({ leadId: props.leadId, offset: 0, limit: 50 });
  const createDoc = useCreateDocumentMutation();
  const updateDoc = useUpdateDocumentMutation();
  const deleteDoc = useDeleteLeadDocumentMutation();

  // docType currently showing the inline date editor (create or edit mode).
  const [editorFor, setEditorFor] = useState<string | null>(null);
  const [editorIssueDate, setEditorIssueDate] = useState("");
  const [editorExpiryDate, setEditorExpiryDate] = useState("");
  const [editorError, setEditorError] = useState("");
  const [uncheckTarget, setUncheckTarget] = useState<DocumentRecord | null>(null);
  const [uncheckError, setUncheckError] = useState("");

  // Documents come back ordered updatedAt DESC (see findAll) — the first row
  // per docType is always the current one (backend enforces one per type).
  const docs: DocumentRecord[] = docsQuery.data?.data ?? [];
  const byType = new Map<string, DocumentRecord>();
  for (const doc of docs) {
    if (!byType.has(doc.docType)) byType.set(doc.docType, doc);
  }

  const requiredDone = [...LEAD_DOC_REQUIRED].filter((t) => byType.has(t)).length;
  const requiredTotal = LEAD_DOC_REQUIRED.size;
  const progressPct = Math.round((requiredDone / requiredTotal) * 100);
  const allDone = requiredDone === requiredTotal;
  const isSaving = createDoc.isPending || updateDoc.isPending;

  function openEditor(docType: string, doc?: DocumentRecord) {
    setEditorError("");
    setEditorFor(docType);
    setEditorIssueDate(doc?.issueDate ?? new Date().toISOString().slice(0, 10));
    setEditorExpiryDate(doc?.expiryDate ?? "");
  }

  function closeEditor() {
    setEditorFor(null);
    setEditorError("");
  }

  function handleSave(docType: string, doc: DocumentRecord | undefined) {
    if (!canManageDocuments) return;
    setEditorError("");
    const onError = (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditorError(message ?? copy({ en: "Saving failed.", vi: "Lưu thất bại." }));
    };
    if (doc) {
      updateDoc.mutate(
        { id: doc.id, patch: { issueDate: editorIssueDate || null, expiryDate: editorExpiryDate || null } },
        { onSuccess: closeEditor, onError },
      );
    } else {
      createDoc.mutate(
        {
          leadId: props.leadId,
          docType,
          // Checklist semantics: marking means the paper exists and is good —
          // create as "verified" so required-document gates count it.
          status: "verified",
          issueDate: editorIssueDate || undefined,
          expiryDate: editorExpiryDate || undefined,
        },
        { onSuccess: closeEditor, onError },
      );
    }
  }

  function handleConfirmUncheck() {
    if (!uncheckTarget) return;
    setUncheckError("");
    deleteDoc.mutate(
      { id: uncheckTarget.id, leadId: props.leadId },
      {
        onSuccess: () => setUncheckTarget(null),
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setUncheckError(message ?? copy({ en: "Could not unmark.", vi: "Không bỏ đánh dấu được." }));
        },
      },
    );
  }

  return (
    <Panel
      title={copy({ en: "Document checklist", vi: "Danh sách giấy tờ" })}
      subtitle={copy({
        en: "Tick each paper once it has been prepared for this lead, and track its issue and expiry dates.",
        vi: "Đánh dấu từng giấy tờ đã làm xong cho ứng viên và theo dõi ngày tạo, ngày hết hạn.",
      })}
      action={
        <Badge tone={allDone ? "success" : "warning"}>
          {copy({
            en: `${requiredDone}/${requiredTotal} required done`,
            vi: `Hoàn thành ${requiredDone}/${requiredTotal} bắt buộc`,
          })}
        </Badge>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-emerald-500" : "bg-indigo-500"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums text-slate-500">{progressPct}%</span>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
        {LEAD_DOC_TYPES.map((docType) => {
          const doc = byType.get(docType);
          const required = LEAD_DOC_REQUIRED.has(docType);
          const done = Boolean(doc);
          const expired = isDocExpired(doc);
          const isEditing = editorFor === docType;
          return (
            <li key={docType} className={`px-4 py-3 transition-colors ${done ? "bg-emerald-50/40" : "bg-white"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!canManageDocuments) return;
                    if (doc) {
                      setUncheckError("");
                      setUncheckTarget(doc);
                    } else {
                      openEditor(docType);
                    }
                  }}
                  disabled={!canManageDocuments || deleteDoc.isPending}
                  aria-label={
                    done
                      ? copy({ en: `Unmark ${formatDocumentType(docType)}`, vi: `Bỏ đánh dấu ${formatDocumentType(docType)}` })
                      : copy({ en: `Mark ${formatDocumentType(docType)} as created`, vi: `Đánh dấu đã tạo ${formatDocumentType(docType)}` })
                  }
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white hover:border-emerald-400 hover:bg-emerald-400"
                      : "border-slate-300 bg-white text-transparent hover:border-indigo-400"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {done ? <CheckIcon /> : null}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{formatDocumentType(docType)}</span>
                    <Badge tone={required ? "neutral" : "accent"}>
                      {required ? copy({ en: "Required", vi: "Bắt buộc" }) : copy({ en: "Optional", vi: "Tùy chọn" })}
                    </Badge>
                    {expired ? <Badge tone="danger">{copy({ en: "Expired", vi: "Hết hạn" })}</Badge> : null}
                    {doc && !expired && doc.status === "rejected" ? (
                      <Badge tone="danger">{formatDocumentStatus(doc.status)}</Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {doc ? (
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>
                          {copy({ en: "Created", vi: "Ngày tạo" })}:{" "}
                          <span className="font-medium text-slate-700">{doc.issueDate ?? "—"}</span>
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className={expired ? "font-semibold text-rose-600" : ""}>
                          {copy({ en: "Expires", vi: "Hết hạn" })}:{" "}
                          <span className={expired ? "" : "font-medium text-slate-700"}>{doc.expiryDate ?? "—"}</span>
                        </span>
                      </span>
                    ) : (
                      copy({ en: "Not marked yet — tick the circle once this paper is done.", vi: "Chưa đánh dấu — tích vào ô tròn khi đã làm xong giấy tờ này." })
                    )}
                  </div>
                </div>

                {doc && canManageDocuments && !isEditing ? (
                  <Button variant="ghost" size="sm" onClick={() => openEditor(docType, doc)}>
                    {copy({ en: "Edit dates", vi: "Sửa ngày" })}
                  </Button>
                ) : null}
              </div>

              {isEditing ? (
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label={copy({ en: "Issue date", vi: "Ngày tạo" })}
                      type="date"
                      value={editorIssueDate}
                      onChange={(e) => setEditorIssueDate(e.target.value)}
                    />
                    <Input
                      label={copy({ en: "Expiry date", vi: "Ngày hết hạn" })}
                      type="date"
                      value={editorExpiryDate}
                      onChange={(e) => setEditorExpiryDate(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => handleSave(docType, doc)} disabled={isSaving}>
                      {isSaving
                        ? copy({ en: "Saving...", vi: "Đang lưu..." })
                        : doc
                          ? copy({ en: "Save dates", vi: "Lưu ngày" })
                          : copy({ en: "Mark as created", vi: "Xác nhận đã tạo" })}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={closeEditor} disabled={isSaving}>
                      {copy({ en: "Cancel", vi: "Hủy" })}
                    </Button>
                    {editorError ? <span className="text-sm text-red-600">{editorError}</span> : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!canManageDocuments ? (
        <p className="mt-3 text-xs italic text-slate-500">
          {copy({ en: "Read-only — requires edit_leads permission to update the checklist.", vi: "Chỉ xem — cần quyền edit_leads để cập nhật danh sách." })}
        </p>
      ) : null}

      <ConfirmationDialog
        open={Boolean(uncheckTarget)}
        title={copy({ en: "Unmark this document?", vi: "Bỏ đánh dấu giấy tờ này?" })}
        description={copy({
          en: "This removes the record and its dates from the checklist. You can mark it again later.",
          vi: "Thao tác này xoá bản ghi và các ngày khỏi danh sách. Bạn có thể đánh dấu lại sau.",
        })}
        details={uncheckTarget ? [{ label: copy({ en: "Type", vi: "Loại" }), value: formatDocumentType(uncheckTarget.docType) }] : []}
        warning={uncheckError || undefined}
        confirmLabel={copy({ en: "Unmark", vi: "Bỏ đánh dấu" })}
        cancelLabel={copy({ en: "Cancel", vi: "Hủy" })}
        pendingLabel={copy({ en: "Removing...", vi: "Đang xoá..." })}
        isPending={deleteDoc.isPending}
        onConfirm={handleConfirmUncheck}
        onCancel={() => setUncheckTarget(null)}
      />
    </Panel>
  );
}
