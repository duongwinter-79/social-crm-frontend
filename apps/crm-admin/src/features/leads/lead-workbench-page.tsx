import { useEffect, useMemo, useState } from "react";
import { getLeadDisplayName, getLeadFullNameLabel } from "@/lib/lead-display";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  FieldGroup,
  InfoCard,
  InfoStrip,
  Input,
  Panel,
  Select,
  SectionHeader,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useAiQueryMutation,
  useCandidateByLeadQuery,
  useLeadAiSuggestionsQuery,
  useLeadDetailQuery,
  useLeadOrderSuggestionsQuery,
  useLeadQualificationQuery,
  useLeadTransitionsQuery,
  useProcessThreadExtractionMutation,
  useRestoreLeadMutation,
  useUpdateLeadMutation,
  useUpdateLeadQualificationMutation,
  usePermissions
} from "@social-crm/api";
import type { LeadOrderSuggestion } from "@social-crm/api";
import { useI18n } from "../../i18n";
import { type NavigationReturnState, resolveReturnState } from "@/app/navigation-state";
import {
  FieldWithProvenance,
  findPhoneMergeCandidate,
  indexSuggestions
} from "./field-with-provenance";
import { LeadConversationInline } from "./lead-conversation-inline";
import { LeadAiSnapshotCard } from "./lead-ai-snapshot-card";

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
  const { copy, formatLeadStatus, formatEnum, yesNoUnknown } = useI18n();
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
  const leadOrderSuggestionsQuery = useLeadOrderSuggestionsQuery(leadId, 5);
  const updateLead = useUpdateLeadMutation();
  const restoreLead = useRestoreLeadMutation();
  const qualificationMutation = useUpdateLeadQualificationMutation(leadId);
  const aiMutation = useAiQueryMutation();
  const runExtraction = useProcessThreadExtractionMutation();
  const { canEditLeads, isAdmin } = usePermissions();

  // Two-step disqualification: clicking "Move to disqualified" opens an inline
  // reason form; the operator types a reason and confirms. Backend rejects the
  // patch without a reason.
  const [disqualifyDraft, setDisqualifyDraft] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("Summarize this conversation and identify any signals that the lead is high potential.");
  const [conversationVisible, setConversationVisible] = useState(false);
  const [qualificationForm, setQualificationForm] = useState({
    age: "",
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
    setQualificationForm({
      age: readString(verified.age),
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
    });
  }, [qualificationQuery.data]);

  const lead = leadQuery.data;
  const candidate = candidateQuery.data;
  const selectedThreadId = useMemo(() => lead?.threads?.[0]?.id ?? "", [lead]);
  const hasCandidate = Boolean(candidate?.id);

  // Per-field provenance lookup. `verifiedKeys` lives on the lead detail.
  const suggestionsByField = useMemo(
    () => indexSuggestions(suggestionsQuery.data),
    [suggestionsQuery.data]
  );
  const verifiedKeys: string[] = Array.isArray((lead as any)?.verifiedKeys)
    ? ((lead as any).verifiedKeys as string[])
    : [];
  const isFieldVerified = (key: string) => verifiedKeys.includes(key);
  const phoneMergeConflictId = findPhoneMergeCandidate(suggestionsQuery.data);

  if (!lead) {
    return <Panel title={copy({ en: "Lead workbench", vi: "Bàn xử lý ứng viên tiềm năng" })}><EmptyState title={copy({ en: "Lead not loaded", vi: "Chưa tải được ứng viên tiềm năng" })} description={copy({ en: "The selected lead could not be loaded from the backend.", vi: "Không tải được ứng viên tiềm năng đã chọn từ API." })} /></Panel>;
  }

  return (
    <div className="space-y-6">
      <ReturnNavigation
        label={returnLabel}
        onBack={() => navigate(returnState.from)}
        copy={copy}
      />

      <SectionHeader
        eyebrow={copy({ en: "Lead workbench", vi: "Bàn xử lý ứng viên tiềm năng" })}
        title={getLeadDisplayName(lead)}
        description={[
          getLeadFullNameLabel(lead),
          `${lead.source.toUpperCase()} · ${lead.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })} · ${lead.region || copy({ en: "No region", vi: "Chưa có khu vực" })}`,
        ].filter(Boolean).join(" · ")}
      />

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
            {canEditLeads && (transitionsQuery.data?.allowed ?? []).map((next) => {
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
                        // Two-step: open the inline reason form instead of patching immediately.
                        setDisqualifyDraft("");
                        return;
                      }
                      updateLead.mutate({ id: leadId, patch: { status: next } });
                    }}
                    disabled={updateLead.isPending || isBlocked}
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
                disabled={updateLead.isPending || disqualifyDraft.trim().length === 0}
                onClick={() => {
                  updateLead.mutate(
                    { id: leadId, patch: { status: "disqualified", disqualifiedReason: disqualifyDraft.trim() } },
                    { onSuccess: () => setDisqualifyDraft(null) }
                  );
                }}
              >
                {updateLead.isPending
                  ? copy({ en: "Disqualifying…", vi: "Đang loại…" })
                  : copy({ en: "Confirm disqualify", vi: "Xác nhận loại" })}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDisqualifyDraft(null)} disabled={updateLead.isPending}>
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
          <Badge tone="neutral">
            {hasCandidate
              ? copy({ en: "Candidate record linked", vi: "Đã liên kết hồ sơ ứng viên" })
              : copy({ en: "No candidate created yet", vi: "Chưa tạo hồ sơ ứng viên" })}
          </Badge>
          <Badge tone={candidate ? "success" : "warning"}>{candidate ? `${copy({ en: "Candidate", vi: "Ứng viên" })} ${candidate.code ?? candidate.id}` : copy({ en: "No candidate created yet", vi: "Chưa tạo hồ sơ ứng viên" })}</Badge>
        </div>
      </InfoStrip>

      <LeadAiSnapshotCard
        lead={lead}
        suggestions={suggestionsQuery.data ?? []}
        qualification={qualificationQuery.data}
        onVerifyAll={(patch) => qualificationMutation.mutate(patch)}
        onRerunExtraction={(scanMode) => {
          if (selectedThreadId) {
            runExtraction.mutate({ leadId, threadId: selectedThreadId, scanMode });
          }
        }}
        isVerifyAllPending={qualificationMutation.isPending}
        isRerunPending={runExtraction.isPending}
        extractionStatus={runExtraction.backgroundStatus}
        className="border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/50"
      />

      <Panel
        title={copy({ en: "Candidate dossier", vi: "Hồ sơ ứng viên" })}
        subtitle={copy({
          en: "Full form-derived candidate data now lives on its own page, linked to the verified document record.",
          vi: "Dữ liệu ứng viên từ form đã được tách sang trang riêng và liên kết với hồ sơ đã xác minh."
        })}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">{copy({ en: "Candidate:", vi: "Ứng viên:" })}</span>{" "}
              {candidate?.code ?? candidate?.id ?? copy({ en: "Not created yet", vi: "Chưa tạo" })}
            </div>
            <div>
              {candidate?.profile
                ? copy({ en: "Open the dossier to review form fields and document evidence.", vi: "Mở hồ sơ để xem dữ liệu từ form và bằng chứng tài liệu." })
                : copy({ en: "Upload and verify the standard worker form to create the candidate dossier.", vi: "Tải lên và xác minh form lao động chuẩn để tạo hồ sơ ứng viên." })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/leads/${lead.id}/dossier`)}
              disabled={!candidate?.profile}
            >
              {copy({ en: "Open dossier", vi: "Mở hồ sơ" })}
            </Button>
            {canEditLeads && !candidate?.profile ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/applications/detail?leadId=${lead.id}`)}
              >
                {copy({ en: "Upload form", vi: "Tải form" })}
              </Button>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Conversation", vi: "Hội thoại" })}
            subtitle={copy({
              en: "Latest messages from this lead's primary thread. Both directions captured (inbound from candidate, outbound when admin replies via Zalo OA).",
              vi: "Tin nhắn gần nhất từ luồng hội thoại chính. Bao gồm cả hai chiều: ứng viên gửi vào và nhân sự trả lời qua Zalo OA."
            })}
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
            title={copy({ en: "Manual AI question", vi: "Hỏi AI về hội thoại" })}
            subtitle={copy({
              en: "Use this for one-off questions about the conversation. It does not update verified qualification, AI suggestions, score, or matching inputs.",
              vi: "Dùng để hỏi nhanh về hội thoại. Kết quả này không cập nhật dữ liệu xác minh, gợi ý AI, điểm ứng viên hoặc dữ liệu ghép đơn."
            })}
          >
            <div className="space-y-3">
              <InfoStrip className="border-indigo-100 bg-indigo-50/70 text-indigo-900">
                <div className="text-sm leading-6">
                  {copy({
                    en: "For saved structured extraction, use the AI snapshot action above.",
                    vi: "Muốn cập nhật dữ liệu trích xuất đã lưu, dùng nút trong khối Dữ liệu AI phía trên."
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

          <Panel title={copy({ en: "Qualification overlay", vi: "Lớp xác minh điều kiện" })} subtitle={copy({ en: "Staff-verified fields directly influence lead score and matching.", vi: "Các trường đã được nhân viên xác minh ảnh hưởng trực tiếp đến điểm ứng viên và kết quả ghép đơn." })}>
            <FieldGroup columns={2}>
              <FieldWithProvenance
                fieldKey="age"
                suggestion={suggestionsByField.age}
                isVerified={isFieldVerified("age")}
                currentValue={qualificationForm.age}
                onApplySuggestion={(v) => setQualificationForm((s) => ({ ...s, age: v == null ? "" : String(v) }))}
              >
                <Input label={copy({ en: "Verified age", vi: "Tuổi đã xác minh" })} value={qualificationForm.age} onChange={(e) => setQualificationForm((s) => ({ ...s, age: e.target.value }))} />
              </FieldWithProvenance>
              <FieldWithProvenance
                fieldKey="gender"
                suggestion={suggestionsByField.gender}
                isVerified={isFieldVerified("gender")}
                currentValue={qualificationForm.gender}
                onApplySuggestion={(v) => setQualificationForm((s) => ({ ...s, gender: typeof v === "string" ? v : "" }))}
              >
                <Select label={copy({ en: "Verified gender", vi: "Giới tính đã xác minh" })} value={qualificationForm.gender} onChange={(e) => setQualificationForm((s) => ({ ...s, gender: e.target.value }))}>
                  <option value="">{copy({ en: "Unspecified", vi: "Chưa xác định" })}</option>
                  <option value="male">{copy({ en: "Male", vi: "Nam" })}</option>
                  <option value="female">{copy({ en: "Female", vi: "Nữ" })}</option>
                  <option value="other">{copy({ en: "Other", vi: "Khác" })}</option>
                </Select>
              </FieldWithProvenance>
              <FieldWithProvenance
                fieldKey="hasPassport"
                suggestion={suggestionsByField.hasPassport}
                isVerified={isFieldVerified("hasPassport")}
                currentValue={qualificationForm.hasPassport}
              >
                <Select label={copy({ en: "Has passport", vi: "Có hộ chiếu" })} value={qualificationForm.hasPassport} onChange={(e) => setQualificationForm((s) => ({ ...s, hasPassport: e.target.value }))}>
                  <option value="">{copy({ en: "Unknown", vi: "Chưa rõ" })}</option>
                  <option value="true">{copy({ en: "Yes", vi: "Có" })}</option>
                  <option value="false">{copy({ en: "No", vi: "Không" })}</option>
                </Select>
              </FieldWithProvenance>
              <FieldWithProvenance
                fieldKey="height"
                suggestion={suggestionsByField.heightCm ?? suggestionsByField.height}
                isVerified={isFieldVerified("height") || isFieldVerified("heightCm")}
                currentValue={qualificationForm.height}
                onApplySuggestion={(v) => setQualificationForm((s) => ({ ...s, height: v == null ? "" : String(v) }))}
              >
                <Input label={copy({ en: "Verified height (cm)", vi: "Chiều cao đã xác minh (cm)" })} value={qualificationForm.height} onChange={(e) => setQualificationForm((s) => ({ ...s, height: e.target.value }))} />
              </FieldWithProvenance>
              <FieldWithProvenance
                fieldKey="weight"
                suggestion={suggestionsByField.weightKg ?? suggestionsByField.weight}
                isVerified={isFieldVerified("weight") || isFieldVerified("weightKg")}
                currentValue={qualificationForm.weight}
                onApplySuggestion={(v) => setQualificationForm((s) => ({ ...s, weight: v == null ? "" : String(v) }))}
              >
                <Input label={copy({ en: "Verified weight (kg)", vi: "Cân nặng đã xác minh (kg)" })} value={qualificationForm.weight} onChange={(e) => setQualificationForm((s) => ({ ...s, weight: e.target.value }))} />
              </FieldWithProvenance>
              <Input label={copy({ en: "Experience years", vi: "Số năm kinh nghiệm" })} value={qualificationForm.experienceYears} onChange={(e) => setQualificationForm((s) => ({ ...s, experienceYears: e.target.value }))} />
              <FieldWithProvenance
                fieldKey="experienceField"
                suggestion={suggestionsByField.experienceField}
                isVerified={isFieldVerified("experienceField")}
                currentValue={qualificationForm.experienceField}
                onApplySuggestion={(v) => setQualificationForm((s) => ({ ...s, experienceField: typeof v === "string" ? v : "" }))}
              >
                <Input label={copy({ en: "Experience field", vi: "Lĩnh vực kinh nghiệm" })} value={qualificationForm.experienceField} onChange={(e) => setQualificationForm((s) => ({ ...s, experienceField: e.target.value }))} />
              </FieldWithProvenance>
              <FieldWithProvenance
                fieldKey="desiredIndustry"
                suggestion={suggestionsByField.desiredIndustry}
                isVerified={isFieldVerified("desiredIndustry")}
                currentValue={qualificationForm.desiredIndustry}
                onApplySuggestion={(v) => setQualificationForm((s) => ({ ...s, desiredIndustry: typeof v === "string" ? v : "" }))}
              >
                <Input label={copy({ en: "Desired industry", vi: "Ngành mong muốn" })} value={qualificationForm.desiredIndustry} onChange={(e) => setQualificationForm((s) => ({ ...s, desiredIndustry: e.target.value }))} />
              </FieldWithProvenance>
              <Input label={copy({ en: "Ready to depart (months)", vi: "Sẵn sàng xuất cảnh (tháng)" })} value={qualificationForm.readyToDepartInMonths} onChange={(e) => setQualificationForm((s) => ({ ...s, readyToDepartInMonths: e.target.value }))} />
              <FieldWithProvenance
                fieldKey="preferredRegion"
                suggestion={suggestionsByField.preferredRegion ?? suggestionsByField.preferredRegions}
                isVerified={isFieldVerified("preferredRegion") || isFieldVerified("preferredRegions")}
                currentValue={qualificationForm.preferredRegion}
                onApplySuggestion={(v) => setQualificationForm((s) => ({ ...s, preferredRegion: Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v) }))}
              >
                <Input label={copy({ en: "Preferred region(s)", vi: "Khu vực mong muốn" })} value={qualificationForm.preferredRegion} onChange={(e) => setQualificationForm((s) => ({ ...s, preferredRegion: e.target.value }))} />
              </FieldWithProvenance>
              <FieldWithProvenance
                fieldKey="desiredSalary"
                suggestion={suggestionsByField.desiredSalary}
                isVerified={isFieldVerified("desiredSalary")}
                currentValue={qualificationForm.desiredSalary}
                onApplySuggestion={(v) => setQualificationForm((s) => ({ ...s, desiredSalary: v == null ? "" : String(v) }))}
              >
                <Input label={copy({ en: "Desired salary", vi: "Mức lương mong muốn" })} value={qualificationForm.desiredSalary} onChange={(e) => setQualificationForm((s) => ({ ...s, desiredSalary: e.target.value }))} />
              </FieldWithProvenance>
              <Select label={copy({ en: "Worked abroad before", vi: "Từng đi nước ngoài" })} value={qualificationForm.hasWorkedAbroad} onChange={(e) => setQualificationForm((s) => ({ ...s, hasWorkedAbroad: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chưa rõ" })}</option>
                <option value="true">{copy({ en: "Yes", vi: "Có" })}</option>
                <option value="false">{copy({ en: "No", vi: "Không" })}</option>
              </Select>
              <Select label={copy({ en: "Tattoo risk", vi: "Rủi ro hình xăm" })} value={qualificationForm.tattooStatus} onChange={(e) => setQualificationForm((s) => ({ ...s, tattooStatus: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chưa rõ" })}</option>
                <option value="none">{copy({ en: "None", vi: "Không có" })}</option>
                <option value="hidden">{copy({ en: "Hidden", vi: "Ẩn" })}</option>
                <option value="small">{copy({ en: "Small / coverable", vi: "Nhỏ / che được" })}</option>
                <option value="visible">{copy({ en: "Visible", vi: "Lộ rõ" })}</option>
                <option value="offensive">{copy({ en: "Offensive", vi: "Phản cảm" })}</option>
                <option value="forbidden_zone">{copy({ en: "Forbidden zone", vi: "Vùng cấm" })}</option>
              </Select>
              <Select label={copy({ en: "Mandatory health fit", vi: "Sức khỏe đạt yêu cầu" })} value={qualificationForm.healthMeetsCriteria} onChange={(e) => setQualificationForm((s) => ({ ...s, healthMeetsCriteria: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chưa rõ" })}</option>
                <option value="true">{copy({ en: "Pass", vi: "Đạt" })}</option>
                <option value="false">{copy({ en: "Fail", vi: "Không đạt" })}</option>
              </Select>
              <Select label={copy({ en: "Risk history", vi: "Lịch sử rủi ro" })} value={qualificationForm.hasRiskHistory} onChange={(e) => setQualificationForm((s) => ({ ...s, hasRiskHistory: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chưa rõ" })}</option>
                <option value="none">{copy({ en: "None", vi: "Không có" })}</option>
                <option value="dropped_deposit">{copy({ en: "Dropped deposit", vi: "Bỏ cọc" })}</option>
                <option value="canceled_late">{copy({ en: "Canceled late", vi: "Hủy muộn" })}</option>
                <option value="fake_profile">{copy({ en: "Fake profile", vi: "Hồ sơ giả" })}</option>
              </Select>
              <Input label={copy({ en: "Late cancellation count", vi: "Số lần hủy muộn" })} value={qualificationForm.lateCancellationCount} onChange={(e) => setQualificationForm((s) => ({ ...s, lateCancellationCount: e.target.value }))} />
              <Input label={copy({ en: "No-show count", vi: "Số lần vắng mặt" })} value={qualificationForm.noShowCount} onChange={(e) => setQualificationForm((s) => ({ ...s, noShowCount: e.target.value }))} />
              <Input label={copy({ en: "Unreasonable cancellation count", vi: "Số lần hủy vô lý" })} value={qualificationForm.unreasonableCancellationCount} onChange={(e) => setQualificationForm((s) => ({ ...s, unreasonableCancellationCount: e.target.value }))} />
              <Input label={copy({ en: "Verified inconsistency count", vi: "Số lần thông tin không nhất quán" })} value={qualificationForm.inconsistentInfoCount} onChange={(e) => setQualificationForm((s) => ({ ...s, inconsistentInfoCount: e.target.value }))} />
            </FieldGroup>
            <div className="mt-4">
              <Input label={copy({ en: "Qualification note", vi: "Ghi chú xác minh" })} value={qualificationForm.note} onChange={(e) => setQualificationForm((s) => ({ ...s, note: e.target.value }))} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {canEditLeads ? (
                <Button onClick={() => qualificationMutation.mutate(buildQualificationPatch(qualificationForm))} disabled={qualificationMutation.isPending}>
                  {qualificationMutation.isPending ? copy({ en: "Saving qualification...", vi: "Đang lưu dữ liệu xác minh..." }) : copy({ en: "Save verified qualification", vi: "Lưu dữ liệu xác minh" })}
                </Button>
              ) : (
                <span className="text-xs italic text-slate-500">
                  {copy({ en: "Read-only — requires edit_leads permission", vi: "Chỉ xem — cần quyền edit_leads để lưu" })}
                </span>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={copy({ en: "Lead summary", vi: "Tóm tắt ứng viên tiềm năng" })} subtitle={copy({ en: "Fast operator snapshot before taking action.", vi: "Thông tin nhanh để nhân sự quyết định bước xử lý tiếp theo." })}>
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

          <Panel
            title={copy({ en: "Lead-stage matching suggestions", vi: "Gợi ý ghép đơn sơ bộ" })}
            subtitle={copy({
              en: "Top orders ranked by the lead-triage engine. Available immediately — no candidate record required.",
              vi: "Đơn hàng được xếp hạng từ dữ liệu sàng lọc sơ bộ. Có thể xem ngay từ giai đoạn tiếp nhận, chưa cần tạo hồ sơ ứng viên chính thức."
            })}
          >
            {leadOrderSuggestionsQuery.isLoading ? (
              <div className="text-sm text-slate-500">{copy({ en: "Ranking orders…", vi: "Đang xếp hạng đơn hàng…" })}</div>
            ) : (leadOrderSuggestionsQuery.data ?? []).length === 0 ? (
              <EmptyState
                title={copy({ en: "No orders to rank", vi: "Chưa có đơn hàng để xếp hạng" })}
                description={copy({
                  en: "Add active orders in the Orders module; matches will appear here automatically.",
                  vi: "Thêm đơn hàng đang hoạt động trong mục Đơn hàng, các đơn phù hợp sẽ tự động hiển thị tại đây."
                })}
              />
            ) : (
              <div className="space-y-3">
                {(leadOrderSuggestionsQuery.data ?? []).map((sug) => renderLeadSuggestion(sug, copy, formatEnum))}
              </div>
            )}
          </Panel>

          {canEditLeads ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
              <div className="text-sm text-indigo-900">
                {copy({
                  en: "Standard worker form is required before the lead can advance to matching.",
                  vi: "Form lao động chuẩn là bắt buộc trước khi ứng viên có thể chuyển sang bước ghép đơn."
                })}
              </div>
              <Button
                variant="secondary"
                onClick={() => navigate(`/applications/detail?leadId=${lead.id}`)}
              >
                {copy({ en: "Upload application file →", vi: "Tải hồ sơ ứng tuyển →" })}
              </Button>
            </div>
          ) : null}

          <Panel title={copy({ en: "Verified qualification snapshot", vi: "Dữ liệu xác minh đã lưu" })} subtitle={copy({ en: "Staff-confirmed fields used for scoring and matching.", vi: "Các trường nhân sự đã xác nhận để tính điểm và ghép đơn." })}>
            <DescriptionList
              items={[
                { label: copy({ en: "Passport", vi: "Hộ chiếu" }), value: yesNoUnknown(qualificationForm.hasPassport) },
                { label: copy({ en: "Worked abroad", vi: "Từng đi nước ngoài" }), value: yesNoUnknown(qualificationForm.hasWorkedAbroad) },
                { label: copy({ en: "Health fit", vi: "Sức khỏe đạt yêu cầu" }), value: yesNoUnknown(qualificationForm.healthMeetsCriteria) },
                { label: copy({ en: "Risk history", vi: "Lịch sử rủi ro" }), value: qualificationForm.hasRiskHistory ? formatEnum(qualificationForm.hasRiskHistory) : copy({ en: "Unknown", vi: "Chưa rõ" }) }
              ]}
            />
            <pre className="mt-4 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(qualificationQuery.data?.verifiedData ?? lead.verifiedProfileData ?? {}, null, 2)}</pre>
          </Panel>
        </div>
      </div>
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

function toneForConclusion(conclusion: string) {
  if (conclusion === "high_priority") return "success" as const;
  if (conclusion === "conditional") return "warning" as const;
  if (conclusion === "limited") return "neutral" as const;
  return "danger" as const;
}

function toneForFit(fit: LeadOrderSuggestion["preliminaryFit"]) {
  if (fit === "promising") return "success" as const;
  if (fit === "needs_review") return "warning" as const;
  if (fit === "insufficient_data") return "neutral" as const;
  return "danger" as const;
}

function renderLeadSuggestion(
  sug: LeadOrderSuggestion,
  copy: (value: { en: string; vi: string }) => string,
  formatEnum: (value: string) => string,
) {
  return (
    <div
      key={sug.id}
      className={`rounded-2xl border p-4 ${sug.isEligible ? "border-slate-200 bg-slate-50" : "border-rose-200 bg-rose-50/40"
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold text-slate-900">{sug.name}</div>
            <Badge tone={toneForConclusion(sug.conclusion)}>{formatEnum(sug.conclusion)}</Badge>
            <Badge tone={toneForFit(sug.preliminaryFit)}>{formatEnum(sug.preliminaryFit)}</Badge>
            {sug.requiresManagerApproval ? (
              <Badge tone="warning">{copy({ en: "Manager approval", vi: "Cần duyệt quản lý" })}</Badge>
            ) : null}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {sug.region || copy({ en: "No region", vi: "Chưa có khu vực" })} ·{" "}
            {sug.industry || copy({ en: "No industry", vi: "Chưa có ngành" })}
            {sug.salaryRange ? ` · ${sug.salaryRange}` : ""}
          </div>
        </div>
        <Badge tone={sug.isEligible ? "accent" : "danger"}>{sug.matchScore} pts</Badge>
      </div>

      {sug.rejectReason ? (
        <div className="mt-2 text-xs text-rose-700">
          <span className="font-semibold">
            {copy({ en: "Order fit issue", vi: "Không hợp đơn này" })}:
          </span>{" "}
          {sug.rejectReason}
        </div>
      ) : null}

      {sug.flags?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sug.flags.map((flag, idx) => (
            <span key={idx} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              {flag}
            </span>
          ))}
        </div>
      ) : null}

      {sug.missingRequirements?.length ? (
        <div className="mt-2 text-xs text-slate-500">
          <span className="font-semibold">{copy({ en: "Missing", vi: "Còn thiếu" })}:</span>{" "}
          {sug.missingRequirements.join(", ")}
        </div>
      ) : null}
    </div>
  );
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
    age: parseNumber(form.age),
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
