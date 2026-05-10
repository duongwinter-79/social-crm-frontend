import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  InfoStrip,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useCandidateMatchingEvaluationMutation,
  useLeadsQuery,
  useMatchingEvaluationMutation,
  useOrdersQuery,
  type CandidateRef,
  type Lead,
  type MatchingResult,
  type Order
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import { CandidatePicker } from "@/components/candidate-picker";

type MatchingMode = "lead_triage" | "candidate_formal";

function toneForStatus(status: string) {
  const normalized = status.toUpperCase();
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(normalized)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED", "DEPARTED"].includes(normalized)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "INTERVIEWING", "VISA_PROCESSING"].includes(normalized)) return "warning" as const;
  return "accent" as const;
}

export function MatchingPage() {
  const { copy, formatLeadStatus } = useI18n();
  const leads = useLeadsQuery({ offset: 0, limit: 50 });
  const orders = useOrdersQuery();
  const leadEvaluation = useMatchingEvaluationMutation();
  const candidateEvaluation = useCandidateMatchingEvaluationMutation();
  const [mode, setMode] = useState<MatchingMode>("lead_triage");
  const [leadId, setLeadId] = useState("");
  const [leadOrderId, setLeadOrderId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRef | undefined>();
  const [candidateOrderId, setCandidateOrderId] = useState("");

  const selectedLead = useMemo(() => (leads.data?.data ?? []).find((lead) => lead.id === leadId), [leads.data, leadId]);
  const selectedLeadOrder = useMemo(() => (orders.data ?? []).find((order) => order.id === leadOrderId), [orders.data, leadOrderId]);
  const selectedCandidateOrder = useMemo(() => (orders.data ?? []).find((order) => order.id === candidateOrderId), [orders.data, candidateOrderId]);
  const activeMatching = mode === "lead_triage" ? leadEvaluation.data?.matching : candidateEvaluation.data?.matching;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Matching", vi: "Ghép đơn" })}
        title={copy({ en: "Matching workbench", vi: "Bàn làm việc ghép đơn" })}
        description={copy({
          en: "Run preliminary lead triage or formal candidate matching against real backend rules, then inspect score, hard failures, risk flags, and approval needs.",
          vi: "Chạy sàng lọc lead sơ bộ hoặc ghép ứng viên chính thức theo luật backend, sau đó kiểm tra điểm, điều kiện loại, cờ rủi ro và yêu cầu phê duyệt."
        })}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TopStat label={copy({ en: "Leads loaded", vi: "Lead đã tải" })} value={leads.data?.data?.length ?? 0} />
        <TopStat label={copy({ en: "Orders loaded", vi: "Đơn hàng đã tải" })} value={orders.data?.length ?? 0} />
        <TopStat label={copy({ en: "Mode", vi: "Chế độ" })} value={mode === "lead_triage" ? copy({ en: "Lead triage", vi: "Sàng lọc lead" }) : copy({ en: "Formal", vi: "Chính thức" })} tone="accent" />
        <TopStat
          label={copy({ en: "Result", vi: "Kết quả" })}
          value={activeMatching?.isEligible ? copy({ en: "Eligible", vi: "Phù hợp" }) : activeMatching ? copy({ en: "Rejected", vi: "Không phù hợp" }) : copy({ en: "Waiting", vi: "Chờ chạy" })}
          tone={activeMatching ? (activeMatching.isEligible ? "success" : "danger") : "neutral"}
        />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant={mode === "lead_triage" ? "primary" : "secondary"} size="sm" onClick={() => setMode("lead_triage")}>
            {copy({ en: "Lead triage", vi: "Sàng lọc lead" })}
          </Button>
          <Button variant={mode === "candidate_formal" ? "primary" : "secondary"} size="sm" onClick={() => setMode("candidate_formal")}>
            {copy({ en: "Formal candidate match", vi: "Ghép ứng viên chính thức" })}
          </Button>
        </div>

        {mode === "lead_triage" ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
            <Select label={copy({ en: "Lead", vi: "Lead" })} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">{copy({ en: "Select a lead", vi: "Chọn lead" })}</option>
              {(leads.data?.data ?? []).map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.fullName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" })} - {formatLeadStatus(lead.status)}
                </option>
              ))}
            </Select>
            <Select label={copy({ en: "Order", vi: "Đơn hàng" })} value={leadOrderId} onChange={(e) => setLeadOrderId(e.target.value)}>
              <option value="">{copy({ en: "Select an order", vi: "Chọn đơn hàng" })}</option>
              {(orders.data ?? []).map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name} - {order.region || copy({ en: "No region", vi: "Chưa có khu vực" })}
                </option>
              ))}
            </Select>
            <ToolbarActions className="justify-start xl:justify-end">
              <Button onClick={() => leadEvaluation.mutate({ leadId, orderId: leadOrderId })} disabled={!leadId || !leadOrderId || leadEvaluation.isPending}>
                {leadEvaluation.isPending ? copy({ en: "Evaluating...", vi: "Đang đánh giá..." }) : copy({ en: "Run lead triage", vi: "Chạy sàng lọc lead" })}
              </Button>
            </ToolbarActions>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
            <CandidatePicker
              label={copy({ en: "Candidate", vi: "Ứng viên" })}
              searchLabel={copy({ en: "Candidate search", vi: "Tìm ứng viên" })}
              placeholder={copy({ en: "Code, lead name, or phone", vi: "Mã, tên lead hoặc số điện thoại" })}
              emptyLabel={copy({ en: "Select a candidate", vi: "Chọn ứng viên" })}
              noLeadDetailLabel={copy({ en: "No linked lead detail", vi: "Chưa có thông tin lead liên kết" })}
              value={candidateId}
              onChange={(nextCandidateId, candidate) => {
                setCandidateId(nextCandidateId);
                setSelectedCandidate(candidate);
              }}
            />
            <Select label={copy({ en: "Order", vi: "Đơn hàng" })} value={candidateOrderId} onChange={(e) => setCandidateOrderId(e.target.value)}>
              <option value="">{copy({ en: "Select an order", vi: "Chọn đơn hàng" })}</option>
              {(orders.data ?? []).map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name} - {order.region || copy({ en: "No region", vi: "Chưa có khu vực" })}
                </option>
              ))}
            </Select>
            <ToolbarActions className="justify-start xl:justify-end">
              <Button
                onClick={() => candidateEvaluation.mutate({ candidateId, orderId: candidateOrderId })}
                disabled={!candidateId || !candidateOrderId || candidateEvaluation.isPending}
              >
                {candidateEvaluation.isPending ? copy({ en: "Evaluating...", vi: "Đang đánh giá..." }) : copy({ en: "Evaluate candidate", vi: "Đánh giá ứng viên" })}
              </Button>
            </ToolbarActions>
          </div>
        )}
      </Toolbar>

      <InfoStrip>
        {mode === "lead_triage"
          ? copy({
              en: "Lead triage is preliminary. It helps operators decide whether to complete profile data and move a lead toward candidate qualification; it is not the final recruitment match.",
              vi: "Sàng lọc lead là bước sơ bộ. Kết quả này giúp nhân viên quyết định có cần hoàn thiện hồ sơ và chuyển lead sang bước đủ điều kiện ứng viên hay không; đây chưa phải kết quả ghép đơn cuối cùng."
            })
          : copy({
              en: "Formal candidate matching uses candidate profile data and persisted order criteria. Use this result for recruitment fit review, manager approval needs, and application decisions.",
              vi: "Ghép ứng viên chính thức dùng dữ liệu hồ sơ ứng viên và tiêu chí đơn hàng đã lưu. Dùng kết quả này để xem mức độ phù hợp, nhu cầu phê duyệt quản lý và quyết định tạo hồ sơ ứng tuyển."
            })}
      </InfoStrip>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Selected context", vi: "Ngữ cảnh đã chọn" })}
            subtitle={copy({
              en: mode === "lead_triage" ? "Lead and order summary before preliminary triage." : "Candidate and order summary before formal matching.",
              vi: mode === "lead_triage" ? "Tóm tắt lead và đơn hàng trước khi sàng lọc sơ bộ." : "Tóm tắt ứng viên và đơn hàng trước khi ghép chính thức."
            })}
          >
            {mode === "lead_triage" ? (
              <LeadContext lead={selectedLead} order={selectedLeadOrder} formatLeadStatus={formatLeadStatus} />
            ) : (
              <CandidateContext candidate={selectedCandidate} order={selectedCandidateOrder} />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {mode === "lead_triage" ? (
            <LeadTriageResult result={leadEvaluation.data} />
          ) : (
            <FormalCandidateResult result={candidateEvaluation.data?.matching} />
          )}
        </div>
      </div>
    </div>
  );
}

