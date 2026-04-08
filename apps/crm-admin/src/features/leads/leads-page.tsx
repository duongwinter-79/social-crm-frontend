import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, DataTable, Input, SectionHeader, Select, Toolbar, ToolbarActions } from "@social-crm/ui";
import { useLeadsQuery } from "@social-crm/api";

function toneForStatus(status: string) {
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(status)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED"].includes(status)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "INTERVIEWING"].includes(status)) return "warning" as const;
  return "neutral" as const;
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
      blocked: leads.filter((lead) => ["INTERVIEW_FAILED", "DISQUALIFIED"].includes(lead.status)).length
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Lead operations"
        title="Lead inbox"
        description="Search, filter, and open leads into the workbench. This surface prioritizes triage and next action over decorative dashboard chrome."
      />

      <Toolbar>
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <Input
            label="Lead name"
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => setSearch(value));
            }}
            placeholder="Nguyen, Tran, Linh..."
          />
          <Select label="Current status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["NEW", "CONTACTED", "QUALIFIED", "MATCHING", "MATCHED", "INTERVIEW_SCHEDULED", "INTERVIEWING", "INTERVIEW_PASSED", "INTERVIEW_FAILED", "CONTRACT_SIGNED", "VISA_PROCESSING", "DEPARTED", "DISQUALIFIED"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Select label="Acquisition channel" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All channels</option>
            {["zalo", "facebook", "miniapp"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <ToolbarActions className="justify-start lg:justify-end">
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

      <div className="grid gap-3 md:grid-cols-4">
        <Strip label="Loaded" value={leads.length} />
        <Strip label="Total" value={total} />
        <Strip label="Hot" value={stats.hot} />
        <Strip label="Blocked" value={stats.blocked} />
      </div>

      <DataTable>
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-base font-semibold text-slate-900">Lead list</div>
          <div className="mt-1 text-sm text-slate-500">
            Showing {leads.length} records in the current filter window. {stats.stale} look untouched since capture.
          </div>
        </div>
        <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-5 pb-3 pt-4">Lead</th>
                <th className="pb-3 pr-4 pt-4">Source</th>
                <th className="pb-3 pr-4 pt-4">Status</th>
                <th className="pb-3 pr-4 pt-4">Signal</th>
                <th className="pb-3 pr-4 pt-4">Tags</th>
                <th className="pb-3 pr-5 pt-4">Threads</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-200 align-top transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4 pr-4">
                    <Link to={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-sky-700">
                      {lead.fullName || "Unnamed lead"}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">{lead.phone || "No phone"} - {lead.region || "No region"}</div>
                  </td>
                  <td className="py-4 pr-4 uppercase text-slate-600">{lead.source}</td>
                  <td className="py-4 pr-4">
                    <Badge tone={toneForStatus(lead.status)}>{lead.status}</Badge>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="font-medium text-slate-900">{lead.leadScore ?? "-"}</div>
                    <div className="mt-1 text-xs text-slate-500">{lead.leadClassification ?? "Unclassified"}</div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex max-w-[220px] flex-wrap gap-2">
                      {(lead.tags ?? []).slice(0, 4).map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 pr-5 text-slate-500">{lead.threads?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
        </table>
      </DataTable>
    </div>
  );
}

function Strip(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}
