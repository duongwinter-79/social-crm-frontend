import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Button, DescriptionList, EmptyState, InfoStrip, Input, Panel, SectionHeader, Toolbar, ToolbarActions } from "@social-crm/ui";
import {
  useAiQueryMutation,
  useLeadDetailQuery,
  useLeadProfileQuery,
  useLeadTransitionsQuery,
  useUpdateLeadMutation,
  useUpsertLeadProfileMutation
} from "@social-crm/api";

export function LeadWorkbenchPage() {
  const { leadId = "" } = useParams();
  const leadQuery = useLeadDetailQuery(leadId);
  const transitionsQuery = useLeadTransitionsQuery(leadId);
  const profileQuery = useLeadProfileQuery(leadId);
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

  if (!lead) {
    return <Panel title="Lead workbench"><EmptyState title="Lead not loaded" description="The selected lead could not be loaded from the backend." /></Panel>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Lead workbench"
        title={lead.fullName || "Unnamed lead"}
        description={`Channel ${lead.source.toUpperCase()} - ${lead.phone || "No phone"} - ${lead.region || "No region"}`}
      />

      <Toolbar compact>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <DescriptionList
            className="flex-1"
            columns={4}
            items={[
              { label: "Current status", value: <Badge tone="accent">{lead.status}</Badge> },
              {
                label: "Lead score",
                value: (
                  <Badge tone={(lead.leadScore ?? 0) >= 80 ? "success" : (lead.leadScore ?? 0) >= 60 ? "warning" : "neutral"}>
                    {lead.leadScore ?? "-"}
                  </Badge>
                )
              },
              { label: "Classification", value: lead.leadClassification ?? "Unclassified" },
              { label: "Threads", value: lead.threads?.length ?? 0 }
            ]}
          />
          <ToolbarActions className="lg:justify-end">
            {(transitionsQuery.data?.allowed ?? []).map((next) => (
              <Button
                key={next}
                variant={next.includes("FAILED") || next === "DISQUALIFIED" ? "danger" : "secondary"}
                onClick={() => updateLead.mutate({ id: leadId, patch: { status: next } })}
                disabled={updateLead.isPending}
              >
                Move to {next}
              </Button>
            ))}
          </ToolbarActions>
        </div>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <InfoStrip>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">{lead.status}</Badge>
              <Badge tone={(lead.leadScore ?? 0) >= 80 ? "success" : (lead.leadScore ?? 0) >= 60 ? "warning" : "neutral"}>
                Score {lead.leadScore ?? "-"}
              </Badge>
              <Badge>{lead.leadClassification ?? "Unclassified"}</Badge>
              <span className="text-slate-500">{lead.threads?.length ?? 0} linked threads</span>
            </div>
          </InfoStrip>

          <Panel title="Conversation context" subtitle="Threads are available from the lead detail payload. Message history endpoints are not exposed yet, so this view focuses on thread state and AI analysis.">
            {lead.threads?.length ? (
              <div className="space-y-4">
                {lead.threads.map((thread) => (
                  <div key={thread.id} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{thread.channel}</Badge>
                      <Badge tone="warning">{thread.analyzeStatus}</Badge>
                      <span className="text-xs text-slate-500">Thread {thread.id}</span>
                    </div>
                    <div className="mt-3 text-sm text-slate-500">
                      Last message: {thread.lastMessageAt ?? "Unknown"} - Last AI extraction: {thread.lastAiExtractedAt ?? "Never"}
                    </div>
                    {thread.metadata ? (
                      <details className="mt-3 text-sm text-slate-500">
                        <summary className="cursor-pointer text-slate-700">Raw metadata</summary>
                        <pre className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(thread.metadata, null, 2)}</pre>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No threads on this lead" description="Webhook ingestion may not have attached conversation threads yet." />
            )}
          </Panel>

          <Panel title="AI thread query" subtitle="Run a manual prompt against the first available thread. Results are returned directly from the backend AI extraction service.">
            <div className="space-y-3">
              <Input label="Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <div className="flex items-center gap-3">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="mb-2 text-slate-500">AI result</div>
                  {aiMutation.data.result}
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Next actions" subtitle="Allowed transitions come directly from the backend state machine.">
            <DescriptionList
              items={[
                { label: "Lead ID", value: lead.id },
                { label: "Source", value: lead.source },
                { label: "Phone", value: lead.phone || "No phone" },
                { label: "Region", value: lead.region || "No region" }
              ]}
            />
            {!transitionsQuery.data?.allowed.length ? (
              <div className="mt-4 text-sm text-slate-500">No further transitions available.</div>
            ) : null}
          </Panel>

          <Panel title="Profile panel" subtitle="Review and update the structured lead profile stored behind /leads/:leadId/profile.">
            <div className="grid gap-3">
              <Input label="Birth year" value={profileForm.birthYear} onChange={(e) => setProfileForm((s) => ({ ...s, birthYear: e.target.value }))} />
              <Input label="Gender" value={profileForm.gender} onChange={(e) => setProfileForm((s) => ({ ...s, gender: e.target.value }))} />
              <Input label="Height (cm)" value={profileForm.heightCm} onChange={(e) => setProfileForm((s) => ({ ...s, heightCm: e.target.value }))} />
              <Input label="Weight (kg)" value={profileForm.weightKg} onChange={(e) => setProfileForm((s) => ({ ...s, weightKg: e.target.value }))} />
              <Input label="Experience field" value={profileForm.experienceField} onChange={(e) => setProfileForm((s) => ({ ...s, experienceField: e.target.value }))} />
              <Input label="Desired industry" value={profileForm.desiredIndustry} onChange={(e) => setProfileForm((s) => ({ ...s, desiredIndustry: e.target.value }))} />
              <Input label="Preferred region" value={profileForm.preferredRegion} onChange={(e) => setProfileForm((s) => ({ ...s, preferredRegion: e.target.value }))} />
              <Input label="Desired salary" value={profileForm.desiredSalary} onChange={(e) => setProfileForm((s) => ({ ...s, desiredSalary: e.target.value }))} />
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

          <Panel title="Extracted data snapshot" subtitle="What matching currently sees first is often the AI staging JSON on the lead.">
            <pre className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(lead.aiExtractedData ?? {}, null, 2)}</pre>
          </Panel>
        </div>
      </div>
    </div>
  );
}
