import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  EmptyState,
  Panel,
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openPendingGoogleDocsTab(): Window | null {
  const tab = window.open("about:blank", "_blank");
  if (tab) {
    tab.document.title = "Opening Google Docs";
    tab.document.body.innerHTML = "<p style=\"font-family: sans-serif; padding: 24px;\">Opening Google Docs...</p>";
  }
  return tab;
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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
    setUploadProgress(null);
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
    const docsTab = openPendingGoogleDocsTab();
    openEditSession.mutate(documentId, {
      onSuccess: ({ sessionId, editUrl }) => {
        const session = { documentId, sessionId, editUrl };
        setEditSession(session);
        localStorage.setItem("crm-app-edit-session", JSON.stringify(session));
        if (docsTab) {
          docsTab.location.href = editUrl;
        } else {
          window.open(editUrl, "_blank", "noopener,noreferrer");
        }
      },
      onError: (err: unknown) => {
        docsTab?.close();
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
        clearEditSession();
        setConfirmUnlink(false);
        setUploadFile(null);
        setUploadProgress(null);
        setLastUploadedDocumentId(null);
        registerQuery.refetch();
      },
    });
  }

  const ext = fileExtension(selectedRow?.fileUrl);
  const isWord = ext === ".docx" || ext === ".doc";
  const hasActiveEditSession = editSession?.documentId === selectedRow?.documentId;
  const isUploadingForm = uploadFormStandard.isPending;
  const visibleUploadProgress = uploadProgress ?? (isUploadingForm ? 8 : 0);
  const uploadFileExtension = uploadFile?.name.includes(".")
    ? uploadFile.name.slice(uploadFile.name.lastIndexOf(".") + 1).toUpperCase()
    : copy({ en: "File", vi: "File" });
  const selectedRowMeta = selectedRow
    ? [
      selectedRow.lead.phone ?? copy({ en: "No phone", vi: "Chưa có SĐT" }),
      selectedRow.candidate?.code,
      selectedRow.order?.name,
    ].filter(Boolean).join(" · ")
    : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <Button
              variant="secondary"
              onClick={() => navigate("/applications")}
              className="shrink-0"
            >
              ← {copy({ en: "Back to list", vi: "Quay lại danh sách" })}
            </Button>
            <div className="min-w-0 flex-1 sm:max-w-xl">
              <LeadPicker
                label={copy({ en: "Select candidate", vi: "Chọn ứng viên" })}
                placeholder={copy({
                  en: "Search name, phone, or lead ID",
                  vi: "Tìm tên, SĐT hoặc mã lead",
                })}
                value={selectedLeadId}
                onChange={handleLeadChange}
              />
            </div>
          </div>
          {selectedRow ? (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Badge tone={toneForDocStatus(selectedRow.documentStatus)}>
                {formatDocumentStatus(selectedRow.documentStatus)}
              </Badge>
              {selectedRow.hasFile
                ? <Badge tone="success">{copy({ en: "File uploaded", vi: "Có file" })}</Badge>
                : <Badge tone="warning">{copy({ en: "No file", vi: "Chưa có file" })}</Badge>}
            </div>
          ) : null}
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
            title={selectedRow ? leadLabel(selectedRow) : copy({ en: "Application file", vi: "Hồ sơ ứng tuyển" })}
            subtitle={selectedRowMeta}
          >
            {selectedRow ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {copy({ en: "Form data", vi: "Dữ liệu hồ sơ" })}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {hasActiveEditSession
                          ? copy({
                            en: "Save and close the Google Docs edit session before matching.",
                            vi: "Lưu và đóng phiên chỉnh sửa Google Docs trước khi đối chiếu.",
                          })
                          : copy({
                            en: "Extract data from the uploaded form for review.",
                            vi: "Trích xuất dữ liệu từ hồ sơ đã tải lên để rà soát.",
                          })}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={hasActiveEditSession}
                      onClick={() => navigate(`/applications/match/${selectedRow.documentId}`)}
                      className="w-full sm:w-auto"
                    >
                      {copy({ en: "Match to lead profile →", vi: "Đối chiếu hồ sơ →" })}
                    </Button>
                  </div>
                </div>

                {lastUploadedDocumentId ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <div className="font-medium">
                      {copy({ en: "Form uploaded successfully.", vi: "Tải hồ sơ lên thành công." })}
                    </div>
                    <div className="mt-1 text-xs text-emerald-700">
                      {copy({
                        en: "Use Match to lead profile above to review the extracted data.",
                        vi: "Dùng nút Đối chiếu với hồ sơ ứng viên ở trên để xem dữ liệu trích xuất.",
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Edit session banner */}
                {hasActiveEditSession ? (
                  <EditSessionBanner
                    session={editSession}
                    onExpired={clearEditSession}
                    onClosed={() => {
                      clearEditSession();
                      registerQuery.refetch();
                    }}
                  />
                ) : null}

                {/* Current file actions */}
                {selectedRow.hasFile ? (
                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {copy({ en: "Current file", vi: "File hiện tại" })}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {isWord
                          ? copy({ en: "Preview, edit in Docs, or download.", vi: "Xem, chỉnh sửa trong Docs hoặc tải xuống." })
                          : copy({ en: "Preview or download.", vi: "Xem hoặc tải xuống." })}
                      </div>
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
                          disabled={openEditSession.isPending || hasActiveEditSession}
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
              subtitle={copy({
                en: "PDF, DOC, and DOCX are supported. DOC files are normalized before saving.",
                vi: "Hỗ trợ PDF, DOC và DOCX. File DOC sẽ được chuẩn hoá trước khi lưu.",
              })}
            >
              <div className="space-y-4">
                <label
                  className={[
                    "block cursor-pointer rounded-2xl border border-dashed px-4 py-5 transition",
                    uploadFile
                      ? "border-indigo-200 bg-indigo-50/60"
                      : "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40",
                    isUploadingForm ? "cursor-not-allowed opacity-70" : "",
                  ].join(" ")}
                >
                  <input
                    type="file"
                    accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                    disabled={isUploadingForm}
                    onChange={(e) => {
                      setUploadFile(e.target.files?.[0] ?? null);
                      setUploadProgress(null);
                      setFileActionError("");
                    }}
                    className="sr-only"
                  />
                  <span className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                      ↑
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {uploadFile
                          ? copy({ en: "File ready to upload", vi: "File đã sẵn sàng tải lên" })
                          : copy({ en: "Choose application file", vi: "Chọn hồ sơ ứng tuyển" })}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {uploadFile
                          ? copy({ en: "Review the file below, then upload.", vi: "Kiểm tra file bên dưới rồi tải lên." })
                          : copy({ en: "PDF, DOC, or DOCX up to the configured server limit.", vi: "PDF, DOC hoặc DOCX theo giới hạn máy chủ." })}
                      </span>
                    </span>
                  </span>
                </label>

                {uploadFile ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{uploadFile.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                            {uploadFileExtension}
                          </span>
                          <span>{formatFileSize(uploadFile.size)}</span>
                        </div>
                      </div>
                      {!isUploadingForm ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUploadFile(null);
                            setUploadProgress(null);
                          }}
                          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          {copy({ en: "Remove", vi: "Bỏ chọn" })}
                        </button>
                      ) : null}
                    </div>

                    {isUploadingForm ? (
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-indigo-700">
                            {copy({ en: "Uploading and processing...", vi: "Đang tải lên và xử lý..." })}
                          </span>
                          <span className="font-semibold text-slate-600">{visibleUploadProgress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${visibleUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <Button
                  className="w-full"
                  onClick={() => {
                    if (!uploadFile) return;
                    setUploadProgress(0);
                    setFileActionError("");
                    uploadFormStandard.mutate(
                      {
                        leadId: selectedLeadId,
                        candidateId: resolvedCandidateId,
                        status: "verified",
                        file: uploadFile,
                        onUploadProgress: setUploadProgress,
                      },
                      {
                        onSuccess: (result) => {
                          setUploadProgress(100);
                          setUploadFile(null);
                          setLastUploadedDocumentId((result as any)?.id ?? selectedRow?.documentId ?? null);
                          registerQuery.refetch();
                        },
                        onError: () => setUploadProgress(null),
                        onSettled: () => {
                          window.setTimeout(() => setUploadProgress(null), 400);
                        },
                      },
                    );
                  }}
                  disabled={isUploadingForm || !uploadFile}
                >
                  {isUploadingForm
                    ? copy({ en: "Uploading...", vi: "Đang tải lên..." })
                    : copy({ en: selectedRow?.hasFile ? "Replace file" : "Upload file", vi: selectedRow?.hasFile ? "Thay thế file" : "Tải file lên" })}
                </Button>
              </div>
            </Panel>
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
                    {copy({ en: "Remove file", vi: "Xoá file" })}
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
