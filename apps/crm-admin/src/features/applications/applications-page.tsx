import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  PaginationFooter,
  Select,
  Toolbar,
} from "@social-crm/ui";
import {
  useApplicationsQuery,
  useCandidatesQuery,
  useCreateApplicationMutation,
  useDeleteApplicationMutation,
  useFormStandardRegisterQuery,
  useOrdersQuery,
  useUpdateApplicationMutation,
  usePermissions,
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import type { ApplicationRecord, CandidateRef, FormStandardRegisterRow } from "@social-crm/api";
import { ApplicationContextNav } from "./application-context-nav";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

const DOC_STATUSES = ["", "pending", "submitted", "verified", "rejected", "expired"] as const;
const APPLICATION_STATUSES = [
  "",
  "matching",
  "referred",
  "interview_scheduled",
  "interview_passed",
  "interview_failed",
  "signing",
  "ready_to_depart",
  "rejected",
  "withdrawn",
] as const;
const APPLICATION_PAGE_SIZE = 20;
const DOCUMENT_PAGE_SIZE = 25;

type TabKey = "applications" | "forms";
type ApplicationStatusValue = Exclude<(typeof APPLICATION_STATUSES)[number], "">;

type ApplicationDraft = {
  status: string;
  interviewDate: string;
  rejectReason: string;
};

type DeleteTarget = {
  id: string;
  candidate: string;
  order: string;
} | null;

const APPLICATION_STATUS_TRANSITIONS: Record<ApplicationStatusValue, ApplicationStatusValue[]> = {
  matching: ["referred", "rejected", "withdrawn"],
  referred: ["interview_scheduled", "rejected", "withdrawn"],
  interview_scheduled: ["interview_passed", "interview_failed", "rejected", "withdrawn"],
  interview_passed: ["signing", "rejected", "withdrawn"],
  signing: ["ready_to_depart", "rejected", "withdrawn"],
  interview_failed: [],
  ready_to_depart: [],
  rejected: [],
  withdrawn: [],
};

function isApplicationStatus(value: string): value is ApplicationStatusValue {
  return value !== "" && APPLICATION_STATUSES.includes(value as (typeof APPLICATION_STATUSES)[number]);
}

function applicationStatusOptions(currentStatus: string) {
  const options = new Set<string>();
  if (currentStatus) options.add(currentStatus);
  if (isApplicationStatus(currentStatus)) {
    APPLICATION_STATUS_TRANSITIONS[currentStatus].forEach((status) => options.add(status));
  }
  return Array.from(options);
}

function hasApplicationNextStatus(currentStatus: string) {
  return isApplicationStatus(currentStatus) && APPLICATION_STATUS_TRANSITIONS[currentStatus].length > 0;
}

function toneForDocStatus(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "submitted") return "warning" as const;
  return "neutral" as const;
}

function toneForApplicationStatus(status: string) {
  if (["interview_failed", "rejected", "withdrawn"].includes(status)) return "danger" as const;
  if (["interview_passed", "signing", "ready_to_depart"].includes(status)) return "success" as const;
  if (["referred", "interview_scheduled"].includes(status)) return "warning" as const;
  return "accent" as const;
}

function leadLabel(row: FormStandardRegisterRow) {
  return row.lead.fullName || row.lead.displayName || row.lead.phone || row.lead.id;
}

function candidateLabel(candidate?: CandidateRef | null) {
  if (!candidate) return "—";
  const lead = candidate.lead;
  const leadName = lead?.fullName || lead?.displayName || lead?.phone;
  return [candidate.code, leadName].filter(Boolean).join(" · ") || candidate.id;
}

function applicationCandidateLabel(application: ApplicationRecord) {
  return candidateLabel(application.candidate) || application.candidate_id || "—";
}

