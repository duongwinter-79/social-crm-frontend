import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Panel,
  useImeSafeInput,
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
import { UiText } from "@/ui-text/ui-text";
import type {
  FormStandardRegisterRow,
  FormStandardStageResult,
  VerifyPendingResult,
  FormStandardLeadSuggestion,
  FormStandardExtractedFields,
  LeadAcquisitionSource,
} from "@social-crm/api";
import { LeadPicker } from "@/components/lead-picker";
import { ApplicationContextNav } from "./application-context-nav";

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

// ── Staging-session persistence ────────────────────────────────────────────
// The staged upload → verify flow lives in component state, which is destroyed
// when the Journey form-intake modal closes or the operator navigates away. The
// staged file itself persists server-side (keyed by pendingId), so we mirror the
// in-progress UI state into sessionStorage and rehydrate on remount — the
// operator returns to exactly where they left off instead of an empty upload box.
const STAGING_SESSION_PREFIX = "form-intake-session:v1:";

type PersistedStagingSession = {
  pending: FormStandardStageResult | null;
  verifyResult: VerifyPendingResult | null;
  choices: Record<string, ChoicePerField>;
  overrides: Record<string, string>;
  editSessionOpen: boolean;
  newLeadFullName: string;
  newLeadDisplayName: string;
  newLeadPhone: string;
  newLeadAcquisitionSource: LeadAcquisitionSource;
};

function stagingSessionKey(leadKey: string): string {
  return STAGING_SESSION_PREFIX + (leadKey || "__no_lead__");
}

function readStagingSession(leadKey: string): PersistedStagingSession | null {
  try {
    const raw = sessionStorage.getItem(stagingSessionKey(leadKey));
    return raw ? (JSON.parse(raw) as PersistedStagingSession) : null;
  } catch {
    return null;
  }
}

function writeStagingSession(leadKey: string, session: PersistedStagingSession): void {
  try {
    sessionStorage.setItem(stagingSessionKey(leadKey), JSON.stringify(session));
  } catch {
    /* storage full / unavailable — non-fatal, the session just won't persist */
  }
}

function clearStagingSession(leadKey: string): void {
  try {
    sessionStorage.removeItem(stagingSessionKey(leadKey));
  } catch {
    /* non-fatal */
  }
}

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
  { key: "alcohol",           group: "soft",  section: "physical",   en: "Drinks alcohol",     vi: "Uống rượu",            input: "select-yes-no" },
  { key: "smoking",           group: "soft",  section: "physical",   en: "Smokes",             vi: "Hút thuốc",            input: "select-yes-no" },
  { key: "surgery",           group: "soft",  section: "physical",   en: "Surgery history",    vi: "Phẫu thuật",           input: "text" },
  { key: "birthDefect",       group: "soft",  section: "physical",   en: "Birth defect",       vi: "Dị tật",               input: "text" },
  // ── Background ───────────────────────────────────────────────────────
  { key: "hometownProvince",  group: "typed", section: "background", en: "Hometown",           vi: "Hộ khẩu",              input: "text" },
  { key: "address",           group: "typed", section: "background", en: "Address",            vi: "Địa chỉ",              input: "text" },
  { key: "education",         group: "soft",  section: "background", en: "Education",          vi: "Trình độ",             input: "text" },
  { key: "languages",         group: "soft",  section: "background", en: "Foreign languages",  vi: "Ngoại ngữ",            input: "text" },
  { key: "referrer",          group: "soft",  section: "background", en: "Referrer",           vi: "Người giới thiệu",     input: "text" },
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

// A staged pending row can disappear out-of-band (committed/cancelled in another
// tab, or server-side expiry). The server answers 404/410 for its pendingId.
function isPendingGoneError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 410;
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

