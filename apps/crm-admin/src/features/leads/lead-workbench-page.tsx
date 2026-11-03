import { useEffect, useMemo, useState } from "react";
import { getLeadDisplayName, getLeadFullNameLabel } from "@/lib/lead-display";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  InfoCard,
  InfoStrip,
  Input,
  Panel,
  SectionHeader,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useAiQueryMutation,
  useApplicationsQuery,
  useCandidateByLeadQuery,
  useFormStandardRegisterQuery,
  useLeadAiSuggestionsQuery,
  useDismissLeadAiSuggestionMutation,
  useLeadDetailQuery,
  useLeadQualificationQuery,
  useLeadTransitionsQuery,
  useProcessThreadExtractionMutation,
  useRestoreLeadMutation,
  useTrainingFinanceByLeadQuery,
  useTransitionLeadMutation,
  useUpdateLeadMutation,
  useUpdateLeadQualificationMutation,
  usePermissions
} from "@social-crm/api";
import { LeadStatusLine } from "./lead-status-line";
import { CandidateWorkbench } from "@/features/candidate-workbench/candidate-workbench";
import { DossierModal } from "./dossier-modal";
import { FormChuanEntryPanel } from "./form-chuan-entry-panel";
import { useI18n } from "../../i18n";
import { UiText } from "@/ui-text/ui-text";
import { type NavigationReturnState, resolveReturnState } from "@/app/navigation-state";
import {
  findPhoneMergeCandidate,
} from "./field-with-provenance";
import { LeadConversationInline } from "./lead-conversation-inline";
import { LeadAiSnapshotCard } from "./lead-ai-snapshot-card";
import { FormExtractionProgress } from "./form-extraction-progress";
import { useFormExtractionWatcher } from "./use-form-extraction-watcher";
import { LeadDocumentsPanel } from "./lead-documents-panel";
import { ApplicationPhasePanel } from "@/features/journey/application-phase-panel";
import { FormIntakeModal } from "@/features/journey/form-intake-modal";
import { TrainingFinanceDetailPage } from "@/features/training-finance/training-finance-detail-page";

