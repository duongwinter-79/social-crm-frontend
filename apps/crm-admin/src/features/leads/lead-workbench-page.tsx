import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  InfoStrip,
  Input,
  Panel,
  SectionHeader,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useAiQueryMutation,
  useLeadDetailQuery,
  useLeadProfileQuery,
  useLeadTransitionsQuery,
  useOrdersQuery,
  useSuggestedOrdersQuery,
  useUpdateLeadMutation,
  useUpsertLeadProfileMutation
} from "@social-crm/api";
import type { CandidateSuggestion, Order } from "@social-crm/api";

function toneForStatus(status: string) {
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(status)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED", "DEPARTED"].includes(status)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "INTERVIEWING", "VISA_PROCESSING"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function LeadWorkbenchPage() {
  const { leadId = "" } = useParams();
  const leadQuery = useLeadDetailQuery(leadId);
  const transitionsQuery = useLeadTransitionsQuery(leadId);
  const profileQuery = useLeadProfileQuery(leadId);
  const ordersQuery = useOrdersQuery();
  const suggestedOrdersQuery = useSuggestedOrdersQuery(leadId);
  const updateLead = useUpdateLeadMutation();
  const profileMutation = useUpsertLeadProfileMutation(leadId);
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

  const lead = leadQuery.data;
  const selectedThreadId = useMemo(() => lead?.threads?.[0]?.id ?? "", [lead]);
  const allOrders = ordersQuery.data ?? [];
  const suggestedOrders = suggestedOrdersQuery.data ?? [];
  const fallbackOrders = useMemo(() => allOrders.slice(0, 4), [allOrders]);

  if (!lead) {
    return <Panel title="Lead workbench"><EmptyState title="Lead not loaded" description="The selected lead could not be loaded from the backend." /></Panel>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Lead workbench"
        title={lead.fullName || "Unnamed lead"}
        description={`${lead.source.toUpperCase()} channel · ${lead.phone || "No phone"} · ${lead.region || "No region"}`}
      />

      <Toolbar compact className="border-slate-200/90">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 md:grid-cols-4 xl:flex-1">
            <WorkbenchStrip label="Status" value={<Badge tone={toneForStatus(lead.status)}>{lead.status}</Badge>} />
            <WorkbenchStrip label="Lead score" value={<Badge tone={(lead.leadScore ?? 0) >= 80 ? "success" : (lead.leadScore ?? 0) >= 60 ? "warning" : "neutral"}>{lead.leadScore ?? "-"}</Badge>} />
            <WorkbenchStrip label="Classification" value={lead.leadClassification ?? "Unclassified"} />
            <WorkbenchStrip label="Threads" value={lead.threads?.length ?? 0} />
          </div>
          <ToolbarActions className="xl:justify-end">
            {(transitionsQuery.data?.allowed ?? []).map((next) => (
              <Button
                key={next}
                variant={next.includes("FAILED") || next === "DISQUALIFIED" ? "danger" : "secondary"}
                size="sm"
                onClick={() => updateLead.mutate({ id: leadId, patch: { status: next } })}
                disabled={updateLead.isPending}
              >
                Move to {next}
              </Button>
            ))}
          </ToolbarActions>
        </div>
      </Toolbar>

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>Use transitions from the backend state machine first.</span>
          <Badge tone="neutral">Profile completeness drives matching quality</Badge>
          <Badge tone="neutral">{suggestedOrders.length ? `${suggestedOrders.length} suggested orders` : "No backend suggestions yet"}</Badge>
        </div>
      </InfoStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-6">
          <Panel
            title="Conversation and thread context"
            subtitle="Message history is not exposed yet, so this workbench focuses on thread health, AI extraction timing, and operator review."
          >
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
                      <ThreadMeta label="Last message" value={thread.lastMessageAt ?? "Unknown"} />
                      <ThreadMeta label="Last AI extraction" value={thread.lastAiExtractedAt ?? "Never"} />
                    </div>
                    {thread.metadata ? (
                      <details className="mt-3 text-sm text-slate-500">
                        <summary className="cursor-pointer font-medium text-slate-700">Raw metadata</summary>
                        <pre className="mt-3 overflow-auto rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">{JSON.stringify(thread.metadata, null, 2)}</pre>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No threads on this lead" description="Webhook ingestion may not have attached conversation threads yet." />
            )}
          </Panel>

          <Panel
            title="AI operator query"
            subtitle="Run a manual prompt against the first available thread and keep the result attached to the active workbench."
          >
            <div className="space-y-3">
              <Input label="Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => {
                    if (selectedThreadId) aiMutation.mutate({ threadId: selectedThreadId, prompt });
                  }}
                  disabled={!selectedThreadId || aiMutation.isPending}
                >
                  {aiMutation.isPending ? "Running AI query..." : "Run query"}
                </Button>
                <span className="text-sm text-slate-500">{selectedThreadId ? `Using thread ${selectedThreadId}` : "No thread available"}</span>
              </div>
              {aiMutation.data ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">AI result</div>
                  {aiMutation.data.result}
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel
            title="Profile workspace"
            subtitle="This section maps directly to `/leads/:leadId/profile` and should be treated as the operator-owned structured profile."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Birth year" value={profileForm.birthYear} onChange={(e) => setProfileForm((s) => ({ ...s, birthYear: e.target.value }))} />
              <Input label="Gender" value={profileForm.gender} onChange={(e) => setProfileForm((s) => ({ ...s, gender: e.target.value }))} />
              <Input label="Height (cm)" value={profileForm.heightCm} onChange={(e) => setProfileForm((s) => ({ ...s, heightCm: e.target.value }))} />
              <Input label="Weight (kg)" value={profileForm.weightKg} onChange={(e) => setProfileForm((s) => ({ ...s, weightKg: e.target.value }))} />
              <Input label="Experience field" value={profileForm.experienceField} onChange={(e) => setProfileForm((s) => ({ ...s, experienceField: e.target.value }))} />
              <Input label="Desired industry" value={profileForm.desiredIndustry} onChange={(e) => setProfileForm((s) => ({ ...s, desiredIndustry: e.target.value }))} />
              <Input label="Preferred region" value={profileForm.preferredRegion} onChange={(e) => setProfileForm((s) => ({ ...s, preferredRegion: e.target.value }))} />
              <Input label="Desired salary" value={profileForm.desiredSalary} onChange={(e) => setProfileForm((s) => ({ ...s, desiredSalary: e.target.value }))} />
            </div>
            <div className="mt-4">
              <Button
                onClick={() =>
                  profileMutation.mutate({
                    birthYear: profileForm.birthYear ? Number(profileForm.birthYear) : null,
                    gender: profileForm.gender || null,
                    heightCm: profileForm.heightCm ? Number(profileForm.heightCm) : null,
                    weightKg: profileForm.weightKg ? Number(profileForm.weightKg) : null,
                    experienceField: profileForm.experienceField || null,
                    desiredIndustry: profileForm.desiredIndustry || null,
                    preferredRegion: profileForm.preferredRegion || null,
                    desiredSalary: profileForm.desiredSalary || null
                  })
                }
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? "Saving profile..." : "Save profile"}
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Lead summary" subtitle="Fast operator snapshot before taking any action.">
            <DescriptionList
              items={[
                { label: "Lead ID", value: lead.id },
                { label: "Source", value: lead.source },
                { label: "Phone", value: lead.phone || "No phone" },
                { label: "Region", value: lead.region || "No region" },
                { label: "Created", value: lead.createdAt || "Unknown" },
                { label: "Updated", value: lead.updatedAt || "Unknown" }
              ]}
            />
          </Panel>

          <Panel
            title="Suggested orders"
            subtitle="Driven by the backend matching suggestion endpoint when available."
          >
            {(suggestedOrders.length ? suggestedOrders : fallbackOrders).length ? (
              <div className="space-y-3">
                {(suggestedOrders.length ? suggestedOrders : fallbackOrders).map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{order.name}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{order.region || "No region"} · {order.industry || "No industry"}</div>
                      </div>
                      {renderOrderBadge(order)}
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-500">{order.description || order.requirements || "No additional order detail available."}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No orders available" description="No backend suggestions or orders are available for this lead." />
            )}
          </Panel>

          <Panel
            title="Extracted data snapshot"
            subtitle="What the current AI/matching layer sees before operator corrections."
          >
            <pre className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(lead.aiExtractedData ?? {}, null, 2)}</pre>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function WorkbenchStrip(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}

function ThreadMeta(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{props.value}</div>
    </div>
  );
}

function renderOrderBadge(order: Order | CandidateSuggestion) {
  if ("matchScore" in order && typeof order.matchScore === "number") {
    return <Badge tone="accent">{order.matchScore} pts</Badge>;
  }

  return <Badge tone="neutral">Catalog</Badge>;
}
