import { useMemo, useState } from "react";
import { Badge, Button, Select, useImeSafeInput } from "@social-crm/ui";
import {
  useCreateApplicationMutation,
  useDeleteApplicationMutation,
  useOrdersQuery,
  usePermissions,
  useUpdateApplicationMutation,
} from "@social-crm/api";
import type { ApplicationRecord, CandidateRef, FormStandardRegisterRow } from "@social-crm/api";
import { useI18n } from "@/i18n";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  applicationStatusOptions,
  applicationToDraft,
  hasApplicationNextStatus,
  hasVerifiedForm,
  isCreateStage,
  isDraftDirty,
  requiresInterviewDate,
  requiresRejectReason,
  toneForApplicationStatus,
  type ApplicationDraft,
} from "../applications/application-logic";

/**
 * Journey §3 — Application phase, inlined.
 *
 * Replaces the old modal create dialog + the separate Applications table row.
 * Because the workbench is scoped to one candidate, the create flow only needs
 * an order choice (the candidate is fixed), and the transition flow operates on
 * the single existing application. All state-machine rules come from the shared
 * application-logic module — no rules are re-implemented here.
 */

function GateRow(props: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
      <span className="text-xs uppercase tracking-[0.1em] text-slate-400">{props.label}</span>
      <span className="flex items-center gap-2 text-right text-sm font-medium text-slate-800">
        {props.value}
        <span className={props.ok ? "text-emerald-600" : "text-amber-500"}>{props.ok ? "✓" : "•"}</span>
      </span>
    </div>
  );
}