function LeadContext(props: { lead?: Lead; order?: Order; formatLeadStatus: (status: string) => string }) {
  const { copy } = useI18n();

  if (!props.lead || !props.order) {
    return (
      <EmptyState
        title={copy({ en: "Choose lead and order", vi: "Chọn lead và đơn hàng" })}
        description={copy({ en: "Select both entities to inspect a preliminary triage result.", vi: "Chọn đủ hai dữ liệu để xem kết quả sàng lọc sơ bộ." })}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <ContextCard label="Lead" value={props.lead.fullName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" })} note={props.lead.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })} />
        <ContextCard label={copy({ en: "Order", vi: "Đơn hàng" })} value={props.order.name} note={props.order.region || copy({ en: "No region", vi: "Chưa có khu vực" })} />
      </div>
      <DescriptionList
        items={[
          { label: copy({ en: "Lead status", vi: "Trạng thái lead" }), value: <Badge tone={toneForStatus(props.lead.status)}>{props.formatLeadStatus(props.lead.status)}</Badge> },
          { label: copy({ en: "Lead score", vi: "Điểm lead" }), value: props.lead.leadScore ?? "-" },
          { label: copy({ en: "Classification", vi: "Phân loại" }), value: props.lead.leadClassification ?? copy({ en: "Unclassified", vi: "Chưa phân loại" }) },
          { label: copy({ en: "Industry", vi: "Ngành nghề" }), value: props.order.industry || copy({ en: "No industry", vi: "Chưa có ngành nghề" }) },
          { label: copy({ en: "Gender rule", vi: "Yêu cầu giới tính" }), value: props.order.genderRequired },
          { label: copy({ en: "Experience", vi: "Kinh nghiệm" }), value: props.order.experienceRequired ? copy({ en: "Required", vi: "Bắt buộc" }) : copy({ en: "Open", vi: "Không bắt buộc" }) },
          { label: copy({ en: "Minimum height", vi: "Chiều cao tối thiểu" }), value: props.order.heightMin ? `${props.order.heightMin} cm` : copy({ en: "No minimum", vi: "Không yêu cầu" }) },
          { label: copy({ en: "Returnees", vi: "Lao động từng đi về" }), value: props.order.acceptsReturnees === false ? copy({ en: "Not accepted", vi: "Không nhận" }) : copy({ en: "Accepted or unspecified", vi: "Nhận hoặc chưa quy định" }) }
        ]}
      />
    </div>
  );
}

function CandidateContext(props: { candidate?: CandidateRef; order?: Order }) {
  const { copy } = useI18n();

  if (!props.candidate || !props.order) {
    return (
      <EmptyState
        title={copy({ en: "Choose candidate and order", vi: "Chọn ứng viên và đơn hàng" })}
        description={copy({ en: "Select both entities to inspect a formal candidate matching result.", vi: "Chọn đủ hai dữ liệu để xem kết quả ghép ứng viên chính thức." })}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <ContextCard label={copy({ en: "Candidate", vi: "Ứng viên" })} value={props.candidate.code || props.candidate.id.slice(0, 8)} note={props.candidate.lifecycleStatus || copy({ en: "No lifecycle status", vi: "Chưa có trạng thái hồ sơ" })} />
        <ContextCard label={copy({ en: "Order", vi: "Đơn hàng" })} value={props.order.name} note={props.order.region || copy({ en: "No region", vi: "Chưa có khu vực" })} />
      </div>
      <DescriptionList
        items={[
          { label: copy({ en: "Linked lead", vi: "Lead liên kết" }), value: props.candidate.lead?.fullName || props.candidate.lead?.phone || copy({ en: "No linked lead detail", vi: "Chưa có thông tin lead liên kết" }) },
          { label: copy({ en: "Candidate status", vi: "Trạng thái ứng viên" }), value: <Badge tone={toneForStatus(props.candidate.lifecycleStatus || "")}>{props.candidate.lifecycleStatus || copy({ en: "Unknown", vi: "Chưa rõ" })}</Badge> },
          { label: copy({ en: "Profile gender", vi: "Giới tính hồ sơ" }), value: profileValue(props.candidate.profile, "gender") },
          { label: copy({ en: "Profile height", vi: "Chiều cao hồ sơ" }), value: profileValue(props.candidate.profile, "heightCm") },
          { label: copy({ en: "Experience field", vi: "Lĩnh vực kinh nghiệm" }), value: profileValue(props.candidate.profile, "experienceField") },
          { label: copy({ en: "Order gender rule", vi: "Yêu cầu giới tính của đơn" }), value: props.order.genderRequired },
          { label: copy({ en: "Order height minimum", vi: "Chiều cao tối thiểu của đơn" }), value: props.order.heightMin ? `${props.order.heightMin} cm` : copy({ en: "No minimum", vi: "Không yêu cầu" }) },
          { label: copy({ en: "Returnee policy", vi: "Chính sách lao động từng đi về" }), value: props.order.acceptsReturnees === false ? copy({ en: "Not accepted", vi: "Không nhận" }) : copy({ en: "Accepted or unspecified", vi: "Nhận hoặc chưa quy định" }) }
        ]}
      />
    </div>
  );
}

function LeadTriageResult(props: {
  result?: {
    preliminaryFit: string;
    suggestedAction: string;
    dataQuality: { completeness: number; presentSignals: string[]; source: string };
    missingRequirements: string[];
    warnings: string[];
    matching: MatchingResult;
  };
}) {
  const { copy } = useI18n();

  return (
    <Panel title={copy({ en: "Lead triage result", vi: "Kết quả sàng lọc lead" })} subtitle={copy({ en: "Preliminary screening exposes missing inputs and data quality before candidate qualification.", vi: "Bước sàng lọc sơ bộ cho biết dữ liệu còn thiếu và chất lượng dữ liệu trước khi xác nhận ứng viên." })}>
      {props.result ? (
        <div className="space-y-5">
          <MatchingSummary matching={props.result.matching} />
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label={copy({ en: "Data quality", vi: "Chất lượng dữ liệu" })} value={`${props.result.dataQuality.completeness}%`} />
            <Metric label={copy({ en: "Preliminary fit", vi: "Mức phù hợp sơ bộ" })} value={props.result.preliminaryFit.replace(/_/g, " ")} />
            <Metric label={copy({ en: "Suggested action", vi: "Hành động đề xuất" })} value={props.result.suggestedAction.replace(/_/g, " ")} />
          </div>
          <ReasonBox
            title={copy({ en: "Missing requirements", vi: "Yêu cầu còn thiếu" })}
            tone="warning"
            value={props.result.missingRequirements.length ? props.result.missingRequirements.join(", ") : copy({ en: "No required triage signals are missing.", vi: "Không thiếu tín hiệu sàng lọc bắt buộc." })}
          />
          <ReasonBox
            title={copy({ en: "Warnings", vi: "Cảnh báo" })}
            tone="neutral"
            value={props.result.warnings.length ? props.result.warnings.join(", ") : copy({ en: "No warnings returned.", vi: "Không có cảnh báo." })}
          />
        </div>
      ) : (
        <EmptyState title={copy({ en: "No lead triage yet", vi: "Chưa có kết quả sàng lọc lead" })} description={copy({ en: "Run lead triage to see score, flags, penalties, missing inputs, and reject reasons.", vi: "Chạy sàng lọc lead để xem điểm, cờ rủi ro, điểm trừ, dữ liệu thiếu và lý do loại." })} />
      )}
    </Panel>
  );
}

function FormalCandidateResult(props: { result?: MatchingResult }) {
  const { copy } = useI18n();

  return (
    <Panel title={copy({ en: "Formal candidate result", vi: "Kết quả ghép ứng viên chính thức" })} subtitle={copy({ en: "Candidate-stage matching exposes eligibility, penalties, risk flags, and manager approval requirements.", vi: "Ghép đơn ở giai đoạn ứng viên cho biết mức phù hợp, điểm trừ, cờ rủi ro và yêu cầu duyệt quản lý." })}>
      {props.result ? (
        <div className="space-y-5">
          <MatchingSummary matching={props.result} />
          {props.result.rejectReason ? <ReasonBox title={copy({ en: "Reject reason", vi: "Lý do loại" })} tone="danger" value={props.result.rejectReason} /> : null}
          <ReasonBox title={copy({ en: "Flags", vi: "Cờ đánh dấu" })} tone="neutral" value={props.result.flags.length ? props.result.flags.join(", ") : copy({ en: "No risk or flex flags returned.", vi: "Không có cờ rủi ro hoặc điều kiện linh hoạt." })} />
        </div>
      ) : (
        <EmptyState title={copy({ en: "No formal match yet", vi: "Chưa có kết quả ghép chính thức" })} description={copy({ en: "Evaluate a candidate against an order to see final eligibility, approval needs, penalties, and hard-fail reasons.", vi: "Đánh giá ứng viên với một đơn hàng để xem kết quả phù hợp cuối cùng, nhu cầu phê duyệt, điểm trừ và lý do loại cứng." })} />
      )}
    </Panel>
  );
}

function MatchingSummary(props: { matching: MatchingResult }) {
  const { copy } = useI18n();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge tone={props.matching.isEligible ? "success" : "danger"}>{props.matching.isEligible ? copy({ en: "Eligible", vi: "Phù hợp" }) : copy({ en: "Rejected", vi: "Không phù hợp" })}</Badge>
        <Badge tone="accent">{props.matching.conclusion}</Badge>
        {props.matching.requiresManagerApproval ? <Badge tone="warning">{copy({ en: "Manager approval required", vi: "Cần quản lý phê duyệt" })}</Badge> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label={copy({ en: "Score", vi: "Điểm" })} value={props.matching.totalScore} />
        <Metric label={copy({ en: "Foundation", vi: "Nền tảng" })} value={props.matching.breakdown.foundation} />
        <Metric label={copy({ en: "Experience", vi: "Kinh nghiệm" })} value={props.matching.breakdown.experience} />
        <Metric label={copy({ en: "Penalties", vi: "Điểm trừ" })} value={props.matching.breakdown.penalties} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Metric label={copy({ en: "Risk", vi: "Rủi ro" })} value={props.matching.breakdown.risk} />
        <Metric label={copy({ en: "Flags", vi: "Cờ đánh dấu" })} value={props.matching.flags.length} />
      </div>
    </div>
  );
}

function TopStat(props: { label: string; value: string | number; tone?: "neutral" | "accent" | "success" | "danger" }) {
  const accentClass =
    props.tone === "accent"
      ? "border-indigo-200 bg-indigo-50"
      : props.tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : props.tone === "danger"
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)] ${accentClass}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
    </div>
  );
}

function ContextCard(props: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{props.value}</div>
      <div className="mt-1 text-xs text-slate-500">{props.note}</div>
    </div>
  );
}

function Metric(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}

function ReasonBox(props: { title: string; value: string; tone: "neutral" | "warning" | "danger" }) {
  const toneClass =
    props.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : props.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-[22px] border p-4 text-sm ${toneClass}`}>
      <div className="font-semibold">{props.title}</div>
      <div className="mt-1">{props.value}</div>
    </div>
  );
}

function profileValue(profile: Record<string, unknown> | null | undefined, key: string) {
  const value = profile?.[key];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "-";
}
