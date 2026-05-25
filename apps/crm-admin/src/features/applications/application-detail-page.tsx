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
  useAnalyzeFormStandardMutation,
  useCommitFormStandardPendingMutation,
  useRematchFormStandardPendingMutation,
  useCancelFormStandardPendingMutation,
  useCreateLeadMutation,
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import type {
  FormStandardRegisterRow,
  FormStandardAnalyzeResult,
  FormStandardLeadSuggestion,
  FormStandardExtractedFields,
  LeadAcquisitionSource,
} from "@social-crm/api";
import { LeadPicker } from "@/components/lead-picker";
import { EditSessionBanner } from "@/components/edit-session-banner";

/**
 * Unified application file management screen.
 *
 * Three states, all on the same route:
 *  - No leadId, no file yet → operator can pick a candidate via LeadPicker
 *    OR drop a form file. Both lead to the same eventual destination.
 *  - No leadId, file analyzed → operator picks one of the suggested existing
 *    leads, or fills the inline Create-New-Lead panel.
 *  - leadId set → existing lead-scoped UI (file actions, edit in Docs,
 *    match-to-lead, danger zone). Same behavior as the original detail page.
 */

const ACQUISITION_SOURCES: { value: LeadAcquisitionSource; en: string; vi: string }[] = [
  { value: "zalo", en: "Zalo", vi: "Zalo" },
  { value: "facebook", en: "Facebook", vi: "Facebook" },
  { value: "tiktok", en: "TikTok", vi: "TikTok" },
  { value: "website", en: "Website", vi: "Website" },
  { value: "gioi_thieu", en: "Referral", vi: "Giới thiệu" },
];

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
  if (typeof message === "string" && message.trim()) return message;
  if (message && typeof message === "object" && "message" in (message as any)) {
    const inner = (message as any).message;
    if (typeof inner === "string" && inner.trim()) return inner;
  }
  return null;
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

  // ── Lead-scoped (existing) state ────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileActionError, setFileActionError] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [lastUploadedDocumentId, setLastUploadedDocumentId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editSession, setEditSession] = useState<{
    documentId: string; sessionId: string; editUrl: string; driveFileId?: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem("crm-app-edit-session");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  // ── Leadless analyze-and-pick state ─────────────────────────────────────
  const [analysis, setAnalysis] = useState<FormStandardAnalyzeResult | null>(null);
  const [analyzeFile, setAnalyzeFile] = useState<File | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState<number | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [newLeadFullName, setNewLeadFullName] = useState("");
  const [newLeadDisplayName, setNewLeadDisplayName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadAcquisitionSource, setNewLeadAcquisitionSource] = useState<LeadAcquisitionSource>("zalo");

  // ── Mutations ───────────────────────────────────────────────────────────
  const openEditSession = useOpenEditSessionMutation();
  const uploadFormStandard = useUploadFormStandardDocumentMutation();
  const unlinkFormStandard = useUnlinkFormStandardMutation();
  const analyzeMutation = useAnalyzeFormStandardMutation();
  const commitMutation = useCommitFormStandardPendingMutation();
  const rematchMutation = useRematchFormStandardPendingMutation();
  const cancelMutation = useCancelFormStandardPendingMutation();
  const createLeadMutation = useCreateLeadMutation();

  const candidateByLeadQuery = useCandidateByLeadQuery(selectedLeadId || undefined);
  const resolvedCandidateId = candidateByLeadQuery.data?.id;

  // Load a broad register page to find this lead's row by ID.
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
    // Picking a lead supersedes any in-flight analyze flow.
    resetAnalyzeState();
    if (id) {
      setSearchParams({ leadId: id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  function resetAnalyzeState() {
    setAnalysis(null);
    setAnalyzeFile(null);
    setAnalyzeProgress(null);
    setAnalyzeError("");
    setManualPhone("");
    setManualName("");
    setNewLeadFullName("");
    setNewLeadDisplayName("");
    setNewLeadPhone("");
    setNewLeadAcquisitionSource("zalo");
  }

  function applyExtractedToNewLead(extracted: FormStandardExtractedFields | null) {
    setNewLeadFullName(extracted?.name ?? "");
    setNewLeadDisplayName(extracted?.name ?? "");
    setNewLeadPhone(extracted?.phone ?? "");
  }

  // ── Lead-scoped actions (existing behavior) ─────────────────────────────

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
      onSuccess: ({ sessionId, editUrl, driveFileId }) => {
        const session = { documentId, sessionId, editUrl, driveFileId };
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

  // ── Leadless analyze + commit actions ───────────────────────────────────

  function handleAnalyze() {
    if (!analyzeFile) return;
    setAnalyzeError("");
    setAnalyzeProgress(0);
    analyzeMutation.mutate(
      { file: analyzeFile, onUploadProgress: setAnalyzeProgress },
      {
        onSuccess: (result) => {
          setAnalyzeProgress(100);
          setAnalysis(result);
          applyExtractedToNewLead(result.extracted);
          if (result.extracted?.phone) setManualPhone(result.extracted.phone);
          if (result.extracted?.name) setManualName(result.extracted.name);
          window.setTimeout(() => setAnalyzeProgress(null), 400);
        },
        onError: (err: unknown) => {
          setAnalyzeProgress(null);
          setAnalyzeError(
            apiErrorMessage(err)
            ?? copy({ en: "Could not analyze the file. Try again.", vi: "Không phân tích được file. Hãy thử lại." }),
          );
        },
      },
    );
  }

  function handleUseLead(lead: FormStandardLeadSuggestion) {
    if (!analysis) return;
    setAnalyzeError("");
    commitMutation.mutate(
      { pendingId: analysis.pendingId, payload: { leadId: lead.id, status: "verified" } },
      {
        onSuccess: () => {
          resetAnalyzeState();
          setSelectedLeadId(lead.id);
          setSearchParams({ leadId: lead.id }, { replace: true });
        },
        onError: (err: unknown) => {
          setAnalyzeError(
            apiErrorMessage(err)
            ?? copy({ en: "Could not link the form to this lead.", vi: "Không thể gắn hồ sơ với ứng viên này." }),
          );
        },
      },
    );
  }

  function handleCreateAndCommit() {
    if (!analysis) return;
    if (!newLeadFullName.trim() && !newLeadDisplayName.trim() && !newLeadPhone.trim()) {
      setAnalyzeError(copy({
        en: "Enter at least a name, display name, or phone before creating a lead.",
        vi: "Hãy nhập ít nhất họ tên, tên hiển thị hoặc số điện thoại trước khi tạo ứng viên.",
      }));
      return;
    }
    setAnalyzeError("");
    const channelSource = newLeadAcquisitionSource === "facebook" ? "facebook" : "zalo";

    createLeadMutation.mutate(
      {
        fullName: newLeadFullName.trim() || undefined,
        displayName: newLeadDisplayName.trim() || undefined,
        phone: newLeadPhone.trim() || undefined,
        source: channelSource,
        leadSource: newLeadAcquisitionSource,
      },
      {
        onSuccess: (createdLead) => {
          commitMutation.mutate(
            { pendingId: analysis.pendingId, payload: { leadId: createdLead.id, status: "verified" } },
            {
              onSuccess: () => {
                resetAnalyzeState();
                setSelectedLeadId(createdLead.id);
                setSearchParams({ leadId: createdLead.id }, { replace: true });
              },
              onError: (err: unknown) => {
                setAnalyzeError(
                  apiErrorMessage(err)
                  ?? copy({
                    en: "Lead created but form linking failed. Open the lead and re-upload.",
                    vi: "Đã tạo ứng viên nhưng không gắn được hồ sơ. Mở ứng viên và tải lại.",
                  }),
                );
              },
            },
          );
        },
        onError: (err: unknown) => {
          setAnalyzeError(
            apiErrorMessage(err)
            ?? copy({ en: "Could not create the lead.", vi: "Không tạo được ứng viên." }),
          );
        },
      },
    );
  }

  function handleRematch() {
    if (!analysis) return;
    setAnalyzeError("");
    rematchMutation.mutate(
      {
        pendingId: analysis.pendingId,
        payload: { phone: manualPhone || undefined, name: manualName || undefined },
      },
      {
        onSuccess: (result) => {
          setAnalysis({ ...analysis, ...result });
        },
        onError: (err: unknown) => {
          setAnalyzeError(
            apiErrorMessage(err)
            ?? copy({ en: "Could not re-run matching.", vi: "Không tìm lại được kết quả." }),
          );
        },
      },
    );
  }

  function handleCancelAnalyze() {
    if (analysis) {
      cancelMutation.mutate(analysis.pendingId);
    }
    resetAnalyzeState();
  }

  // ── Derived view state ──────────────────────────────────────────────────

  const ext = fileExtension(selectedRow?.fileUrl);
  const isWord = ext === ".docx" || ext === ".doc";
  const hasActiveEditSession = editSession?.documentId === selectedRow?.documentId;
  const isUploadingForm = uploadFormStandard.isPending;
  const visibleUploadProgress = uploadProgress ?? (isUploadingForm ? 8 : 0);
  const uploadFileExtension = uploadFile?.name.includes(".")
    ? uploadFile.name.slice(uploadFile.name.lastIndexOf(".") + 1).toUpperCase()
    : copy({ en: "File", vi: "File" });
  const analyzeFileExtension = analyzeFile?.name.includes(".")
    ? analyzeFile.name.slice(analyzeFile.name.lastIndexOf(".") + 1).toUpperCase()
    : copy({ en: "File", vi: "File" });
  const isAnalyzing = analyzeMutation.isPending;
  const isCommitting = commitMutation.isPending || createLeadMutation.isPending;
  const isRematching = rematchMutation.isPending;
  const visibleAnalyzeProgress = analyzeProgress ?? (isAnalyzing ? 8 : 0);
  const selectedRowMeta = selectedRow
    ? [
      selectedRow.lead.phone ?? copy({ en: "No phone", vi: "Chưa có SĐT" }),
      selectedRow.candidate?.code,
      selectedRow.order?.name,
    ].filter(Boolean).join(" · ")
    : undefined;

  return (
    <div className="space-y-6">
      {/* Shared header: Back + LeadPicker + lead-status badges */}
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
          ) : analysis ? (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Badge tone="neutral">
                {copy({ en: "Step 2 — Pick a lead", vi: "Bước 2 — Chọn ứng viên" })}
              </Badge>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── State 3: lead-scoped UI (preserves existing behavior) ─────────────── */}
      {selectedLeadId ? (
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
                          onClick={() => { setUploadFile(null); setUploadProgress(null); }}
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
      ) : analysis ? (
        /* ── State 2: file analyzed, picking the lead ─────────────────────── */
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Panel
            title={copy({ en: "Extracted from the form", vi: "Dữ liệu trích xuất từ hồ sơ" })}
            subtitle={copy({
              en: "Review what we read from the file before picking a lead.",
              vi: "Xem dữ liệu trích xuất trước khi chọn ứng viên.",
            })}
          >
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <ExtractedField label={copy({ en: "Full name", vi: "Họ và tên" })} value={analysis.extracted?.name} />
              <ExtractedField label={copy({ en: "Phone", vi: "Số điện thoại" })} value={analysis.extracted?.phone} />
              <ExtractedField label={copy({ en: "Gender", vi: "Giới tính" })} value={analysis.extracted?.gender} />
              <ExtractedField label={copy({ en: "Birth year", vi: "Năm sinh" })} value={analysis.extracted?.birthYear} />
              <ExtractedField label={copy({ en: "Height (cm)", vi: "Chiều cao (cm)" })} value={analysis.extracted?.heightCm} />
              <ExtractedField label={copy({ en: "Weight (kg)", vi: "Cân nặng (kg)" })} value={analysis.extracted?.weightKg} />
              <ExtractedField label={copy({ en: "Experience field", vi: "Ngành nghề kinh nghiệm" })} value={analysis.extracted?.experienceField} />
              <ExtractedField label={copy({ en: "Desired industry", vi: "Ngành nghề mong muốn" })} value={analysis.extracted?.desiredIndustry} />
              <ExtractedField
                label={copy({ en: "Preferred regions", vi: "Khu vực mong muốn" })}
                value={analysis.extracted?.preferredRegions?.join(", ")}
              />
              <ExtractedField label={copy({ en: "Desired salary", vi: "Mức lương mong muốn" })} value={analysis.extracted?.desiredSalary} />
            </dl>

            <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">
                  {copy({ en: "Override phone for matching", vi: "Ghi đè SĐT để tìm" })}
                </span>
                <input
                  type="text"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder={copy({ en: "e.g. 0901234567", vi: "VD: 0901234567" })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">
                  {copy({ en: "Override name for matching", vi: "Ghi đè tên để tìm" })}
                </span>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder={copy({ en: "Candidate name", vi: "Tên ứng viên" })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleRematch} disabled={isRematching}>
                {isRematching
                  ? copy({ en: "Searching…", vi: "Đang tìm…" })
                  : copy({ en: "Re-run matching", vi: "Tìm lại" })}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCancelAnalyze} disabled={isCommitting}>
                {copy({ en: "Cancel & discard file", vi: "Huỷ và xoá file" })}
              </Button>
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel
              title={copy({ en: "Phone match", vi: "Khớp số điện thoại" })}
              subtitle={
                analysis.phoneMatch
                  ? copy({ en: "We found one lead with this phone.", vi: "Tìm thấy một ứng viên có cùng SĐT." })
                  : copy({ en: "No lead matched the extracted phone.", vi: "Không có ứng viên nào trùng SĐT trích xuất." })
              }
            >
              {analysis.phoneMatch ? (
                <LeadSuggestionRow
                  lead={analysis.phoneMatch}
                  onPick={() => handleUseLead(analysis.phoneMatch!)}
                  disabled={isCommitting}
                />
              ) : (
                <p className="text-sm text-slate-500">
                  {copy({
                    en: "Adjust the phone override above and re-run matching, or use the panels below.",
                    vi: "Sửa SĐT phía trên rồi tìm lại, hoặc dùng các bảng bên dưới.",
                  })}
                </p>
              )}
            </Panel>

            <Panel
              title={copy({ en: "Name matches", vi: "Khớp theo tên" })}
              subtitle={copy({
                en: "Up to 10 candidates whose name resembles the extracted name.",
                vi: "Tối đa 10 ứng viên có tên tương tự.",
              })}
            >
              {analysis.nameMatches.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.nameMatches.map((lead) => (
                    <li key={lead.id}>
                      <LeadSuggestionRow
                        lead={lead}
                        onPick={() => handleUseLead(lead)}
                        disabled={isCommitting}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  {copy({ en: "No name-based matches.", vi: "Không có ứng viên nào trùng tên." })}
                </p>
              )}
            </Panel>

            <Panel
              title={copy({ en: "Create a new lead", vi: "Tạo ứng viên mới" })}
              subtitle={copy({
                en: "If none of the matches above are right, create a new lead and link the form in one step.",
                vi: "Nếu không có ứng viên phù hợp ở trên, tạo ứng viên mới và gắn hồ sơ trong một thao tác.",
              })}
            >
              <div className="space-y-3">
                <FieldInput
                  label={copy({ en: "Full name", vi: "Họ và tên" })}
                  value={newLeadFullName}
                  onChange={setNewLeadFullName}
                />
                <FieldInput
                  label={copy({ en: "Display name", vi: "Tên hiển thị" })}
                  value={newLeadDisplayName}
                  onChange={setNewLeadDisplayName}
                />
                <FieldInput
                  label={copy({ en: "Phone", vi: "Số điện thoại" })}
                  value={newLeadPhone}
                  onChange={setNewLeadPhone}
                />
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">
                    {copy({ en: "Acquisition source", vi: "Nguồn ứng viên" })}
                  </span>
                  <select
                    value={newLeadAcquisitionSource}
                    onChange={(e) => setNewLeadAcquisitionSource(e.target.value as LeadAcquisitionSource)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {ACQUISITION_SOURCES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{copy({ en: opt.en, vi: opt.vi })}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-slate-500">
                    {copy({
                      en: "Where the candidate originally came from. Used for reporting.",
                      vi: "Ứng viên đến từ đâu. Dùng cho báo cáo.",
                    })}
                  </span>
                </label>

                <Button onClick={handleCreateAndCommit} disabled={isCommitting} className="w-full">
                  {isCommitting
                    ? copy({ en: "Creating…", vi: "Đang tạo…" })
                    : copy({ en: "Create lead & link form", vi: "Tạo ứng viên & gắn hồ sơ" })}
                </Button>
              </div>
            </Panel>

            {analyzeError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {analyzeError}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* ── State 1: empty — pick existing lead OR upload to auto-match ──── */
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title={copy({ en: "Pick an existing candidate", vi: "Chọn ứng viên có sẵn" })}
            subtitle={copy({
              en: "Use the search field above to open a candidate's application file directly.",
              vi: "Dùng ô tìm kiếm phía trên để mở hồ sơ ứng tuyển của ứng viên có sẵn.",
            })}
          >
            <EmptyState
              title={copy({ en: "Search for a candidate above", vi: "Tìm ứng viên ở trên" })}
              description={copy({
                en: "Type a name or phone number to find a candidate and manage their application file.",
                vi: "Nhập tên hoặc số điện thoại để tìm ứng viên và quản lý hồ sơ ứng tuyển.",
              })}
            />
          </Panel>

          <Panel
            title={copy({ en: "Or, upload a form to auto-match", vi: "Hoặc tải hồ sơ lên để tự đối chiếu" })}
            subtitle={copy({
              en: "Drop a PDF / DOC / DOCX. We extract the candidate fields and suggest matching leads.",
              vi: "Tải PDF / DOC / DOCX. Hệ thống sẽ trích xuất dữ liệu và gợi ý ứng viên phù hợp.",
            })}
          >
            <div className="space-y-4">
              <label
                className={[
                  "block cursor-pointer rounded-2xl border border-dashed px-4 py-5 transition",
                  analyzeFile
                    ? "border-indigo-200 bg-indigo-50/60"
                    : "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40",
                  isAnalyzing ? "cursor-not-allowed opacity-70" : "",
                ].join(" ")}
              >
                <input
                  type="file"
                  accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                  disabled={isAnalyzing}
                  onChange={(e) => {
                    setAnalyzeFile(e.target.files?.[0] ?? null);
                    setAnalyzeProgress(null);
                    setAnalyzeError("");
                  }}
                  className="sr-only"
                />
                <span className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                    ↑
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {analyzeFile
                        ? copy({ en: "File ready to analyze", vi: "File đã sẵn sàng phân tích" })
                        : copy({ en: "Choose application file", vi: "Chọn hồ sơ ứng tuyển" })}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {analyzeFile
                        ? copy({ en: "Click Analyze to extract candidate data and find matching leads.", vi: "Bấm Phân tích để trích xuất dữ liệu và tìm ứng viên phù hợp." })
                        : copy({ en: "PDF, DOC, or DOCX up to the configured server limit.", vi: "PDF, DOC hoặc DOCX theo giới hạn máy chủ." })}
                    </span>
                  </span>
                </span>
              </label>

              {analyzeFile ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{analyzeFile.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                          {analyzeFileExtension}
                        </span>
                        <span>{formatFileSize(analyzeFile.size)}</span>
                      </div>
                    </div>
                    {!isAnalyzing ? (
                      <button
                        type="button"
                        onClick={() => { setAnalyzeFile(null); setAnalyzeProgress(null); }}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      >
                        {copy({ en: "Remove", vi: "Bỏ chọn" })}
                      </button>
                    ) : null}
                  </div>
                  {isAnalyzing ? (
                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-indigo-700">
                          {copy({ en: "Uploading and extracting…", vi: "Đang tải lên và trích xuất…" })}
                        </span>
                        <span className="font-semibold text-slate-600">{visibleAnalyzeProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${visibleAnalyzeProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <Button onClick={handleAnalyze} disabled={!analyzeFile || isAnalyzing} className="w-full">
                {isAnalyzing
                  ? copy({ en: "Analyzing…", vi: "Đang phân tích…" })
                  : copy({ en: "Analyze form", vi: "Phân tích hồ sơ" })}
              </Button>

              {analyzeError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {analyzeError}
                </div>
              ) : null}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function ExtractedField(props: { label: string; value: string | number | null | undefined }) {
  const v = props.value;
  const display = v === null || v === undefined || v === "" ? "—" : String(v);
  const empty = display === "—";
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{props.label}</dt>
      <dd className={`mt-1 text-sm ${empty ? "text-slate-400" : "text-slate-900"}`}>{display}</dd>
    </div>
  );
}

function LeadSuggestionRow(props: {
  lead: FormStandardLeadSuggestion;
  onPick: () => void;
  disabled?: boolean;
}) {
  const { copy } = useI18n();
  const name = props.lead.fullName || props.lead.displayName || props.lead.phone || props.lead.id;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
        <div className="mt-0.5 text-xs text-slate-500">
          {[
            props.lead.phone ?? copy({ en: "No phone", vi: "Chưa có SĐT" }),
            props.lead.status ?? null,
          ].filter(Boolean).join(" · ")}
        </div>
      </div>
      <Button size="sm" onClick={props.onPick} disabled={props.disabled}>
        {copy({ en: "Use this lead", vi: "Chọn ứng viên này" })}
      </Button>
    </div>
  );
}

function FieldInput(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{props.label}</span>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}
