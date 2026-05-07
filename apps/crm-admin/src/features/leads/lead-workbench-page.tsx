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
  useLeadDetailQuery,
  useLeadProfileQuery,
  useLeadQualificationQuery,
  useLeadTransitionsQuery,
  useSuggestedOrdersQuery,
  useUpdateLeadMutation,
  useUpdateLeadQualificationMutation,
  useUpsertLeadProfileMutation
} from "@social-crm/api";
import type { CandidateSuggestion, Order } from "@social-crm/api";
import { useI18n } from "../../i18n";

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
  const suggestedOrdersQuery = useSuggestedOrdersQuery(candidateQuery.data?.id);
  const updateLead = useUpdateLeadMutation();
  const createApplication = useCreateApplicationMutation();
  const profileMutation = useUpsertLeadProfileMutation(leadId);
  const qualificationMutation = useUpdateLeadQualificationMutation(leadId);
  const aiMutation = useAiQueryMutation();

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

  if (!lead) {
    return <Panel title={copy({ en: "Lead workbench", vi: "Ban lam viec lead" })}><EmptyState title={copy({ en: "Lead not loaded", vi: "Chua tai duoc lead" })} description={copy({ en: "The selected lead could not be loaded from the backend.", vi: "Khong tai duoc lead da chon tu backend." })} /></Panel>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Lead workbench", vi: "Ban lam viec lead" })}
        title={lead.fullName || copy({ en: "Unnamed lead", vi: "Lead chua co ten" })}
        description={`${lead.source.toUpperCase()} · ${lead.phone || copy({ en: "No phone", vi: "Khong co so dien thoai" })} · ${lead.region || copy({ en: "No region", vi: "Khong co khu vuc" })}`}
      />

      <Toolbar compact className="border-slate-200/90">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 md:grid-cols-4 xl:flex-1">
            <InfoCard label={copy({ en: "Status", vi: "Trang thai" })} value={<Badge tone={toneForStatus(lead.status)}>{formatLeadStatus(lead.status)}</Badge>} className="bg-slate-50" />
            <InfoCard label={copy({ en: "Lead score", vi: "Diem lead" })} value={<Badge tone={(lead.leadScore ?? 0) >= 80 ? "success" : (lead.leadScore ?? 0) >= 60 ? "warning" : "neutral"}>{lead.leadScore ?? "-"}</Badge>} className="bg-slate-50" />
            <InfoCard label={copy({ en: "Classification", vi: "Phan loai" })} value={lead.leadClassification ?? copy({ en: "Unclassified", vi: "Chua phan loai" })} className="bg-slate-50" />
            <InfoCard label={copy({ en: "Threads", vi: "Luong hoi thoai" })} value={lead.threads?.length ?? 0} className="bg-slate-50" />
          </div>
          <ToolbarActions className="xl:justify-end">
            {(transitionsQuery.data?.allowed ?? []).map((next) => (
              <Button key={next} variant={next.includes("FAILED") || next === "DISQUALIFIED" ? "danger" : "secondary"} size="sm" onClick={() => updateLead.mutate({ id: leadId, patch: { status: next } })} disabled={updateLead.isPending}>
                {copy({ en: "Move to", vi: "Chuyen sang" })} {formatLeadStatus(next)}
              </Button>
            ))}
          </ToolbarActions>
        </div>
      </Toolbar>

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy({ en: "Use backend state transitions first.", vi: "Uu tien dung luong chuyen trang thai tu backend." })}</span>
          <Badge tone="neutral">{copy({ en: "Profile completeness drives matching quality", vi: "Do day du ho so anh huong chat luong ghep don" })}</Badge>
          <Badge tone="neutral">
            {hasCandidate
              ? suggestedOrders.length
                ? copy({ en: `${suggestedOrders.length} formal suggestions`, vi: `${suggestedOrders.length} de xuat chinh thuc` })
                : copy({ en: "No formal suggestions yet", vi: "Chua co de xuat chinh thuc" })
              : copy({ en: "Qualification required before formal suggestions", vi: "Can xac minh truoc khi de xuat chinh thuc" })}
          </Badge>
          <Badge tone={candidate ? "success" : "warning"}>{candidate ? `Candidate ${candidate.code ?? candidate.id}` : copy({ en: "No candidate created yet", vi: "Chua tao candidate" })}</Badge>
        </div>
      </InfoStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-6">
          <Panel title={copy({ en: "Conversation and thread context", vi: "Ngu canh hoi thoai va thread" })} subtitle={copy({ en: "Focus on thread health, AI extraction timing, and operator review.", vi: "Tap trung vao suc khoe thread, thoi diem AI trich xuat va danh gia cua nhan vien." })}>
            {lead.threads?.length ? (
              <div className="space-y-4">
                {lead.threads.map((thread) => (
                  <div key={thread.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{thread.channel}</Badge>
                      <Badge tone="warning">{thread.analyzeStatus}</Badge>
                      <span className="text-xs text-slate-500">Thread {thread.id}</span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <InfoCard label={copy({ en: "Last message", vi: "Tin nhan cuoi" })} value={thread.lastMessageAt ?? copy({ en: "Unknown", vi: "Chua ro" })} />
                      <InfoCard label={copy({ en: "Last AI extraction", vi: "Lan AI trich xuat cuoi" })} value={thread.lastAiExtractedAt ?? copy({ en: "Never", vi: "Chua tung" })} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={copy({ en: "No threads on this lead", vi: "Lead nay chua co thread" })} description={copy({ en: "Webhook ingestion may not have attached conversation threads yet.", vi: "Webhook co the chua gan hoi thoai vao lead nay." })} />
            )}
          </Panel>

          <Panel title={copy({ en: "AI operator query", vi: "Truy van AI cho nhan vien" })} subtitle={copy({ en: "Run a manual prompt against the first available thread.", vi: "Chay prompt thu cong tren thread dau tien co san." })}>
            <div className="space-y-3">
              <Input label="Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => { if (selectedThreadId) aiMutation.mutate({ threadId: selectedThreadId, prompt }); }} disabled={!selectedThreadId || aiMutation.isPending}>
                  {aiMutation.isPending ? copy({ en: "Running AI query...", vi: "Dang chay truy van AI..." }) : copy({ en: "Run query", vi: "Chay truy van" })}
                </Button>
                <span className="text-sm text-slate-500">{selectedThreadId ? copy({ en: `Using thread ${selectedThreadId}`, vi: `Dang dung thread ${selectedThreadId}` }) : copy({ en: "No thread available", vi: "Khong co thread" })}</span>
              </div>
              {aiMutation.data ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">AI</div>
                  {aiMutation.data.result}
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel title={copy({ en: "Profile workspace", vi: "Khong gian ho so" })} subtitle={copy({ en: "Operator-owned structured profile mapped to the backend profile endpoint.", vi: "Ho so cau truc do nhan vien cap nhat va dong bo voi endpoint profile cua backend." })}>
            <FieldGroup columns={2}>
              <Input label={copy({ en: "Birth year", vi: "Nam sinh" })} value={profileForm.birthYear} onChange={(e) => setProfileForm((s) => ({ ...s, birthYear: e.target.value }))} />
              <Input label={copy({ en: "Gender", vi: "Gioi tinh" })} value={profileForm.gender} onChange={(e) => setProfileForm((s) => ({ ...s, gender: e.target.value }))} />
              <Input label={copy({ en: "Height (cm)", vi: "Chieu cao (cm)" })} value={profileForm.heightCm} onChange={(e) => setProfileForm((s) => ({ ...s, heightCm: e.target.value }))} />
              <Input label={copy({ en: "Weight (kg)", vi: "Can nang (kg)" })} value={profileForm.weightKg} onChange={(e) => setProfileForm((s) => ({ ...s, weightKg: e.target.value }))} />
              <Input label={copy({ en: "Experience field", vi: "Linh vuc kinh nghiem" })} value={profileForm.experienceField} onChange={(e) => setProfileForm((s) => ({ ...s, experienceField: e.target.value }))} />
              <Input label={copy({ en: "Desired industry", vi: "Nganh mong muon" })} value={profileForm.desiredIndustry} onChange={(e) => setProfileForm((s) => ({ ...s, desiredIndustry: e.target.value }))} />
              <Input label={copy({ en: "Preferred region", vi: "Khu vuc mong muon" })} value={profileForm.preferredRegion} onChange={(e) => setProfileForm((s) => ({ ...s, preferredRegion: e.target.value }))} />
              <Input label={copy({ en: "Desired salary", vi: "Muc luong mong muon" })} value={profileForm.desiredSalary} onChange={(e) => setProfileForm((s) => ({ ...s, desiredSalary: e.target.value }))} />
            </FieldGroup>
            <div className="mt-4">
              <Button onClick={() => profileMutation.mutate({ birthYear: profileForm.birthYear ? Number(profileForm.birthYear) : null, gender: profileForm.gender || null, heightCm: profileForm.heightCm ? Number(profileForm.heightCm) : null, weightKg: profileForm.weightKg ? Number(profileForm.weightKg) : null, experienceField: profileForm.experienceField || null, desiredIndustry: profileForm.desiredIndustry || null, preferredRegion: profileForm.preferredRegion || null, desiredSalary: profileForm.desiredSalary || null })} disabled={profileMutation.isPending}>
                {profileMutation.isPending ? copy({ en: "Saving profile...", vi: "Dang luu ho so..." }) : copy({ en: "Save profile", vi: "Luu ho so" })}
              </Button>
            </div>
          </Panel>

          <Panel title={copy({ en: "Qualification overlay", vi: "Lop xac minh dieu kien" })} subtitle={copy({ en: "Staff-verified fields directly influence lead score and matching.", vi: "Cac truong da xac minh boi nhan vien anh huong truc tiep den diem lead va ghep don." })}>
            <FieldGroup columns={2}>
              <Input label={copy({ en: "Verified age", vi: "Tuoi da xac minh" })} value={qualificationForm.age} onChange={(e) => setQualificationForm((s) => ({ ...s, age: e.target.value }))} />
              <Select label={copy({ en: "Verified gender", vi: "Gioi tinh da xac minh" })} value={qualificationForm.gender} onChange={(e) => setQualificationForm((s) => ({ ...s, gender: e.target.value }))}>
                <option value="">{copy({ en: "Unspecified", vi: "Chua xac dinh" })}</option>
                <option value="male">{copy({ en: "Male", vi: "Nam" })}</option>
                <option value="female">{copy({ en: "Female", vi: "Nu" })}</option>
                <option value="other">{copy({ en: "Other", vi: "Khac" })}</option>
              </Select>
              <Select label={copy({ en: "Has passport", vi: "Co ho chieu" })} value={qualificationForm.hasPassport} onChange={(e) => setQualificationForm((s) => ({ ...s, hasPassport: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chua ro" })}</option>
                <option value="true">{copy({ en: "Yes", vi: "Co" })}</option>
                <option value="false">{copy({ en: "No", vi: "Khong" })}</option>
              </Select>
              <Input label={copy({ en: "Verified height (cm)", vi: "Chieu cao da xac minh (cm)" })} value={qualificationForm.height} onChange={(e) => setQualificationForm((s) => ({ ...s, height: e.target.value }))} />
              <Input label={copy({ en: "Verified weight (kg)", vi: "Can nang da xac minh (kg)" })} value={qualificationForm.weight} onChange={(e) => setQualificationForm((s) => ({ ...s, weight: e.target.value }))} />
              <Select label={copy({ en: "Experience level", vi: "Muc do kinh nghiem" })} value={qualificationForm.experienceLevel} onChange={(e) => setQualificationForm((s) => ({ ...s, experienceLevel: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chua ro" })}</option>
                <option value="excellent">{copy({ en: "Excellent", vi: "Rat tot" })}</option>
                <option value="good">{copy({ en: "Good", vi: "Tot" })}</option>
                <option value="basic">{copy({ en: "Basic", vi: "Co ban" })}</option>
                <option value="none">{copy({ en: "None", vi: "Khong co" })}</option>
                <option value="undisclosed">{copy({ en: "Undisclosed", vi: "Chua khai bao" })}</option>
              </Select>
              <Input label={copy({ en: "Experience years", vi: "So nam kinh nghiem" })} value={qualificationForm.experienceYears} onChange={(e) => setQualificationForm((s) => ({ ...s, experienceYears: e.target.value }))} />
              <Select label={copy({ en: "Strong skills", vi: "Ky nang tot" })} value={qualificationForm.hasStrongSkills} onChange={(e) => setQualificationForm((s) => ({ ...s, hasStrongSkills: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chua ro" })}</option>
                <option value="true">{copy({ en: "Yes", vi: "Co" })}</option>
                <option value="false">{copy({ en: "No", vi: "Khong" })}</option>
              </Select>
              <Input label={copy({ en: "Ready to depart (months)", vi: "San sang xuat canh (thang)" })} value={qualificationForm.readyToDepartInMonths} onChange={(e) => setQualificationForm((s) => ({ ...s, readyToDepartInMonths: e.target.value }))} />
              <Select label={copy({ en: "Understands job nature", vi: "Hieu tinh chat cong viec" })} value={qualificationForm.understandsJobNature} onChange={(e) => setQualificationForm((s) => ({ ...s, understandsJobNature: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chua ro" })}</option>
                <option value="true">{copy({ en: "Yes", vi: "Co" })}</option>
                <option value="false">{copy({ en: "No", vi: "Khong" })}</option>
              </Select>
              <Input label={copy({ en: "Preferred region(s)", vi: "Khu vuc mong muon" })} value={qualificationForm.preferredRegion} onChange={(e) => setQualificationForm((s) => ({ ...s, preferredRegion: e.target.value }))} />
              <Select label={copy({ en: "Worked abroad before", vi: "Tung di nuoc ngoai" })} value={qualificationForm.hasWorkedAbroad} onChange={(e) => setQualificationForm((s) => ({ ...s, hasWorkedAbroad: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chua ro" })}</option>
                <option value="true">{copy({ en: "Yes", vi: "Co" })}</option>
                <option value="false">{copy({ en: "No", vi: "Khong" })}</option>
              </Select>
              <Select label={copy({ en: "Returnee history clean", vi: "Lich su lao dong nuoc ngoai tot" })} value={qualificationForm.hasCleanHistoryAbroad} onChange={(e) => setQualificationForm((s) => ({ ...s, hasCleanHistoryAbroad: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chua ro" })}</option>
                <option value="true">{copy({ en: "Yes", vi: "Co" })}</option>
                <option value="false">{copy({ en: "No", vi: "Khong" })}</option>
              </Select>
              <Select label={copy({ en: "Tattoo risk", vi: "Rui ro hinh xam" })} value={qualificationForm.tattooStatus} onChange={(e) => setQualificationForm((s) => ({ ...s, tattooStatus: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chua ro" })}</option>
                <option value="none">{copy({ en: "None", vi: "Khong co" })}</option>
                <option value="hidden">{copy({ en: "Hidden", vi: "An" })}</option>
                <option value="small">{copy({ en: "Small / coverable", vi: "Nho / che duoc" })}</option>
                <option value="visible">{copy({ en: "Visible", vi: "Lo ro" })}</option>
                <option value="offensive">{copy({ en: "Offensive", vi: "Phan cam" })}</option>
                <option value="forbidden_zone">{copy({ en: "Forbidden zone", vi: "Vung cam" })}</option>
              </Select>
              <Select label={copy({ en: "Mandatory health fit", vi: "Suc khoe dat yeu cau" })} value={qualificationForm.healthMeetsCriteria} onChange={(e) => setQualificationForm((s) => ({ ...s, healthMeetsCriteria: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chua ro" })}</option>
                <option value="true">{copy({ en: "Pass", vi: "Dat" })}</option>
                <option value="false">{copy({ en: "Fail", vi: "Khong dat" })}</option>
              </Select>
              <Select label={copy({ en: "Risk history", vi: "Lich su rui ro" })} value={qualificationForm.hasRiskHistory} onChange={(e) => setQualificationForm((s) => ({ ...s, hasRiskHistory: e.target.value }))}>
                <option value="">{copy({ en: "Unknown", vi: "Chua ro" })}</option>
                <option value="none">{copy({ en: "None", vi: "Khong co" })}</option>
                <option value="dropped_deposit">{copy({ en: "Dropped deposit", vi: "Bo coc" })}</option>
                <option value="canceled_late">{copy({ en: "Canceled late", vi: "Huy muon" })}</option>
                <option value="fake_profile">{copy({ en: "Fake profile", vi: "Ho so gia" })}</option>
              </Select>
              <Input label={copy({ en: "Late cancellation count", vi: "So lan huy muon" })} value={qualificationForm.lateCancellationCount} onChange={(e) => setQualificationForm((s) => ({ ...s, lateCancellationCount: e.target.value }))} />
              <Input label={copy({ en: "No-show count", vi: "So lan vang mat" })} value={qualificationForm.noShowCount} onChange={(e) => setQualificationForm((s) => ({ ...s, noShowCount: e.target.value }))} />
              <Input label={copy({ en: "Unreasonable cancellation count", vi: "So lan huy vo ly" })} value={qualificationForm.unreasonableCancellationCount} onChange={(e) => setQualificationForm((s) => ({ ...s, unreasonableCancellationCount: e.target.value }))} />
              <Input label={copy({ en: "Verified inconsistency count", vi: "So lan thong tin khong nhat quan" })} value={qualificationForm.inconsistentInfoCount} onChange={(e) => setQualificationForm((s) => ({ ...s, inconsistentInfoCount: e.target.value }))} />
            </FieldGroup>
            <div className="mt-4">
              <Input label={copy({ en: "Qualification note", vi: "Ghi chu xac minh" })} value={qualificationForm.note} onChange={(e) => setQualificationForm((s) => ({ ...s, note: e.target.value }))} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={() => qualificationMutation.mutate(buildQualificationPatch(qualificationForm))} disabled={qualificationMutation.isPending}>
                {qualificationMutation.isPending ? copy({ en: "Saving qualification...", vi: "Dang luu du lieu xac minh..." }) : copy({ en: "Save verified qualification", vi: "Luu du lieu xac minh" })}
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={copy({ en: "Lead summary", vi: "Tom tat lead" })} subtitle={copy({ en: "Fast operator snapshot before taking action.", vi: "Tom tat nhanh truoc khi thao tac." })}>
            <DescriptionList
              items={[
                { label: copy({ en: "Lead ID", vi: "Lead ID" }), value: lead.id },
                { label: copy({ en: "Candidate", vi: "Candidate" }), value: candidate?.code ?? candidate?.id ?? copy({ en: "Not created", vi: "Chua tao" }) },
                { label: copy({ en: "Source", vi: "Nguon" }), value: lead.source },
                { label: copy({ en: "Phone", vi: "Dien thoai" }), value: lead.phone || copy({ en: "No phone", vi: "Khong co so dien thoai" }) },
                { label: copy({ en: "Region", vi: "Khu vuc" }), value: lead.region || copy({ en: "No region", vi: "Khong co khu vuc" }) },
                { label: copy({ en: "Created", vi: "Tao luc" }), value: lead.createdAt || copy({ en: "Unknown", vi: "Chua ro" }) },
                { label: copy({ en: "Updated", vi: "Cap nhat luc" }), value: lead.updatedAt || copy({ en: "Unknown", vi: "Chua ro" }) }
              ]}
            />
          </Panel>

          <Panel title={copy({ en: "Formal suggested orders", vi: "Don hang de xuat chinh thuc" })} subtitle={copy({ en: "Shown only after this lead has a linked candidate record.", vi: "Chi hien thi sau khi lead co candidate lien ket." })}>
            {!hasCandidate ? (
              <div className="space-y-4">
                <EmptyState
                  title={copy({ en: "Candidate required before formal suggestions", vi: "Can candidate truoc khi de xuat chinh thuc" })}
                  description={copy({
                    en: "Complete the qualification overlay and move the lead through the backend transition to qualified. The backend creates the candidate record before formal matching and application creation.",
                    vi: "Hoan tat lop xac minh va chuyen lead theo luong backend sang qualified. Backend se tao candidate truoc khi ghep don chinh thuc va tao ho so ung tuyen."
                  })}
                />
                <div className="grid gap-3">
                  <InfoCard label={copy({ en: "Current lead status", vi: "Trang thai lead hien tai" })} value={<Badge tone={toneForStatus(lead.status)}>{formatLeadStatus(lead.status)}</Badge>} className="bg-slate-50" />
                  <InfoCard label={copy({ en: "Required operator action", vi: "Hanh dong can lam" })} value={copy({ en: "Save verified qualification data, then use the allowed backend transition buttons at the top of this page.", vi: "Luu du lieu xac minh, sau do dung nut chuyen trang thai backend o dau trang." })} className="bg-slate-50" />
                  <InfoCard label={copy({ en: "Why orders are hidden", vi: "Vi sao an don hang" })} value={copy({ en: "Order suggestions here are candidate-stage matching results, not lead-stage catalog previews.", vi: "De xuat don hang o day la ket qua matching giai doan candidate, khong phai preview danh muc cho lead." })} className="bg-slate-50" />
                </div>
              </div>
            ) : suggestedOrders.length ? (
              <div className="space-y-3">
                {suggestedOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{order.name}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{order.region || copy({ en: "No region", vi: "Khong co khu vuc" })} · {order.industry || copy({ en: "No industry", vi: "Khong co nganh" })}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {copy({ en: "Min height", vi: "Chieu cao toi thieu" })}: {order.heightMin ? `${order.heightMin} cm` : copy({ en: "Not set", vi: "Chua dat" })} · {copy({ en: "Returnees", vi: "Lao dong di ve" })}: {
                            typeof order.acceptsReturnees === "boolean"
                              ? order.acceptsReturnees
                                ? copy({ en: "Accepted", vi: "Nhan" })
                                : copy({ en: "Not accepted", vi: "Khong nhan" })
                              : copy({ en: "Not set", vi: "Chua dat" })
                          }
                        </div>
                      </div>
                      {renderOrderBadge(order)}
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-500">{order.description || order.requirements || copy({ en: "No additional order detail available.", vi: "Khong co thong tin bo sung cho don hang." })}</div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button size="sm" onClick={() => { if (!candidate?.id) return; createApplication.mutate({ candidateId: candidate.id, orderId: order.id }); }} disabled={createApplication.isPending}>
                        {createApplication.isPending ? copy({ en: "Creating...", vi: "Dang tao..." }) : copy({ en: "Create application", vi: "Tao ho so ung tuyen" })}
                      </Button>
                      <span className="text-xs text-slate-500">
                        {copy({ en: "Uses the linked candidate record from the recruitment API.", vi: "Su dung candidate da lien ket tu recruitment API." })}
                      </span>
                    </div>
                  </div>
                ))}
                {createApplication.error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {copy({ en: "Application creation failed. Check whether this candidate/order application already exists or whether the backend rejected the request.", vi: "Tao ho so ung tuyen that bai. Kiem tra ho so candidate/don hang da ton tai hoac backend tu choi yeu cau." })}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title={copy({ en: "No formal suggestions returned", vi: "Chua co de xuat chinh thuc" })} description={copy({ en: "The backend candidate matching suggestion endpoint did not return orders for this candidate yet. Review the verified profile and formal matching page if needed.", vi: "Endpoint de xuat matching candidate chua tra ve don hang cho candidate nay. Hay kiem tra ho so da xac minh va trang matching chinh thuc neu can." })} />
            )}
          </Panel>

          <Panel title={copy({ en: "Extracted data snapshot", vi: "Anh chup du lieu da trich xuat" })} subtitle={copy({ en: "What the current AI layer sees before operator corrections.", vi: "Nhung gi lop AI hien tai nhin thay truoc khi nhan vien chinh sua." })}>
            <pre className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(lead.aiExtractedData ?? {}, null, 2)}</pre>
          </Panel>

          <Panel title={copy({ en: "Verified qualification snapshot", vi: "Anh chup du lieu da xac minh" })} subtitle={copy({ en: "Staff-confirmed fields used for scoring and matching.", vi: "Cac truong da duoc nhan vien xac nhan de tinh diem va ghep don." })}>
            <DescriptionList
              items={[
                { label: copy({ en: "Passport", vi: "Ho chieu" }), value: yesNoUnknown(qualificationForm.hasPassport) },
                { label: copy({ en: "Strong skills", vi: "Ky nang tot" }), value: yesNoUnknown(qualificationForm.hasStrongSkills) },
                { label: copy({ en: "Worked abroad", vi: "Tung di nuoc ngoai" }), value: yesNoUnknown(qualificationForm.hasWorkedAbroad) },
                { label: copy({ en: "Health fit", vi: "Suc khoe dat yeu cau" }), value: yesNoUnknown(qualificationForm.healthMeetsCriteria) },
                { label: copy({ en: "Experience level", vi: "Muc do kinh nghiem" }), value: qualificationForm.experienceLevel ? formatEnum(qualificationForm.experienceLevel) : copy({ en: "Unknown", vi: "Chua ro" }) },
                { label: copy({ en: "Risk history", vi: "Lich su rui ro" }), value: qualificationForm.hasRiskHistory ? formatEnum(qualificationForm.hasRiskHistory) : copy({ en: "Unknown", vi: "Chua ro" }) }
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