export function ApplicationDetailPage(props: { embeddedLeadId?: string; embeddedOnViewDossier?: () => void; onLeadCommitted?: (leadId: string) => void; createMode?: boolean } = {}) {
  const { copy, formatDocumentStatus } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Embedded mode: the Journey workbench mounts this component for one fixed
  // lead. The lead picker, back button, and context nav are hidden, and URL
  // search-param syncing is suppressed so /journey/:leadId is not clobbered.
  const embedded = Boolean(props.embeddedLeadId);
  const leadIdFromUrl = searchParams.get("leadId") ?? "";
  const [selectedLeadId, setSelectedLeadId] = useState(props.embeddedLeadId ?? leadIdFromUrl);

  useEffect(() => {
    if (props.embeddedLeadId) setSelectedLeadId(props.embeddedLeadId);
  }, [props.embeddedLeadId]);

  // Rehydrate any in-progress staging session persisted before an unmount (modal
  // close / navigation). Read once on mount, keyed by the lead in context.
  const [restoredSession] = useState(() => readStagingSession(props.embeddedLeadId ?? leadIdFromUrl));

  // Staging session state
  const [pending, setPending] = useState<FormStandardStageResult | null>(restoredSession?.pending ?? null);
  const [verifyResult, setVerifyResult] = useState<VerifyPendingResult | null>(restoredSession?.verifyResult ?? null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editSessionOpen, setEditSessionOpen] = useState(restoredSession?.editSessionOpen ?? false);
  const [stageError, setStageError] = useState("");
  const [fileActionError, setFileActionError] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  // Verify-screen UI state — per-field operator choice (current / form /
  // override). `overrides` holds the operator's typed value when choice is
  // "override". Form-wins is the default when the form provides a non-null
  // value; otherwise current-wins.
  const [choices, setChoices] = useState<Record<string, ChoicePerField>>(restoredSession?.choices ?? {});
  const [overrides, setOverrides] = useState<Record<string, string>>(restoredSession?.overrides ?? {});
  const [newLeadFullName, setNewLeadFullName] = useState(restoredSession?.newLeadFullName ?? "");
  const [newLeadDisplayName, setNewLeadDisplayName] = useState(restoredSession?.newLeadDisplayName ?? "");
  const [newLeadPhone, setNewLeadPhone] = useState(restoredSession?.newLeadPhone ?? "");
  const [newLeadAcquisitionSource, setNewLeadAcquisitionSource] = useState<LeadAcquisitionSource>(restoredSession?.newLeadAcquisitionSource ?? "zalo");

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

  // Persist the in-progress staging session so it survives a modal close or
  // navigation. Only while a file is staged; resetStagingState clears it.
  const stagingLeadKey = props.embeddedLeadId ?? selectedLeadId ?? "";
  useEffect(() => {
    if (!pending) return;
    writeStagingSession(stagingLeadKey, {
      pending,
      verifyResult,
      choices,
      overrides,
      editSessionOpen,
      newLeadFullName,
      newLeadDisplayName,
      newLeadPhone,
      newLeadAcquisitionSource,
    });
  }, [
    stagingLeadKey,
    pending,
    verifyResult,
    choices,
    overrides,
    editSessionOpen,
    newLeadFullName,
    newLeadDisplayName,
    newLeadPhone,
    newLeadAcquisitionSource,
  ]);

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
    if (embedded) return;
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
    clearStagingSession(props.embeddedLeadId ?? selectedLeadId ?? "");
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

  // If a verify/commit fails because the staged row is gone, self-heal: drop the
  // dead (and now-stale persisted) session and tell the operator to re-upload,
  // instead of leaving them stuck on a session that can never be committed.
  function handleStaleSessionError(err: unknown): boolean {
    if (!isPendingGoneError(err)) return false;
    resetStagingState();
    setStageError(
      copy({
        en: "This staged form is no longer available — it may have been completed or cancelled elsewhere. Please upload again.",
        vi: "Hồ sơ tạm này không còn khả dụng — có thể đã hoàn tất hoặc bị hủy ở nơi khác. Vui lòng tải lên lại.",
      }),
    );
    return true;
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
          if (handleStaleSessionError(err)) return;
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
          if (!embedded) setSearchParams({ leadId }, { replace: true });
          props.onLeadCommitted?.(leadId);
        },
        onError: (err: unknown) => {
          if (handleStaleSessionError(err)) return;
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
            if (!embedded) setSearchParams({ leadId: newLeadId }, { replace: true });
            props.onLeadCommitted?.(newLeadId);
          }
        },
        onError: (err: unknown) => {
          if (handleStaleSessionError(err)) return;
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
      {/* Header (Back-to-list + candidate picker + status badges) — hidden in
          embedded (Journey workbench) mode and in create mode (new journey is
          create-new-lead only, so there is no list to go back to or pick from). */}
      {!embedded && !props.createMode ? (
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
      ) : null}

      {!embedded ? <ApplicationContextNav leadId={selectedLeadId || undefined} active="form" /> : null}

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
        title={selectedLeadId ? <UiText id="appdetail.upload.title.with-lead" /> : <UiText id="appdetail.upload.title.no-lead" />}
        subtitle={<UiText id="appdetail.upload.subtitle" />}
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
        title={<UiText id="appdetail.staged.title" />}
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
      <div className="flex flex-col gap-6">
        <Panel
          className="order-2"
          title={<UiText id="appdetail.confirm.title" />}
          subtitle={<UiText id="appdetail.confirm.subtitle" />}
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
                {/* Multi-column card grid (was a long vertical table). The verify
                    panel is full-width now, so fan the compact cards out to up to
                    3 columns to keep the modal short. */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sectionFields.map((field) => {
                    const formVal = readFieldValue(verifyResult.extracted, verifyResult.extractedSoft, field);
                    const currVal = readFieldValue(verifyResult.current, verifyResult.currentSoft, field);
                    const choice = choices[field.key] ?? "current";
                    const override = overrides[field.key] ?? "";
                    const formHasValue = isNonEmpty(formVal);
                    const currentHasValue = isNonEmpty(currVal);
                    return (
                      <div key={field.key} className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-medium text-slate-700">{copy(field)}</div>
                        <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">{copy({ en: "Current", vi: "Hiện tại" })}</div>
                            <div className={currentHasValue ? "text-slate-700" : "text-slate-300"}>{displayValue(currVal)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">{copy({ en: "From form", vi: "Từ form" })}</div>
                            <div className={formHasValue ? "font-medium text-indigo-700" : "text-slate-300"}>{displayValue(formVal)}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2">
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
                        </div>
                        {choice === "override" ? (
                          <div className="mt-2">
                            {field.input === "select-gender" ? (
                              <select
                                value={override}
                                onChange={(e) => setOverride(field.key, e.target.value)}
                                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                              >
                                <option value="">—</option>
                                <option value="male">{copy({ en: "Male", vi: "Nam" })}</option>
                                <option value="female">{copy({ en: "Female", vi: "Nữ" })}</option>
                              </select>
                            ) : field.input === "select-yes-no" ? (
                              <select
                                value={override}
                                onChange={(e) => setOverride(field.key, e.target.value)}
                                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                              >
                                <option value="">—</option>
                                <option value="true">{copy({ en: "Yes", vi: "Rồi" })}</option>
                                <option value="false">{copy({ en: "No", vi: "Chưa" })}</option>
                              </select>
                            ) : (
                              <OverrideTextInput
                                type={field.input === "number" ? "number" : "text"}
                                value={override}
                                onChange={(value) => setOverride(field.key, value)}
                                placeholder={String(displayValue(formVal))}
                              />
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Panel>

        <div className="order-1 space-y-6">
          {!skipSuggestions ? (
            <>
              <Panel
                title={<UiText id="appdetail.phone-match.title" />}
                subtitle={
                  verifyResult.phoneMatch
                    ? <UiText id="appdetail.phone-match.subtitle.found" />
                    : <UiText id="appdetail.phone-match.subtitle.none" />
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
                title={<UiText id="appdetail.name-matches.title" />}
                subtitle={<UiText id="appdetail.name-matches.subtitle" />}
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
                title={<UiText id="appdetail.new-lead.title" />}
                subtitle={<UiText id="appdetail.new-lead.subtitle" />}
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
              title={<UiText id="appdetail.apply.title" />}
              subtitle={<UiText id="appdetail.apply.subtitle" />}
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
          {(() => {
            const isVerified = selectedRow.documentStatus === "verified";
            const fileType = ext ? ext.replace(/^\./, "").toUpperCase() : copy({ en: "File", vi: "File" });
            return (
              <div className={`rounded-2xl border px-4 py-4 ${isVerified ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${isVerified ? "bg-white text-emerald-600 ring-emerald-200" : "bg-white text-slate-500 ring-slate-200"}`}>
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3h6l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                        <path d="M14 3v5h5" />
                      </svg>
                      {isVerified ? (
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-white">✓</span>
                      ) : null}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {copy({ en: "Current file", vi: "File hiện tại" })}
                        </span>
                        <Badge tone={toneForDocStatus(selectedRow.documentStatus)}>{formatDocumentStatus(selectedRow.documentStatus)}</Badge>
                        <Badge tone="neutral">{fileType}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {copy({ en: "Preview or download. To change anything, remove and upload a fresh form.", vi: "Xem hoặc tải xuống. Để chỉnh sửa, xoá rồi tải hồ sơ mới." })}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openFile(selectedRow.documentId, "preview")}>
                      {copy({ en: "View", vi: "Xem" })}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openFile(selectedRow.documentId, "download")}>
                      {copy({ en: "Download", vi: "Tải xuống" })}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Hand-off to the lead workbench where the operator picks an order
              and clicks Create placement — the manual "ghép đơn" step. */}
          <Panel
            title={<UiText id="appdetail.replace.title" />}
            subtitle={<UiText id="appdetail.replace.subtitle" />}
          >
            {renderUploadZone()}
          </Panel>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-indigo-900">
                {copy({
                  en: "Form on file. Review the dossier extracted from it next.",
                  vi: "Đã có hồ sơ. Tiếp tục xem dữ liệu hồ sơ ứng viên trích từ form.",
                })}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (embedded && props.embeddedOnViewDossier) {
                    props.embeddedOnViewDossier();
                  } else {
                    navigate(`/leads/${selectedLeadId}`);
                  }
                }}
                className="shrink-0"
              >
                {embedded
                  ? copy({ en: "View candidate dossier →", vi: "Xem hồ sơ ứng viên →" })
                  : copy({ en: "Open candidate to ghép đơn →", vi: "Mở ứng viên để ghép đơn →" })}
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
  const ime = useImeSafeInput(props.value, (e) => props.onChange(e.target.value));
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{props.label}</span>
      <input
        type="text"
        value={ime.value}
        onChange={ime.onChange}
        onCompositionStart={ime.onCompositionStart}
        onCompositionEnd={ime.onCompositionEnd}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}

function OverrideTextInput(props: {
  type: "number" | "text";
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const ime = useImeSafeInput(props.value, (e) => props.onChange(e.target.value));
  return (
    <input
      type={props.type}
      value={ime.value}
      onChange={ime.onChange}
      onCompositionStart={ime.onCompositionStart}
      onCompositionEnd={ime.onCompositionEnd}
      placeholder={props.placeholder}
      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
    />
  );
}
