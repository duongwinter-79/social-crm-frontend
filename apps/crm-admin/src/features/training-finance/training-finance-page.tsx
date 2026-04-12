import { useMemo, useState } from "react";
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
  useCreateTrainingFinanceMutation,
  useTrainingFinanceQuery,
  useUpdateTrainingFinanceMutation
} from "@social-crm/api";
import type { TrainingFinanceRecord } from "@social-crm/api";

function toneForMilestone(record: TrainingFinanceRecord) {
  if (record.departureDate) return "success" as const;
  if (record.visaDate) return "success" as const;
  if (record.trainingStartDate || record.trainingProgress) return "warning" as const;
  if (record.depositStatus || record.amountPaid) return "accent" as const;
  return "neutral" as const;
}

function milestoneLabel(record: TrainingFinanceRecord) {
  if (record.departureDate) return "departure scheduled";
  if (record.visaDate) return "visa ready";
  if (record.trainingStartDate || record.trainingProgress) return "training in progress";
  if (record.depositStatus || record.amountPaid) return "deposit tracked";
  return "not started";
}

export function TrainingFinancePage() {
  const [filters, setFilters] = useState({
    leadId: "",
    orderId: "",
    search: ""
  });
  const [selectedId, setSelectedId] = useState("");
  const [createForm, setCreateForm] = useState({
    leadId: "",
    orderId: "",
    orderType: "",
    depositStatus: "",
    amountPaid: "",
    trainingStartDate: "",
    trainingProgress: "",
    visaDate: "",
    departureDate: ""
  });
  const [editForm, setEditForm] = useState({
    orderId: "",
    orderType: "",
    depositStatus: "",
    amountPaid: "",
    trainingStartDate: "",
    trainingProgress: "",
    visaDate: "",
    departureDate: ""
  });

  const recordsQuery = useTrainingFinanceQuery({
    offset: 0,
    limit: 100,
    leadId: filters.leadId || undefined,
    orderId: filters.orderId || undefined
  });
  const createTrainingFinance = useCreateTrainingFinanceMutation();
  const updateTrainingFinance = useUpdateTrainingFinanceMutation();

  const records = recordsQuery.data?.data ?? [];
  const filteredRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const term = filters.search.trim().toLowerCase();
    return records.filter((record: TrainingFinanceRecord) =>
      [record.id, record.lead_id, record.order_id, record.orderType, record.depositStatus, record.trainingProgress]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [records, filters.search]);

  const selected = filteredRecords.find((record: TrainingFinanceRecord) => record.id === selectedId) ?? filteredRecords[0] ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Training & Finance"
        title="Commitment, training, visa, and departure tracking"
        description="Track downstream milestones after matching and application progression with real backend training-finance records."
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>The current module is milestone-driven rather than payment-infrastructure heavy.</span>
          <Badge tone="warning">Use it to manage operational readiness, not full accounting</Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Lead ID" value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
          <Input label="Order ID" value={filters.orderId} onChange={(e) => setFilters((s) => ({ ...s, orderId: e.target.value }))} />
          <Input label="Search" value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </div>
        <ToolbarActions>
          <Badge tone="neutral">{filteredRecords.length} visible records</Badge>
        </ToolbarActions>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="space-y-6">
          <Panel
            title="Milestone ledger"
            subtitle="Each record ties deposit, training, visa, and departure progress back to a lead and optional order."
          >
            {filteredRecords.length ? (
              <div className="space-y-3">
                {filteredRecords.map((record: TrainingFinanceRecord) => {
                  const active = record.id === selected?.id;
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(record.id);
                        setEditForm({
                          orderId: record.order_id ?? "",
                          orderType: record.orderType ?? "",
                          depositStatus: record.depositStatus ?? "",
                          amountPaid: record.amountPaid != null ? String(record.amountPaid) : "",
                          trainingStartDate: record.trainingStartDate ?? "",
                          trainingProgress: record.trainingProgress ?? "",
                          visaDate: record.visaDate ?? "",
                          departureDate: record.departureDate ?? ""
                        });
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? "border-indigo-500 bg-indigo-50/60" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{record.orderType || record.order?.name || "Training-finance record"}</div>
                          <div className="mt-1 text-xs text-slate-500">{record.lead?.fullName || record.lead_id}</div>
                        </div>
                        <Badge tone={toneForMilestone(record)}>{milestoneLabel(record)}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <LedgerMeta label="Deposit" value={record.depositStatus || "Not set"} />
                        <LedgerMeta label="Amount paid" value={record.amountPaid != null ? String(record.amountPaid) : "0"} />
                        <LedgerMeta label="Visa" value={record.visaDate || "Pending"} />
                        <LedgerMeta label="Departure" value={record.departureDate || "Pending"} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No training-finance records found" description="Create the first milestone record for a lead once downstream processing begins." />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Create milestone record"
            subtitle="This is the first operational record for deposits, training, visa, and departure readiness."
          >
            <div className="space-y-4">
              <Input label="Lead ID" value={createForm.leadId} onChange={(e) => setCreateForm((s) => ({ ...s, leadId: e.target.value }))} />
              <Input label="Order ID" value={createForm.orderId} onChange={(e) => setCreateForm((s) => ({ ...s, orderId: e.target.value }))} />
              <Input label="Order type" value={createForm.orderType} onChange={(e) => setCreateForm((s) => ({ ...s, orderType: e.target.value }))} />
              <Input label="Deposit status" value={createForm.depositStatus} onChange={(e) => setCreateForm((s) => ({ ...s, depositStatus: e.target.value }))} />
              <Input label="Amount paid" value={createForm.amountPaid} onChange={(e) => setCreateForm((s) => ({ ...s, amountPaid: e.target.value }))} />
              <Input label="Training start" type="date" value={createForm.trainingStartDate} onChange={(e) => setCreateForm((s) => ({ ...s, trainingStartDate: e.target.value }))} />
              <Input label="Training progress" value={createForm.trainingProgress} onChange={(e) => setCreateForm((s) => ({ ...s, trainingProgress: e.target.value }))} />
              <Input label="Visa date" type="date" value={createForm.visaDate} onChange={(e) => setCreateForm((s) => ({ ...s, visaDate: e.target.value }))} />
              <Input label="Departure date" type="date" value={createForm.departureDate} onChange={(e) => setCreateForm((s) => ({ ...s, departureDate: e.target.value }))} />
              <Button
                onClick={() =>
                  createTrainingFinance.mutate({
                    leadId: createForm.leadId,
                    orderId: createForm.orderId || undefined,
                    orderType: createForm.orderType || undefined,
                    depositStatus: createForm.depositStatus || undefined,
                    amountPaid: createForm.amountPaid ? Number(createForm.amountPaid) : undefined,
                    trainingStartDate: createForm.trainingStartDate || undefined,
                    trainingProgress: createForm.trainingProgress || undefined,
                    visaDate: createForm.visaDate || undefined,
                    departureDate: createForm.departureDate || undefined
                  })
                }
                disabled={!createForm.leadId || createTrainingFinance.isPending}
              >
                {createTrainingFinance.isPending ? "Creating..." : "Create milestone record"}
              </Button>
            </div>
          </Panel>

          <Panel
            title="Selected record"
            subtitle="Update live milestone fields and let backend side effects advance the downstream workflow."
          >
            {selected ? (
              <div className="space-y-4">
                <DescriptionList
                  items={[
                    { label: "Record ID", value: selected.id },
                    { label: "Lead", value: selected.lead?.fullName || selected.lead_id },
                    { label: "Order", value: selected.order?.name || selected.order_id || "No order" },
                    { label: "Updated", value: selected.updatedAt || "Unknown" }
                  ]}
                />
                <Input label="Order ID" value={editForm.orderId} onChange={(e) => setEditForm((s) => ({ ...s, orderId: e.target.value }))} />
                <Input label="Order type" value={editForm.orderType} onChange={(e) => setEditForm((s) => ({ ...s, orderType: e.target.value }))} />
                <Input label="Deposit status" value={editForm.depositStatus} onChange={(e) => setEditForm((s) => ({ ...s, depositStatus: e.target.value }))} />
                <Input label="Amount paid" value={editForm.amountPaid} onChange={(e) => setEditForm((s) => ({ ...s, amountPaid: e.target.value }))} />
                <Input label="Training start" type="date" value={editForm.trainingStartDate} onChange={(e) => setEditForm((s) => ({ ...s, trainingStartDate: e.target.value }))} />
                <Input label="Training progress" value={editForm.trainingProgress} onChange={(e) => setEditForm((s) => ({ ...s, trainingProgress: e.target.value }))} />
                <Input label="Visa date" type="date" value={editForm.visaDate} onChange={(e) => setEditForm((s) => ({ ...s, visaDate: e.target.value }))} />
                <Input label="Departure date" type="date" value={editForm.departureDate} onChange={(e) => setEditForm((s) => ({ ...s, departureDate: e.target.value }))} />
                <Button
                  onClick={() =>
                    updateTrainingFinance.mutate({
                      id: selected.id,
                      patch: {
                        orderId: editForm.orderId || null,
                        orderType: editForm.orderType || null,
                        depositStatus: editForm.depositStatus || null,
                        amountPaid: editForm.amountPaid ? Number(editForm.amountPaid) : null,
                        trainingStartDate: editForm.trainingStartDate || null,
                        trainingProgress: editForm.trainingProgress || null,
                        visaDate: editForm.visaDate || null,
                        departureDate: editForm.departureDate || null
                      }
                    })
                  }
                  disabled={updateTrainingFinance.isPending}
                >
                  {updateTrainingFinance.isPending ? "Saving..." : "Save milestone update"}
                </Button>
              </div>
            ) : (
              <EmptyState title="No record selected" description="Select a record from the ledger to update milestone progress." />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function LedgerMeta(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{props.value}</div>
    </div>
  );
}
