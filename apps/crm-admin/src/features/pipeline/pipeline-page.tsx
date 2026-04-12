import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  EmptyState,
  InfoStrip,
  Input,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import { usePipelineQuery } from "@social-crm/api";
import type { PipelineRow } from "@social-crm/api";

function toneForStage(stage: string) {
  if (["departed"].includes(stage)) return "success" as const;
  if (["disqualified", "interview_failed"].includes(stage)) return "danger" as const;
  if (["visa_processing", "contract_signed", "interview_passed", "interviewing", "interview_scheduled"].includes(stage)) return "warning" as const;
  return "accent" as const;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function PipelinePage() {
  const [filters, setFilters] = useState({
    stage: "",
    search: ""
  });

  const pipelineQuery = usePipelineQuery({
    offset: 0,
    limit: 100,
    stage: filters.stage || undefined,
    search: filters.search || undefined
  });

  const rows = pipelineQuery.data?.data ?? [];
  const groups = pipelineQuery.data?.groups ?? {};
  const orderedGroups = useMemo(() => Object.entries(groups).sort((a, b) => b[1] - a[1]), [groups]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Pipeline"
        title="Cross-stage case flow"
        description="One operational view across lead stage, candidate linkage, application status, document blockers, and training-finance readiness."
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>This workspace is backed by the aggregated `/pipeline` endpoint, not by frontend-only stitching.</span>
          <Badge tone="neutral">{pipelineQuery.data?.total ?? 0} cases</Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Stage" value={filters.stage} onChange={(e) => setFilters((s) => ({ ...s, stage: e.target.value }))}>
            <option value="">All stages</option>
            {orderedGroups.map(([stage]) => (
              <option key={stage} value={stage}>{formatLabel(stage)}</option>
            ))}
          </Select>
          <Input label="Search" value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </div>
        <ToolbarActions>
          {orderedGroups.slice(0, 5).map(([stage, count]) => (
            <Badge key={stage} tone="neutral">{formatLabel(stage)}: {count}</Badge>
          ))}
        </ToolbarActions>
      </Toolbar>

      <Panel
        title="Case queue"
        subtitle="Rows are keyed by lead and summarize the active operational state across modules."
      >
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((row: PipelineRow) => (
              <div key={row.leadId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{row.leadName || "Unnamed lead"}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.phone || "No phone"} · {row.source}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={toneForStage(row.currentStage)}>{formatLabel(row.currentStage)}</Badge>
                    {row.applicationStatus ? <Badge tone="warning">{formatLabel(row.applicationStatus)}</Badge> : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <PipelineMeta label="Candidate" value={row.candidateCode || row.candidateId || "Not created"} />
                  <PipelineMeta label="Order" value={row.applicationOrderName || "No application"} />
                  <PipelineMeta label="Documents" value={row.documents.missingRequired.length ? `${row.documents.missingRequired.length} missing` : "Complete"} />
                  <PipelineMeta label="Next action" value={row.nextAction} />
                </div>

                {row.blockers.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {row.blockers.map((blocker) => (
                      <Badge key={blocker} tone="danger">{blocker}</Badge>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link className="text-sm font-medium text-indigo-700 hover:text-indigo-800" to={`/leads/${row.leadId}`}>
                    Open lead workbench
                  </Link>
                  <span className="text-xs text-slate-500">
                    {row.trainingFinance?.departureDate
                      ? `Departure ${row.trainingFinance.departureDate}`
                      : row.trainingFinance?.visaDate
                        ? `Visa ${row.trainingFinance.visaDate}`
                        : row.trainingFinance?.trainingProgress || "No downstream milestone yet"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No pipeline rows found" description="Adjust the filters or wait until lead and downstream workflow data is available." />
        )}
      </Panel>
    </div>
  );
}

function PipelineMeta(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{props.value}</div>
    </div>
  );
}
