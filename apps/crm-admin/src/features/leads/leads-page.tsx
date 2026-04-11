import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, DataTable, Input, SectionHeader, Select, Toolbar, ToolbarActions } from "@social-crm/ui";
import { useLeadsQuery } from "@social-crm/api";

function toneForStatus(status: string) {
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(status)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED", "DEPARTED"].includes(status)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "INTERVIEWING", "VISA_PROCESSING"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function LeadsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const deferredSearch = useDeferredValue(search);

  const query = useLeadsQuery({
    offset: 0,
    limit: 50,
    search: deferredSearch || undefined,
    status: status || undefined,
    source: source || undefined
  });

  const leads = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  const stats = useMemo(() => {
    return {
      stale: leads.filter((lead) => !lead.updatedAt || lead.updatedAt === lead.createdAt).length,
      hot: leads.filter((lead) => (lead.leadScore ?? 0) >= 80).length,
      blocked: leads.filter((lead) => ["INTERVIEW_FAILED", "DISQUALIFIED"].includes(lead.status)).length,
      worked: leads.filter((lead) => ["QUALIFIED", "MATCHING", "MATCHED", "INTERVIEW_SCHEDULED", "INTERVIEWING"].includes(lead.status)).length
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Lead operations"
        title="Lead inbox"
        description="Source-style triage surface: compact filters, operational metrics, and a denser lead table driven by the current backend list APIs."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Strip label="Loaded" value={leads.length} hint="Visible lead rows" />
        <Strip label="Total" value={total} hint="Backend result size" />
        <Strip label="Hot" value={stats.hot} hint="Score >= 80" tone="accent" />
        <Strip label="Blocked" value={stats.blocked} hint="Failed or disqualified" tone="danger" />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_auto]">
          <Input
            label="Lead search"
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => setSearch(value));
            }}
            placeholder="Name or phone..."
          />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["NEW", "CONTACTED", "QUALIFIED", "MATCHING", "MATCHED", "INTERVIEW_SCHEDULED", "INTERVIEWING", "INTERVIEW_PASSED", "INTERVIEW_FAILED", "CONTRACT_SIGNED", "VISA_PROCESSING", "DEPARTED", "DISQUALIFIED"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Select label="Channel" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All channels</option>
            {["zalo", "facebook", "miniapp"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <ToolbarActions className="justify-start xl:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setStatus("");
                setSource("");
              }}
            >
              Reset
            </Button>
          </ToolbarActions>
        </div>
      </Toolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <DataTable>
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">Lead list</div>
                <div className="mt-1 text-sm text-slate-500">
                  Showing {leads.length} records in the current filter window. {stats.stale} still look untouched since capture.
                </div>
              </div>
              <Badge tone="neutral">{stats.worked} active in pipeline</Badge>
            </div>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Lead</th>
                <th className="py-4 pr-4">Channel</th>
                <th className="py-4 pr-4">Status</th>
                <th className="py-4 pr-4">Signal</th>
                <th className="py-4 pr-4">Tags</th>
                <th className="py-4 pr-6">Threads</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-200 align-top transition-colors hover:bg-slate-50">
                  <td className="px-6 py-5 pr-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xs font-bold text-indigo-700">
                        {(lead.fullName || "Lead").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/leads/${lead.id}`} className="font-semibold text-slate-900 hover:text-indigo-700">
                          {lead.fullName || "Unnamed lead"}
                        </Link>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{lead.phone || "No phone"} · {lead.region || "No region"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 pr-4 uppercase text-slate-600">{lead.source}</td>
                  <td className="py-5 pr-4">
                    <Badge tone={toneForStatus(lead.status)}>{lead.status}</Badge>
                  </td>
                  <td className="py-5 pr-4">
                    <div className="font-semibold text-slate-900">{lead.leadScore ?? "-"}</div>
                    <div className="mt-1 text-xs text-slate-500">{lead.leadClassification ?? "Unclassified"}</div>
                  </td>
                  <td className="py-5 pr-4">
                    <div className="flex max-w-[220px] flex-wrap gap-2">
                      {(lead.tags ?? []).slice(0, 4).map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-5 pr-6 text-slate-500">{lead.threads?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Workboard notes</div>
          <div className="mt-4 space-y-3">
            <SideNote label="High attention" value={stats.hot} description="Score-driven follow-up priority." />
            <SideNote label="Blocked leads" value={stats.blocked} description="Review for recovery or exit." />
            <SideNote label="Untouched" value={stats.stale} description="Candidates with no visible progression yet." />
          </div>
        </div>
      </div>
    </div>
  );
}

function Strip(props: { label: string; value: string | number; hint: string; tone?: "neutral" | "accent" | "danger" }) {
  const accentClass =
    props.tone === "accent"
      ? "border-indigo-200 bg-indigo-50"
      : props.tone === "danger"
        ? "border-rose-200 bg-rose-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)] ${accentClass}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
      <div className="mt-2 text-xs text-slate-500">{props.hint}</div>
    </div>
  );
}

function SideNote(props: { label: string; value: string | number; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-800">{props.label}</div>
        <div className="text-lg font-bold text-slate-900">{props.value}</div>
      </div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{props.description}</div>
    </div>
  );
}