function CreateApplication(props: {
  leadId: string;
  leadStatus: string;
  candidate: CandidateRef | null;
  form: FormStandardRegisterRow | null;
  /** When set (order-first flow), the order is pre-selected and locked. */
  presetOrderId?: string;
}) {
  const { copy, formatDocumentStatus, formatLeadStatus } = useI18n();
  const { canManageRecruitment } = usePermissions();
  const ordersQuery = useOrdersQuery();
  const orders = ordersQuery.data ?? [];
  const createApplication = useCreateApplicationMutation();
  const [orderId, setOrderId] = useState(props.presetOrderId ?? "");

  // Lead status casing is not guaranteed — normalize like leads-page does.
  const stageOk = isCreateStage(props.leadStatus.toLowerCase());
  const candidateOk = Boolean(props.candidate?.id);
  const formOk = hasVerifiedForm(props.form);
  const orderOk = Boolean(orderId);

  const gate = useMemo(() => {
    if (!candidateOk) return { ok: false, message: copy({ en: "This lead has no candidate dossier yet.", vi: "Lead này chưa có hồ sơ ứng viên." }) };
    if (!formOk) return { ok: false, message: copy({ en: "A verified standard form is required first.", vi: "Cần form chuẩn đã xác minh trước." }) };
    if (!stageOk) return { ok: false, message: copy({ en: "Lead must be Form ready or Matching.", vi: "Lead phải ở trạng thái Đã có form hoặc Đang ghép đơn." }) };
    if (!orderOk) return { ok: false, message: copy({ en: "Select the target order.", vi: "Chọn đơn hàng mục tiêu." }) };
    return { ok: true, message: copy({ en: "Ready to create application.", vi: "Đủ điều kiện tạo ứng tuyển." }) };
  }, [candidateOk, formOk, stageOk, orderOk, copy]);

  function submit() {
    if (!canManageRecruitment || !gate.ok || !props.candidate?.id || !orderId) return;
    createApplication.mutate({ candidateId: props.candidate.id, orderId }, { onSuccess: () => setOrderId("") });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
      <div className="space-y-3">
        <Select
          label={copy({ en: "Order", vi: "Đơn hàng" })}
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          disabled={Boolean(props.presetOrderId)}
        >
          <option value="">{copy({ en: "Choose order", vi: "Chọn đơn hàng" })}</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.name}
            </option>
          ))}
        </Select>
        <p className="text-xs leading-5 text-slate-500">
          {copy({
            en: "Creating an application links this candidate to an order and starts the interview-to-departure flow.",
            vi: "Tạo ứng tuyển sẽ liên kết ứng viên với đơn hàng và bắt đầu luồng phỏng vấn đến xuất cảnh.",
          })}
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {copy({ en: "Creation gate", vi: "Điều kiện tạo" })}
        </div>
        <GateRow label={copy({ en: "Candidate", vi: "Ứng viên" })} ok={candidateOk} value={props.candidate?.code || props.candidate?.id || copy({ en: "None", vi: "Chưa có" })} />
        <GateRow label={copy({ en: "Standard form", vi: "Form chuẩn" })} ok={formOk} value={props.form ? formatDocumentStatus(props.form.documentStatus) : copy({ en: "Missing", vi: "Thiếu" })} />
        <GateRow label={copy({ en: "Lead status", vi: "Trạng thái" })} ok={stageOk} value={formatLeadStatus(props.leadStatus)} />
        <GateRow label={copy({ en: "Order", vi: "Đơn hàng" })} ok={orderOk} value={orders.find((o) => o.id === orderId)?.name ?? copy({ en: "Not selected", vi: "Chưa chọn" })} />
        <div className={`rounded-lg border px-3 py-2 text-xs ${gate.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {gate.message}
        </div>
        {!canManageRecruitment ? (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            {copy({ en: "Only recruitment staff can create applications.", vi: "Chỉ nhân sự tuyển dụng mới tạo được ứng tuyển." })}
          </div>
        ) : null}
        <Button className="w-full" onClick={submit} disabled={!canManageRecruitment || !gate.ok || createApplication.isPending}>
          {createApplication.isPending ? copy({ en: "Creating...", vi: "Đang tạo..." }) : copy({ en: "Create application", vi: "Tạo ứng tuyển" })}
        </Button>
      </div>
    </div>
  );
}

function EditApplication(props: { application: ApplicationRecord }) {
  const { application } = props;
  const { copy, formatApplicationStatus } = useI18n();
  const { canManageRecruitment, isAdmin } = usePermissions();
  const updateApplication = useUpdateApplicationMutation();
  const deleteApplication = useDeleteApplicationMutation();
  const [draft, setDraft] = useState<ApplicationDraft>(() => applicationToDraft(application));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusOptions = applicationStatusOptions(application.status);
  const safeStatus = statusOptions.includes(draft.status) ? draft.status : application.status;
  const effectiveDraft = { ...draft, status: safeStatus };
  const rejectReasonIme = useImeSafeInput(effectiveDraft.rejectReason, (e) =>
    setDraft((d) => ({ ...d, rejectReason: e.target.value }))
  );
  const hasNextStatus = hasApplicationNextStatus(application.status);
  const missingInterviewDate = requiresInterviewDate(effectiveDraft.status) && !effectiveDraft.interviewDate;
  const missingRejectReason = requiresRejectReason(effectiveDraft.status) && !effectiveDraft.rejectReason.trim();
  const dirty = isDraftDirty(application, effectiveDraft);
  // Mirror the backend guard: only early-stage applications can be deleted;
  // advanced ones must be closed via Withdraw/Reject.
  const canDelete = ["matching", "referred"].includes(application.status);

  function save() {
    if (!canManageRecruitment || !dirty || missingInterviewDate || missingRejectReason) return;
    updateApplication.mutate({
      id: application.id,
      patch: {
        status: effectiveDraft.status,
        interviewDate: effectiveDraft.interviewDate || undefined,
        rejectReason: effectiveDraft.rejectReason.trim() || undefined,
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-[0.1em] text-slate-400">{copy({ en: "Order", vi: "Đơn hàng" })}</span>
        <span className="text-sm font-semibold text-slate-900">{application.order?.name ?? application.order_id}</span>
        <Badge tone={toneForApplicationStatus(application.status)}>{formatApplicationStatus(application.status)}</Badge>
        {!hasNextStatus ? <Badge tone="neutral">{copy({ en: "Terminal", vi: "Kết thúc" })}</Badge> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label={copy({ en: "Move to status", vi: "Chuyển trạng thái" })}
          value={effectiveDraft.status}
          onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          disabled={!canManageRecruitment || !hasNextStatus}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {formatApplicationStatus(status)}
            </option>
          ))}
        </Select>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">{copy({ en: "Interview date", vi: "Ngày phỏng vấn" })}</label>
          <input
            type="date"
            value={effectiveDraft.interviewDate}
            onChange={(e) => setDraft((d) => ({ ...d, interviewDate: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">{copy({ en: "Reject / withdraw reason", vi: "Lý do rớt / rút" })}</label>
          <input
            type="text"
            value={rejectReasonIme.value}
            onChange={rejectReasonIme.onChange}
            onCompositionStart={rejectReasonIme.onCompositionStart}
            onCompositionEnd={rejectReasonIme.onCompositionEnd}
            placeholder={copy({ en: "Required for closed outcomes", vi: "Bắt buộc khi đóng hồ sơ" })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {missingInterviewDate || missingRejectReason ? (
        <div className="text-xs text-amber-700">
          {missingInterviewDate
            ? copy({ en: "Interview date is required for this status.", vi: "Cần ngày phỏng vấn cho trạng thái này." })
            : copy({ en: "Reason is required for failed, rejected, or withdrawn applications.", vi: "Cần lý do cho hồ sơ rớt, bị từ chối hoặc rút." })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={!canManageRecruitment || !dirty || updateApplication.isPending || missingInterviewDate || missingRejectReason}>
          {updateApplication.isPending ? copy({ en: "Saving...", vi: "Đang lưu..." }) : copy({ en: "Save transition", vi: "Lưu chuyển trạng thái" })}
        </Button>
        {isAdmin && canDelete ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={deleteApplication.isPending}>
            {copy({ en: "Delete record", vi: "Xóa bản ghi" })}
          </Button>
        ) : null}
        {isAdmin && !canDelete ? (
          <span className="text-xs text-slate-500">
            {copy({ en: "Advanced applications can't be deleted — use Withdraw/Reject to close.", vi: "Hồ sơ đã tiến triển không thể xóa — dùng Rút/Từ chối để đóng." })}
          </span>
        ) : null}
        {!canManageRecruitment ? (
          <span className="text-xs text-slate-500">{copy({ en: "Recruitment role required to change status.", vi: "Cần quyền tuyển dụng để đổi trạng thái." })}</span>
        ) : null}
      </div>

      <ConfirmationDialog
        open={confirmDelete}
        title={copy({ en: "Delete application record?", vi: "Xóa bản ghi ứng tuyển?" })}
        description={copy({
          en: "This removes only the application record. Use it for admin corrections when the record was created by mistake.",
          vi: "Thao tác này chỉ xóa bản ghi ứng tuyển. Chỉ dùng để hiệu chỉnh admin khi bản ghi được tạo nhầm.",
        })}
        details={[
          { label: copy({ en: "Order", vi: "Đơn hàng" }), value: application.order?.name ?? application.order_id },
        ]}
        warning={copy({
          en: "If this application has linked training-finance records, correct those first.",
          vi: "Nếu ứng tuyển này đã liên kết đào tạo/tài chính, hãy xử lý bản ghi đó trước.",
        })}
        confirmLabel={copy({ en: "Delete record", vi: "Xóa bản ghi" })}
        pendingLabel={copy({ en: "Deleting...", vi: "Đang xóa..." })}
        cancelLabel={copy({ en: "Cancel", vi: "Hủy" })}
        isPending={deleteApplication.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteApplication.mutate(application.id, { onSuccess: () => setConfirmDelete(false) })}
      />
    </div>
  );
}

export function ApplicationPhasePanel(props: {
  leadId: string;
  leadStatus: string;
  candidate: CandidateRef | null;
  form: FormStandardRegisterRow | null;
  application: ApplicationRecord | null;
  /** Order-first flow: pre-select and lock the target order in the create gate. */
  presetOrderId?: string;
}) {
  if (props.application) {
    return <EditApplication application={props.application} />;
  }
  return (
    <CreateApplication
      leadId={props.leadId}
      leadStatus={props.leadStatus}
      candidate={props.candidate}
      form={props.form}
      presetOrderId={props.presetOrderId}
    />
  );
}
