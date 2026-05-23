import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  SectionHeader,
} from "@social-crm/ui";
import {
  apiClient,
  useCandidateByLeadQuery,
  useFormStandardRegisterQuery,
  useUnlinkFormStandardMutation,
  useUploadFormStandardDocumentMutation,
  useOpenEditSessionMutation,
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import type { FormStandardRegisterRow } from "@social-crm/api";
import { LeadPicker } from "@/components/lead-picker";
import { EditSessionBanner } from "@/components/edit-session-banner";

/** Derive the lower-cased file extension from a storage key. */
function fileExtension(fileUrl?: string | null): string {
  if (!fileUrl) return "";
  const lastDot = fileUrl.lastIndexOf(".");
  return lastDot >= 0 ? fileUrl.slice(lastDot).toLowerCase() : "";
}

function toneForDocStatus(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "submitted") return "warning" as const;
  return "neutral" as const;
}

function leadLabel(row: FormStandardRegisterRow) {
  return row.lead.fullName || row.lead.displayName || row.lead.phone || row.lead.id;
}

function apiErrorMessage(err: unknown): string | null {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : null;
}

function isWordFilename(filename: string): boolean {
  return /\.(doc|docx)$/i.test(filename);
}

function googleViewerUrl(url: string): string {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
}

export function ApplicationDetailPage() {
  const { copy, formatDocumentStatus } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const leadIdFromUrl = searchParams.get("leadId") ?? "";
  const [selectedLeadId, setSelectedLeadId] = useState(leadIdFromUrl);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileActionError, setFileActionError] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [lastUploadedDocumentId, setLastUploadedDocumentId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<{
    documentId: string; sessionId: string; editUrl: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem("crm-app-edit-session");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const openEditSession = useOpenEditSessionMutation();
  const uploadFormStandard = useUploadFormStandardDocumentMutation();
  const unlinkFormStandard = useUnlinkFormStandardMutation();

  const candidateByLeadQuery = useCandidateByLeadQuery(selectedLeadId || undefined);
  const resolvedCandidateId = candidateByLeadQuery.data?.id;

  // Load a broad register page to find this lead's row by ID.
  // The register is typically small; 500 covers most realistic datasets.
  const registerQuery = useFormStandardRegisterQuery(
    { offset: 0, limit: 500 },
    { enabled: Boolean(selectedLeadId) },
  );
  const selectedRow = (registerQuery.data?.data ?? []).find(
    (r) => r.lead.id === selectedLeadId,
  ) ?? null;

  function handleLeadChange(id: string) {
    setSelectedLeadId(id);
    setUploadFile(null);
    setFileActionError("");
    setConfirmUnlink(false);
    if (id) {
      setSearchParams({ leadId: id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  async function openFile(documentId: string, mode: "preview" | "download") {
    setFileActionError("");
    try {
      const { url, filename, isObjectUrl } = await apiClient.getDocumentUrl(documentId, mode === "download");
      if (mode === "download") {
        if (isObjectUrl) {
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        return;
      }
      window.open(!isObjectUrl && isWordFilename(filename) ? googleViewerUrl(url) : url, "_blank", "noopener,noreferrer");
      if (isObjectUrl) window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = status ? ` (HTTP ${status})` : "";
      console.error("[openFile] error:", err);
      setFileActionError(
        copy({ en: `Could not open this file${detail}.`, vi: `Không mở được file này${detail}.` }),
      );
    }
  }

  function openGoogleEdit(documentId: string) {
    setFileActionError("");
    openEditSession.mutate(documentId, {
      onSuccess: ({ sessionId, editUrl }) => {
        const session = { documentId, sessionId, editUrl };
        setEditSession(session);
        localStorage.setItem("crm-app-edit-session", JSON.stringify(session));
        window.open(editUrl, "_blank", "noopener,noreferrer");
      },
      onError: (err: unknown) => {
        setFileActionError(
          apiErrorMessage(err)
          ?? copy({ en: "Could not open Google Docs. Check Drive configuration.", vi: "Không mở được Google Docs. Kiểm tra cấu hình Drive." }),
        );
      },
    });
  }

  function clearEditSession() {
    setEditSession(null);
    localStorage.removeItem("crm-app-edit-session");
  }

  function handleUnlink() {
    if (!selectedLeadId) return;
    setFileActionError("");
    unlinkFormStandard.mutate(selectedLeadId, {
      onSuccess: () => {
        setConfirmUnlink(false);
        setUploadFile(null);
        registerQuery.refetch();
      },
    });
  }

  const ext = fileExtension(selectedRow?.fileUrl);
  const isWord = ext === ".docx" || ext === ".doc";

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Applications", vi: "Hồ sơ ứng tuyển" })}
        title={copy({ en: "Application file detail", vi: "Chi tiết hồ sơ ứng tuyển" })}
        description={copy({
          en: "Search for a candidate to view, upload, download, or remove their application file.",
          vi: "Tìm ứng viên để xem, tải lên, tải xuống hoặc xoá hồ sơ ứng tuyển.",
        })}
      />

      {/* Back + lead picker */}
      <div className="flex items-end gap-4">
        <button
          type="button"
          onClick={() => navigate("/applications")}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          ← {copy({ en: "Back to list", vi: "Quay lại danh sách" })}
        </button>
        <div className="flex-1 max-w-sm">
          <LeadPicker
            label={copy({ en: "Select candidate", vi: "Chọn ứng viên" })}
            value={selectedLeadId}
            onChange={handleLeadChange}
          />
        </div>
      </div>

      {!selectedLeadId ? (
        <Panel title={copy({ en: "No candidate selected", vi: "Chưa chọn ứng viên" })}>
          <EmptyState
            title={copy({ en: "Search for a candidate above", vi: "Tìm ứng viên ở trên" })}
            description={copy({
              en: "Type a name or phone number to find a candidate and manage their application file.",
              vi: "Nhập tên hoặc số điện thoại để tìm ứng viên và quản lý hồ sơ ứng tuyển.",
            })}
          />
        </Panel>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Left: candidate info + file actions */}
          <Panel
            title={copy({ en: "Application file", vi: "Hồ sơ ứng tuyển" })}
            subtitle={selectedRow ? leadLabel(selectedRow) : undefined}
          >
            {selectedRow ? (
              <div className="space-y-5">
                {/* Candidate summary */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-900">{leadLabel(selectedRow)}</div>
                  <div className="mt-1 text-slate-500">
                    {selectedRow.lead.phone ?? copy({ en: "No phone", vi: "Chưa có SĐT" })}
                    {selectedRow.candidate?.code ? ` · ${selectedRow.candidate.code}` : ""}
                  </div>
                  {selectedRow.order ? (
                    <div className="mt-1 text-slate-500">{selectedRow.order.name}</div>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    <Badge tone={toneForDocStatus(selectedRow.documentStatus)}>
                      {formatDocumentStatus(selectedRow.documentStatus)}
                    </Badge>
                    {selectedRow.hasFile
                      ? <Badge tone="success">{copy({ en: "File uploaded", vi: "Có file" })}</Badge>
                      : <Badge tone="warning">{copy({ en: "No file", vi: "Chưa có file" })}</Badge>}
                  </div>
                </div>

                {/* Match form data to profile */}
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/applications/match/${selectedRow.documentId}`)}
                  >
                    {copy({ en: "Match to lead profile →", vi: "Đối chiếu với hồ sơ ứng viên →" })}
                  </Button>
                  <span className="text-xs text-slate-400">
                    {copy({ en: "Review extracted form data and apply selected fields.", vi: "Xem dữ liệu trích xuất và cập nhật các trường đã chọn." })}
                  </span>
                </div>

                {/* Edit session banner */}
                {editSession?.documentId === selectedRow.documentId ? (
                  <EditSessionBanner
                    session={editSession}
                    onExpired={clearEditSession}
                    onClosed={clearEditSession}
                  />
                ) : null}

                {/* Current file actions */}
                {selectedRow.hasFile ? (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {copy({ en: "Current file", vi: "File hiện tại" })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openFile(selectedRow.documentId, "preview")}
                      >
                        {copy({ en: "View", vi: "Xem" })}
                      </Button>
                      {isWord ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={openEditSession.isPending || editSession?.documentId === selectedRow.documentId}
                          onClick={() => openGoogleEdit(selectedRow.documentId)}
                        >
                          {openEditSession.isPending
                            ? copy({ en: "Opening…", vi: "Đang mở…" })
                            : copy({ en: "Edit in Google Docs", vi: "Chỉnh sửa trong Google Docs" })}
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openFile(selectedRow.documentId, "download")}
                      >
                        {copy({ en: "Download", vi: "Tải xuống" })}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {fileActionError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {fileActionError}
                  </div>
                ) : null}
              </div>
            ) : (
              /* Lead selected but no existing record */
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {copy({
                  en: "This candidate has no application file yet. Upload one using the panel on the right.",
                  vi: "Ứng viên này chưa có hồ sơ ứng tuyển. Tải lên bằng bảng bên phải.",
                })}
              </div>
            )}
          </Panel>

          {/* Right: upload + delete */}
          <div className="space-y-6">
            {/* Upload / Replace */}
            <Panel
              title={copy({
                en: selectedRow?.hasFile ? "Replace file" : "Upload file",
                vi: selectedRow?.hasFile ? "Thay thế file" : "Tải file lên",
              })}
            >
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  {copy({ en: "Select file (PDF, DOC, DOCX)", vi: "Chọn file (PDF, DOC, DOCX)" })}
                  <input
                    type="file"
                    accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                    onChange={(e) => { setUploadFile(e.target.files?.[0] ?? null); setFileActionError(""); }}
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
                    setFileActionError("");
                    uploadFormStandard.mutate(
                      {
                        leadId: selectedLeadId,
                        candidateId: resolvedCandidateId,
                        status: "verified",
                        file: uploadFile,
                      },
                      {
                        onSuccess: (result) => {
                          setUploadFile(null);
                          setLastUploadedDocumentId((result as any)?.id ?? selectedRow?.documentId ?? null);
                          registerQuery.refetch();
                        },
                      },
                    );
                  }}
                  disabled={uploadFormStandard.isPending || !uploadFile}
                >
                  {uploadFormStandard.isPending
                    ? copy({ en: "Uploading…", vi: "Đang tải lên…" })
                    : copy({ en: "Upload application file", vi: "Tải hồ sơ ứng tuyển" })}
                </Button>
              </div>
            </Panel>

            {/* Post-upload: prompt operator to match form data */}
            {lastUploadedDocumentId ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
                <div className="font-medium text-indigo-900">
                  {copy({ en: "Form uploaded successfully.", vi: "Tải hồ sơ lên thành công." })}
                </div>
                <div className="mt-1 text-indigo-700">
                  {copy({
                    en: "Would you like to review the extracted data and apply it to this lead's profile?",
                    vi: "Bạn có muốn xem dữ liệu trích xuất và cập nhật vào hồ sơ ứng viên không?",
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/applications/match/${lastUploadedDocumentId}`)}
                  >
                    {copy({ en: "Review & apply form data →", vi: "Xem & cập nhật dữ liệu hồ sơ →" })}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLastUploadedDocumentId(null)}
                  >
                    {copy({ en: "Dismiss", vi: "Bỏ qua" })}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Delete */}
            {selectedRow?.hasFile ? (
              <Panel title={copy({ en: "Danger zone", vi: "Vùng nguy hiểm" })}>
                {confirmUnlink ? (
                  <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <p className="text-sm text-rose-800">
                      {copy({
                        en: "This will permanently delete the uploaded file and remove the application record. This cannot be undone.",
                        vi: "Thao tác này sẽ xoá vĩnh viễn file đã tải lên và huỷ hồ sơ ứng tuyển. Không thể hoàn tác.",
                      })}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleUnlink}
                        disabled={unlinkFormStandard.isPending}
                      >
                        {unlinkFormStandard.isPending
                          ? copy({ en: "Removing…", vi: "Đang xoá…" })
                          : copy({ en: "Yes, remove", vi: "Xác nhận xoá" })}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmUnlink(false)}
                        disabled={unlinkFormStandard.isPending}
                      >
                        {copy({ en: "Cancel", vi: "Huỷ" })}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => { setConfirmUnlink(true); setFileActionError(""); }}
                  >
                    {copy({ en: "Remove application file", vi: "Xoá hồ sơ ứng tuyển" })}
                  </Button>
                )}
              </Panel>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
