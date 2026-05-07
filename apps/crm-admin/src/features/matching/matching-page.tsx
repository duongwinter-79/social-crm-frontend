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
        eyebrow={copy({ en: "Matching", vi: "Matching" })}
        title={copy({ en: "Matching workbench", vi: "Matching workbench" })}
        description={copy({
          en: "Run preliminary lead triage or formal candidate matching against real backend rules, then inspect score, hard failures, risk flags, and approval needs.",
          vi: "Run preliminary lead triage or formal candidate matching against real backend rules, then inspect score, hard failures, risk flags, and approval needs."
        })}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TopStat label={copy({ en: "Leads loaded", vi: "Leads loaded" })} value={leads.data?.data?.length ?? 0} />
        <TopStat label={copy({ en: "Orders loaded", vi: "Orders loaded" })} value={orders.data?.length ?? 0} />
        <TopStat label={copy({ en: "Mode", vi: "Mode" })} value={mode === "lead_triage" ? copy({ en: "Lead triage", vi: "Lead triage" }) : copy({ en: "Formal", vi: "Formal" })} tone="accent" />
        <TopStat
          label={copy({ en: "Result", vi: "Result" })}
          value={activeMatching?.isEligible ? copy({ en: "Eligible", vi: "Eligible" }) : activeMatching ? copy({ en: "Rejected", vi: "Rejected" }) : copy({ en: "Waiting", vi: "Waiting" })}
          tone={activeMatching ? (activeMatching.isEligible ? "success" : "danger") : "neutral"}
        />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant={mode === "lead_triage" ? "primary" : "secondary"} size="sm" onClick={() => setMode("lead_triage")}>
            {copy({ en: "Lead triage", vi: "Lead triage" })}
          </Button>
          <Button variant={mode === "candidate_formal" ? "primary" : "secondary"} size="sm" onClick={() => setMode("candidate_formal")}>
            {copy({ en: "Formal candidate match", vi: "Formal candidate match" })}
          </Button>
        </div>

        {mode === "lead_triage" ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
            <Select label={copy({ en: "Lead", vi: "Lead" })} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">{copy({ en: "Select a lead", vi: "Select a lead" })}</option>
              {(leads.data?.data ?? []).map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.fullName || copy({ en: "Unnamed lead", vi: "Unnamed lead" })} - {formatLeadStatus(lead.status)}
                </option>
              ))}
            </Select>
            <Select label={copy({ en: "Order", vi: "Order" })} value={leadOrderId} onChange={(e) => setLeadOrderId(e.target.value)}>
              <option value="">{copy({ en: "Select an order", vi: "Select an order" })}</option>
              {(orders.data ?? []).map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name} - {order.region || copy({ en: "No region", vi: "No region" })}
                </option>
              ))}
            </Select>
            <ToolbarActions className="justify-start xl:justify-end">
              <Button onClick={() => leadEvaluation.mutate({ leadId, orderId: leadOrderId })} disabled={!leadId || !leadOrderId || leadEvaluation.isPending}>
                {leadEvaluation.isPending ? copy({ en: "Evaluating...", vi: "Evaluating..." }) : copy({ en: "Run lead triage", vi: "Run lead triage" })}
              </Button>
            </ToolbarActions>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
            <CandidatePicker
              label={copy({ en: "Candidate", vi: "Candidate" })}
              searchLabel={copy({ en: "Candidate search", vi: "Candidate search" })}
              placeholder={copy({ en: "Code, lead name, or phone", vi: "Code, lead name, or phone" })}
              emptyLabel={copy({ en: "Select a candidate", vi: "Select a candidate" })}
              noLeadDetailLabel={copy({ en: "No linked lead detail", vi: "No linked lead detail" })}
              value={candidateId}
              onChange={(nextCandidateId, candidate) => {
                setCandidateId(nextCandidateId);
                setSelectedCandidate(candidate);
              }}
            />
            <Select label={copy({ en: "Order", vi: "Order" })} value={candidateOrderId} onChange={(e) => setCandidateOrderId(e.target.value)}>
              <option value="">{copy({ en: "Select an order", vi: "Select an order" })}</option>
              {(orders.data ?? []).map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name} - {order.region || copy({ en: "No region", vi: "No region" })}
                </option>
              ))}
            </Select>
            <ToolbarActions className="justify-start xl:justify-end">
              <Button
                onClick={() => candidateEvaluation.mutate({ candidateId, orderId: candidateOrderId })}
                disabled={!candidateId || !candidateOrderId || candidateEvaluation.isPending}
              >
                {candidateEvaluation.isPending ? copy({ en: "Evaluating...", vi: "Evaluating..." }) : copy({ en: "Evaluate candidate", vi: "Evaluate candidate" })}
              </Button>
            </ToolbarActions>
          </div>
        )}
      </Toolbar>

      <InfoStrip>
        {mode === "lead_triage"
          ? copy({
              en: "Lead triage is preliminary. It helps operators decide whether to complete profile data and move a lead toward candidate qualification; it is not the final recruitment match.",
              vi: "Lead triage is preliminary. It helps operators decide whether to complete profile data and move a lead toward candidate qualification; it is not the final recruitment match."
            })
          : copy({
              en: "Formal candidate matching uses candidate profile data and persisted order criteria. Use this result for recruitment fit review, manager approval needs, and application decisions.",
              vi: "Formal candidate matching uses candidate profile data and persisted order criteria. Use this result for recruitment fit review, manager approval needs, and application decisions."
            })}
      </InfoStrip>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Selected context", vi: "Selected context" })}
            subtitle={copy({
              en: mode === "lead_triage" ? "Lead and order summary before preliminary triage." : "Candidate and order summary before formal matching.",
              vi: mode === "lead_triage" ? "Lead and order summary before preliminary triage." : "Candidate and order summary before formal matching."
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
  if (!props.lead || !props.order) {
    return (
      <EmptyState
        title="Choose lead and order"
        description="Select both entities to inspect a preliminary triage result."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <ContextCard label="Lead" value={props.lead.fullName || "Unnamed lead"} note={props.lead.phone || "No phone"} />
        <ContextCard label="Order" value={props.order.name} note={props.order.region || "No region"} />
      </div>
      <DescriptionList
        items={[
          { label: "Lead status", value: <Badge tone={toneForStatus(props.lead.status)}>{props.formatLeadStatus(props.lead.status)}</Badge> },
          { label: "Lead score", value: props.lead.leadScore ?? "-" },
          { label: "Classification", value: props.lead.leadClassification ?? "Unclassified" },
          { label: "Industry", value: props.order.industry || "No industry" },
          { label: "Gender rule", value: props.order.genderRequired },
          { label: "Experience", value: props.order.experienceRequired ? "Required" : "Open" },
          { label: "Minimum height", value: props.order.heightMin ? `${props.order.heightMin} cm` : "No minimum" },
          { label: "Returnees", value: props.order.acceptsReturnees === false ? "Not accepted" : "Accepted or unspecified" }
        ]}
      />
    </div>
  );
}

function CandidateContext(props: { candidate?: CandidateRef; order?: Order }) {
  if (!props.candidate || !props.order) {
    return (
      <EmptyState
        title="Choose candidate and order"
        description="Select both entities to inspect a formal candidate matching result."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <ContextCard label="Candidate" value={props.candidate.code || props.candidate.id.slice(0, 8)} note={props.candidate.lifecycleStatus || "No lifecycle status"} />
        <ContextCard label="Order" value={props.order.name} note={props.order.region || "No region"} />
      </div>
      <DescriptionList
        items={[
          { label: "Linked lead", value: props.candidate.lead?.fullName || props.candidate.lead?.phone || "No linked lead detail" },
          { label: "Candidate status", value: <Badge tone={toneForStatus(props.candidate.lifecycleStatus || "")}>{props.candidate.lifecycleStatus || "Unknown"}</Badge> },
          { label: "Profile gender", value: profileValue(props.candidate.profile, "gender") },
          { label: "Profile height", value: profileValue(props.candidate.profile, "heightCm") },
          { label: "Experience field", value: profileValue(props.candidate.profile, "experienceField") },
          { label: "Order gender rule", value: props.order.genderRequired },
          { label: "Order height minimum", value: props.order.heightMin ? `${props.order.heightMin} cm` : "No minimum" },
          { label: "Returnee policy", value: props.order.acceptsReturnees === false ? "Not accepted" : "Accepted or unspecified" }
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
  return (
    <Panel title="Lead triage result" subtitle="Preliminary screening exposes missing inputs and data quality before candidate qualification.">
      {props.result ? (
        <div className="space-y-5">
          <MatchingSummary matching={props.result.matching} />
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Data quality" value={`${props.result.dataQuality.completeness}%`} />
            <Metric label="Preliminary fit" value={props.result.preliminaryFit.replace(/_/g, " ")} />
            <Metric label="Suggested action" value={props.result.suggestedAction.replace(/_/g, " ")} />
          </div>
          <ReasonBox
            title="Missing requirements"
            tone="warning"
            value={props.result.missingRequirements.length ? props.result.missingRequirements.join(", ") : "No required triage signals are missing."}
          />
          <ReasonBox
            title="Warnings"
            tone="neutral"
            value={props.result.warnings.length ? props.result.warnings.join(", ") : "No warnings returned."}
          />
        </div>
      ) : (
        <EmptyState title="No lead triage yet" description="Run lead triage to see score, flags, penalties, missing inputs, and reject reasons." />
      )}
    </Panel>
  );
}

function FormalCandidateResult(props: { result?: MatchingResult }) {
  return (
    <Panel title="Formal candidate result" subtitle="Candidate-stage matching exposes eligibility, penalties, risk flags, and manager approval requirements.">
      {props.result ? (
        <div className="space-y-5">
          <MatchingSummary matching={props.result} />
          {props.result.rejectReason ? <ReasonBox title="Reject reason" tone="danger" value={props.result.rejectReason} /> : null}
          <ReasonBox title="Flags" tone="neutral" value={props.result.flags.length ? props.result.flags.join(", ") : "No risk or flex flags returned."} />
        </div>
      ) : (
        <EmptyState title="No formal match yet" description="Evaluate a candidate against an order to see final eligibility, approval needs, penalties, and hard-fail reasons." />
      )}
    </Panel>
  );
}

function MatchingSummary(props: { matching: MatchingResult }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge tone={props.matching.isEligible ? "success" : "danger"}>{props.matching.isEligible ? "Eligible" : "Rejected"}</Badge>
        <Badge tone="accent">{props.matching.conclusion}</Badge>
        {props.matching.requiresManagerApproval ? <Badge tone="warning">Manager approval required</Badge> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Score" value={props.matching.totalScore} />
        <Metric label="Foundation" value={props.matching.breakdown.foundation} />
        <Metric label="Experience" value={props.matching.breakdown.experience} />
        <Metric label="Penalties" value={props.matching.breakdown.penalties} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Metric label="Risk" value={props.matching.breakdown.risk} />
        <Metric label="Flags" value={props.matching.flags.length} />
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
