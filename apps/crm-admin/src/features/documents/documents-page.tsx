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
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  useCandidateByLeadQuery,
  useCandidateDocumentChecklistQuery,
  useCreateDocumentMutation,
  useDocumentsQuery,
  useLeadDocumentChecklistQuery,
  useUpdateDocumentMutation
} from "@social-crm/api";
import type { DocumentChecklistSummary, DocumentRecord } from "@social-crm/api";

const DOC_TYPES = ["", "passport", "criminal_record", "health_check", "diploma", "work_permit", "other"] as const;
const DOC_STATUSES = ["", "pending", "submitted", "verified", "rejected", "expired"] as const;

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function toneForDocStatus(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "submitted") return "warning" as const;
  return "neutral" as const;
}

export function DocumentsPage() {
  const [filters, setFilters] = useState({
    leadId: "",
    candidateId: "",
    docType: "",
    status: "",
    search: ""
  });
  const [selectedId, setSelectedId] = useState("");
  const [createForm, setCreateForm] = useState({
    docType: "passport",
    status: "pending",
    fileUrl: "",
    storageBucket: "",
    issueDate: "",
    expiryDate: ""
  });
  const [editForm, setEditForm] = useState({
    status: "",
    fileUrl: "",
    storageBucket: "",
    issueDate: "",
    expiryDate: ""
  });

  const candidateByLeadQuery = useCandidateByLeadQuery(filters.leadId || undefined);
  const resolvedCandidateId = filters.candidateId || candidateByLeadQuery.data?.id || undefined;
  const documentsQuery = useDocumentsQuery({
    offset: 0,
    limit: 100,
    leadId: filters.leadId || undefined,
    candidateId: resolvedCandidateId,
    docType: filters.docType || undefined,
    status: filters.status || undefined
  });
  const leadChecklistQuery = useLeadDocumentChecklistQuery(filters.leadId || undefined);
  const candidateChecklistQuery = useCandidateDocumentChecklistQuery(resolvedCandidateId);
  const createDocument = useCreateDocumentMutation();
  const updateDocument = useUpdateDocumentMutation();

  const records = documentsQuery.data?.data ?? [];
  const filteredRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const term = filters.search.trim().toLowerCase();
    return records.filter((record: DocumentRecord) =>
      [record.id, record.docType, record.status, record.fileUrl, record.storageBucket]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [records, filters.search]);

  const selected = filteredRecords.find((record: DocumentRecord) => record.id === selectedId) ?? filteredRecords[0] ?? null;
  const checklist = candidateChecklistQuery.data ?? leadChecklistQuery.data;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Documents"
        title="Candidate document readiness"
        description="Track required recruitment documents, review missing and expired items, and update document status from a real backend-backed checklist."
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>Document records are live backend entities. File handling is metadata-first for now.</span>
          <Badge tone={resolvedCandidateId ? "success" : "warning"}>
            {resolvedCandidateId ? `Candidate ${resolvedCandidateId}` : "Lead-only checklist mode"}
          </Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input label="Lead ID" value={filters.leadId} onChange={(e) => setFilters((s) => ({ ...s, leadId: e.target.value }))} />
          <Input label="Candidate ID" value={filters.candidateId} onChange={(e) => setFilters((s) => ({ ...s, candidateId: e.target.value }))} />
          <Select label="Doc type" value={filters.docType} onChange={(e) => setFilters((s) => ({ ...s, docType: e.target.value }))}>
            <option value="">All types</option>
            {DOC_TYPES.filter(Boolean).map((value) => (
              <option key={value} value={value}>{formatLabel(value)}</option>
            ))}
          </Select>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            <option value="">All statuses</option>
            {DOC_STATUSES.filter(Boolean).map((value) => (
              <option key={value} value={value}>{formatLabel(value)}</option>
            ))}
          </Select>
          <Input label="Search" value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </div>
        <ToolbarActions>
          <Badge tone="neutral">{filteredRecords.length} visible documents</Badge>
          <Badge tone="neutral">{checklist?.missingDocTypes?.length ?? 0} missing required docs</Badge>
        </ToolbarActions>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="space-y-6">
          <Panel
            title="Checklist overview"
            subtitle="Required-document progress from backend rules, with lead or candidate scope depending on available context."
          >
            {checklist ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <ChecklistStat label="Required" value={String(checklist.requiredDocTypes.length)} />
                  <ChecklistStat label="Missing" value={String(checklist.missingDocTypes.length)} tone={checklist.missingDocTypes.length ? "danger" : "success"} />
                  <ChecklistStat label="Verified" value={String(checklist.verifiedDocTypes.length)} tone="success" />
                  <ChecklistStat label="Expired" value={String(checklist.expiredDocTypes.length)} tone={checklist.expiredDocTypes.length ? "danger" : "neutral"} />
                </div>
                <div className="space-y-3">
                  {checklist.items.map((item: DocumentChecklistSummary["items"][number]) => (
                    <div key={item.docType} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{formatLabel(item.docType)}</div>
                        <Badge tone={toneForDocStatus(item.status)}>{formatLabel(item.status)}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {item.present ? "Document record exists" : "Missing document record"} · {item.isExpired ? "Expired" : "Not expired"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="Checklist not loaded" description="Provide a lead ID or candidate ID to load the real backend checklist summary." />
            )}
          </Panel>

          <Panel
            title="Document register"
            subtitle="Metadata-driven records for passport, health, criminal record, diploma, and other required files."
          >
            {filteredRecords.length ? (
              <div className="space-y-3">
                {filteredRecords.map((record: DocumentRecord) => {
                  const active = record.id === selected?.id;
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(record.id);
                        setEditForm({
                          status: record.status,
                          fileUrl: record.fileUrl ?? "",
                          storageBucket: record.storageBucket ?? "",
                          issueDate: record.issueDate ?? "",
                          expiryDate: record.expiryDate ?? ""
                        });
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? "border-indigo-500 bg-indigo-50/60" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{formatLabel(record.docType)}</div>
                          <div className="mt-1 text-xs text-slate-500">{record.fileUrl || "No file URL yet"}</div>
                        </div>
                        <Badge tone={toneForDocStatus(record.status)}>{formatLabel(record.status)}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <ChecklistMeta label="Issue date" value={record.issueDate || "Unknown"} />
                        <ChecklistMeta label="Expiry date" value={record.expiryDate || "Not set"} />
                        <ChecklistMeta label="Bucket" value={record.storageBucket || "None"} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No documents found" description="Create the first document record for this lead or candidate scope." />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Create document record"
            subtitle="This records document metadata and readiness status. Binary file upload can be added later without changing the workflow model."
          >
            <div className="space-y-4">
              <DescriptionList
                items={[
                  { label: "Lead scope", value: filters.leadId || "Required" },
                  { label: "Candidate scope", value: resolvedCandidateId ?? "Optional / unresolved" }
                ]}
              />
              <Select label="Doc type" value={createForm.docType} onChange={(e) => setCreateForm((s) => ({ ...s, docType: e.target.value }))}>
                {DOC_TYPES.filter(Boolean).map((value) => (
                  <option key={value} value={value}>{formatLabel(value)}</option>
                ))}
              </Select>
              <Select label="Initial status" value={createForm.status} onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value }))}>
                {DOC_STATUSES.filter(Boolean).map((value) => (
                  <option key={value} value={value}>{formatLabel(value)}</option>
                ))}
              </Select>
              <Input label="File URL" value={createForm.fileUrl} onChange={(e) => setCreateForm((s) => ({ ...s, fileUrl: e.target.value }))} />
              <Input label="Storage bucket" value={createForm.storageBucket} onChange={(e) => setCreateForm((s) => ({ ...s, storageBucket: e.target.value }))} />
              <Input label="Issue date" type="date" value={createForm.issueDate} onChange={(e) => setCreateForm((s) => ({ ...s, issueDate: e.target.value }))} />
              <Input label="Expiry date" type="date" value={createForm.expiryDate} onChange={(e) => setCreateForm((s) => ({ ...s, expiryDate: e.target.value }))} />
              <Button
                onClick={() =>
                  createDocument.mutate({
                    leadId: filters.leadId,
                    candidateId: resolvedCandidateId,
                    docType: createForm.docType,
                    status: createForm.status,
                    fileUrl: createForm.fileUrl || undefined,
                    storageBucket: createForm.storageBucket || undefined,
                    issueDate: createForm.issueDate || undefined,
                    expiryDate: createForm.expiryDate || undefined
                  })
                }
                disabled={!filters.leadId || createDocument.isPending}
              >
                {createDocument.isPending ? "Creating..." : "Create document"}
              </Button>
            </div>
          </Panel>

          <Panel
            title="Selected document"
            subtitle="Update backend status and document metadata from the same workspace."
          >
            {selected ? (
              <div className="space-y-4">
                <DescriptionList
                  items={[
                    { label: "Document ID", value: selected.id },
                    { label: "Type", value: formatLabel(selected.docType) },
                    { label: "Lead", value: selected.lead_id },
                    { label: "Candidate", value: selected.candidate_id ?? "No candidate scope" }
                  ]}
                />
                <Select label="Status" value={editForm.status} onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value }))}>
                  {DOC_STATUSES.filter(Boolean).map((value) => (
                    <option key={value} value={value}>{formatLabel(value)}</option>
                  ))}
                </Select>
                <Input label="File URL" value={editForm.fileUrl} onChange={(e) => setEditForm((s) => ({ ...s, fileUrl: e.target.value }))} />
                <Input label="Storage bucket" value={editForm.storageBucket} onChange={(e) => setEditForm((s) => ({ ...s, storageBucket: e.target.value }))} />
                <Input label="Issue date" type="date" value={editForm.issueDate} onChange={(e) => setEditForm((s) => ({ ...s, issueDate: e.target.value }))} />
                <Input label="Expiry date" type="date" value={editForm.expiryDate} onChange={(e) => setEditForm((s) => ({ ...s, expiryDate: e.target.value }))} />
                <Button
                  onClick={() =>
                    updateDocument.mutate({
                      id: selected.id,
                      patch: {
                        status: editForm.status || undefined,
                        fileUrl: editForm.fileUrl || null,
                        storageBucket: editForm.storageBucket || null,
                        issueDate: editForm.issueDate || null,
                        expiryDate: editForm.expiryDate || null
                      }
                    })
                  }
                  disabled={updateDocument.isPending}
                >
                  {updateDocument.isPending ? "Saving..." : "Save document update"}
                </Button>
              </div>
            ) : (
              <EmptyState title="No document selected" description="Pick a document from the register to update its status and metadata." />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ChecklistStat(props: { label: string; value: string; tone?: "success" | "danger" | "neutral" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className={`mt-2 text-lg font-semibold ${props.tone === "danger" ? "text-rose-600" : props.tone === "success" ? "text-emerald-600" : "text-slate-900"}`}>{props.value}</div>
    </div>
  );
}

function ChecklistMeta(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{props.value}</div>
    </div>
  );
}
