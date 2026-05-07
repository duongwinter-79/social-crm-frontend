import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  FieldGroup,
  InfoCard,
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
  useCreateApplicationMutation,
  useOrdersQuery,
  useUpdateApplicationMutation
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import { CandidatePicker } from "@/components/candidate-picker";

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

type ApplicationFormState = {
  candidateId: string;
  orderId: string;
  status: string;
  interviewDate: string;
  interviewResult: string;
  rejectReason: string;
};

const emptyCreateForm: ApplicationFormState = {
  candidateId: "",
  orderId: "",
  status: "matching",
  interviewDate: "",
  interviewResult: "",
  rejectReason: ""
};

function toneForApplicationStatus(status: string) {
  if (["interview_failed", "rejected", "withdrawn"].includes(status)) return "danger" as const;
  if (["interview_passed", "signing"].includes(status)) return "success" as const;
  if (["referred", "interview_scheduled"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function ApplicationsPage() {
  const { copy, formatApplicationStatus } = useI18n();
  const [filters, setFilters] = useState({
    leadId: "",
    candidateId: "",
    orderId: "",
    status: "",
    search: ""
  });
  const [selectedId, setSelectedId] = useState<string>("");
  const [createForm, setCreateForm] = useState<ApplicationFormState>(emptyCreateForm);
  const [detailForm, setDetailForm] = useState({
    status: "",
    interviewDate: "",
    interviewResult: "",
    rejectReason: ""
  });
  const [createError, setCreateError] = useState("");
  const [detailError, setDetailError] = useState("");

  const applicationQuery = useApplicationsQuery({
    offset: 0,
    limit: 50,
    leadId: filters.leadId || undefined,
    candidateId: filters.candidateId || undefined,
    orderId: filters.orderId || undefined,
    status: filters.status || undefined
  });
  const ordersQuery = useOrdersQuery();
  const createApplication = useCreateApplicationMutation();
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
    setDetailError("");
  }, [selected]);

  function submitCreate() {
    const error = validateApplicationForm(createForm);
    if (error) {
      setCreateError(error);
      return;
    }

    setCreateError("");
    createApplication.mutate(
      {
        candidateId: createForm.candidateId,
        orderId: createForm.orderId,
        status: createForm.status || undefined,
        interviewDate: createForm.interviewDate || undefined,
        interviewResult: createForm.interviewResult.trim() || undefined,
        rejectReason: createForm.rejectReason.trim() || undefined
      },
      {
        onSuccess: (application) => {
          setSelectedId(application.id);
          setCreateForm(emptyCreateForm);
        }
      }
    );
  }

  function submitDetailUpdate() {
    if (!selected) return;
    const error = validateApplicationForm({
      candidateId: selected.candidate_id || "selected",
      orderId: selected.order_id || "selected",
      status: detailForm.status,
      interviewDate: detailForm.interviewDate,
      interviewResult: detailForm.interviewResult,
      rejectReason: detailForm.rejectReason
    });
    if (error) {
      setDetailError(error);
      return;
    }

    setDetailError("");
    updateApplication.mutate({
      id: selected.id,
      patch: {
        status: detailForm.status || undefined,
        interviewDate: detailForm.interviewDate || null,
        interviewResult: detailForm.interviewResult || null,
        rejectReason: detailForm.rejectReason || null
      }
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Applications", vi: "Applications" })}
        title={copy({ en: "Placement progress workspace", vi: "Placement progress workspace" })}
        description={copy({
          en: "Create and track candidate-to-order applications with interview state, rejection context, and downstream placement readiness.",
          vi: "Create and track candidate-to-order applications with interview state, rejection context, and downstream placement readiness."
        })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy({ en: "The backend applications module is live for list, detail, create, and lifecycle updates.", vi: "The backend applications module is live for list, detail, create, and lifecycle updates." })}</span>
          <Badge tone="success">{copy({ en: "Creation uses candidate and order selectors", vi: "Creation uses candidate and order selectors" })}</Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <FieldGroup columns={4} className="xl:grid-cols-5">
          <Input label={copy({ en: "Lead ID", vi: "Lead ID" })} value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
          <Input label={copy({ en: "Candidate ID", vi: "Candidate ID" })} value={filters.candidateId} onChange={(e) => setFilters((s) => ({ ...s, candidateId: e.target.value }))} />
          <Input label={copy({ en: "Order ID", vi: "Order ID" })} value={filters.orderId} onChange={(e) => setFilters((s) => ({ ...s, orderId: e.target.value }))} />
          <Select label={copy({ en: "Status", vi: "Status" })} value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            <option value="">{copy({ en: "All statuses", vi: "All statuses" })}</option>
            {STATUS_OPTIONS.filter(Boolean).map((status) => (
              <option key={status} value={status}>{formatApplicationStatus(status)}</option>
            ))}
          </Select>
          <Input label={copy({ en: "Search", vi: "Search" })} value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </FieldGroup>
        <ToolbarActions>
          <Badge tone="neutral">{copy({ en: `${filteredRecords.length} visible applications`, vi: `${filteredRecords.length} visible applications` })}</Badge>
          <Badge tone="neutral">{copy({ en: `${applicationQuery.data?.total ?? 0} total from backend`, vi: `${applicationQuery.data?.total ?? 0} total from backend` })}</Badge>
        </ToolbarActions>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_390px]">
        <Panel
          title={copy({ en: "Application queue", vi: "Application queue" })}
          subtitle={copy({ en: "Each record is a real candidate-to-order application from the backend workflow.", vi: "Each record is a real candidate-to-order application from the backend workflow." })}
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
                        <div className="font-semibold text-slate-900">{record.order?.name ?? copy({ en: "Unknown order", vi: "Unknown order" })}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {record.lead?.fullName ?? copy({ en: "Unknown lead", vi: "Unknown lead" })} - {record.candidate?.code ?? record.candidate_id ?? copy({ en: "No candidate code", vi: "No candidate code" })}
                        </div>
                      </div>
                      <Badge tone={toneForApplicationStatus(record.status)}>{formatApplicationStatus(record.status)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <InfoCard label={copy({ en: "Lead", vi: "Lead" })} value={record.lead?.phone ?? record.lead_id} />
                      <InfoCard label={copy({ en: "Interview", vi: "Interview" })} value={record.interviewDate ? record.interviewDate.slice(0, 10) : copy({ en: "Not set", vi: "Not set" })} />
                      <InfoCard label={copy({ en: "Updated", vi: "Updated" })} value={record.updatedAt ? record.updatedAt.slice(0, 10) : copy({ en: "Unknown", vi: "Unknown" })} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState title={copy({ en: "No applications found", vi: "No applications found" })} description={copy({ en: "Adjust filters or create an application from the candidate/order panel.", vi: "Adjust filters or create an application from the candidate/order panel." })} />
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title={copy({ en: "Create application", vi: "Create application" })}
            subtitle={copy({ en: "Create a real candidate-to-order application without manual UUID entry.", vi: "Create a real candidate-to-order application without manual UUID entry." })}
          >
            <div className="space-y-4">
              <CandidatePicker
                label={copy({ en: "Candidate", vi: "Candidate" })}
                searchLabel={copy({ en: "Candidate search", vi: "Candidate search" })}
                placeholder={copy({ en: "Code, lead name, or phone", vi: "Code, lead name, or phone" })}
                emptyLabel={copy({ en: "Select candidate", vi: "Select candidate" })}
                noLeadDetailLabel={copy({ en: "No lead detail", vi: "No lead detail" })}
                value={createForm.candidateId}
                onChange={(candidateId) => setCreateForm((s) => ({ ...s, candidateId }))}
              />
              <FieldGroup>
                <Select label={copy({ en: "Order", vi: "Order" })} value={createForm.orderId} onChange={(e) => setCreateForm((s) => ({ ...s, orderId: e.target.value }))}>
                  <option value="">{copy({ en: "Select order", vi: "Select order" })}</option>
                  {(ordersQuery.data ?? []).map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.name} - {order.region || copy({ en: "No region", vi: "No region" })}
                    </option>
                  ))}
                </Select>
                <Select label={copy({ en: "Initial status", vi: "Initial status" })} value={createForm.status} onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value }))}>
                  {STATUS_OPTIONS.filter(Boolean).map((status) => (
                    <option key={status} value={status}>{formatApplicationStatus(status)}</option>
                  ))}
                </Select>
                <Input label={copy({ en: "Interview date", vi: "Interview date" })} type="date" value={createForm.interviewDate} onChange={(e) => setCreateForm((s) => ({ ...s, interviewDate: e.target.value }))} />
                <Input label={copy({ en: "Interview result", vi: "Interview result" })} maxLength={255} value={createForm.interviewResult} onChange={(e) => setCreateForm((s) => ({ ...s, interviewResult: e.target.value }))} />
                <Input label={copy({ en: "Reject reason", vi: "Reject reason" })} maxLength={255} value={createForm.rejectReason} onChange={(e) => setCreateForm((s) => ({ ...s, rejectReason: e.target.value }))} />
              </FieldGroup>
              {createError || createApplication.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {createError || copy({ en: "Application creation failed. Check selected entities and status-required fields.", vi: "Application creation failed. Check selected entities and status-required fields." })}
                </div>
              ) : null}
              <ToolbarActions>
                <Button onClick={submitCreate} disabled={createApplication.isPending || ordersQuery.isLoading}>
                  {createApplication.isPending ? copy({ en: "Creating application...", vi: "Creating application..." }) : copy({ en: "Create application", vi: "Create application" })}
                </Button>
                <Button variant="secondary" onClick={() => setCreateForm(emptyCreateForm)} disabled={createApplication.isPending}>
                  {copy({ en: "Reset", vi: "Reset" })}
                </Button>
              </ToolbarActions>
            </div>
          </Panel>

          <Panel
            title={copy({ en: "Application detail", vi: "Application detail" })}
            subtitle={copy({ en: "Update live backend status, interview metadata, and rejection context.", vi: "Update live backend status, interview metadata, and rejection context." })}
          >
            {selected ? (
              <div className="space-y-4">
                <DescriptionList
                  items={[
                    { label: copy({ en: "Application ID", vi: "Application ID" }), value: selected.id },
                    { label: copy({ en: "Lead", vi: "Lead" }), value: selected.lead?.fullName ?? selected.lead_id },
                    { label: copy({ en: "Candidate", vi: "Candidate" }), value: selected.candidate?.code ?? selected.candidate_id ?? copy({ en: "Unknown", vi: "Unknown" }) },
                    { label: copy({ en: "Order", vi: "Order" }), value: selected.order?.name ?? selected.order_id },
                    { label: copy({ en: "Created", vi: "Created" }), value: selected.createdAt ?? copy({ en: "Unknown", vi: "Unknown" }) }
                  ]}
                />

                <FieldGroup>
                  <Select label={copy({ en: "Status", vi: "Status" })} value={detailForm.status} onChange={(e) => setDetailForm((s) => ({ ...s, status: e.target.value }))}>
                    {STATUS_OPTIONS.filter(Boolean).map((status) => (
                      <option key={status} value={status}>{formatApplicationStatus(status)}</option>
                    ))}
                  </Select>
                  <Input label={copy({ en: "Interview date", vi: "Interview date" })} type="date" value={detailForm.interviewDate} onChange={(e) => setDetailForm((s) => ({ ...s, interviewDate: e.target.value }))} />
                  <Input label={copy({ en: "Interview result", vi: "Interview result" })} maxLength={255} value={detailForm.interviewResult} onChange={(e) => setDetailForm((s) => ({ ...s, interviewResult: e.target.value }))} />
                  <Input label={copy({ en: "Reject reason", vi: "Reject reason" })} maxLength={255} value={detailForm.rejectReason} onChange={(e) => setDetailForm((s) => ({ ...s, rejectReason: e.target.value }))} />
                </FieldGroup>

                {detailError || updateApplication.error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {detailError || copy({ en: "Application update failed. Check status-required fields.", vi: "Application update failed. Check status-required fields." })}
                  </div>
                ) : null}

                <Button onClick={submitDetailUpdate} disabled={updateApplication.isPending}>
                  {updateApplication.isPending ? copy({ en: "Saving application...", vi: "Saving application..." }) : copy({ en: "Save application update", vi: "Save application update" })}
                </Button>
              </div>
            ) : (
              <EmptyState title={copy({ en: "No application selected", vi: "No application selected" })} description={copy({ en: "Select a queue record to inspect and update live backend application state.", vi: "Select a queue record to inspect and update live backend application state." })} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function validateApplicationForm(form: {
  candidateId: string;
  orderId: string;
  status: string;
  interviewDate: string;
  interviewResult?: string;
  rejectReason: string;
}) {
  if (!form.candidateId) return "Select a candidate before creating an application.";
  if (!form.orderId) return "Select an order before creating an application.";
  if (form.status === "interview_scheduled" && !form.interviewDate) {
    return "Interview date is required when status is interview scheduled.";
  }
  if (["interview_failed", "rejected", "withdrawn"].includes(form.status) && !form.rejectReason.trim()) {
    return "Reject reason is required when status is interview failed, rejected, or withdrawn.";
  }
  return "";
}
