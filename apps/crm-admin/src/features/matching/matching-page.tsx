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
import { useLeadsQuery, useMatchingEvaluationMutation, useOrdersQuery } from "@social-crm/api";

function toneForStatus(status: string) {
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(status)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED", "DEPARTED"].includes(status)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "INTERVIEWING", "VISA_PROCESSING"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function MatchingPage() {
  const leads = useLeadsQuery({ offset: 0, limit: 50 });
  const orders = useOrdersQuery();
  const evaluation = useMatchingEvaluationMutation();
  const [leadId, setLeadId] = useState("");
  const [orderId, setOrderId] = useState("");

  const selectedLead = useMemo(() => (leads.data?.data ?? []).find((lead) => lead.id === leadId), [leads.data, leadId]);
  const selectedOrder = useMemo(() => (orders.data ?? []).find((order) => order.id === orderId), [orders.data, orderId]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Matching"
        title="Matching workbench"
        description="Run the backend triage engine against one lead and one order, then inspect scoring, hard fails, missing inputs, and next-action guidance in a source-style operator surface."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TopStat label="Leads loaded" value={leads.data?.data?.length ?? 0} />
        <TopStat label="Orders loaded" value={orders.data?.length ?? 0} />
        <TopStat label="Mode" value="Lead triage" tone="accent" />
        <TopStat label="Result" value={evaluation.data?.matching.isEligible ? "Eligible" : evaluation.data ? "Rejected" : "Waiting"} tone={evaluation.data ? (evaluation.data.matching.isEligible ? "success" : "danger") : "neutral"} />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
          <Select label="Lead" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">Select a lead</option>
            {(leads.data?.data ?? []).map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.fullName || "Unnamed lead"} - {lead.status}
              </option>
            ))}
          </Select>
          <Select label="Order" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">Select an order</option>
            {(orders.data ?? []).map((order) => (
              <option key={order.id} value={order.id}>
                {order.name} - {order.region || "No region"}
              </option>
            ))}
          </Select>
          <ToolbarActions className="justify-start xl:justify-end">
            <Button onClick={() => evaluation.mutate({ leadId, orderId })} disabled={!leadId || !orderId || evaluation.isPending}>
              {evaluation.isPending ? "Evaluating..." : "Evaluate match"}
            </Button>
          </ToolbarActions>
        </div>
      </Toolbar>

      <InfoStrip>
        Matching is currently driven by structured lead data and AI extraction quality. If a result looks weak, correct the lead profile and extracted snapshot before making an order decision.
      </InfoStrip>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Panel title="Selected context" subtitle="Operator-side summary before running backend triage.">
            {selectedLead && selectedOrder ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <ContextCard label="Lead" value={selectedLead.fullName || "Unnamed lead"} note={selectedLead.phone || "No phone"} />
                  <ContextCard label="Order" value={selectedOrder.name} note={selectedOrder.region || "No region"} />
                </div>
                <DescriptionList
                  items={[
                    { label: "Lead status", value: <Badge tone={toneForStatus(selectedLead.status)}>{selectedLead.status}</Badge> },
                    { label: "Lead score", value: selectedLead.leadScore ?? "-" },
                    { label: "Classification", value: selectedLead.leadClassification ?? "Unclassified" },
                    { label: "Industry", value: selectedOrder.industry || "No industry" },
                    { label: "Gender rule", value: selectedOrder.genderRequired },
                    { label: "Experience", value: selectedOrder.experienceRequired ? "Required" : "Open" }
                  ]}
                />
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  Lead triage is preliminary. It relies on profile completeness and extracted signal quality, so weak source data should trigger operator review instead of blind rejection.
                </div>
              </div>
            ) : (
              <EmptyState title="Choose lead and order" description="Select both entities to inspect a preliminary triage result." />
            )}
          </Panel>

          <Panel title="Operator guidance" subtitle="Read this before changing lead status based on a triage outcome.">
            <div className="space-y-3">
              <GuidanceRow title="Use triage as a decision aid" body="A low-quality or incomplete profile can lower confidence. Confirm profile quality before treating a rejection as final." />
              <GuidanceRow title="Watch hard-fail reasons first" body="Reject reasons and missing requirements matter more than raw score when deciding whether to recover or disqualify." />
              <GuidanceRow title="Route weak data back to enrichment" body="If the result says `request_profile_completion`, send the lead back through operator enrichment before escalating." />
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Triage result" subtitle="The backend result exposes hard-fail reasons, flex penalties, missing inputs, and data quality.">
            {evaluation.data ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={evaluation.data.matching.isEligible ? "success" : "danger"}>
                    {evaluation.data.matching.isEligible ? "Eligible" : "Rejected"}
                  </Badge>
                  <Badge tone="accent">{evaluation.data.matching.conclusion}</Badge>
                  <Badge tone="neutral">{evaluation.data.preliminaryFit.replace(/_/g, " ")}</Badge>
                  <Badge tone="neutral">Data quality {evaluation.data.dataQuality.completeness}%</Badge>
                  {evaluation.data.matching.requiresManagerApproval ? <Badge tone="warning">Manager approval required</Badge> : null}
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <Metric label="Score" value={evaluation.data.matching.totalScore} />
                  <Metric label="Foundation" value={evaluation.data.matching.breakdown.foundation} />
                  <Metric label="Experience" value={evaluation.data.matching.breakdown.experience} />
                  <Metric label="Penalties" value={evaluation.data.matching.breakdown.penalties} />
                </div>

                {evaluation.data.matching.rejectReason ? (
                  <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{evaluation.data.matching.rejectReason}</div>
                ) : null}

                <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="font-semibold">Missing requirements</div>
                  <div className="mt-1">
                    {evaluation.data.missingRequirements.length
                      ? evaluation.data.missingRequirements.join(", ")
                      : "No required triage signals are missing."}
                  </div>
                </div>

                <div className="rounded-[22px] border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
                  <div className="font-semibold">Suggested next action</div>
                  <div className="mt-1">{evaluation.data.suggestedAction.replace(/_/g, " ")}</div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TagGroup title="Warnings" tone="warning" items={evaluation.data.warnings} emptyLabel="No warnings" />
                  <TagGroup title="Flags" tone="neutral" items={evaluation.data.matching.flags} emptyLabel="No flags" />
                </div>
              </div>
            ) : (
              <EmptyState title="No triage yet" description="Run lead triage to see score, flags, penalties, missing inputs, and reject reasons." />
            )}
          </Panel>
        </div>
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

function GuidanceRow(props: { title: string; body: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-sm font-semibold text-slate-800">{props.title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{props.body}</div>
    </div>
  );
}

function TagGroup(props: { title: string; items: string[]; emptyLabel: string; tone: "neutral" | "warning" }) {
  return (
    <div>
      <div className="text-sm text-slate-500">{props.title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {props.items.length
          ? props.items.map((item) => (
              <Badge key={item} tone={props.tone}>
                {item}
              </Badge>
            ))
          : <span className="text-sm text-slate-500">{props.emptyLabel}</span>}
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
    </div>
  );
}