function toneForStatus(status: string) {
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(status)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED", "DEPARTED"].includes(status)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "VISA_PROCESSING"].includes(status)) return "warning" as const;
  return "accent" as const;
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M15 18 9 12l6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M10 12h10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function resolveReturnLabel(
  returnState: Required<NavigationReturnState>,
  copy: (value: { en: string; vi: string }) => string
) {
  if (returnState.from.startsWith("/conversations")) {
    return copy({ en: "Conversations", vi: "Hội thoại" });
  }
  if (returnState.from.startsWith("/leads")) {
    return copy({ en: "Leads", vi: "Danh sách ứng viên" });
  }
  return returnState.fromLabel;
}

function ReturnNavigation(props: {
  label: string;
  onBack: () => void;
  copy: (value: { en: string; vi: string }) => string;
}) {
  return (
    <div className="sticky top-3 z-20 flex w-fit">
      <button
        type="button"
        onClick={props.onBack}
        className="group inline-flex max-w-[min(100vw-2rem,360px)] items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-indigo-100 group-hover:text-indigo-700">
          <ArrowLeftIcon />
        </span>
        <span className="truncate">
          {props.copy({ en: `Back to ${props.label}`, vi: `Quay lại` })}
        </span>
      </button>
    </div>
  );
}

export function LeadWorkbenchPage() {
  const { copy, formatLeadStatus, formatEnum, formatDocumentStatus, yesNoUnknown } = useI18n();
  const { leadId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const returnState = resolveReturnState(location.state, {
    from: "/leads",
    fromLabel: copy({ en: "Leads", vi: "Danh sách ứng viên" })
  });
  const returnLabel = resolveReturnLabel(returnState, copy);
  const leadQuery = useLeadDetailQuery(leadId);
  const candidateQuery = useCandidateByLeadQuery(leadId);
  const transitionsQuery = useLeadTransitionsQuery(leadId);
  const qualificationQuery = useLeadQualificationQuery(leadId);
  const suggestionsQuery = useLeadAiSuggestionsQuery(leadId);
  // Journey-merge data: application, staged form and training-finance record
  // power the Ứng tuyển / Tiến độ & Tài chính / Xuất cảnh sections below.
  const applicationsQuery = useApplicationsQuery({ offset: 0, limit: 1, leadId: leadId || undefined }, { enabled: Boolean(leadId) });
  const formQuery = useFormStandardRegisterQuery(leadId ? { offset: 0, limit: 1, leadId } : undefined, { enabled: Boolean(leadId) });
  const tfQuery = useTrainingFinanceByLeadQuery(leadId || undefined);
  const updateLead = useUpdateLeadMutation();
  const transitionLead = useTransitionLeadMutation();
  const restoreLead = useRestoreLeadMutation();
  const qualificationMutation = useUpdateLeadQualificationMutation(leadId);
  const dismissSuggestion = useDismissLeadAiSuggestionMutation(leadId);
  const aiMutation = useAiQueryMutation();
  const runExtraction = useProcessThreadExtractionMutation();
  const { canEditLeads, canManageDocuments, canTransitionLeadStatus, canViewLeadPii, isAdmin } = usePermissions();
  // Page-level, not tab-scoped — see useFormExtractionWatcher for why the
  // poll/toast/refresh must survive the operator switching away from the
  // "extraction" tab.
  useFormExtractionWatcher(leadId);

  // Two-step disqualification: clicking "Move to disqualified" opens an inline
  // reason form; the operator types a reason and confirms. Backend rejects the
  // patch without a reason.
  const [disqualifyDraft, setDisqualifyDraft] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("Summarize this conversation and identify any signals that the lead is high potential.");
  const [conversationVisible, setConversationVisible] = useState(false);
  // The AI block sits collapsed above the form; per-field "Dùng" means an
  // operator rarely needs to open it at all.
  const [aiVisible, setAiVisible] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [qualificationForm, setQualificationForm] = useState({
    birthYear: "",
    gender: "",
    hasPassport: "",
    height: "",
    weight: "",
    experienceLevel: "",
    experienceYears: "",
    hasStrongSkills: "",
    experienceField: "",
    desiredIndustry: "",
    readyToDepartInMonths: "",
    understandsJobNature: "",
    preferredRegion: "",
    desiredSalary: "",
    lateCancellationCount: "",
    noShowCount: "",
    unreasonableCancellationCount: "",
    inconsistentInfoCount: "",
    hasWorkedAbroad: "",
    hasCleanHistoryAbroad: "",
    tattooStatus: "",
    healthMeetsCriteria: "",
    hasRiskHistory: "",
    note: ""
  });

  useEffect(() => {
    if (!qualificationQuery.data) return;
    const verified = qualificationQuery.data.verifiedData ?? {};
    const seeded = {
      // Prefer canonical `birthYear`; fall back to deriving from legacy `age`
      // (= currentYear - age) so older saved verified blobs still pre-fill the
      // form correctly. Operator can type a 4-digit year here.
      birthYear: readString(
        verified.birthYear ?? (typeof verified.age === 'number' ? new Date().getFullYear() - verified.age : undefined),
      ),
      gender: readString(verified.gender),
      hasPassport: readBooleanString(verified.hasPassport),
      height: readString(verified.height),
      weight: readString(verified.weight),
      experienceLevel: readString(verified.experienceLevel),
      experienceYears: readString(verified.experienceYears),
      hasStrongSkills: readBooleanString(verified.hasStrongSkills),
      experienceField: readString(verified.experienceField),
      desiredIndustry: readString(verified.desiredIndustry),
      readyToDepartInMonths: readString(verified.readyToDepartInMonths),
      understandsJobNature: readBooleanString(verified.understandsJobNature),
      preferredRegion: Array.isArray(verified.preferredRegion) ? verified.preferredRegion.join(", ") : readString(verified.preferredRegion),
      desiredSalary: readString(verified.desiredSalary),
      lateCancellationCount: readString(verified.lateCancellationCount),
      noShowCount: readString(verified.noShowCount),
      unreasonableCancellationCount: readString(verified.unreasonableCancellationCount),
      inconsistentInfoCount: readString(verified.inconsistentInfoCount),
      hasWorkedAbroad: readBooleanString(verified.hasWorkedAbroad),
      hasCleanHistoryAbroad: readBooleanString(verified.hasCleanHistoryAbroad),
      tattooStatus: readString(verified.tattooStatus),
      healthMeetsCriteria: readBooleanString(verified.healthMeetsCriteria),
      hasRiskHistory: readString(verified.hasRiskHistory),
      note: readQualificationNote(verified)
    };
    setQualificationForm(seeded);
  }, [qualificationQuery.data]);

  const lead = leadQuery.data;
  const candidate = candidateQuery.data;
  const application = applicationsQuery.data?.data?.[0] ?? null;
  const form = formQuery.data?.data?.[0] ?? null;
  const tf = tfQuery.data?.[0] ?? null;
  // Standard-form gate summary for the dossier panel: the form must be
  // uploaded and verified before the lead can advance to matching.
  const formHasFile = Boolean(form?.hasFile);
  const formVerified = formHasFile && form?.documentStatus === "verified";
  const formStatusTone = formVerified ? ("success" as const) : formHasFile ? ("warning" as const) : ("neutral" as const);
  const formStatusLabel = form && formHasFile
    ? formatDocumentStatus(form.documentStatus)
    : copy({ en: "Form missing", vi: "Chưa có form" });
  const selectedThreadId = useMemo(() => lead?.threads?.[0]?.id ?? "", [lead]);
  /** How many AI values are still waiting on an operator — the strip's label. */
  const aiSuggestionCount = suggestionsQuery.data?.length ?? 0;

  const phoneMergeConflictId = findPhoneMergeCandidate(suggestionsQuery.data);

  if (!lead) {
    return <Panel title={<UiText id="lead.workbench.title" />}><EmptyState title={<UiText id="lead.workbench.not-loaded.title" />} description={<UiText id="lead.workbench.not-loaded.desc" />} /></Panel>;
  }

  return (
    <div className="space-y-6">
      <ReturnNavigation
        label={returnLabel}
        onBack={() => navigate(returnState.from)}
        copy={copy}
      />

      <SectionHeader
        eyebrow={<UiText id="lead.workbench.eyebrow" />}
        title={getLeadDisplayName(lead)}
        description={[
          getLeadFullNameLabel(lead),
          `${lead.source.toUpperCase()} · ${lead.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })} · ${lead.region || copy({ en: "No region", vi: "Chưa có khu vực" })}`,
        ].filter(Boolean).join(" · ")}
      />

      <div className="rounded-2xl border border-slate-200 bg-white px-6 pt-4 shadow-sm">
        <LeadStatusLine status={lead.status} />
      </div>

      {phoneMergeConflictId ? (
        <InfoStrip className="border-rose-300 bg-rose-50 text-rose-900">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="danger">{copy({ en: "Merge required", vi: "Cần gộp ứng viên" })}</Badge>
            <span>
              {copy({
                en: "AI extracted a phone number that already belongs to another lead. The phone column was NOT auto-applied.",
                vi: "AI đã trích xuất số điện thoại trùng với một ứng viên khác. Số điện thoại chưa được tự động áp dụng."
              })}
            </span>
            <code className="rounded bg-rose-100 px-2 py-0.5 text-xs">{phoneMergeConflictId}</code>
          </div>
        </InfoStrip>
      ) : null}

      <Toolbar compact className="border-slate-200/90">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 md:grid-cols-4 xl:flex-1">
            <InfoCard label={copy({ en: "Status", vi: "Trạng thái" })} value={<Badge tone={toneForStatus(lead.status)}>{formatLeadStatus(lead.status)}</Badge>} className="bg-slate-50" />
            <InfoCard label={copy({ en: "Lead score", vi: "Điểm ứng viên" })} value={<Badge tone={(lead.leadScore ?? 0) >= 80 ? "success" : (lead.leadScore ?? 0) >= 60 ? "warning" : "neutral"}>{lead.leadScore ?? "-"}</Badge>} className="bg-slate-50" />
            <InfoCard label={copy({ en: "Classification", vi: "Phân loại" })} value={lead.leadClassification ?? copy({ en: "Unclassified", vi: "Chưa phân loại" })} className="bg-slate-50" />
            <InfoCard label={copy({ en: "Threads", vi: "Luồng hội thoại" })} value={lead.threads?.length ?? 0} className="bg-slate-50" />
          </div>
          <ToolbarActions className="xl:justify-end">
            {canTransitionLeadStatus && (transitionsQuery.data?.allowed ?? []).map((next) => {
              const blocker = (transitionsQuery.data?.blocked ?? []).find((b) => b.status === next);
              const isBlocked = Boolean(blocker);
              const isDisqualify = next === "disqualified";
              const isDanger = next.toLowerCase().includes("failed") || isDisqualify;
              return (
                <span key={next} title={blocker?.reason ?? ""} className={isBlocked ? "cursor-not-allowed" : undefined}>
                  <Button
                    variant={isBlocked ? "ghost" : isDanger ? "danger" : "secondary"}
                    size="sm"
                    onClick={() => {
                      if (isDisqualify) {
                        // Two-step: open the inline reason form instead of transitioning immediately.
                        setDisqualifyDraft("");
                        return;
                      }
                      transitionLead.mutate({ id: leadId, status: next });
                    }}
                    disabled={transitionLead.isPending || isBlocked}
                  >
                    {copy({ en: "Move to", vi: "Chuyển sang" })} {formatLeadStatus(next)}
                    {isBlocked ? " 🔒" : ""}
                  </Button>
                </span>
              );
            })}
          </ToolbarActions>
        </div>
      </Toolbar>

      {disqualifyDraft !== null ? (
        <InfoStrip className="border-rose-300 bg-rose-50 text-rose-900">
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge tone="danger">{copy({ en: "Confirm disqualification", vi: "Xác nhận loại ứng viên" })}</Badge>
              <span className="text-sm font-medium">
                {copy({
                  en: "Provide a reason so the team can review or roll this back later.",
                  vi: "Hãy nêu lý do để cả nhóm có thể xem lại hoặc khôi phục sau này."
                })}
              </span>
            </div>
            <Input
              label={copy({ en: "Reason", vi: "Lý do" })}
              value={disqualifyDraft}
              onChange={(event) => setDisqualifyDraft(event.target.value)}
              placeholder={copy({
                en: "e.g. wrong phone, abandoned conversation, ineligible age…",
                vi: "VD: sai số điện thoại, không phản hồi, không đủ tuổi…"
              })}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={transitionLead.isPending || disqualifyDraft.trim().length === 0}
                onClick={() => {
                  transitionLead.mutate(
                    { id: leadId, status: "disqualified", disqualifiedReason: disqualifyDraft.trim() },
                    { onSuccess: () => setDisqualifyDraft(null) }
                  );
                }}
              >
                {transitionLead.isPending
                  ? copy({ en: "Disqualifying…", vi: "Đang loại…" })
                  : copy({ en: "Confirm disqualify", vi: "Xác nhận loại" })}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDisqualifyDraft(null)} disabled={transitionLead.isPending}>
                {copy({ en: "Cancel", vi: "Hủy" })}
              </Button>
            </div>
          </div>
        </InfoStrip>
      ) : null}

      {lead.status === "disqualified" ? (
        <InfoStrip className="border-rose-300 bg-rose-50 text-rose-900">
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="danger">{copy({ en: "Lead disqualified", vi: "Hồ sơ đã bị loại" })}</Badge>
                {lead.previousStatus ? (
                  <span className="text-xs">
                    {copy({ en: "Previous status:", vi: "Trạng thái trước:" })}{" "}
                    <span className="font-semibold">{formatLeadStatus(lead.previousStatus)}</span>
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-sm leading-6">
                <span className="font-semibold">{copy({ en: "Reason:", vi: "Lý do:" })}</span>{" "}
                {lead.disqualifiedReason || copy({ en: "(no reason recorded)", vi: "(không có lý do được ghi nhận)" })}
              </div>
              <div className="mt-0.5 text-xs text-rose-700/80">
                {lead.disqualifiedByUsername ? (
                  <>
                    {copy({ en: "By", vi: "Bởi" })}{" "}
                    <span className="font-semibold">{lead.disqualifiedByUsername}</span>
                  </>
                ) : null}
                {lead.disqualifiedAt ? (
                  <>
                    {lead.disqualifiedByUsername ? " · " : ""}
                    {copy({ en: "On", vi: "Vào" })}{" "}
                    <span className="font-mono">{new Date(lead.disqualifiedAt).toLocaleString()}</span>
                  </>
                ) : null}
              </div>
            </div>
            <span
              title={
                lead.previousStatus
                  ? copy({
                      en: `Restore to ${lead.previousStatus}`,
                      vi: `Khôi phục về ${formatLeadStatus(lead.previousStatus)}`
                    })
                  : copy({
                      en: "No previous status recorded — cannot restore automatically",
                      vi: "Không có trạng thái trước — không thể khôi phục tự động"
                    })
              }
            >
              {isAdmin ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={restoreLead.isPending || !lead.previousStatus}
                  onClick={() => restoreLead.mutate(leadId)}
                >
                  {restoreLead.isPending
                    ? copy({ en: "Restoring…", vi: "Đang khôi phục…" })
                    : lead.previousStatus
                      ? copy({
                          en: `Restore to ${formatLeadStatus(lead.previousStatus)}`,
                          vi: `Khôi phục về ${formatLeadStatus(lead.previousStatus)}`
                        })
                      : copy({ en: "Restore unavailable", vi: "Không thể khôi phục" })}
                </Button>
              ) : (
                <span className="text-xs italic text-slate-500">
                  {copy({ en: "Admin only", vi: "Chỉ admin có thể khôi phục" })}
                </span>
              )}
            </span>
          </div>
        </InfoStrip>
      ) : null}

      {(transitionsQuery.data?.blocked ?? []).length ? (
        <InfoStrip className="border-amber-300 bg-amber-50 text-amber-900">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge tone="warning">{copy({ en: "Pipeline gate", vi: "Chốt pipeline" })}</Badge>
              <span className="font-medium">
                {copy({ en: "Some transitions are blocked", vi: "Một số chuyển trạng thái đang bị chặn" })}
              </span>
            </div>
            {(transitionsQuery.data?.blocked ?? []).map((b) => (
              <div key={b.status} className="text-xs">
                <span className="font-semibold">{formatLeadStatus(b.status)}</span>
                {": "}
                <span>{b.reason}</span>
              </div>
            ))}
          </div>
        </InfoStrip>
      ) : null}

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy({ en: "Use backend state transitions first.", vi: "Ưu tiên dùng luồng chuyển trạng thái do hệ thống kiểm soát." })}</span>
          <Badge tone="neutral">{copy({ en: "Profile completeness drives matching quality", vi: "Độ đầy đủ hồ sơ ảnh hưởng chất lượng ghép đơn" })}</Badge>
          {/* One badge, not two: the tone-carrying one below already says
              "Chưa tạo hồ sơ ứng viên" when there is no candidate, and says
              strictly more (the code) when there is. A second neutral badge
              rendered the same sentence twice side by side. */}
          <Badge tone={candidate ? "success" : "warning"}>{candidate ? `${copy({ en: "Candidate", vi: "Ứng viên" })} ${candidate.code ?? candidate.id}` : copy({ en: "No candidate created yet", vi: "Chưa tạo hồ sơ ứng viên" })}</Badge>
        </div>
      </InfoStrip>

      <CandidateWorkbench
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        defaultSection="formStandard"
        sections={[
          {
            key: "formStandard",
            content: (
              <div className="space-y-5">
                {/* The AI data used to be a sidebar section of its own, but
                    the form already offers "Dùng" inline on every field that
                    has an unverified value. It lives here, collapsed, so the
                    one screen still reaches it without being a second place
                    to go looking. */}
                <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40">
                  <button
                    type="button"
                    onClick={() => setAiVisible((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-sm font-semibold text-indigo-900">
                      {aiSuggestionCount > 0
                        ? copy({
                            en: `${aiSuggestionCount} AI values not verified yet`,
                            vi: `${aiSuggestionCount} giá trị AI chưa xác minh`
                          })
                        : copy({ en: "AI extraction", vi: "Dữ liệu AI" })}
                    </span>
                    <span className="text-xs font-medium text-indigo-700">
                      {aiVisible ? copy({ en: "Hide", vi: "Ẩn" }) : copy({ en: "Show", vi: "Xem" })}
                    </span>
                  </button>
                  {aiVisible ? (
                    <div className="space-y-6 border-t border-indigo-100 p-4">
                      <FormExtractionProgress leadId={leadId} />
                      <LeadAiSnapshotCard
                        lead={lead}
                        suggestions={suggestionsQuery.data ?? []}
                        qualification={qualificationQuery.data}
                        onVerifyAll={(patch, identityPatch) => {
                          if (Object.keys(patch).length > 0) {
                            qualificationMutation.mutate(patch);
                          }
                          // Identity fields (fullName/phone) are Lead-level, not qualification.
                          // "Verify all" verifies EVERY actionable field in the snapshot card,
                          // identity included — so persist them via updateLead (which mirrors
                          // them into lead_field_state as verified). A phone collision surfaces
                          // as an error on this mutation while the qualification save still
                          // succeeds independently.
                          if (identityPatch && Object.keys(identityPatch).length > 0) {
                            const idPatch: { fullName?: string; phone?: string } = {};
                            if (typeof identityPatch.fullName === "string") idPatch.fullName = identityPatch.fullName;
                            if (typeof identityPatch.phone === "string") idPatch.phone = identityPatch.phone;
                            if (Object.keys(idPatch).length > 0) {
                              updateLead.mutate({ id: leadId, patch: idPatch });
                            }
                          }
                        }}
                        onRerunExtraction={(scanMode) => {
                          if (selectedThreadId) {
                            runExtraction.mutate({ leadId, threadId: selectedThreadId, scanMode });
                          }
                        }}
                        onDismissSuggestion={(fn) => dismissSuggestion.mutate(fn)}
                        isDismissing={dismissSuggestion.isPending}
                        isVerifyAllPending={qualificationMutation.isPending}
                        isRerunPending={runExtraction.isPending}
                        extractionStatus={runExtraction.backgroundStatus}
                        className="border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/50"
                      />
                    </div>
                  ) : null}
                </div>

                <FormChuanEntryPanel
                  leadId={leadId}
                  lead={lead}
                  qualification={qualificationQuery.data}
                  profile={(candidate?.profile as Record<string, unknown> | null | undefined) ?? null}
                  canEdit={canEditLeads}
                  canViewPii={canViewLeadPii}
                />
              </div>
            )
          },
          // "Thông tin cơ bản" was removed here. Every field it edited now
          // lives on the FORM CHUẨN panel, which already owned all three
          // writes (lead identity, qualification, dossier) and sequenced
          // them. Keeping it meant the same lead data had two editors with
          // two different sets of labels and two save buttons.
          {
            key: "documents",
            content: (
              <div className="space-y-6">
                <Panel
                  title={<UiText id="lead.workbench.dossier.title" />}
                  subtitle={<UiText id="lead.workbench.dossier.subtitle" />}
                  action={<Badge tone={formStatusTone}>{formStatusLabel}</Badge>}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoCard
                      label={copy({ en: "Candidate", vi: "Ứng viên" })}
                      value={candidate?.code ?? candidate?.id ?? copy({ en: "Not created yet", vi: "Chưa tạo" })}
                      hint={candidate?.profile
                        ? copy({ en: "Open the dossier to review form fields and document evidence.", vi: "Mở hồ sơ để xem dữ liệu từ form và bằng chứng tài liệu." })
                        : copy({ en: "Upload and verify the standard worker form to create the candidate dossier.", vi: "Tải lên và xác minh form lao động chuẩn để tạo hồ sơ ứng viên." })}
                    />
                    <InfoCard
                      label={copy({ en: "Standard worker form", vi: "Form lao động chuẩn" })}
                      value={formStatusLabel}
                      hint={form?.updatedAt
                        ? `${copy({ en: "Last updated:", vi: "Cập nhật:" })} ${form.updatedAt}`
                        : copy({ en: "No form file on record yet.", vi: "Chưa có file form nào được lưu." })}
                    />
                  </div>

                  {!formVerified ? (
                    <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm leading-6 text-indigo-900">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-indigo-500">
                        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 8h.01M12 11v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                      </svg>
                      <span>
                        {copy({
                          en: "Standard worker form is required before the lead can advance to matching.",
                          vi: "Form lao động chuẩn là bắt buộc trước khi ứng viên có thể chuyển sang bước ghép đơn."
                        })}
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    {canManageDocuments ? (
                      <Button onClick={() => setFormModalOpen(true)}>
                        {form?.hasFile
                          ? <UiText id="journey.workbench.form.manage" />
                          : <UiText id="journey.workbench.form.upload" />}
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      onClick={() => setDossierOpen(true)}
                      disabled={!candidate?.profile}
                    >
                      {copy({ en: "Open dossier", vi: "Mở hồ sơ" })}
                    </Button>
                  </div>
                </Panel>

                <LeadDocumentsPanel leadId={leadId} />
              </div>
            ),
          },
          {
            key: "application",
            // "Ứng tuyển" and "Tiến độ & Tài chính" were two sections for one
            // job: getting this lead onto an order and through to departure.
            // Both read the same application/tf records, so splitting them
            // just made the operator click twice.
            content: (
              <div className="space-y-6">
                <Panel
                  title={<UiText id="lead.workbench.application.title" />}
                  subtitle={<UiText id="lead.workbench.application.subtitle" />}
                >
                  <ApplicationPhasePanel
                    leadId={leadId}
                    leadStatus={lead.status}
                    candidate={candidate ?? null}
                    form={form}
                    application={application}
                  />
                </Panel>
                <TrainingFinanceDetailPage embeddedRecordId={tf ? tf.id : "new"} embeddedLeadId={leadId} />
              </div>
            ),
          },
          // "Xuất cảnh" was removed here: it rendered departureDate and
          // visaDate read-only off the same `tf` record that the section
          // above owns, where training-finance-detail-page.tsx:547-548
          // renders them as editable inputs. Its third row, pipeline status,
          // is already in the page header. A whole section for a worse copy
          // of the neighbouring one.
          {
            key: "history",
            content: (
              <div className="space-y-6">
                <Panel title={<UiText id="lead.workbench.summary.title" />} subtitle={<UiText id="lead.workbench.summary.subtitle" />}>
                  <DescriptionList
                    items={[
                      { label: copy({ en: "Lead ID", vi: "Mã ứng viên tiềm năng" }), value: lead.id },
                      { label: copy({ en: "Candidate", vi: "Ứng viên" }), value: candidate?.code ?? candidate?.id ?? copy({ en: "Not created", vi: "Chưa tạo" }) },
                      { label: copy({ en: "Source", vi: "Nguồn" }), value: lead.source },
                      { label: copy({ en: "Phone", vi: "Điện thoại" }), value: lead.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" }) },
                      { label: copy({ en: "Region", vi: "Khu vực" }), value: lead.region || copy({ en: "No region", vi: "Chưa có khu vực" }) },
                      { label: copy({ en: "Created", vi: "Tạo lúc" }), value: lead.createdAt || copy({ en: "Unknown", vi: "Chưa rõ" }) },
                      { label: copy({ en: "Updated", vi: "Cập nhật lúc" }), value: lead.updatedAt || copy({ en: "Unknown", vi: "Chưa rõ" }) }
                    ]}
                  />
                </Panel>

                <Panel title={<UiText id="lead.workbench.verified-snapshot.title" />} subtitle={<UiText id="lead.workbench.verified-snapshot.subtitle" />}>
                  <DescriptionList
                    items={[
                      { label: copy({ en: "Passport", vi: "Hộ chiếu" }), value: yesNoUnknown(qualificationForm.hasPassport) },
                      { label: copy({ en: "Worked abroad", vi: "Từng đi nước ngoài" }), value: yesNoUnknown(qualificationForm.hasWorkedAbroad) },
                      { label: copy({ en: "Health fit", vi: "Sức khỏe đạt yêu cầu" }), value: yesNoUnknown(qualificationForm.healthMeetsCriteria) },
                      { label: copy({ en: "Risk history", vi: "Lịch sử rủi ro" }), value: qualificationForm.hasRiskHistory ? formatEnum(qualificationForm.hasRiskHistory) : copy({ en: "Unknown", vi: "Chưa rõ" }) }
                    ]}
                  />
                </Panel>

                {/* Conversation and the ad-hoc AI question moved here from the
                    old "Trích xuất AI" section: both are chronology, not data
                    entry, and this is the chronology section. */}
                <Panel
                  title={<UiText id="lead.workbench.conversation.title" />}
                  subtitle={<UiText id="lead.workbench.conversation.subtitle" />}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-slate-600">
                      {selectedThreadId
                        ? copy({ en: "Conversation is hidden by default to keep this workbench focused.", vi: "Hội thoại được ẩn mặc định để trang xử lý gọn hơn." })
                        : copy({ en: "No primary conversation thread is linked to this lead.", vi: "Chưa có luồng hội thoại chính được liên kết với hồ sơ này." })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setConversationVisible((value) => !value)}
                        disabled={!selectedThreadId}
                      >
                        {conversationVisible
                          ? copy({ en: "Hide conversation", vi: "Ẩn hội thoại" })
                          : copy({ en: "Show conversation", vi: "Xem hội thoại" })}
                      </Button>
                      {selectedThreadId ? (
                        <Button
                          variant="ghost"
                          onClick={() => navigate(`/conversations?threadId=${selectedThreadId}`)}
                        >
                          {copy({ en: "Open full page", vi: "Mở trang hội thoại" })}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {conversationVisible ? (
                    <div className="mt-4">
                      <LeadConversationInline thread={lead.threads?.[0]} />
                    </div>
                  ) : null}

                  {lead.threads?.length ? (
                    <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs md:grid-cols-3">
                      <div>
                        <span className="text-slate-400">{copy({ en: "Status", vi: "Trạng thái AI" })}: </span>
                        <Badge tone="warning">{lead.threads[0].analyzeStatus}</Badge>
                      </div>
                      <div>
                        <span className="text-slate-400">{copy({ en: "Last message", vi: "Tin nhắn cuối" })}: </span>
                        <span className="text-slate-600">{lead.threads[0].lastMessageAt ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">{copy({ en: "Last AI scan", vi: "AI quét gần nhất" })}: </span>
                        <span className="text-slate-600">{lead.threads[0].lastAiExtractedAt ?? "—"}</span>
                      </div>
                    </div>
                  ) : null}
                </Panel>

                <Panel
                  title={<UiText id="lead.workbench.ai-question.title" />}
                  subtitle={<UiText id="lead.workbench.ai-question.subtitle" />}
                >
                  <div className="space-y-3">
                    <InfoStrip className="border-indigo-100 bg-indigo-50/70 text-indigo-900">
                      <div className="text-sm leading-6">
                        {copy({
                          // Was "above" — the AI block now lives on the worker
                          // profile section, not in this one.
                          en: "For saved structured extraction, open the AI data strip on the worker profile.",
                          vi: "Muốn cập nhật dữ liệu trích xuất đã lưu, mở khối Dữ liệu AI ở mục Hồ sơ lao động."
                        })}
                      </div>
                    </InfoStrip>
                    <Input label={copy({ en: "Question", vi: "Câu hỏi" })} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={() => { if (selectedThreadId) aiMutation.mutate({ threadId: selectedThreadId, prompt }); }} disabled={!selectedThreadId || aiMutation.isPending}>
                        {aiMutation.isPending ? copy({ en: "Running AI query...", vi: "Đang hỏi AI..." }) : copy({ en: "Run query", vi: "Hỏi AI" })}
                      </Button>
                      <span className="text-sm text-slate-500">{selectedThreadId ? copy({ en: `Using thread ${selectedThreadId}`, vi: `Đang dùng luồng hội thoại ${selectedThreadId}` }) : copy({ en: "No thread available", vi: "Không có luồng hội thoại" })}</span>
                    </div>
                    {aiMutation.data ? renderAiQueryResult(aiMutation.data.result, copy) : null}
                  </div>
                </Panel>
              </div>
            ),
          },
        ]}
      />

      {dossierOpen ? (
        <DossierModal
          name={getLeadDisplayName(lead)}
          profile={candidate?.profile}
          onClose={() => setDossierOpen(false)}
        />
      ) : null}
      {formModalOpen ? (
        <FormIntakeModal
          leadId={leadId}
          onClose={() => setFormModalOpen(false)}
          onViewDossier={() => {
            setFormModalOpen(false);
            setDossierOpen(true);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * AI freeform query results can be either a plain string (when Gemini returns
 * unstructured text) or an arbitrary JSON object (when it returns structured
 * data, e.g. `{ extracted, summary, hasRequiredInfo }`).
 *
 * Rendering a raw object as a React child throws "Objects are not valid as a
 * React child" and unmounts the page. This helper handles both shapes:
 *   - string  → rendered inline
 *   - object  → if a `summary`/`text`/`answer` string field exists, surfaced
 *               as the headline; the full payload sits in a collapsible
 *               <details> as pretty-printed JSON
 *   - other   → fallback to JSON dump
 */
function renderAiQueryResult(
  result: string | Record<string, unknown> | null | undefined,
  copy: (value: { en: string; vi: string }) => string,
) {
  if (result === null || result === undefined) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">AI</div>
        {copy({ en: "No response.", vi: "Không có phản hồi." })}
      </div>
    );
  }

  if (typeof result === "string") {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">AI</div>
        {result}
      </div>
    );
  }

  // Object — pull a headline summary if the model included one
  const headline =
    pickStringField(result, "summary") ??
    pickStringField(result, "text") ??
    pickStringField(result, "answer") ??
    pickStringField(result, "content");

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">AI</div>
      {headline ? <div className="mb-3 whitespace-pre-wrap">{headline}</div> : null}
      <details className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {copy({ en: "Full response (JSON)", vi: "Phản hồi đầy đủ (JSON)" })}
        </summary>
        <pre className="mt-2 max-h-72 overflow-auto text-xs leading-5 text-slate-600">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function pickStringField(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function readString(value: unknown) {
  return value == null ? "" : String(value);
}

function readBooleanString(value: unknown) {
  return typeof value === "boolean" ? String(value) : "";
}

function readQualificationNote(verified: Record<string, unknown>) {
  const meta = verified._qualificationMeta as Record<string, unknown> | undefined;
  return typeof meta?.note === "string" ? meta.note : "";
}

function parseNumber(value: string) {
  return value.trim() ? Number(value) : undefined;
}

function parseBoolean(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function buildQualificationPatch(form: Record<string, string>) {
  return {
    // Canonical key as of 2026-05-28 — backend resolver treats birthYear/age
    // as semantic aliases; the form stops sending `age` so the lossy
    // `currentYear - age` derivation in syncProfileFromVerifiedLeadData is
    // skipped in favour of the operator's precise year.
    birthYear: parseNumber(form.birthYear),
    gender: form.gender || undefined,
    hasPassport: parseBoolean(form.hasPassport),
    height: parseNumber(form.height),
    weight: parseNumber(form.weight),
    experienceLevel: form.experienceLevel || undefined,
    experienceYears: parseNumber(form.experienceYears),
    hasStrongSkills: parseBoolean(form.hasStrongSkills),
    experienceField: form.experienceField || undefined,
    desiredIndustry: form.desiredIndustry || undefined,
    readyToDepartInMonths: parseNumber(form.readyToDepartInMonths),
    understandsJobNature: parseBoolean(form.understandsJobNature),
    preferredRegion: form.preferredRegion ? form.preferredRegion.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
    desiredSalary: form.desiredSalary || undefined,
    lateCancellationCount: parseNumber(form.lateCancellationCount),
    noShowCount: parseNumber(form.noShowCount),
    unreasonableCancellationCount: parseNumber(form.unreasonableCancellationCount),
    inconsistentInfoCount: parseNumber(form.inconsistentInfoCount),
    hasWorkedAbroad: parseBoolean(form.hasWorkedAbroad),
    hasCleanHistoryAbroad: parseBoolean(form.hasCleanHistoryAbroad),
    tattooStatus: form.tattooStatus || undefined,
    healthMeetsCriteria: parseBoolean(form.healthMeetsCriteria),
    hasRiskHistory: form.hasRiskHistory || undefined,
    note: form.note || undefined
  };
}
