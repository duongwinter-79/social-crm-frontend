import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Panel,
} from "@social-crm/ui";
import {
  apiClient,
  useFormStandardRegisterQuery,
  useLeadDetailQuery,
  useUnlinkFormStandardMutation,
  useStageFormStandardMutation,
  useOpenPendingEditSessionMutation,
  useClosePendingEditSessionMutation,
  usePendingEditSessionStatusQuery,
  useVerifyPendingMutation,
  useCommitPendingFormMutation,
  useCancelPendingMutation,
  useCreateLeadMutation,
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import type {
  FormStandardRegisterRow,
  FormStandardStageResult,
  VerifyPendingResult,
  FormStandardLeadSuggestion,
  FormStandardExtractedFields,
  LeadAcquisitionSource,
} from "@social-crm/api";
import { LeadPicker } from "@/components/lead-picker";

/**
 * Unified staging-first flow.
 *
 *  EMPTY → STAGED → VERIFIED → COMMITTED
 *    ↑                            │
 *    └─────── Remove ─────────────┘  (leadId preserved)
 *
 * The same component drives all four states; URL holds the (optional) leadId,
 * local state holds the in-flight pendingId / verifyResult. Switching leads
 * via the header LeadPicker keeps the staged file (the pending row is not
 * tied to any lead) so the operator can re-target before committing.
 */

const ACQUISITION_SOURCES: { value: LeadAcquisitionSource; en: string; vi: string }[] = [
  { value: "zalo", en: "Zalo", vi: "Zalo" },
  { value: "facebook", en: "Facebook", vi: "Facebook" },
  { value: "tiktok", en: "TikTok", vi: "TikTok" },
  { value: "website", en: "Website", vi: "Website" },
  { value: "gioi_thieu", en: "Referral", vi: "Giới thiệu" },
];

/**
 * Verify-screen field catalog. Each entry drives one side-by-side row in the
 * comparison view. `group` decides where the value lands in the commit
 * payload: `typed` → top-level dossierFields key; `soft` → nested under
 * dossierFields.softFields.
 *
 * Phone is intentionally NOT here — it's channel identity on Lead, not
 * dossier data. Form upload never writes Lead.phone.
 */
type ChoicePerField = "current" | "form" | "override";

type VerifyFieldDef = {
  key: string;
  group: "typed" | "soft";
  section: "identity" | "physical" | "background" | "family" | "work" | "wishes";
  en: string;
  vi: string;
  /** UI input type for the Override column. */
  input: "text" | "number" | "select-gender" | "select-yes-no";
};

const VERIFY_FIELDS: readonly VerifyFieldDef[] = [
  // ── Identity ─────────────────────────────────────────────────────────
  { key: "name",              group: "typed", section: "identity",   en: "Full name",          vi: "Họ và tên",            input: "text" },
  { key: "dateOfBirth",       group: "typed", section: "identity",   en: "Date of birth",      vi: "Ngày sinh",            input: "text" },
  { key: "birthYear",         group: "typed", section: "identity",   en: "Birth year",         vi: "Năm sinh",             input: "number" },
  { key: "gender",            group: "typed", section: "identity",   en: "Gender",             vi: "Giới tính",            input: "select-gender" },
  // ── Physical ─────────────────────────────────────────────────────────
  { key: "heightCm",          group: "typed", section: "physical",   en: "Height (cm)",        vi: "Chiều cao (cm)",       input: "number" },
  { key: "weightKg",          group: "typed", section: "physical",   en: "Weight (kg)",        vi: "Cân nặng (kg)",        input: "number" },
  { key: "vision",            group: "soft",  section: "physical",   en: "Vision",             vi: "Thị lực",              input: "text" },
  { key: "handedness",        group: "soft",  section: "physical",   en: "Handedness",         vi: "Thuận tay",            input: "text" },
  { key: "tattooNote",        group: "soft",  section: "physical",   en: "Tattoo note",        vi: "Hình xăm",             input: "text" },
  // ── Background ───────────────────────────────────────────────────────
  { key: "hometownProvince",  group: "typed", section: "background", en: "Hometown",           vi: "Hộ khẩu",              input: "text" },
  { key: "address",           group: "typed", section: "background", en: "Address",            vi: "Địa chỉ",              input: "text" },
  { key: "education",         group: "soft",  section: "background", en: "Education",          vi: "Trình độ",             input: "text" },
  // ── Family ───────────────────────────────────────────────────────────
  { key: "maritalStatus",     group: "soft",  section: "family",     en: "Marital status",     vi: "Tình trạng hôn nhân",  input: "text" },
  { key: "spouseName",        group: "soft",  section: "family",     en: "Spouse name",        vi: "Họ tên vợ/chồng",      input: "text" },
  { key: "spouseAge",         group: "soft",  section: "family",     en: "Spouse age",         vi: "Tuổi vợ/chồng",        input: "number" },
  { key: "childrenCount",     group: "soft",  section: "family",     en: "Children count",     vi: "Số con",               input: "number" },
  { key: "childrenAges",      group: "soft",  section: "family",     en: "Children ages",      vi: "Tuổi con",             input: "text" },
  { key: "fatherName",        group: "soft",  section: "family",     en: "Father's name",      vi: "Họ tên bố",            input: "text" },
  { key: "fatherAge",         group: "soft",  section: "family",     en: "Father's age",       vi: "Tuổi bố",              input: "number" },
  { key: "motherName",        group: "soft",  section: "family",     en: "Mother's name",      vi: "Họ tên mẹ",            input: "text" },
  { key: "motherAge",         group: "soft",  section: "family",     en: "Mother's age",       vi: "Tuổi mẹ",              input: "number" },
  { key: "siblingsCount",     group: "soft",  section: "family",     en: "Siblings count",     vi: "Số anh chị em",        input: "number" },
  { key: "birthOrder",        group: "soft",  section: "family",     en: "Birth order",        vi: "Thứ tự sinh",          input: "number" },
  // ── Work ─────────────────────────────────────────────────────────────
  { key: "experienceField",   group: "typed", section: "work",       en: "Experience field",   vi: "Ngành kinh nghiệm",    input: "text" },
  { key: "experienceDetails", group: "typed", section: "work",       en: "Experience details", vi: "Chi tiết kinh nghiệm", input: "text" },
  { key: "experienceYears",   group: "typed", section: "work",       en: "Experience years",   vi: "Số năm KN",            input: "number" },
  { key: "hasBeenToTaiwan",   group: "soft",  section: "work",       en: "Has been to Taiwan", vi: "Đã qua Đài Loan",      input: "select-yes-no" },
  // ── Wishes ───────────────────────────────────────────────────────────
  { key: "desiredIndustry",   group: "typed", section: "wishes",     en: "Desired industry",   vi: "Ngành mong muốn",      input: "text" },
  { key: "desiredSalary",     group: "typed", section: "wishes",     en: "Desired salary",     vi: "Lương mong muốn",      input: "text" },
];

const SECTION_LABELS: Record<VerifyFieldDef["section"], { en: string; vi: string }> = {
  identity:   { en: "Identity",   vi: "Thông tin cơ bản" },
  physical:   { en: "Physical",   vi: "Thể chất" },
  background: { en: "Background", vi: "Hoàn cảnh" },
  family:     { en: "Family",     vi: "Gia đình" },
  work:       { en: "Work",       vi: "Nghề nghiệp" },
  wishes:     { en: "Wishes",     vi: "Nguyện vọng" },
};

const EXTRACTABLE_FIELDS: { key: keyof FormStandardExtractedFields; en: string; vi: string }[] = [
  { key: "name", en: "Full name", vi: "Họ và tên" },
  { key: "phone", en: "Phone", vi: "Số điện thoại" },
  { key: "gender", en: "Gender", vi: "Giới tính" },
  { key: "birthYear", en: "Birth year", vi: "Năm sinh" },
  { key: "heightCm", en: "Height (cm)", vi: "Chiều cao (cm)" },
  { key: "weightKg", en: "Weight (kg)", vi: "Cân nặng (kg)" },
  { key: "experienceField", en: "Experience field", vi: "Ngành nghề kinh nghiệm" },
  { key: "desiredIndustry", en: "Desired industry", vi: "Ngành nghề mong muốn" },
  { key: "preferredRegions", en: "Preferred regions", vi: "Khu vực mong muốn" },
  { key: "desiredSalary", en: "Desired salary", vi: "Mức lương mong muốn" },
];

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

  // Staging session state
  const [pending, setPending] = useState<FormStandardStageResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyPendingResult | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [stageError, setStageError] = useState("");
  const [fileActionError, setFileActionError] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  // Verify-screen UI state — per-field operator choice (current / form /
  // override). `overrides` holds the operator's typed value when choice is
  // "override". Form-wins is the default when the form provides a non-null
  // value; otherwise current-wins.
  const [choices, setChoices] = useState<Record<string, ChoicePerField>>({});
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [newLeadFullName, setNewLeadFullName] = useState("");
  const [newLeadDisplayName, setNewLeadDisplayName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadAcquisitionSource, setNewLeadAcquisitionSource] = useState<LeadAcquisitionSource>("zalo");

  // Mutations / queries
  const unlinkFormStandard = useUnlinkFormStandardMutation();
  const stageMutation = useStageFormStandardMutation();
  const openEditSessionMutation = useOpenPendingEditSessionMutation();
  const closeEditSessionMutation = useClosePendingEditSessionMutation();
  const verifyMutation = useVerifyPendingMutation();
  const commitMutation = useCommitPendingFormMutation();
  const cancelMutation = useCancelPendingMutation();
  const createLeadMutation = useCreateLeadMutation();

  // Poll the staging-time edit session while it's open. Auto-syncs Drive edits back to the staged R2 key.
  const editSessionStatusQuery = usePendingEditSessionStatusQuery(
    pending?.pendingId ?? null,
    { poll: editSessionOpen },
  );

  // When polling reports the session ended (closed in Docs or expired), clear our local flag.
  useEffect(() => {
    if (!editSessionOpen) return;
    if (editSessionStatusQuery.data?.status === "expired" || editSessionStatusQuery.data?.status === "none") {
      setEditSessionOpen(false);
    }
  }, [editSessionOpen, editSessionStatusQuery.data?.status]);

  // Register lookup for the committed-state UI. Skipped when no lead picked.
  const registerQuery = useFormStandardRegisterQuery(
    { offset: 0, limit: 500, leadId: selectedLeadId || undefined },
    { enabled: Boolean(selectedLeadId) },
  );
  const selectedRow = (registerQuery.data?.data ?? []).find(
    (r) => r.lead.id === selectedLeadId,
  ) ?? null;

  // Lead detail for the candidate-context panel. Used in the EMPTY/STAGED
  // states where selectedRow is null (no committed FORM_STANDARD doc yet) but
  // we still want to show the picked lead's name instead of a raw UUID.
  const leadDetailQuery = useLeadDetailQuery(selectedLeadId || undefined);
  const pickedLead = leadDetailQuery.data;

  // Page-state derivation. Order matters: VERIFIED > STAGED > COMMITTED > EMPTY.
  type PageState = "EMPTY" | "STAGED" | "VERIFIED" | "COMMITTED";
  const pageState: PageState = useMemo(() => {
    if (pending && verifyResult) return "VERIFIED";
    if (pending) return "STAGED";
    if (selectedLeadId && selectedRow?.hasFile) return "COMMITTED";
    return "EMPTY";
  }, [pending, verifyResult, selectedLeadId, selectedRow?.hasFile]);

  function handleLeadChange(id: string) {
    // Switching leads keeps the staged file (pending row isn't tied to a lead).
    setSelectedLeadId(id);
    setConfirmUnlink(false);
    setFileActionError("");
    if (id) setSearchParams({ leadId: id }, { replace: true });
    else setSearchParams({}, { replace: true });
  }

  // ── Lead-scoped (COMMITTED state) actions ───────────────────────────────

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

  function handleUnlink() {
    if (!selectedLeadId) return;
    setFileActionError("");
    unlinkFormStandard.mutate(selectedLeadId, {
      onSuccess: () => {
        setConfirmUnlink(false);
        registerQuery.refetch();
      },
      onError: (err) => {
        setFileActionError(apiErrorMessage(err) ?? copy({
          en: "Could not remove this file.",
          vi: "Không xoá được file này.",
        }));
      },
    });
  }

  // ── Staging actions ─────────────────────────────────────────────────────

  function resetStagingState() {
    setPending(null);
    setVerifyResult(null);
    setUploadFile(null);
    setUploadProgress(null);
    setEditSessionOpen(false);
    setStageError("");
    setChoices({});
    setOverrides({});
    setNewLeadFullName("");
    setNewLeadDisplayName("");
    setNewLeadPhone("");
    setNewLeadAcquisitionSource("zalo");
  }

  function handleStageUpload() {
    if (!uploadFile) return;
    setStageError("");
    setUploadProgress(0);
    stageMutation.mutate(
      { file: uploadFile, onUploadProgress: setUploadProgress },
      {
        onSuccess: (result) => {
          setUploadProgress(100);
          setPending(result);
          setUploadFile(null);
          window.setTimeout(() => setUploadProgress(null), 400);
        },
        onError: (err: unknown) => {
          setUploadProgress(null);
          setStageError(
            apiErrorMessage(err)
            ?? copy({ en: "Could not upload the file.", vi: "Không tải lên được file." }),
          );
        },
      },
    );
  }

  async function handlePreviewStaged() {
    if (!pending) return;
    setStageError("");
    try {
      const result = await apiClient.getPendingDownloadUrl(pending.pendingId, false);
      if (!result?.url) {
        setStageError(copy({ en: "Could not open preview.", vi: "Không mở được file." }));
        return;
      }
      const opener = isWordFilename(result.filename) ? googleViewerUrl(result.url) : result.url;
      window.open(opener, "_blank", "noopener,noreferrer");
    } catch (err) {
      setStageError(
        apiErrorMessage(err)
        ?? copy({ en: "Could not open preview.", vi: "Không mở được file." }),
      );
    }
  }

  async function handleDownloadStaged() {
    if (!pending) return;
    setStageError("");
    try {
      const result = await apiClient.getPendingDownloadUrl(pending.pendingId, true);
      if (!result?.url) {
        setStageError(copy({ en: "Could not download the file.", vi: "Không tải xuống được file." }));
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setStageError(
        apiErrorMessage(err)
        ?? copy({ en: "Could not download the file.", vi: "Không tải xuống được file." }),
      );
    }
  }

  function handleOpenEditSession() {
    if (!pending) return;
    setStageError("");
    const docsTab = openPendingGoogleDocsTab();
    openEditSessionMutation.mutate(pending.pendingId, {
      onSuccess: (session) => {
        setEditSessionOpen(true);
        if (docsTab) docsTab.location.href = session.editUrl;
        else window.open(session.editUrl, "_blank", "noopener,noreferrer");
      },
      onError: (err: unknown) => {
        docsTab?.close();
        setStageError(
          apiErrorMessage(err)
          ?? copy({ en: "Could not open Google Docs. Check Drive configuration.", vi: "Không mở được Google Docs. Kiểm tra cấu hình Drive." }),
        );
      },
    });
  }

  function handleCloseEditSession() {
    if (!pending) return;
    closeEditSessionMutation.mutate(pending.pendingId, {
      onSuccess: () => setEditSessionOpen(false),
      onError: (err: unknown) => {
        setStageError(
          apiErrorMessage(err)
          ?? copy({ en: "Could not close the edit session.", vi: "Không đóng được phiên chỉnh sửa." }),
        );
      },
    });
  }

  function handleVerify() {
    if (!pending) return;
    setStageError("");
    verifyMutation.mutate(
      { pendingId: pending.pendingId, leadId: selectedLeadId || undefined },
      {
        onSuccess: (result) => {
          setVerifyResult(result);
          // Form-wins default: if the form has a non-null value for a field,
          // pre-select "form"; otherwise pre-select "current". Operator can
          // flip to override per row and type a fresh value.
          const initialChoices: Record<string, ChoicePerField> = {};
          for (const f of VERIFY_FIELDS) {
            const formVal = readFieldValue(result.extracted, result.extractedSoft, f);
            initialChoices[f.key] = isNonEmpty(formVal) ? "form" : "current";
          }
          setChoices(initialChoices);
          setOverrides({});
          // Pre-fill the create-new-lead panel from extracted fields.
          if (!selectedLeadId && result.extracted) {
            setNewLeadFullName(result.extracted.name ?? "");
            setNewLeadDisplayName(result.extracted.name ?? "");
            setNewLeadPhone(result.extracted.phone ?? "");
          }
        },
        onError: (err: unknown) => {
          setStageError(
            apiErrorMessage(err)
            ?? copy({ en: "Could not extract data from the file.", vi: "Không trích xuất được dữ liệu." }),
          );
        },
      },
    );
  }

  function handleConfirmWithExistingLead(leadId: string) {
    if (!pending || !verifyResult) return;
    setStageError("");
    const dossierFields = buildDossierFields(verifyResult, choices, overrides);
    commitMutation.mutate(
      { pendingId: pending.pendingId, payload: { leadId, dossierFields } },
      {
        onSuccess: () => {
          resetStagingState();
          setSelectedLeadId(leadId);
          setSearchParams({ leadId }, { replace: true });
        },
        onError: (err: unknown) => {
          setStageError(
            apiErrorMessage(err)
            ?? copy({ en: "Could not link the form to this lead.", vi: "Không thể gắn hồ sơ với ứng viên này." }),
          );
        },
      },
    );
  }

  function handleConfirmCreateNew() {
    if (!pending || !verifyResult) return;
    if (!newLeadFullName.trim() && !newLeadDisplayName.trim() && !newLeadPhone.trim()) {
      setStageError(copy({
        en: "Enter at least a name, display name, or phone before creating a lead.",
        vi: "Hãy nhập ít nhất họ tên, tên hiển thị hoặc số điện thoại trước khi tạo ứng viên.",
      }));
      return;
    }
    setStageError("");
    const dossierFields = buildDossierFields(verifyResult, choices, overrides);
    const channelSource = newLeadAcquisitionSource === "facebook" ? "facebook" : "zalo";
    commitMutation.mutate(
      {
        pendingId: pending.pendingId,
        payload: {
          createNewLead: {
            fullName: newLeadFullName.trim() || undefined,
            displayName: newLeadDisplayName.trim() || undefined,
            phone: newLeadPhone.trim() || undefined,
            source: channelSource,
            leadSource: newLeadAcquisitionSource,
          },
          dossierFields,
        },
      },
      {
        onSuccess: (document) => {
          const newLeadId = document.lead_id;
          resetStagingState();
          if (newLeadId) {
            setSelectedLeadId(newLeadId);
            setSearchParams({ leadId: newLeadId }, { replace: true });
          }
        },
        onError: (err: unknown) => {
          setStageError(
            apiErrorMessage(err)
            ?? copy({ en: "Could not create the lead and link the form.", vi: "Không thể tạo ứng viên và gắn hồ sơ." }),
          );
        },
      },
    );
  }

  function handleCancelStaging() {
    if (!pending) {
      resetStagingState();
      return;
    }
    const pendingId = pending.pendingId;
    cancelMutation.mutate(pendingId, {
      onSuccess: () => resetStagingState(),
      onError: () => resetStagingState(),
    });
  }

  // ── Derived view state ──────────────────────────────────────────────────

  const ext = fileExtension(selectedRow?.fileUrl);
  const isWordCommitted = ext === ".docx" || ext === ".doc";
  const stagedExt = fileExtension(pending?.originalFilename);
  const canEditInDocs = stagedExt === ".docx" || stagedExt === ".doc";
  const isStaging = stageMutation.isPending;
  const visibleUploadProgress = uploadProgress ?? (isStaging ? 8 : 0);
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
  // Display chain: committed-row label → picked-lead fields → null (panel
  // omits the name line entirely). The raw lead-id UUID is never shown — it's
  // operator-hostile and the LeadPicker already proves the lead exists.
  const selectedCandidateDisplay = selectedRow
    ? leadLabel(selectedRow)
    : pickedLead
      ? (pickedLead.fullName || pickedLead.displayName || pickedLead.phone || null)
      : null;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {pageState === "COMMITTED" && selectedRow ? (
              <>
                <Badge tone={toneForDocStatus(selectedRow.documentStatus)}>
                  {formatDocumentStatus(selectedRow.documentStatus)}
                </Badge>
                <Badge tone="success">{copy({ en: "File uploaded", vi: "Có file" })}</Badge>
              </>
            ) : pageState === "STAGED" ? (
              <Badge tone="neutral">{copy({ en: "Staged — not yet verified", vi: "Đã tải lên — chưa xác nhận" })}</Badge>
            ) : pageState === "VERIFIED" ? (
              <Badge tone="warning">{copy({ en: "Step 3 — Confirm", vi: "Bước 3 — Xác nhận" })}</Badge>
            ) : null}
          </div>
        </div>
      </div>

      {pageState === "EMPTY" ? renderEmpty()
        : pageState === "STAGED" ? renderStaged()
        : pageState === "VERIFIED" ? renderVerified()
        : renderCommitted()}
    </div>
  );

  // ── State renderers (closures over the component scope) ─────────────────

  function renderEmpty() {
    return (
      <Panel
        title={copy({
          en: selectedLeadId ? "Upload application form" : "Upload a form or choose a candidate",
          vi: selectedLeadId ? "Tải hồ sơ ứng tuyển" : "Tải hồ sơ hoặc chọn ứng viên",
        })}
        subtitle={copy({
          en: "Stage a PDF, DOC, or DOCX, then preview, edit, extract, and link it to the right candidate.",
          vi: "Lưu tạm PDF, DOC hoặc DOCX, sau đó xem, chỉnh sửa, trích xuất và gắn vào đúng ứng viên.",
        })}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
          <div className="border-b border-slate-100 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {copy({ en: "Candidate context", vi: "Ứng viên" })}
            </div>
            {selectedLeadId ? (
              <div className="mt-3 space-y-2">
                {selectedCandidateDisplay ? (
                  <div className="truncate text-base font-semibold text-slate-950">
                    {selectedCandidateDisplay}
                  </div>
                ) : null}
                <Badge tone="neutral">
                  {copy({ en: "No application file yet", vi: "Chưa có hồ sơ" })}
                </Badge>
                <p className="text-sm leading-6 text-slate-600">
                  {copy({
                    en: "The uploaded form will be staged first. It is only linked after verification.",
                    vi: "File sẽ được lưu tạm trước. Hồ sơ chỉ được gắn sau bước xác nhận.",
                  })}
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="text-base font-semibold text-slate-950">
                  {copy({ en: "No candidate selected", vi: "Chưa chọn ứng viên" })}
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {copy({
                    en: "Choose a candidate above, or upload first and let the extracted phone/name suggest a match.",
                    vi: "Chọn ứng viên ở trên, hoặc tải file trước để hệ thống gợi ý theo SĐT/tên trích xuất.",
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="lg:pl-1">
            {renderUploadZone()}
          </div>
        </div>
      </Panel>
    );
  }

  function renderUploadZone() {
    return (
      <div className="space-y-4">
        <label
          className={[
            "block cursor-pointer rounded-2xl border border-dashed px-4 py-5 transition",
            uploadFile
              ? "border-indigo-200 bg-indigo-50/60"
              : "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40",
            isStaging ? "cursor-not-allowed opacity-70" : "",
          ].join(" ")}
        >
          <input
            type="file"
            accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            disabled={isStaging}
            onChange={(e) => {
              setUploadFile(e.target.files?.[0] ?? null);
              setUploadProgress(null);
              setStageError("");
            }}
            className="sr-only"
          />
          <span className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">↑</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                {uploadFile
                  ? copy({ en: "File ready to upload", vi: "File đã sẵn sàng tải lên" })
                  : copy({ en: "Choose application file", vi: "Chọn hồ sơ ứng tuyển" })}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {uploadFile
                  ? copy({ en: "Click Upload to stage the file. You can preview and edit before verifying.", vi: "Bấm Tải lên để lưu tạm. Bạn có thể xem và chỉnh sửa trước khi xác nhận." })
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
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{uploadFileExtension}</span>
                  <span>{formatFileSize(uploadFile.size)}</span>
                </div>
              </div>
              {!isStaging ? (
                <button
                  type="button"
                  onClick={() => { setUploadFile(null); setUploadProgress(null); }}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  {copy({ en: "Remove", vi: "Bỏ chọn" })}
                </button>
              ) : null}
            </div>
            {isStaging ? (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-indigo-700">
                    {copy({ en: "Uploading…", vi: "Đang tải lên…" })}
                  </span>
                  <span className="font-semibold text-slate-600">{visibleUploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${visibleUploadProgress}%` }} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <Button onClick={handleStageUpload} disabled={!uploadFile || isStaging} className="w-full">
          {isStaging
            ? copy({ en: "Uploading…", vi: "Đang tải lên…" })
            : copy({ en: "Upload file", vi: "Tải file lên" })}
        </Button>

        {stageError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {stageError}
          </div>
        ) : null}
      </div>
    );
  }

  function renderStaged() {
    return (
      <Panel
        title={copy({ en: "Staged file — preview and edit before verifying", vi: "File tạm — xem và chỉnh sửa trước khi xác nhận" })}
        subtitle={pending?.originalFilename}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{pending?.originalFilename}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {pending ? formatFileSize(pending.fileSize) : null} · {pending?.mimeType}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handlePreviewStaged}>
                  {copy({ en: "View", vi: "Xem" })}
                </Button>
                {canEditInDocs && !editSessionOpen ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={openEditSessionMutation.isPending}
                    onClick={handleOpenEditSession}
                  >
                    {openEditSessionMutation.isPending
                      ? copy({ en: "Opening…", vi: "Đang mở…" })
                      : copy({ en: "Edit in Google Docs", vi: "Chỉnh sửa trong Google Docs" })}
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={handleDownloadStaged}>
                  {copy({ en: "Download", vi: "Tải xuống" })}
                </Button>
              </div>
            </div>
          </div>

          {editSessionOpen ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              <div className="font-semibold">
                {copy({ en: "Editing in Google Docs", vi: "Đang chỉnh sửa trong Google Docs" })}
              </div>
              <div className="mt-1 text-xs">
                {copy({
                  en: "Changes auto-sync back to the staged file. Click below when you're done so we can extract the latest content.",
                  vi: "Thay đổi tự đồng bộ về file tạm. Bấm nút bên dưới khi xong để hệ thống lấy nội dung mới nhất.",
                })}
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={handleCloseEditSession}
                  disabled={closeEditSessionMutation.isPending}
                >
                  {closeEditSessionMutation.isPending
                    ? copy({ en: "Saving and closing…", vi: "Đang lưu và đóng…" })
                    : copy({ en: "Save & close edit session", vi: "Lưu & đóng phiên chỉnh sửa" })}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              {editSessionOpen
                ? copy({ en: "Close the edit session before verifying.", vi: "Đóng phiên chỉnh sửa trước khi xác nhận." })
                : copy({ en: "Ready when you are.", vi: "Sẵn sàng khi bạn muốn xác nhận." })}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCancelStaging}>
                {copy({ en: "Cancel & discard file", vi: "Huỷ và xoá file" })}
              </Button>
              <Button
                onClick={handleVerify}
                disabled={editSessionOpen || verifyMutation.isPending}
              >
                {verifyMutation.isPending
                  ? copy({ en: "Extracting…", vi: "Đang trích xuất…" })
                  : copy({ en: "Verify", vi: "Xác nhận" })}
              </Button>
            </div>
          </div>

          {stageError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {stageError}
            </div>
          ) : null}
        </div>
      </Panel>
    );
  }

  function renderVerified() {
    if (!verifyResult) return null;
    const isCommitting = commitMutation.isPending || createLeadMutation.isPending;
    const skipSuggestions = Boolean(selectedLeadId); // Fork 2

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel
          title={copy({ en: "Confirm the dossier fields", vi: "Xác nhận hồ sơ ứng viên" })}
          subtitle={copy({
            en: "Per field: keep current value, use form value, or override. Form wins by default when the form has a value. Writes land on the candidate dossier — not the lead.",
            vi: "Mỗi trường: giữ giá trị hiện tại, dùng giá trị từ form, hoặc nhập mới. Mặc định dùng form khi form có giá trị. Dữ liệu được ghi vào hồ sơ ứng viên — không ghi vào lead.",
          })}
        >
          <div className="mb-3 flex items-center gap-3 text-sm">
            <button type="button" onClick={resetAllToFormWins} className="text-indigo-600 hover:underline">
              {copy({ en: "Reset all to form-wins", vi: "Đặt lại tất cả về form-wins" })}
            </button>
          </div>

          {(["identity", "physical", "background", "family", "work", "wishes"] as const).map((section) => {
            const sectionFields = VERIFY_FIELDS.filter((f) => f.section === section);
            return (
              <div key={section} className="mb-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {copy(SECTION_LABELS[section])}
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">{copy({ en: "Field", vi: "Trường" })}</th>
                        <th className="px-3 py-2 text-left">{copy({ en: "Current in dossier", vi: "Trong hồ sơ hiện tại" })}</th>
                        <th className="px-3 py-2 text-left">{copy({ en: "From form", vi: "Từ form" })}</th>
                        <th className="px-3 py-2 text-left">{copy({ en: "Decision", vi: "Quyết định" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionFields.map((field) => {
                        const formVal = readFieldValue(verifyResult.extracted, verifyResult.extractedSoft, field);
                        const currVal = readFieldValue(verifyResult.current, verifyResult.currentSoft, field);
                        const choice = choices[field.key] ?? "current";
                        const override = overrides[field.key] ?? "";
                        const formHasValue = isNonEmpty(formVal);
                        const currentHasValue = isNonEmpty(currVal);
                        return (
                          <tr key={field.key} className="border-t border-slate-100 align-top">
                            <td className="px-3 py-2 font-medium text-slate-700">{copy(field)}</td>
                            <td className={`px-3 py-2 ${currentHasValue ? "text-slate-700" : "text-slate-300"}`}>
                              {displayValue(currVal)}
                            </td>
                            <td className={`px-3 py-2 ${formHasValue ? "font-medium text-indigo-700" : "text-slate-300"}`}>
                              {displayValue(formVal)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex items-center gap-1 text-xs">
                                  <input
                                    type="radio"
                                    name={`choice-${field.key}`}
                                    checked={choice === "current"}
                                    onChange={() => setChoice(field.key, "current")}
                                    className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {copy({ en: "Keep", vi: "Giữ" })}
                                </label>
                                <label className="inline-flex items-center gap-1 text-xs">
                                  <input
                                    type="radio"
                                    name={`choice-${field.key}`}
                                    checked={choice === "form"}
                                    disabled={!formHasValue}
                                    onChange={() => setChoice(field.key, "form")}
                                    className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                                  />
                                  {copy({ en: "Use form", vi: "Dùng form" })}
                                </label>
                                <label className="inline-flex items-center gap-1 text-xs">
                                  <input
                                    type="radio"
                                    name={`choice-${field.key}`}
                                    checked={choice === "override"}
                                    onChange={() => setChoice(field.key, "override")}
                                    className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {copy({ en: "Edit", vi: "Sửa" })}
                                </label>
                                {choice === "override" ? (
                                  field.input === "select-gender" ? (
                                    <select
                                      value={override}
                                      onChange={(e) => setOverride(field.key, e.target.value)}
                                      className="ml-2 rounded-md border border-slate-200 px-2 py-1 text-xs"
                                    >
                                      <option value="">—</option>
                                      <option value="male">{copy({ en: "Male", vi: "Nam" })}</option>
                                      <option value="female">{copy({ en: "Female", vi: "Nữ" })}</option>
                                    </select>
                                  ) : field.input === "select-yes-no" ? (
                                    <select
                                      value={override}
                                      onChange={(e) => setOverride(field.key, e.target.value)}
                                      className="ml-2 rounded-md border border-slate-200 px-2 py-1 text-xs"
                                    >
                                      <option value="">—</option>
                                      <option value="true">{copy({ en: "Yes", vi: "Rồi" })}</option>
                                      <option value="false">{copy({ en: "No", vi: "Chưa" })}</option>
                                    </select>
                                  ) : (
                                    <input
                                      type={field.input === "number" ? "number" : "text"}
                                      value={override}
                                      onChange={(e) => setOverride(field.key, e.target.value)}
                                      placeholder={String(displayValue(formVal))}
                                      className="ml-2 w-32 rounded-md border border-slate-200 px-2 py-1 text-xs"
                                    />
                                  )
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </Panel>

        <div className="space-y-6">
          {!skipSuggestions ? (
            <>
              <Panel
                title={copy({ en: "Phone match", vi: "Khớp số điện thoại" })}
                subtitle={
                  verifyResult.phoneMatch
                    ? copy({ en: "Found one lead with this phone.", vi: "Tìm thấy ứng viên có cùng SĐT." })
                    : copy({ en: "No lead matched the extracted phone.", vi: "Không có ứng viên trùng SĐT trích xuất." })
                }
              >
                {verifyResult.phoneMatch ? (
                  <LeadSuggestionRow
                    lead={verifyResult.phoneMatch}
                    onPick={() => handleConfirmWithExistingLead(verifyResult.phoneMatch!.id)}
                    disabled={isCommitting}
                  />
                ) : null}
              </Panel>

              <Panel
                title={copy({ en: "Name matches", vi: "Khớp theo tên" })}
                subtitle={copy({ en: "Up to 10 candidates whose name resembles the extracted name.", vi: "Tối đa 10 ứng viên có tên tương tự." })}
              >
                {verifyResult.nameMatches.length > 0 ? (
                  <ul className="space-y-2">
                    {verifyResult.nameMatches.map((lead) => (
                      <li key={lead.id}>
                        <LeadSuggestionRow
                          lead={lead}
                          onPick={() => handleConfirmWithExistingLead(lead.id)}
                          disabled={isCommitting}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    {copy({ en: "No name-based matches.", vi: "Không có ứng viên trùng tên." })}
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
                  <FieldInput label={copy({ en: "Full name", vi: "Họ và tên" })} value={newLeadFullName} onChange={setNewLeadFullName} />
                  <FieldInput label={copy({ en: "Display name", vi: "Tên hiển thị" })} value={newLeadDisplayName} onChange={setNewLeadDisplayName} />
                  <FieldInput label={copy({ en: "Phone", vi: "Số điện thoại" })} value={newLeadPhone} onChange={setNewLeadPhone} />
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
                  </label>
                  <Button onClick={handleConfirmCreateNew} disabled={isCommitting} className="w-full">
                    {isCommitting
                      ? copy({ en: "Creating…", vi: "Đang tạo…" })
                      : copy({ en: "Create lead & link form", vi: "Tạo ứng viên & gắn hồ sơ" })}
                  </Button>
                </div>
              </Panel>
            </>
          ) : (
            <Panel
              title={copy({ en: "Apply to selected candidate", vi: "Ghi vào ứng viên đã chọn" })}
              subtitle={copy({
                en: "The form will be linked to the candidate selected above. Only checked fields will be written.",
                vi: "Hồ sơ sẽ được gắn với ứng viên đã chọn phía trên. Chỉ các trường được tick mới được ghi.",
              })}
            >
              <Button
                onClick={() => handleConfirmWithExistingLead(selectedLeadId)}
                disabled={isCommitting}
                className="w-full"
              >
                {isCommitting
                  ? copy({ en: "Confirming…", vi: "Đang xác nhận…" })
                  : copy({ en: "Confirm & link form", vi: "Xác nhận & gắn hồ sơ" })}
              </Button>
            </Panel>
          )}

          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleCancelStaging}>
              {copy({ en: "Cancel & discard file", vi: "Huỷ và xoá file" })}
            </Button>
          </div>

          {stageError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {stageError}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderCommitted() {
    if (!selectedRow) return null;
    const formUsedByApplication = Boolean(selectedRow.application);
    return (
      <Panel
        title={leadLabel(selectedRow)}
        subtitle={selectedRowMeta}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {copy({ en: "Current file", vi: "File hiện tại" })}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {isWordCommitted
                    ? copy({ en: "Preview or download. To change anything, remove and upload a fresh form.", vi: "Xem hoặc tải xuống. Để chỉnh sửa, xoá rồi tải hồ sơ mới." })
                    : copy({ en: "Preview or download. To change anything, remove and upload a fresh form.", vi: "Xem hoặc tải xuống. Để chỉnh sửa, xoá rồi tải hồ sơ mới." })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => openFile(selectedRow.documentId, "preview")}>
                  {copy({ en: "View", vi: "Xem" })}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openFile(selectedRow.documentId, "download")}>
                  {copy({ en: "Download", vi: "Tải xuống" })}
                </Button>
              </div>
            </div>
          </div>

          {/* Hand-off to the lead workbench where the operator picks an order
              and clicks Create placement — the manual "ghép đơn" step. */}
          <Panel
            title={copy({ en: "Replace form", vi: "Thay hồ sơ" })}
            subtitle={copy({
              en: "Use this when the uploaded form was wrong or needs correction. The current verified form stays active until the replacement is verified.",
              vi: "Dùng khi hồ sơ đã tải lên bị sai hoặc cần chỉnh lại. Hồ sơ đã xác nhận hiện tại vẫn còn hiệu lực cho đến khi bản thay thế được xác nhận.",
            })}
          >
            {renderUploadZone()}
          </Panel>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-indigo-900">
                {copy({
                  en: "Form on file. The candidate is now ready to be matched to an order.",
                  vi: "Đã có hồ sơ. Ứng viên đã sẵn sàng để ghép đơn.",
                })}
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/leads/${selectedLeadId}`)}
                className="shrink-0"
              >
                {copy({ en: "Open candidate to ghép đơn →", vi: "Mở ứng viên để ghép đơn →" })}
              </Button>
            </div>
          </div>

          {fileActionError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {fileActionError}
            </div>
          ) : null}

          {confirmUnlink ? (
            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {formUsedByApplication ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  {copy({
                    en: "This form is already used by an application. Upload a replacement above instead, so the application keeps a complete form record.",
                    vi: "Hồ sơ này đã được dùng cho một ứng tuyển. Hãy tải bản thay thế ở phía trên để ứng tuyển vẫn có đủ hồ sơ đi kèm.",
                  })}
                </div>
              ) : null}
              <p className="font-semibold">
                {copy({
                  en: "Only the form file is removed. The candidate's profile data — fields you applied during Verify — stays in the database. After removal you can:",
                  vi: "Thao tác này chỉ xoá file hồ sơ đã tải lên. Dữ liệu ứng viên — các trường đã xác nhận trong bước Verify — vẫn được giữ trong CSDL. Sau khi xoá, bạn có thể:",
                })}
              </p>
              <ul className="ml-5 list-disc space-y-1 text-sm">
                <li>{copy({ en: "Upload a new form for the same candidate, or", vi: "Tải lên hồ sơ mới cho cùng ứng viên, hoặc" })}</li>
                <li>{copy({ en: "Pick a different candidate using the search above, or", vi: "Chọn ứng viên khác qua ô tìm kiếm phía trên, hoặc" })}</li>
                <li>{copy({ en: "Go back to the list and click \"Upload file\" to start a fresh upload without a candidate.", vi: "Quay lại danh sách và bấm \"Tải hồ sơ lên\" để bắt đầu tải lên không gắn sẵn ứng viên." })}</li>
              </ul>
              <p>
                {copy({ en: "This action cannot be undone.", vi: "Không thể hoàn tác thao tác này." })}
              </p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={handleUnlink} disabled={unlinkFormStandard.isPending || formUsedByApplication}>
                  {unlinkFormStandard.isPending
                    ? copy({ en: "Removing…", vi: "Đang xoá…" })
                    : copy({ en: "Yes, remove file", vi: "Xác nhận xoá file" })}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmUnlink(false)} disabled={unlinkFormStandard.isPending}>
                  {copy({ en: "Cancel", vi: "Huỷ" })}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={() => { setConfirmUnlink(true); setFileActionError(""); }} disabled={formUsedByApplication}>
              {formUsedByApplication
                ? copy({ en: "Use Replace form", vi: "Dùng Thay hồ sơ" })
                : copy({ en: "Remove file", vi: "Xoá file" })}
            </Button>
          )}
        </div>
      </Panel>
    );
  }

  function setChoice(key: string, choice: ChoicePerField) {
    setChoices((prev) => ({ ...prev, [key]: choice }));
  }

  function setOverride(key: string, value: string) {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }

  function resetAllToFormWins() {
    if (!verifyResult) return;
    const next: Record<string, ChoicePerField> = {};
    for (const f of VERIFY_FIELDS) {
      const formVal = readFieldValue(verifyResult.extracted, verifyResult.extractedSoft, f);
      next[f.key] = isNonEmpty(formVal) ? "form" : "current";
    }
    setChoices(next);
  }
}

/** Read a field's value from one side of the comparison. Typed fields live on
 *  the top-level object; soft fields live under .softFields. */
function readFieldValue(
  typed: FormStandardExtractedFields | null,
  soft: Record<string, unknown> | null | undefined,
  field: VerifyFieldDef,
): unknown {
  if (field.group === "typed") return typed ? (typed as any)[field.key] : null;
  return soft ? (soft as any)[field.key] : null;
}

function isNonEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

/**
 * Build the commit payload from the operator's per-field choices.
 *
 * Each VERIFY_FIELDS row resolves to one of:
 *   - choice === "current"   → omit the key (existing dossier value stays)
 *   - choice === "form"      → use the form-extracted value
 *   - choice === "override"  → use the operator-typed override
 *
 * Typed-group values land at the top level of dossierFields. Soft-group
 * values land under `dossierFields.softFields`.
 */
function buildDossierFields(
  verifyResult: VerifyPendingResult,
  choices: Record<string, ChoicePerField>,
  overrides: Record<string, string>,
): Record<string, unknown> {
  const typed: Record<string, unknown> = {};
  const soft: Record<string, unknown> = {};

  for (const field of VERIFY_FIELDS) {
    const choice = choices[field.key] ?? "current";
    if (choice === "current") continue;

    let value: unknown;
    if (choice === "override") {
      const raw = overrides[field.key] ?? "";
      if (field.input === "number") {
        const n = Number(raw);
        value = Number.isFinite(n) ? n : null;
      } else if (field.input === "select-yes-no") {
        value = raw === "true" ? true : raw === "false" ? false : null;
      } else if (raw.trim() === "") {
        value = null;
      } else {
        value = raw;
      }
    } else {
      // choice === "form"
      value = readFieldValue(verifyResult.extracted, verifyResult.extractedSoft, field);
    }

    if (field.group === "typed") {
      typed[field.key] = value;
    } else {
      soft[field.key] = value;
    }
  }

  const result: Record<string, unknown> = { ...typed };
  if (Object.keys(soft).length > 0) result.softFields = soft;
  return result;
}

function displayValue(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  return String(value);
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
