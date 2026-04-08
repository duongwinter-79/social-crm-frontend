import { useMemo, useState } from "react";
import { Badge, Button, DescriptionList, EmptyState, InfoStrip, Panel, SectionHeader, Select, Toolbar, ToolbarActions } from "@social-crm/ui";
import { useLeadsQuery, useMatchingEvaluationMutation, useOrdersQuery } from "@social-crm/api";

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
        description="Run the backend rule engine against a lead and an order, then inspect score composition, flags, penalties, and reject reasons in one operator view."
      />

      <Toolbar>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
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
          <ToolbarActions className="lg:justify-end">
            <Button onClick={() => evaluation.mutate({ leadId, orderId })} disabled={!leadId || !orderId || evaluation.isPending}>
              {evaluation.isPending ? "Evaluating..." : "Evaluate match"}
            </Button>
          </ToolbarActions>
        </div>
      </Toolbar>

      <InfoStrip>
        Matching is currently driven by structured lead data and AI extraction quality. If a result looks off, verify the lead profile and extracted snapshot before changing the order decision.
      </InfoStrip>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Selected context" subtitle="Operator-side summary before running the engine.">
          {selectedLead && selectedOrder ? (
            <div className="space-y-4">
              <DescriptionList
                items={[
                  { label: "Lead", value: selectedLead.fullName || "Unnamed lead" },
                  { label: "Lead status", value: selectedLead.status },
                  { label: "Lead score", value: selectedLead.leadScore ?? "-" },
                  { label: "Order", value: selectedOrder.name },
                  { label: "Region", value: selectedOrder.region || "No region" },
                  { label: "Industry", value: selectedOrder.industry || "No industry" },
                  { label: "Gender rule", value: selectedOrder.genderRequired },
                  { label: "Experience", value: selectedOrder.experienceRequired ? "Required" : "Open" }
                ]}
              />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                The backend currently builds strict matching mainly from lead aiExtractedData, so results depend on extracted profile quality.
              </div>
            </div>
          ) : (
            <EmptyState title="Choose lead and order" description="Select both entities to inspect a strict matching result." />
          )}
        </Panel>

        <Panel title="Matching result" subtitle="The UI exposes hard-fail reasons, flex penalties, flags, and eligibility.">
          {evaluation.data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone={evaluation.data.isEligible ? "success" : "danger"}>{evaluation.data.isEligible ? "Eligible" : "Rejected"}</Badge>
                <Badge tone="accent">{evaluation.data.conclusion}</Badge>
                {evaluation.data.requiresManagerApproval ? <Badge tone="warning">Manager approval required</Badge> : null}
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="Score" value={evaluation.data.totalScore} />
                <Metric label="Foundation" value={evaluation.data.breakdown.foundation} />
                <Metric label="Experience" value={evaluation.data.breakdown.experience} />
                <Metric label="Penalties" value={evaluation.data.breakdown.penalties} />
              </div>
              {evaluation.data.rejectReason ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{evaluation.data.rejectReason}</div>
              ) : null}
              <div>
                <div className="text-sm text-slate-500">Flags</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {evaluation.data.flags.length ? evaluation.data.flags.map((flag) => <Badge key={flag}>{flag}</Badge>) : <span className="text-sm text-slate-500">No flags</span>}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="No evaluation yet" description="Run the matching engine to see score, flags, penalties, and reject reasons." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}