function applicationLeadLabel(application: ApplicationRecord) {
  const lead = application.lead;
  if (!lead) return application.lead_id;
  return lead.fullName || lead.displayName || lead.phone || lead.id;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function applicationToDraft(application: ApplicationRecord): ApplicationDraft {
  return {
    status: application.status,
    interviewDate: toDateInputValue(application.interviewDate),
    rejectReason: application.rejectReason ?? "",
  };
}

function isDraftDirty(application: ApplicationRecord, draft: ApplicationDraft) {
  const saved = applicationToDraft(application);
  return (
    draft.status !== saved.status ||
    draft.interviewDate !== saved.interviewDate ||
    draft.rejectReason.trim() !== saved.rejectReason.trim()
  );
}

function requiresInterviewDate(status: string) {
  return status === "interview_scheduled";
}

function requiresRejectReason(status: string) {
  return ["interview_failed", "rejected", "withdrawn"].includes(status);
}

function isCreateStage(status?: string | null) {
  return status === "qualified" || status === "matching";
}

function readCandidateLeadId(candidate?: CandidateRef | null) {
  return candidate?.lead_id ?? candidate?.lead?.id ?? "";
}

function hasVerifiedForm(row?: FormStandardRegisterRow | null) {
  return Boolean(row?.hasFile && row.documentStatus === "verified");
}

export function ApplicationsPage() {
  const { copy, formatDocumentStatus, formatApplicationStatus, formatLeadStatus } = useI18n();
  const { canManageRecruitment, isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const contextLeadId = searchParams.get("leadId") ?? "";
  const initialTab = searchParams.get("tab") === "forms" ? "forms" : "applications";

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [applicationStatus, setApplicationStatus] = useState("");
  const [applicationPage, setApplicationPage] = useState(0);
  const [documentFilters, setDocumentFilters] = useState({ status: "", search: "" });
  const [documentPage, setDocumentPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ApplicationDraft>>({});
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setApplicationPage(0);
    setDocumentPage(0);
  }, [contextLeadId, initialTab]);

  const applicationsQuery = useApplicationsQuery({
    offset: applicationPage * APPLICATION_PAGE_SIZE,
    limit: APPLICATION_PAGE_SIZE,
    leadId: contextLeadId || undefined,
    status: applicationStatus || undefined,
  });
  const registerQuery = useFormStandardRegisterQuery({
    offset: documentPage * DOCUMENT_PAGE_SIZE,
    limit: DOCUMENT_PAGE_SIZE,
    leadId: contextLeadId || undefined,
    status: documentFilters.status || undefined,
    search: documentFilters.search || undefined,
  });
  const candidatesQuery = useCandidatesQuery({
    offset: 0,
    limit: 50,
    search: candidateSearch.trim() || undefined,
  });
  const ordersQuery = useOrdersQuery();
  const createApplication = useCreateApplicationMutation();
  const updateApplication = useUpdateApplicationMutation();
  const deleteApplication = useDeleteApplicationMutation();

  const candidates = candidatesQuery.data?.data ?? [];
  const orders = ordersQuery.data ?? [];
  const applications = applicationsQuery.data?.data ?? [];
  const formRows = registerQuery.data?.data ?? [];
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
  const selectedCandidateLeadId = readCandidateLeadId(selectedCandidate);
  const selectedCandidateFormQuery = useFormStandardRegisterQuery(
    selectedCandidateLeadId
      ? { offset: 0, limit: 1, leadId: selectedCandidateLeadId }
      : undefined,
    { enabled: Boolean(selectedCandidateLeadId) },
  );
  const selectedCandidateForm = selectedCandidateFormQuery.data?.data?.[0] ?? null;
  const selectedLeadStatus = selectedCandidate?.lead?.status ?? null;
  const createGate = useMemo(() => {
    if (!selectedCandidateId) {
      return {
        ok: false,
        message: copy({ en: "Select a candidate first.", vi: "Chọn hồ sơ ứng viên trước." }),
      };
    }
    if (!selectedOrderId) {
      return {
        ok: false,
        message: copy({ en: "Select the order this candidate is applying for.", vi: "Chọn đơn hàng ứng viên sẽ ứng tuyển." }),
      };
    }
    if (selectedCandidateFormQuery.isLoading) {
      return {
        ok: false,
        message: copy({ en: "Checking standard form...", vi: "Đang kiểm tra form chuẩn..." }),
      };
    }
    if (!hasVerifiedForm(selectedCandidateForm)) {
      return {
        ok: false,
        message: copy({ en: "A verified standard worker form is required before creating an application.", vi: "Cần có form lao động chuẩn đã xác minh trước khi tạo ứng tuyển." }),
      };
    }
    if (!isCreateStage(selectedLeadStatus)) {
      return {
        ok: false,
        message: copy({ en: "Lead must be Form ready or Matching before an application can be created.", vi: "Ứng viên phải ở trạng thái Đã có form hoặc Đang ghép đơn trước khi tạo ứng tuyển." }),
      };
    }
    return {
      ok: true,
      message: copy({ en: "Ready to create application.", vi: "Đủ điều kiện tạo ứng tuyển." }),
    };
  }, [
    copy,
    selectedCandidateForm,
    selectedCandidateFormQuery.isLoading,
    selectedCandidateId,
    selectedLeadStatus,
    selectedOrderId,
  ]);

  const stats = useMemo(() => {
    return {
      applications: applicationsQuery.data?.total ?? 0,
      forms: registerQuery.data?.total ?? 0,
      waiting: applications.filter((application) => application.status === "matching").length,
      interviews: applications.filter((application) => application.status === "interview_scheduled").length,
    };
  }, [applications, applicationsQuery.data?.total, registerQuery.data?.total]);

  function openDetail(leadId?: string) {
    navigate(leadId ? `/applications/detail?leadId=${leadId}` : "/applications/detail");
  }

  function selectTab(tab: TabKey) {
    setActiveTab(tab);
    setApplicationPage(0);
    setDocumentPage(0);
    if (contextLeadId) {
      setSearchParams({ leadId: contextLeadId, tab });
    }
  }

  function clearContext() {
    setSearchParams({});
    setApplicationPage(0);
    setDocumentPage(0);
  }

  function readDraft(application: ApplicationRecord): ApplicationDraft {
    return drafts[application.id] ?? applicationToDraft(application);
  }

  function setDraft(application: ApplicationRecord, patch: Partial<ApplicationDraft>) {
    setDrafts((current) => ({
      ...current,
      [application.id]: {
        ...(current[application.id] ?? applicationToDraft(application)),
        ...patch,
      },
    }));
  }

  function resetCreateForm() {
    setSelectedCandidateId("");
    setSelectedOrderId("");
    setCandidateSearch("");
    setCreateOpen(false);
  }

  function submitCreateApplication() {
    if (!canManageRecruitment) return;
    if (!createGate.ok || !selectedCandidateId || !selectedOrderId) return;
    createApplication.mutate(
      { candidateId: selectedCandidateId, orderId: selectedOrderId },
      { onSuccess: resetCreateForm },
    );
  }

  function submitApplicationUpdate(application: ApplicationRecord) {
    if (!canManageRecruitment) return;
    const draft = readDraft(application);
    if (!isDraftDirty(application, draft)) return;
    if (requiresInterviewDate(draft.status) && !draft.interviewDate) return;
    if (requiresRejectReason(draft.status) && !draft.rejectReason.trim()) return;

    updateApplication.mutate(
      {
        id: application.id,
        patch: {
          status: draft.status,
          interviewDate: draft.interviewDate || undefined,
          rejectReason: draft.rejectReason.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setDrafts((current) => {
            const next = { ...current };
            delete next[application.id];
            return next;
          });
        },
      },
    );
  }

  function submitApplicationDelete(application: ApplicationRecord) {
    if (!isAdmin) return;
    setDeleteTarget({
      id: application.id,
      candidate: applicationCandidateLabel(application),
      order: application.order?.name ?? application.order_id,
    });
  }

  return (
    <div className="space-y-6">
      <Toolbar compact className="border-slate-200/90">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {copy({ en: "Applications", vi: "Ứng tuyển" })}
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                {copy({
                  en: "Manage real candidate-to-order application records and the standard worker forms required before creation.",
                  vi: "Quản lý bản ghi ứng viên ứng tuyển vào đơn hàng và form lao động chuẩn bắt buộc trước khi tạo ứng tuyển.",
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Badge tone="neutral">{copy({ en: `${stats.applications} applications`, vi: `${stats.applications} ứng tuyển` })}</Badge>
              <Badge tone="neutral">{copy({ en: `${stats.forms} form files`, vi: `${stats.forms} form` })}</Badge>
              {contextLeadId ? (
                <Button variant="ghost" size="sm" onClick={clearContext}>
                  {copy({ en: "Clear lead filter", vi: "Bỏ lọc lead" })}
                </Button>
              ) : null}
              <Button onClick={() => { setActiveTab("applications"); setCreateOpen(true); }} disabled={!canManageRecruitment}>
                {copy({ en: "Create application", vi: "Tạo ứng tuyển" })}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton
              active={activeTab === "applications"}
              label={copy({ en: "Applications", vi: "Ứng tuyển" })}
              onClick={() => selectTab("applications")}
            />
            <TabButton
              active={activeTab === "forms"}
              label={copy({ en: "Form documents", vi: "Form hồ sơ" })}
              onClick={() => selectTab("forms")}
            />
          </div>
        </div>
      </Toolbar>

      {contextLeadId ? (
        <ApplicationContextNav leadId={contextLeadId} active={activeTab === "forms" ? "form" : "application"} />
      ) : null}

      {activeTab === "applications" ? (
        <div className="space-y-6">
          {createOpen ? (
            <Panel
              title={copy({ en: "Create application", vi: "Tạo ứng tuyển" })}
              subtitle={copy({
                en: "Pick the candidate and the order deliberately. The system requires a verified standard form and the lead must be in the application-ready stage.",
                vi: "Chọn rõ hồ sơ ứng viên và đơn hàng. Hệ thống yêu cầu form chuẩn đã xác minh và trạng thái ứng viên phải sẵn sàng tạo ứng tuyển.",
              })}
              action={
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  {copy({ en: "Close", vi: "Đóng" })}
                </Button>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600">
                      {copy({ en: "Find candidate", vi: "Tìm hồ sơ ứng viên" })}
                    </label>
                    <input
                      type="text"
                      value={candidateSearch}
                      onChange={(event) => setCandidateSearch(event.target.value)}
                      placeholder={copy({ en: "Search by candidate code, name, or phone...", vi: "Tìm theo mã hồ sơ, tên hoặc SĐT..." })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                    {candidates.length ? (
                      candidates.map((candidate) => {
                        const leadStatus = candidate.lead?.status ?? "";
                        const selected = candidate.id === selectedCandidateId;
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => setSelectedCandidateId(candidate.id)}
                            className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left text-sm last:border-b-0 ${selected ? "bg-indigo-50" : "bg-white hover:bg-slate-50"}`}
                          >
                            <span className="min-w-0">
                              <span className="block font-semibold text-slate-900">{candidateLabel(candidate)}</span>
                              <span className="mt-1 block text-xs text-slate-500">{candidate.lead?.phone ?? copy({ en: "No phone", vi: "Chưa có SĐT" })}</span>
                            </span>
                            {leadStatus ? <Badge tone={isCreateStage(leadStatus) ? "success" : "warning"}>{formatLeadStatus(leadStatus)}</Badge> : null}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-6 text-sm text-slate-500">
                        {copy({ en: "No candidates found.", vi: "Không tìm thấy hồ sơ ứng viên." })}
                      </div>
                    )}
                  </div>

                  <Select
                    label={copy({ en: "Order", vi: "Đơn hàng" })}
                    value={selectedOrderId}
                    onChange={(event) => setSelectedOrderId(event.target.value)}
                  >
                    <option value="">{copy({ en: "Choose order", vi: "Chọn đơn hàng" })}</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy({ en: "Creation gate", vi: "Điều kiện tạo" })}
                  </div>
                  <GateRow
                    label={copy({ en: "Candidate", vi: "Hồ sơ ứng viên" })}
                    ok={Boolean(selectedCandidateId)}
                    value={selectedCandidate ? candidateLabel(selectedCandidate) : copy({ en: "Not selected", vi: "Chưa chọn" })}
                  />
                  <GateRow
                    label={copy({ en: "Standard form", vi: "Form chuẩn" })}
                    ok={hasVerifiedForm(selectedCandidateForm)}
                    value={selectedCandidateForm
                      ? formatDocumentStatus(selectedCandidateForm.documentStatus)
                      : copy({ en: "Missing", vi: "Thiếu" })}
                  />
                  <GateRow
                    label={copy({ en: "Lead status", vi: "Trạng thái" })}
                    ok={isCreateStage(selectedLeadStatus)}
                    value={selectedLeadStatus ? formatLeadStatus(selectedLeadStatus) : copy({ en: "Unknown", vi: "Chưa rõ" })}
                  />
                  <GateRow
                    label={copy({ en: "Order", vi: "Đơn hàng" })}
                    ok={Boolean(selectedOrderId)}
                    value={orders.find((order) => order.id === selectedOrderId)?.name ?? copy({ en: "Not selected", vi: "Chưa chọn" })}
                  />
                  <div className={`rounded-xl border px-3 py-2 text-sm ${createGate.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                    {createGate.message}
                  </div>
                  {!canManageRecruitment ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      {copy({
                        en: "Only recruitment staff can create application records.",
                        vi: "Chỉ nhân sự tuyển dụng mới có thể tạo ứng tuyển.",
                      })}
                    </div>
                  ) : null}
                  <Button className="w-full" onClick={submitCreateApplication} disabled={!canManageRecruitment || !createGate.ok || createApplication.isPending}>
                    {createApplication.isPending
                      ? copy({ en: "Creating...", vi: "Đang tạo..." })
                      : copy({ en: "Create application", vi: "Tạo ứng tuyển" })}
                  </Button>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel
            title={copy({ en: "Application records", vi: "Bản ghi ứng tuyển" })}
            subtitle={copy({
              en: "These are the actual candidate-to-order records stored in the applications table.",
              vi: "Đây là các bản ghi ứng viên ứng tuyển vào đơn hàng được lưu trong bảng applications.",
            })}
          >
            {isAdmin ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                {copy({
                  en: "Admin correction: delete only records created by mistake. Status changes still follow the application workflow; linked training-finance rows must be fixed before deletion.",
                  vi: "Hiệu chỉnh admin: chỉ xoá bản ghi tạo nhầm. Đổi trạng thái vẫn đi theo quy trình ứng tuyển; bản ghi đào tạo/tài chính liên kết cần được xử lý trước khi xoá.",
                })}
              </div>
            ) : null}
            <div className="mb-4 grid gap-4 md:grid-cols-[minmax(220px,320px)_1fr]">
              <Select
                label={copy({ en: "Application status", vi: "Trạng thái ứng tuyển" })}
                value={applicationStatus}
                onChange={(event) => { setApplicationStatus(event.target.value); setApplicationPage(0); }}
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status || "all"} value={status}>
                    {status ? formatApplicationStatus(status) : copy({ en: "All statuses", vi: "Tất cả trạng thái" })}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryCell label={copy({ en: "Loaded", vi: "Đã tải" })} value={applications.length} />
                <SummaryCell label={copy({ en: "Matching", vi: "Đang ghép" })} value={stats.waiting} />
                <SummaryCell label={copy({ en: "Interviewed", vi: "Đã phỏng vấn" })} value={stats.interviews} />
                <SummaryCell label={copy({ en: "Total", vi: "Tổng" })} value={applicationsQuery.data?.total ?? 0} />
              </div>
            </div>

            {applications.length ? (
              <div className="overflow-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">{copy({ en: "Candidate", vi: "Ứng viên" })}</th>
                      <th className="px-3 py-3">{copy({ en: "Lead", vi: "Lead" })}</th>
                      <th className="px-3 py-3">{copy({ en: "Order", vi: "Đơn hàng" })}</th>
                      <th className="px-3 py-3">{copy({ en: "Status", vi: "Trạng thái" })}</th>
                      <th className="px-3 py-3">{copy({ en: "Interview / reason", vi: "Phỏng vấn / lý do" })}</th>
                      <th className="px-3 py-3">{copy({ en: "Updated", vi: "Cập nhật" })}</th>
                      <th className="px-3 py-3">{copy({ en: "Action", vi: "Thao tác" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((application) => {
                      const rawDraft = readDraft(application);
                      const statusOptions = applicationStatusOptions(application.status);
                      const draft = statusOptions.includes(rawDraft.status)
                        ? rawDraft
                        : { ...rawDraft, status: application.status };
                      const hasNextStatus = hasApplicationNextStatus(application.status);
                      const missingInterviewDate = requiresInterviewDate(draft.status) && !draft.interviewDate;
                      const missingRejectReason = requiresRejectReason(draft.status) && !draft.rejectReason.trim();
                      const draftDirty = isDraftDirty(application, draft);
                      return (
                        <tr key={application.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-900">{applicationCandidateLabel(application)}</div>
                            <div className="mt-1 font-mono text-xs text-slate-400">{application.candidate_id ?? "—"}</div>
                          </td>
                          <td className="px-3 py-3">
                            <Link to={`/leads/${application.lead_id}`} className="font-medium text-indigo-700 hover:underline">
                              {applicationLeadLabel(application)}
                            </Link>
                            {application.lead?.status ? (
                              <div className="mt-1">
                                <Badge tone="neutral">{formatLeadStatus(application.lead.status)}</Badge>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-slate-900">{application.order?.name ?? application.order_id}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {[application.order?.region, application.order?.industry].filter(Boolean).join(" · ") || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Select
                              label=""
                              value={draft.status}
                              onChange={(event) => setDraft(application, { status: event.target.value })}
                              disabled={!canManageRecruitment || !hasNextStatus}
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>{formatApplicationStatus(status)}</option>
                              ))}
                            </Select>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge tone={toneForApplicationStatus(application.status)}>{formatApplicationStatus(application.status)}</Badge>
                              {!hasNextStatus ? (
                                <Badge tone="neutral">{copy({ en: "Terminal", vi: "Kết thúc" })}</Badge>
                              ) : null}
                            </div>
                            {!canManageRecruitment ? (
                              <div className="mt-2 text-xs text-slate-500">
                                {copy({ en: "Recruitment role required to change status.", vi: "Cần quyền tuyển dụng để đổi trạng thái." })}
                              </div>
                            ) : hasNextStatus ? (
                              <div className="mt-2 text-xs text-slate-500">
                                {copy({ en: "Only valid next statuses are shown.", vi: "Chỉ hiển thị các trạng thái kế tiếp hợp lệ." })}
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-slate-500">
                                {copy({ en: "No further status changes are allowed.", vi: "Không cho phép đổi sang trạng thái khác." })}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="space-y-2">
                              <input
                                type="date"
                                value={draft.interviewDate}
                                onChange={(event) => setDraft(application, { interviewDate: event.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              />
                              <input
                                type="text"
                                value={draft.rejectReason}
                                onChange={(event) => setDraft(application, { rejectReason: event.target.value })}
                                placeholder={copy({ en: "Reject / withdrawal reason", vi: "Lý do rớt / từ chối / rút" })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              />
                              {missingInterviewDate || missingRejectReason ? (
                                <div className="text-xs text-amber-700">
                                  {missingInterviewDate
                                    ? copy({ en: "Interview date is required for this status.", vi: "Cần ngày phỏng vấn cho trạng thái này." })
                                    : copy({ en: "Reason is required for failed, rejected, or withdrawn applications.", vi: "Cần lý do cho hồ sơ rớt, bị từ chối hoặc rút." })}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{formatDateTime(application.updatedAt)}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => submitApplicationUpdate(application)}
                              disabled={!canManageRecruitment || !draftDirty || updateApplication.isPending || missingInterviewDate || missingRejectReason}
                            >
                              {updateApplication.isPending
                                ? copy({ en: "Saving...", vi: "Đang lưu..." })
                                : copy({ en: "Save", vi: "Lưu" })}
                            </Button>
                            {isAdmin ? (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => submitApplicationDelete(application)}
                                disabled={deleteApplication.isPending}
                              >
                                {deleteApplication.isPending
                                  ? copy({ en: "Deleting...", vi: "Đang xoá..." })
                                  : copy({ en: "Delete record", vi: "Xóa bản ghi" })}
                              </Button>
                            ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No applications found", vi: "Chưa có ứng tuyển" })}
                description={copy({
                  en: "Create an application only after the candidate has a verified standard form and a target order.",
                  vi: "Chỉ tạo ứng tuyển sau khi hồ sơ ứng viên có form chuẩn đã xác minh và đã chọn đơn hàng.",
                })}
              />
            )}

            <PaginationFooter
              page={applicationPage}
              pageSize={APPLICATION_PAGE_SIZE}
              total={applicationsQuery.data?.total ?? 0}
              isFetching={applicationsQuery.isFetching}
              itemLabel={copy({ en: "applications", vi: "ứng tuyển" })}
              pageLabel={copy({ en: "Page", vi: "Trang" })}
              previousLabel={copy({ en: "Previous", vi: "Trước" })}
              nextLabel={copy({ en: "Next", vi: "Sau" })}
              onPrevious={() => setApplicationPage((page) => Math.max(0, page - 1))}
              onNext={() => setApplicationPage((page) => page + 1)}
              className="mt-4 border-slate-100 px-0 pb-0 pt-4"
            />
          </Panel>
        </div>
      ) : (
        <FormDocumentsTab
          rows={formRows}
          total={registerQuery.data?.total ?? 0}
          page={documentPage}
          isFetching={registerQuery.isFetching}
          filters={documentFilters}
          setFilters={(filters) => { setDocumentFilters(filters); setDocumentPage(0); }}
          setPage={setDocumentPage}
          openDetail={openDetail}
          copy={copy}
          formatDocumentStatus={formatDocumentStatus}
          formatApplicationStatus={formatApplicationStatus}
        />
      )}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title={copy({ en: "Delete application record?", vi: "Xóa bản ghi ứng tuyển?" })}
        description={copy({
          en: "This removes only the application record. Use it for admin corrections when the record was created by mistake.",
          vi: "Thao tác này chỉ xóa bản ghi ứng tuyển. Chỉ dùng để hiệu chỉnh admin khi bản ghi được tạo nhầm.",
        })}
        details={deleteTarget ? [
          { label: copy({ en: "Candidate", vi: "Ứng viên" }), value: deleteTarget.candidate },
          { label: copy({ en: "Order", vi: "Đơn hàng" }), value: deleteTarget.order },
        ] : []}
        warning={copy({
          en: "If this application has linked training-finance records, correct those records first before deleting.",
          vi: "Nếu ứng tuyển này đã liên kết đào tạo/tài chính, hãy xử lý bản ghi đó trước khi xóa.",
        })}
        confirmLabel={copy({ en: "Delete record", vi: "Xóa bản ghi" })}
        pendingLabel={copy({ en: "Deleting...", vi: "Đang xóa..." })}
        cancelLabel={copy({ en: "Cancel", vi: "Hủy" })}
        isPending={deleteApplication.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteApplication.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}

function TabButton(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
        props.active
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {props.label}
    </button>
  );
}

function GateRow(props: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{props.label}</div>
        <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{props.value}</div>
      </div>
      <Badge tone={props.ok ? "success" : "warning"}>{props.ok ? "OK" : "Gate"}</Badge>
    </div>
  );
}

function SummaryCell(props: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-medium text-slate-500">{props.label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}

function FormDocumentsTab(props: {
  rows: FormStandardRegisterRow[];
  total: number;
  page: number;
  isFetching: boolean;
  filters: { status: string; search: string };
  setFilters: (filters: { status: string; search: string }) => void;
  setPage: (updater: (page: number) => number) => void;
  openDetail: (leadId?: string) => void;
  copy: (value: { en: string; vi: string }) => string;
  formatDocumentStatus: (value: string) => string;
  formatApplicationStatus: (value: string) => string;
}) {
  return (
    <Panel
      title={props.copy({ en: "Form documents", vi: "Form hồ sơ" })}
      subtitle={props.copy({
        en: "Upload, verify, replace, or remove the standard worker form. Verified forms unlock application creation.",
        vi: "Tải lên, xác minh, thay thế hoặc xoá form lao động chuẩn. Form đã xác minh mở khoá bước tạo ứng tuyển.",
      })}
      action={
        <Button onClick={() => props.openDetail()}>
          {props.copy({ en: "Upload file", vi: "Tải hồ sơ lên" })}
        </Button>
      }
    >
      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(220px,320px)_minmax(280px,1fr)]">
        <Select
          label={props.copy({ en: "File status", vi: "Trạng thái hồ sơ" })}
          value={props.filters.status}
          onChange={(event) => props.setFilters({ ...props.filters, status: event.target.value })}
        >
          <option value="">{props.copy({ en: "All statuses", vi: "Tất cả trạng thái" })}</option>
          {DOC_STATUSES.filter(Boolean).map((status) => (
            <option key={status} value={status}>{props.formatDocumentStatus(status)}</option>
          ))}
        </Select>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            {props.copy({ en: "Search name / phone", vi: "Tìm tên / SĐT" })}
          </label>
          <input
            type="text"
            value={props.filters.search}
            onChange={(event) => props.setFilters({ ...props.filters, search: event.target.value })}
            placeholder={props.copy({ en: "Search candidate name or phone...", vi: "Tìm theo tên hoặc SĐT..." })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {props.rows.length ? (
        <div className="max-h-[calc(100vh-24rem)] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">{props.copy({ en: "Candidate", vi: "Ứng viên" })}</th>
                <th className="px-3 py-3">{props.copy({ en: "Phone", vi: "Số điện thoại" })}</th>
                <th className="px-3 py-3">{props.copy({ en: "Linked application", vi: "Ứng tuyển liên kết" })}</th>
                <th className="px-3 py-3">{props.copy({ en: "File status", vi: "Trạng thái form" })}</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => (
                <tr
                  key={row.documentId}
                  className="cursor-pointer border-t border-slate-100 align-top transition-colors hover:bg-slate-50"
                  onClick={() => props.openDetail(row.lead.id)}
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-indigo-700">{leadLabel(row)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.candidate?.code ?? props.copy({ en: "No candidate code", vi: "Chưa có mã hồ sơ" })}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {row.lead.phone ?? (
                      <span className="text-slate-400">{props.copy({ en: "Missing", vi: "Thiếu" })}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {row.order ? (
                      <>
                        <div className="font-medium text-slate-900">{row.order.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {[row.order.region, row.order.industry].filter(Boolean).join(" · ")}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400">{props.copy({ en: "No application yet", vi: "Chưa có ứng tuyển" })}</span>
                    )}
                    {row.application ? (
                      <div className="mt-1">
                        <Badge tone="warning">{props.formatApplicationStatus(row.application.status)}</Badge>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={toneForDocStatus(row.documentStatus)}>
                      {props.formatDocumentStatus(row.documentStatus)}
                    </Badge>
                    <div className="mt-1">
                      {row.hasFile
                        ? <Badge tone="success">{props.copy({ en: "File uploaded", vi: "Có file" })}</Badge>
                        : <Badge tone="warning">{props.copy({ en: "No file", vi: "Chưa có file" })}</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            {props.copy({ en: "No form documents found", vi: "Không tìm thấy form hồ sơ" })}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {props.copy({
              en: "No standard worker forms match your filters.",
              vi: "Không tìm thấy form lao động chuẩn phù hợp với bộ lọc.",
            })}
          </p>
          <div className="mt-4">
            <Button onClick={() => props.openDetail()}>
              {props.copy({ en: "Upload file", vi: "Tải hồ sơ lên" })}
            </Button>
          </div>
        </div>
      )}

      <PaginationFooter
        page={props.page}
        pageSize={DOCUMENT_PAGE_SIZE}
        total={props.total}
        isFetching={props.isFetching}
        itemLabel={props.copy({ en: "forms", vi: "form" })}
        pageLabel={props.copy({ en: "Page", vi: "Trang" })}
        previousLabel={props.copy({ en: "Previous", vi: "Trước" })}
        nextLabel={props.copy({ en: "Next", vi: "Sau" })}
        onPrevious={() => props.setPage((page) => Math.max(0, page - 1))}
        onNext={() => props.setPage((page) => page + 1)}
        className="mt-4 border-slate-100 px-0 pb-0 pt-4"
      />
    </Panel>
  );
}
