import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  InfoStrip,
  Input,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useApplicationDetailQuery,
  useApplicationsQuery,
  useUpdateApplicationMutation
} from "@social-crm/api";

const STATUS_OPTIONS = [
  "",
  "matching",
  "referred",
  "interview_scheduled",
  "interview_passed",
  "interview_failed",
  "signing",
  "rejected",
  "withdrawn"
] as const;

function toneForApplicationStatus(status: string) {
  if (["interview_failed", "rejected", "withdrawn"].includes(status)) return "danger" as const;
  if (["interview_passed", "signing"].includes(status)) return "success" as const;
  if (["referred", "interview_scheduled"].includes(status)) return "warning" as const;
  return "accent" as const;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function ApplicationsPage() {
  const [filters, setFilters] = useState({
    leadId: "",
    candidateId: "",
    orderId: "",
    status: "",
    search: ""
  });
  const [selectedId, setSelectedId] = useState<string>("");
  const [detailForm, setDetailForm] = useState({
    status: "",
    interviewDate: "",
    interviewResult: "",
    rejectReason: ""
  });

  const applicationQuery = useApplicationsQuery({
    offset: 0,
    limit: 50,
    leadId: filters.leadId || undefined,
    candidateId: filters.candidateId || undefined,
    orderId: filters.orderId || undefined,
    status: filters.status || undefined
  });
  const updateApplication = useUpdateApplicationMutation();
  const records = applicationQuery.data?.data ?? [];
  const filteredRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const term = filters.search.trim().toLowerCase();
    return records.filter((record) =>
      [record.id, record.lead?.fullName, record.lead?.phone, record.order?.name, record.candidate?.code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [records, filters.search]);

  const selectedIdResolved = selectedId || filteredRecords[0]?.id || "";
  const detailQuery = useApplicationDetailQuery(selectedIdResolved);
  const selected = detailQuery.data;

  useEffect(() => {
    if (!selected) return;
    setDetailForm({
      status: selected.status ?? "",
      interviewDate: selected.interviewDate ? selected.interviewDate.slice(0, 10) : "",
      interviewResult: selected.interviewResult ?? "",
      rejectReason: selected.rejectReason ?? ""
    });
  }, [selected]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Applications"
        title="Placement progress workspace"
        description="Track candidate-to-order progression with real backend application records, interview state, and downstream placement readiness."
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>The backend applications module is now live for list, detail, and lifecycle updates.</span>
          <Badge tone="warning">Creation is deferred until candidate context is exposed cleanly in the frontend</Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input label="Lead ID" value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
          <Input label="Candidate ID" value={filters.candidateId} onChange={(e) => setFilters((s) => ({ ...s, candidateId: e.target.value }))} />
          <Input label="Order ID" value={filters.orderId} onChange={(e) => setFilters((s) => ({ ...s, orderId: e.target.value }))} />
          <Select label="Status" value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((status) => (
              <option key={status} value={status}>{formatStatus(status)}</option>
            ))}
          </Select>
          <Input label="Search" value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </div>
        <ToolbarActions>
          <Badge tone="neutral">{filteredRecords.length} visible applications</Badge>
          <Badge tone="neutral">{applicationQuery.data?.total ?? 0} total from backend</Badge>
        </ToolbarActions>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Panel
          title="Application queue"
          subtitle="Each record is a real candidate-to-order application from the backend workflow."
        >
          {filteredRecords.length ? (
            <div className="space-y-3">
              {filteredRecords.map((record) => {
                const active = record.id === selectedIdResolved;
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? "border-indigo-500 bg-indigo-50/60" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{record.order?.name ?? "Unknown order"}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {record.lead?.fullName ?? "Unknown lead"} · {record.candidate?.code ?? record.candidate_id ?? "No candidate code"}
                        </div>
                      </div>
                      <Badge tone={toneForApplicationStatus(record.status)}>{formatStatus(record.status)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <ApplicationMeta label="Lead" value={record.lead?.phone ?? record.lead_id} />
                      <ApplicationMeta label="Interview" value={record.interviewDate ? record.interviewDate.slice(0, 10) : "Not set"} />
                      <ApplicationMeta label="Updated" value={record.updatedAt ? record.updatedAt.slice(0, 10) : "Unknown"} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No applications found" description="Adjust the filters or wait until backend application records are created from the matching workflow." />
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Application detail"
            subtitle="Update live backend status, interview metadata, and rejection context from the same operator surface."
          >
            {selected ? (
              <div className="space-y-4">
                <DescriptionList
                  items={[
                    { label: "Application ID", value: selected.id },
                    { label: "Lead", value: selected.lead?.fullName ?? selected.lead_id },
                    { label: "Candidate", value: selected.candidate?.code ?? selected.candidate_id ?? "Unknown" },
                    { label: "Order", value: selected.order?.name ?? selected.order_id },
                    { label: "Created", value: selected.createdAt ?? "Unknown" }
                  ]}
                />

                <div className="grid gap-4">
                  <Select label="Status" value={detailForm.status} onChange={(e) => setDetailForm((s) => ({ ...s, status: e.target.value }))}>
                    {STATUS_OPTIONS.filter(Boolean).map((status) => (
                      <option key={status} value={status}>{formatStatus(status)}</option>
                    ))}
                  </Select>
                  <Input label="Interview date" type="date" value={detailForm.interviewDate} onChange={(e) => setDetailForm((s) => ({ ...s, interviewDate: e.target.value }))} />
                  <Input label="Interview result" value={detailForm.interviewResult} onChange={(e) => setDetailForm((s) => ({ ...s, interviewResult: e.target.value }))} />
                  <Input label="Reject reason" value={detailForm.rejectReason} onChange={(e) => setDetailForm((s) => ({ ...s, rejectReason: e.target.value }))} />
                </div>

                <Button
                  onClick={() =>
                    updateApplication.mutate({
                      id: selected.id,
                      patch: {
                        status: detailForm.status || undefined,
                        interviewDate: detailForm.interviewDate || null,
                        interviewResult: detailForm.interviewResult || null,
                        rejectReason: detailForm.rejectReason || null
                      }
                    })
                  }
                  disabled={updateApplication.isPending}
                >
                  {updateApplication.isPending ? "Saving application..." : "Save application update"}
                </Button>
              </div>
            ) : (
              <EmptyState title="No application selected" description="Select a record from the queue to inspect and update the live backend application state." />
            )}
          </Panel>

          <Panel
            title="Operator notes"
            subtitle="Current backend limitation and expected next integration step."
          >
            <div className="space-y-3 text-sm leading-7 text-slate-600">
              <p>
                The backend supports application creation, but the frontend does not yet have a clean candidate lookup surface.
                For now, this workspace focuses on real queue visibility and lifecycle updates instead of inventing a candidate picker.
              </p>
              <p>
                The next upgrade should expose candidate context in the lead workbench or add a recruitment listing API so
                application creation can be performed without manual IDs.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ApplicationMeta(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{props.value}</div>
    </div>
  );
}
