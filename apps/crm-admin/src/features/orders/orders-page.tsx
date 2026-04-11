import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, SectionHeader, Toolbar } from "@social-crm/ui";
import { useLeadsQuery, useMatchingEvaluationMutation, useOrdersQuery } from "@social-crm/api";

export function OrdersPage() {
  const ordersQuery = useOrdersQuery();
  const leadsQuery = useLeadsQuery({ offset: 0, limit: 50 });
  const evaluation = useMatchingEvaluationMutation();

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedLeadByOrder, setSelectedLeadByOrder] = useState<Record<string, string>>({});

  const orders = ordersQuery.data ?? [];
  const leads = leadsQuery.data?.data ?? [];

  const stats = useMemo(() => {
    return {
      total: orders.length,
      regions: new Set(orders.map((order) => order.region).filter(Boolean)).size,
      experienceRequired: orders.filter((order) => order.experienceRequired).length,
      openProfileMatches: leads.filter((lead) => ["QUALIFIED", "MATCHING", "MATCHED"].includes(lead.status)).length
    };
  }, [orders, leads]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Demand"
        title="Orders catalog"
        description="Phase 2 turns orders into a denser operational surface: requirement summaries, profile-fit checks, and a backend-backed triage action."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Orders" value={stats.total} />
        <Stat label="Regions" value={stats.regions} />
        <Stat label="Experience req." value={stats.experienceRequired} />
        <Stat label="Active lead pool" value={stats.openProfileMatches} />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="text-sm leading-7 text-slate-500">
          Create and edit flows remain off until backend CRUD expands. This page is focused on demand visibility and fast operator triage using current APIs.
        </div>
      </Toolbar>

      {orders.length ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const selectedLeadId = selectedLeadByOrder[order.id] ?? "";
            const selectedLead = leads.find((lead) => lead.id === selectedLeadId);
            const evaluationKeyMatch =
              evaluation.variables?.orderId === order.id &&
              evaluation.variables?.leadId === selectedLeadId;

            return (
              <section
                key={order.id}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_34px_rgba(15,23,42,0.05)]"
              >
                <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">{order.name}</h3>
                      <Badge tone="accent">{order.genderRequired}</Badge>
                      <Badge tone={order.experienceRequired ? "warning" : "neutral"}>
                        {order.experienceRequired ? "Experience required" : "Open to mixed profiles"}
                      </Badge>
                    </div>
                    <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500">
                      {order.description || "No description provided by the current orders endpoint."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                      <Chip label="Region" value={order.region || "Not set"} />
                      <Chip label="Industry" value={order.industry || "Not set"} />
                      <Chip label="Age" value={order.ageRange ? `${order.ageRange.min}-${order.ageRange.max}` : "Not set"} />
                      <Chip label="Salary" value={order.salaryRange || "Not set"} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                    >
                      {isExpanded ? "Hide details" : "Open workbench"}
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="grid gap-6 bg-slate-50 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Requirement breakdown</div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <RequirementCard label="Region" value={order.region || "Not set"} />
                          <RequirementCard label="Industry" value={order.industry || "Not set"} />
                          <RequirementCard label="Gender" value={order.genderRequired} />
                          <RequirementCard label="Age range" value={order.ageRange ? `${order.ageRange.min}-${order.ageRange.max}` : "Not set"} />
                        </div>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                          {order.requirements || "This order has no extended requirement text in the current backend payload."}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Quick triage</div>
                        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                          <label className="flex flex-col gap-2 text-sm text-slate-600">
                            <span>Select lead for backend triage</span>
                            <select
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                              value={selectedLeadId}
                              onChange={(e) => setSelectedLeadByOrder((state) => ({ ...state, [order.id]: e.target.value }))}
                            >
                              <option value="">Select a lead</option>
                              {leads.map((lead) => (
                                <option key={lead.id} value={lead.id}>
                                  {lead.fullName || "Unnamed lead"} - {lead.status}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="flex items-end">
                            <Button
                              onClick={() => selectedLeadId && evaluation.mutate({ leadId: selectedLeadId, orderId: order.id })}
                              disabled={!selectedLeadId || evaluation.isPending}
                            >
                              {evaluation.isPending && evaluationKeyMatch ? "Evaluating..." : "Run triage"}
                            </Button>
                          </div>
                        </div>

                        {selectedLead ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                            <div className="font-semibold text-slate-800">{selectedLead.fullName || "Unnamed lead"}</div>
                            <div className="mt-1">{selectedLead.region || "No region"} · {selectedLead.source} · score {selectedLead.leadScore ?? "-"}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Triage result</div>
                        {evaluation.data && evaluationKeyMatch ? (
                          <div className="mt-4 space-y-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge tone={evaluation.data.matching.isEligible ? "success" : "danger"}>
                                {evaluation.data.matching.isEligible ? "Eligible" : "Rejected"}
                              </Badge>
                              <Badge tone="accent">{evaluation.data.matching.conclusion}</Badge>
                              <Badge tone="neutral">{evaluation.data.preliminaryFit.replace(/_/g, " ")}</Badge>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <RequirementCard label="Score" value={evaluation.data.matching.totalScore} />
                              <RequirementCard label="Data quality" value={`${evaluation.data.dataQuality.completeness}%`} />
                              <RequirementCard label="Foundation" value={evaluation.data.matching.breakdown.foundation} />
                              <RequirementCard label="Experience" value={evaluation.data.matching.breakdown.experience} />
                            </div>
                            {evaluation.data.matching.rejectReason ? (
                              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                                {evaluation.data.matching.rejectReason}
                              </div>
                            ) : null}
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                              <div className="font-semibold">Missing requirements</div>
                              <div className="mt-1">
                                {evaluation.data.missingRequirements.length
                                  ? evaluation.data.missingRequirements.join(", ")
                                  : "No required triage signals are missing."}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 text-sm leading-7 text-slate-500">
                            Select a lead and run backend triage to inspect eligibility, penalties, and missing requirements for this order.
                          </div>
                        )}
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Operational note</div>
                        <div className="mt-4 text-sm leading-7 text-slate-500">
                          This Phase 2 surface keeps the source app&apos;s operator-first layout, but it does not fabricate quotas, assignment counts, or pipeline states that the backend does not yet expose.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No orders returned" description="The backend orders endpoint may be empty or unavailable in the current environment." />
      )}
    </div>
  );
}

function Stat(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
    </div>
  );
}

function Chip(props: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
      <span className="font-semibold text-slate-700">{props.label}:</span> {props.value}
    </div>
  );
}

function RequirementCard(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}
