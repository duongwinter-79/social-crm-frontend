import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
  useCreateApplicationMutation,
  useLeadAiSuggestionsQuery,
  useLeadDetailQuery,
  useLeadOrderSuggestionsQuery,
  useLeadProfileQuery,
  useLeadQualificationQuery,
  useLeadTransitionsQuery,
  useProcessThreadExtractionMutation,
  useSuggestedOrdersQuery,
  useUpdateLeadMutation,
  useUpdateLeadQualificationMutation,
  useUpsertLeadProfileMutation
} from "@social-crm/api";
import type { CandidateSuggestion, LeadOrderSuggestion, Order } from "@social-crm/api";
import { useI18n } from "../../i18n";
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
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "INTERVIEWING", "VISA_PROCESSING"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function LeadWorkbenchPage() {
  const { copy, formatLeadStatus, formatEnum, yesNoUnknown } = useI18n();
  const { leadId = "" } = useParams();
  const leadQuery = useLeadDetailQuery(leadId);
  const candidateQuery = useCandidateByLeadQuery(leadId);
  const transitionsQuery = useLeadTransitionsQuery(leadId);
  const profileQuery = useLeadProfileQuery(leadId);
  const qualificationQuery = useLeadQualificationQuery(leadId);
  const suggestionsQuery = useLeadAiSuggestionsQuery(leadId);
  const suggestedOrdersQuery = useSuggestedOrdersQuery(candidateQuery.data?.id);
  const leadOrderSuggestionsQuery = useLeadOrderSuggestionsQuery(leadId, 5);
  const updateLead = useUpdateLeadMutation();
  const createApplication = useCreateApplicationMutation();
  const profileMutation = useUpsertLeadProfileMutation(leadId);
  const qualificationMutation = useUpdateLeadQualificationMutation(leadId);
  const aiMutation = useAiQueryMutation();
  const runExtraction = useProcessThreadExtractionMutation();

  const [prompt, setPrompt] = useState("Summarize this conversation and identify any signals that the lead is high potential.");
  const [profileForm, setProfileForm] = useState({
    birthYear: "",
    gender: "",
    heightCm: "",
    weightKg: "",
    experienceField: "",
    desiredIndustry: "",
    preferredRegion: "",
    desiredSalary: ""
  });
  const [qualificationForm, setQualificationForm] = useState({
    age: "",
    gender: "",
    hasPassport: "",
    height: "",
    weight: "",
    experienceLevel: "",
    experienceYears: "",
    hasStrongSkills: "",
    readyToDepartInMonths: "",
    understandsJobNature: "",
    preferredRegion: "",
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
    if (!profileQuery.data) return;
    setProfileForm({
      birthYear: profileQuery.data.birthYear?.toString() ?? "",
      gender: profileQuery.data.gender ?? "",
      heightCm: profileQuery.data.heightCm?.toString() ?? "",
      weightKg: profileQuery.data.weightKg?.toString() ?? "",
      experienceField: profileQuery.data.experienceField ?? "",
      desiredIndustry: profileQuery.data.desiredIndustry ?? "",
      preferredRegion: profileQuery.data.preferredRegion ?? "",
      desiredSalary: profileQuery.data.desiredSalary ?? ""
    });
  }, [profileQuery.data]);

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
      readyToDepartInMonths: readString(verified.readyToDepartInMonths),
      understandsJobNature: readBooleanString(verified.understandsJobNature),
      preferredRegion: Array.isArray(verified.preferredRegion) ? verified.preferredRegion.join(", ") : readString(verified.preferredRegion),
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
  const suggestedOrders = suggestedOrdersQuery.data ?? [];
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
    return <Panel title={copy({ en: "Lead workbench", vi: "Bàn làm việc lead" })}><EmptyState title={copy({ en: "Lead not loaded", vi: "Chưa tải được lead" })} description={copy({ en: "The selected lead could not be loaded from the backend.", vi: "Không tải được lead đã chọn từ backend." })} /></Panel>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Lead workbench", vi: "Bàn làm việc lead" })}
        title={lead.fullName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" })}
        description={`${lead.source.toUpperCase()} · ${lead.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })} · ${lead.region || copy({ en: "No region", vi: "Chưa có khu vực" })}`}
      />

      {phoneMergeConflictId ? (
        <InfoStrip className="border-rose-300 bg-rose-50 text-rose-900">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="danger">{copy({ en: "Merge required", vi: "Cần gộp lead" })}</Badge>
            <span>
              {copy({
                en: "AI extracted a phone number that already belongs to another lead. The phone column was NOT auto-applied.",
                vi: "AI đã trích xuất số điện thoại trùng với một lead khác. Số điện thoại chưa được tự động áp dụng."
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
            <InfoCard label={copy({ en: "Lead score", vi: "Điểm lead" })} value={<Badge tone={(lead.leadScore ?? 0) >= 80 ? "success" : (lead.leadScore ?? 0) >= 60 ? "warning" : "neutral"}>{lead.leadScore ?? "-"}</Badge>} className="bg-slate-50" />
            <InfoCard label={copy({ en: "Classification", vi: "Phân loại" })} value={lead.leadClassification ?? copy({ en: "Unclassified", vi: "Chưa phân loại" })} className="bg-slate-50" />
            <InfoCard label={copy({ en: "Threads", vi: "Luồng hội thoại" })} value={lead.threads?.length ?? 0} className="bg-slate-50" />
          </div>
          <ToolbarActions className="xl:justify-end">
            {(transitionsQuery.data?.allowed ?? []).map((next) => {
              const blocker = (transitionsQuery.data?.blocked ?? []).find((b) => b.status === next);
              const isBlocked = Boolean(blocker);
              const isDanger = next.toLowerCase().includes("failed") || next === "disqualified";
              return (
                <span key={next} title={blocker?.reason ?? ""} className={isBlocked ? "cursor-not-allowed" : undefined}>
                  <Button
                    variant={isBlocked ? "ghost" : isDanger ? "danger" : "secondary"}
                    size="sm"
                    onClick={() => updateLead.mutate({ id: leadId, patch: { status: next } })}
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
          <span>{copy({ en: "Use backend state transitions first.", vi: "Ưu tiên dùng luồng chuyển trạng thái từ backend." })}</span>
          <Badge tone="neutral">{copy({ en: "Profile completeness drives matching quality", vi: "Độ đầy đủ hồ sơ ảnh hưởng chất lượng ghép đơn" })}</Badge>
          <Badge tone="neutral">
            {hasCandidate
              ? suggestedOrders.length
                ? copy({ en: `${suggestedOrders.length} formal suggestions`, vi: `${suggestedOrders.length} đề xuất chính thức` })
                : copy({ en: "No formal suggestions yet", vi: "Chưa có đề xuất chính thức" })
              : copy({ en: "Qualification required before formal suggestions", vi: "Cần xác minh trước khi có đề xuất chính thức" })}
          </Badge>
          <Badge tone={candidate ? "success" : "warning"}>{candidate ? `Candidate ${candidate.code ?? candidate.id}` : copy({ en: "No candidate created yet", vi: "Chưa tạo ứng viên" })}</Badge>
        </div>
      </InfoStrip>

      <LeadAiSnapshotCard
        lead={lead}
        suggestions={suggestionsQuery.data ?? []}
        qualification={qualificationQuery.data}
        onVerifyAll={(patch) => qualificationMutation.mutate(patch)}
        onRerunExtraction={() => {
          if (selectedThreadId) {
            runExtraction.mutate({ leadId, threadId: selectedThreadId });
          }
        }}
        isVerifyAllPending={qualificationMutation.isPending}
        isRerunPending={runExtraction.isPending}
        extractionStatus={runExtraction.backgroundStatus}
        className="border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/50"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Conversation", vi: "Hội thoại" })}
            subtitle={copy({
              en: "Latest messages from this lead's primary thread. Both directions captured (inbound from candidate, outbound when admin replies via Zalo OA).",
              vi: "Tin nhắn gần nhất từ thread chính. Bao gồm cả 2 chiều (lead gửi vào & admin trả lời qua Zalo OA)."
            })}
          >
            <LeadConversationInline thread={lead.threads?.[0]} />

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
            title={copy({ en: "Manual AI question", vi: "Hỏi AI thủ công" })}
            subtitle={copy({
              en: "Use this for one-off questions about the conversation. It does not update the lead profile, AI suggestions, score, or matching inputs.",
              vi: "Dùng để hỏi nhanh về hội thoại. Kết quả này không cập nhật hồ sơ lead, gợi ý AI, điểm lead hoặc dữ liệu ghép đơn."
            })}
          >
            <div className="space-y-3">
              <InfoStrip className="border-indigo-100 bg-indigo-50/70 text-indigo-900">
                <div className="text-sm leading-6">
                  {copy({
                    en: "For saved structured extraction, use the AI snapshot action above.",
                    vi: "Muốn cập nhật dữ liệu trích xuất đã lưu, dùng nút trong khối Tóm tắt AI phía trên."
                  })}
                </div>
              </InfoStrip>
              <Input label={copy({ en: "Question", vi: "Câu hỏi" })} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => { if (selectedThreadId) aiMutation.mutate({ threadId: selectedThreadId, prompt }); }} disabled={!selectedThreadId || aiMutation.isPending}>
                  {aiMutation.isPending ? copy({ en: "Running AI query...", vi: "Đang chạy truy vấn AI..." }) : copy({ en: "Run query", vi: "Chạy truy vấn" })}
                </Button>
                <span className="text-sm text-slate-500">{selectedThreadId ? copy({ en: `Using thread ${selectedThreadId}`, vi: `Đang dùng thread ${selectedThreadId}` }) : copy({ en: "No thread available", vi: "Không có thread" })}</span>
              </div>
              {aiMutation.data ? renderAiQueryResult(aiMutation.data.result, copy) : null}
            </div>
          </Panel>

          <Panel title={copy({ en: "Profile workspace", vi: "Không gian hồ sơ" })} subtitle={copy({ en: "Operator-owned structured profile mapped to the backend profile endpoint.", vi: "Hồ sơ có cấu trúc do nhân viên cập nhật và đồng bộ với endpoint profile của backend." })}>
            <FieldGroup columns={2}>
              <Input label={copy({ en: "Birth year", vi: "Năm sinh" })} value={profileForm.birthYear} onChange={(e) => setProfileForm((s) => ({ ...s, birthYear: e.target.value }))} />
              <Input label={copy({ en: "Gender", vi: "Giới tính" })} value={profileForm.gender} onChange={(e) => setProfileForm((s) => ({ ...s, gender: e.target.value }))} />
              <Input label={copy({ en: "Height (cm)", vi: "Chiều cao (cm)" })} value={profileForm.heightCm} onChange={(e) => setProfileForm((s) => ({ ...s, heightCm: e.target.value }))} />
              <Input label={copy({ en: "Weight (kg)", vi: "Cân nặng (kg)" })} value={profileForm.weightKg} onChange={(e) => setProfileForm((s) => ({ ...s, weightKg: e.target.value }))} />
              <Input label={copy({ en: "Experience field", vi: "Lĩnh vực kinh nghiệm" })} value={profileForm.experienceField} onChange={(e) => setProfileForm((s) => ({ ...s, experienceField: e.target.value }))} />
              <Input label={copy({ en: "Desired industry", vi: "Ngành mong muốn" })} value={profileForm.desiredIndustry} onChange={(e) => setProfileForm((s) => ({ ...s, desiredIndustry: e.target.value }))} />
              <Input label={copy({ en: "Preferred region", vi: "Khu vực mong muốn" })} value={profileForm.preferredRegion} onChange={(e) => setProfileForm((s) => ({ ...s, preferredRegion: e.target.value }))} />
              <Input label={copy({ en: "Desired salary", vi: "Mức lương mong muốn" })} value={profileForm.desiredSalary} onChange={(e) => setProfileForm((s) => ({ ...s, desiredSalary: e.target.value }))} />
            </FieldGroup>
            <div className="mt-4">
              <Button onClick={() => profileMutation.mutate({ birthYear: profileForm.birthYear ? Number(profileForm.birthYear) : null, gender: profileForm.gender || null, heightCm: profileForm.heightCm ? Number(profileForm.heightCm) : null, weightKg: profileForm.weightKg ? Number(profileForm.weightKg) : null, experienceField: profileForm.experienceField || null, desiredIndustry: profileForm.desiredIndustry || null, preferredRegion: profileForm.preferredRegion || null, desiredSalary: profileForm.desiredSalary || null })} disabled={profileMutation.isPending}>
                {profileMutation.isPending ? copy({ en: "Saving profile...", vi: "Đang lưu hồ sơ..." }) : copy({ en: "Save profile", vi: "Lưu hồ sơ" })}
              </Button>
            </div>
          </Panel>

          <Panel title={copy({ en: "Qualification overlay", vi: "Lớp xác minh điều kiện" })} subtitle={copy({ en: "Staff-verified fields directly influence lead score and matching.", vi: "Các trường đã được nhân viên xác minh ảnh hưởng trực tiếp đến điểm lead và kết quả ghép đơn." })}>
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
              <FieldWithProvenance
                fieldKey="experienceLevel"
                suggestion={suggestionsByField.experienceLevel}
                isVerified={isFieldVerified("experienceLevel")}
                currentValue={qualificationForm.experienceLevel}
                onApplySuggestion={(v) => setQualificationForm((s) => ({ ...s, experienceLevel: typeof v === "string" ? v : "" }))}
              >
                <Select label={copy({ en: "Experience level", vi: "Mức độ kinh nghiệm" })} value={qualificationForm.experienceLevel} onChange={(e) => setQualificationForm((s) => ({ ...s, experienceLevel: e.target.value }))}>
                  <option value="">{copy({ en: "Unknown", vi: "Chưa rõ" })}</option>
                  <option value="excellent">{copy({ en: "Excellent", vi: "Rất tốt" })}</option>
                  <option value="good">{copy({ en: "Good", vi: "Tốt" })}</option>
                  <option value="basic">{copy({ en: "Basic", vi: "Cơ bản" })}</option>
                  <option value="none">{copy({ en: "None", vi: "Không có" })}</option>
                  <option value="undisclosed">{copy({ en: "Undisclosed", vi: "Chưa khai báo" })}</option>
                </Select>
              </FieldWithProvenance>
              <Input label={copy({ en: "Experience years", vi: "Số năm kinh nghiệm" })} value={qualificationForm.experienceYears} onChange={(e) => setQualificationForm((s) => ({ ...s, experienceYears: e.target.value }))} />
              <Select label={copy({ en: "Strong skills", vi: "Kỹ năng tốt" })} value={qualificationForm.hasStrongSkills} onChange={(e) => setQualificationForm((s) => ({ ...s, hasStrongSkills: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chưa rõ" })}</option>
                <option value="true">{copy({ en: "Yes", vi: "Có" })}</option>
                <option value="false">{copy({ en: "No", vi: "Không" })}</option>
              </Select>
              <Input label={copy({ en: "Ready to depart (months)", vi: "Sẵn sàng xuất cảnh (tháng)" })} value={qualificationForm.readyToDepartInMonths} onChange={(e) => setQualificationForm((s) => ({ ...s, readyToDepartInMonths: e.target.value }))} />
              <Select label={copy({ en: "Understands job nature", vi: "Hiểu tính chất công việc" })} value={qualificationForm.understandsJobNature} onChange={(e) => setQualificationForm((s) => ({ ...s, understandsJobNature: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chưa rõ" })}</option>
                <option value="true">{copy({ en: "Yes", vi: "Có" })}</option>
                <option value="false">{copy({ en: "No", vi: "Không" })}</option>
              </Select>
              <Input label={copy({ en: "Preferred region(s)", vi: "Khu vực mong muốn" })} value={qualificationForm.preferredRegion} onChange={(e) => setQualificationForm((s) => ({ ...s, preferredRegion: e.target.value }))} />
              <Select label={copy({ en: "Worked abroad before", vi: "Từng đi nước ngoài" })} value={qualificationForm.hasWorkedAbroad} onChange={(e) => setQualificationForm((s) => ({ ...s, hasWorkedAbroad: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chưa rõ" })}</option>
                <option value="true">{copy({ en: "Yes", vi: "Có" })}</option>
                <option value="false">{copy({ en: "No", vi: "Không" })}</option>
              </Select>
              <Select label={copy({ en: "Returnee history clean", vi: "Lịch sử lao động nước ngoài tốt" })} value={qualificationForm.hasCleanHistoryAbroad} onChange={(e) => setQualificationForm((s) => ({ ...s, hasCleanHistoryAbroad: e.target.value }))}>
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
              <Button onClick={() => qualificationMutation.mutate(buildQualificationPatch(qualificationForm))} disabled={qualificationMutation.isPending}>
                {qualificationMutation.isPending ? copy({ en: "Saving qualification...", vi: "Đang lưu dữ liệu xác minh..." }) : copy({ en: "Save verified qualification", vi: "Lưu dữ liệu xác minh" })}
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={copy({ en: "Lead summary", vi: "Tóm tắt lead" })} subtitle={copy({ en: "Fast operator snapshot before taking action.", vi: "Tóm tắt nhanh trước khi thao tác." })}>
            <DescriptionList
              items={[
                { label: copy({ en: "Lead ID", vi: "Lead ID" }), value: lead.id },
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
            title={copy({ en: "Lead-stage matching suggestions", vi: "Gợi ý ghép đơn (giai đoạn lead)" })}
            subtitle={copy({
              en: "Top orders ranked by the lead-triage engine. Available immediately — no candidate record required.",
              vi: "Đơn hàng được xếp hạng bởi engine lead-triage. Hiển thị ngay từ giai đoạn sàng lọc, không cần candidate."
            })}
          >
            {leadOrderSuggestionsQuery.isLoading ? (
              <div className="text-sm text-slate-500">{copy({ en: "Ranking orders…", vi: "Đang xếp hạng đơn hàng…" })}</div>
            ) : (leadOrderSuggestionsQuery.data ?? []).length === 0 ? (
              <EmptyState
                title={copy({ en: "No orders to rank", vi: "Chưa có đơn hàng để xếp hạng" })}
                description={copy({
                  en: "Add active orders in the Orders module; matches will appear here automatically.",
                  vi: "Thêm đơn hàng đang hoạt động trong mục Orders, các đơn phù hợp sẽ tự động hiển thị tại đây."
                })}
              />
            ) : (
              <div className="space-y-3">
                {(leadOrderSuggestionsQuery.data ?? []).map((sug) => renderLeadSuggestion(sug, copy))}
              </div>
            )}
          </Panel>

          <Panel title={copy({ en: "Formal suggested orders", vi: "Đơn hàng đề xuất chính thức" })} subtitle={copy({ en: "Shown only after this lead has a linked candidate record.", vi: "Chỉ hiển thị sau khi lead có ứng viên liên kết." })}>
            {!hasCandidate ? (
              <div className="space-y-4">
                <EmptyState
                  title={copy({ en: "Candidate required before formal suggestions", vi: "Cần ứng viên trước khi có đề xuất chính thức" })}
                  description={copy({
                    en: "Complete the qualification overlay and move the lead through the backend transition to qualified. The backend creates the candidate record before formal matching and application creation.",
                    vi: "Hoàn tất lớp xác minh và chuyển lead theo luồng backend sang đủ điều kiện. Backend sẽ tạo ứng viên trước khi ghép đơn chính thức và tạo hồ sơ ứng tuyển."
                  })}
                />
                <div className="grid gap-3">
                  <InfoCard label={copy({ en: "Current lead status", vi: "Trạng thái lead hiện tại" })} value={<Badge tone={toneForStatus(lead.status)}>{formatLeadStatus(lead.status)}</Badge>} className="bg-slate-50" />
                  <InfoCard label={copy({ en: "Required operator action", vi: "Hành động cần làm" })} value={copy({ en: "Save verified qualification data, then use the allowed backend transition buttons at the top of this page.", vi: "Lưu dữ liệu xác minh, sau đó dùng nút chuyển trạng thái backend ở đầu trang." })} className="bg-slate-50" />
                  <InfoCard label={copy({ en: "Why orders are hidden", vi: "Vì sao ẩn đơn hàng" })} value={copy({ en: "Order suggestions here are candidate-stage matching results, not lead-stage catalog previews.", vi: "Đề xuất đơn hàng ở đây là kết quả matching giai đoạn ứng viên, không phải bản xem trước danh mục cho lead." })} className="bg-slate-50" />
                </div>
              </div>
            ) : suggestedOrders.length ? (
              <div className="space-y-3">
                {suggestedOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{order.name}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{order.region || copy({ en: "No region", vi: "Chưa có khu vực" })} · {order.industry || copy({ en: "No industry", vi: "Chưa có ngành" })}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {copy({ en: "Min height", vi: "Chiều cao tối thiểu" })}: {order.heightMin ? `${order.heightMin} cm` : copy({ en: "Not set", vi: "Chưa đặt" })} · {copy({ en: "Returnees", vi: "Lao động từng đi về" })}: {
                            typeof order.acceptsReturnees === "boolean"
                              ? order.acceptsReturnees
                                ? copy({ en: "Accepted", vi: "Nhận" })
                                : copy({ en: "Not accepted", vi: "Không nhận" })
                              : copy({ en: "Not set", vi: "Chưa đặt" })
                          }
                        </div>
                      </div>
                      {renderOrderBadge(order)}
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-500">{order.description || order.requirements || copy({ en: "No additional order detail available.", vi: "Không có thông tin bổ sung cho đơn hàng." })}</div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button size="sm" onClick={() => { if (!candidate?.id) return; createApplication.mutate({ candidateId: candidate.id, orderId: order.id }); }} disabled={createApplication.isPending}>
                        {createApplication.isPending ? copy({ en: "Creating...", vi: "Đang tạo..." }) : copy({ en: "Create application", vi: "Tạo hồ sơ ứng tuyển" })}
                      </Button>
                      <span className="text-xs text-slate-500">
                        {copy({ en: "Uses the linked candidate record from the recruitment API.", vi: "Sử dụng ứng viên đã liên kết từ recruitment API." })}
                      </span>
                    </div>
                  </div>
                ))}
                {createApplication.error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {copy({ en: "Application creation failed. Check whether this candidate/order application already exists or whether the backend rejected the request.", vi: "Tạo hồ sơ ứng tuyển thất bại. Kiểm tra hồ sơ ứng viên/đơn hàng đã tồn tại hoặc backend từ chối yêu cầu." })}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title={copy({ en: "No formal suggestions returned", vi: "Chưa có đề xuất chính thức" })} description={copy({ en: "The backend candidate matching suggestion endpoint did not return orders for this candidate yet. Review the verified profile and formal matching page if needed.", vi: "Endpoint đề xuất matching ứng viên chưa trả về đơn hàng cho ứng viên này. Hãy kiểm tra hồ sơ đã xác minh và trang ghép đơn chính thức nếu cần." })} />
            )}
          </Panel>

          <Panel title={copy({ en: "Verified qualification snapshot", vi: "Ảnh chụp dữ liệu đã xác minh" })} subtitle={copy({ en: "Staff-confirmed fields used for scoring and matching.", vi: "Các trường đã được nhân viên xác nhận để tính điểm và ghép đơn." })}>
            <DescriptionList
              items={[
                { label: copy({ en: "Passport", vi: "Hộ chiếu" }), value: yesNoUnknown(qualificationForm.hasPassport) },
                { label: copy({ en: "Strong skills", vi: "Kỹ năng tốt" }), value: yesNoUnknown(qualificationForm.hasStrongSkills) },
                { label: copy({ en: "Worked abroad", vi: "Từng đi nước ngoài" }), value: yesNoUnknown(qualificationForm.hasWorkedAbroad) },
                { label: copy({ en: "Health fit", vi: "Sức khỏe đạt yêu cầu" }), value: yesNoUnknown(qualificationForm.healthMeetsCriteria) },
                { label: copy({ en: "Experience level", vi: "Mức độ kinh nghiệm" }), value: qualificationForm.experienceLevel ? formatEnum(qualificationForm.experienceLevel) : copy({ en: "Unknown", vi: "Chưa rõ" }) },
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

function renderOrderBadge(order: Order | CandidateSuggestion) {
  if ("matchScore" in order && typeof order.matchScore === "number") {
    return <Badge tone="accent">{order.matchScore} pts</Badge>;
  }

  return <Badge tone="neutral">Catalog</Badge>;
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
            <Badge tone={toneForConclusion(sug.conclusion)}>{sug.conclusion}</Badge>
            <Badge tone={toneForFit(sug.preliminaryFit)}>{sug.preliminaryFit}</Badge>
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
          <span className="font-semibold">{copy({ en: "Rejected", vi: "Bị loại" })}:</span> {sug.rejectReason}
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
    readyToDepartInMonths: parseNumber(form.readyToDepartInMonths),
    understandsJobNature: parseBoolean(form.understandsJobNature),
    preferredRegion: form.preferredRegion ? form.preferredRegion.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
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
