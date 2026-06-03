import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
} from "@social-crm/ui";
import {
  useApplicationsQuery,
  useCreateTrainingFinanceMutation,
  useDeleteTrainingFinanceMutation,
  usePermissions,
  useTrainingFinanceDetailQuery,
  useUpdateTrainingFinanceMutation,
  type ApplicationRecord,
  type TrainingFinanceRecord,
} from "@social-crm/api";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { getLeadDisplayName } from "@/lib/lead-display";
import { UiText } from "@/ui-text/ui-text";
import { useI18n } from "../../i18n";

type MilestoneForm = {
  leadId: string;
  orderId: string;
  applicationId: string;
  orderType: string;
  depositStatus: string;
  amountPaid: string;
  trainingStartDate: string;
  trainingProgress: string;
  visaDate: string;
  departureDate: string;
};

const emptyForm: MilestoneForm = {
  leadId: "",
  orderId: "",
  applicationId: "",
  orderType: "",
  depositStatus: "",
  amountPaid: "",
  trainingStartDate: "",
  trainingProgress: "",
  visaDate: "",
  departureDate: "",
};

function applicationLabel(application: ApplicationRecord, formatApplicationStatus: (value: string) => string) {
  const orderName = application.order?.name ?? application.order_id;
  return `${orderName} · ${formatApplicationStatus(application.status)}`;
}

function recordToForm(record: TrainingFinanceRecord): MilestoneForm {
  return {
    leadId: record.lead_id ?? "",
    orderId: record.order_id ?? "",
    applicationId: record.application_id ?? "",
    orderType: record.orderType ?? "",
    depositStatus: record.depositStatus ?? "",
    amountPaid: record.amountPaid != null ? String(record.amountPaid) : "",
    trainingStartDate: record.trainingStartDate ?? "",
    trainingProgress: record.trainingProgress ?? "",
    visaDate: record.visaDate ?? "",
    departureDate: record.departureDate ?? "",
  };
}

function findApplication(applications: ApplicationRecord[], applicationId?: string | null, fallback?: ApplicationRecord | null) {
  if (!applicationId) return null;
  return applications.find((application) => application.id === applicationId) ?? (fallback?.id === applicationId ? fallback : null);
}

function departureGate(departureDate: string, application?: ApplicationRecord | null) {
  if (!departureDate) return true;
  return Boolean(application && application.status === "ready_to_depart");
}

function buildPayload(form: MilestoneForm) {
  return {
    leadId: form.leadId,
    orderId: form.orderId || undefined,
    applicationId: form.applicationId || undefined,
    orderType: form.orderType || undefined,
    depositStatus: form.depositStatus || undefined,
    amountPaid: form.amountPaid ? Number(form.amountPaid) : undefined,
    trainingStartDate: form.trainingStartDate || undefined,
    trainingProgress: form.trainingProgress || undefined,
    visaDate: form.visaDate || undefined,
    departureDate: form.departureDate || undefined,
  };
}

function buildPatch(form: MilestoneForm) {
  return {
    orderId: form.orderId || null,
    applicationId: form.applicationId || null,
    orderType: form.orderType || null,
    depositStatus: form.depositStatus || null,
    amountPaid: form.amountPaid ? Number(form.amountPaid) : null,
    trainingStartDate: form.trainingStartDate || null,
    trainingProgress: form.trainingProgress || null,
    visaDate: form.visaDate || null,
    departureDate: form.departureDate || null,
  };
}

function sameForm(a: MilestoneForm, b: MilestoneForm) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function TrainingFinanceDetailPage(props: { embeddedRecordId?: string; embeddedLeadId?: string } = {}) {
  const params = useParams();
  const navigate = useNavigate();
  const { copy, formatApplicationStatus } = useI18n();
  const { canManageFinance, isAdmin } = usePermissions();

  // Embedded mode: the Journey workbench controls which record (or "new") is
  // shown and locks the lead. Navigation is suppressed — the workbench's
  // by-lead query invalidation swaps create↔edit automatically.
  const embedded = props.embeddedRecordId !== undefined;
  const recordId = props.embeddedRecordId ?? params.recordId;
  const isNew = recordId === "new";
  const detailQuery = useTrainingFinanceDetailQuery(isNew ? undefined : recordId);
  const createTrainingFinance = useCreateTrainingFinanceMutation();
  const updateTrainingFinance = useUpdateTrainingFinanceMutation();
  const deleteTrainingFinance = useDeleteTrainingFinanceMutation();
  const [form, setForm] = useState<MilestoneForm>(emptyForm);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm({ ...emptyForm, leadId: props.embeddedLeadId ?? "" });
      return;
    }
    if (detailQuery.data) {
      setForm(recordToForm(detailQuery.data));
    }
  }, [detailQuery.data, isNew, props.embeddedLeadId]);

  const applicationsQuery = useApplicationsQuery(
    { offset: 0, limit: 50, leadId: form.leadId || undefined },
    { enabled: Boolean(form.leadId) },
  );
  const applications = applicationsQuery.data?.data ?? [];
  const selectedApplication = findApplication(applications, form.applicationId, detailQuery.data?.application ?? null);
  const savedForm = useMemo(() => (detailQuery.data ? recordToForm(detailQuery.data) : emptyForm), [detailQuery.data]);
  const dirty = isNew || !sameForm(form, savedForm);
  const gateOk = departureGate(form.departureDate, selectedApplication);
  const pending = createTrainingFinance.isPending || updateTrainingFinance.isPending;
  const canSave = canManageFinance && Boolean(form.leadId) && gateOk && dirty && !pending;
  const selectedLeadName = detailQuery.data?.lead ? getLeadDisplayName(detailQuery.data.lead) : form.leadId;

  function chooseApplication(applicationId: string) {
    const application = findApplication(applications, applicationId, detailQuery.data?.application ?? null);
    setForm((state) => ({
      ...state,
      applicationId,
      orderId: application?.order_id ?? state.orderId,
    }));
  }

  function submit() {
    if (!canSave) return;
    if (isNew) {
      createTrainingFinance.mutate(buildPayload(form), {
        onSuccess: (record) => {
          if (!embedded) navigate(`/training-finance/${record.id}`);
        },
      });
      return;
    }
    if (!recordId) return;
    updateTrainingFinance.mutate({ id: recordId, patch: buildPatch(form) });
  }

  if (!isNew && detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title={<UiText id="tf.detail.loading" />} />
      </div>
    );
  }

  if (!isNew && !detailQuery.data) {
    return (
      <EmptyState
        title={<UiText id="tf.detail.not-found.title" />}
        description={<UiText id="tf.detail.not-found.desc" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <SectionHeader
          eyebrow={<UiText id="tf.detail.eyebrow" />}
          title={isNew ? <UiText id="tf.detail.new-title" /> : <UiText id="tf.detail.title" />}
          description={<UiText id="tf.detail.desc" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/training-finance" className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 no-underline hover:bg-slate-50">
                <UiText id="tf.detail.back" />
              </Link>
              {!canManageFinance ? <Badge tone="neutral">{copy({ en: "Read only", vi: "Chỉ xem" })}</Badge> : null}
            </div>
          }
        />
      ) : null}

      <InfoStrip>
        <UiText id="tf.detail.best-practice" />
      </InfoStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title={<UiText id="tf.fields.title" />}
          subtitle={<UiText id="tf.fields.subtitle" />}
        >
          <FieldGroup columns={3}>
            <Input label={copy({ en: "Lead ID", vi: "Mã lead" })} value={form.leadId} disabled={!isNew || !canManageFinance || embedded} onChange={(e) => setForm((s) => ({ ...s, leadId: e.target.value }))} />
            <Select
              label={copy({ en: "Linked application", vi: "Ứng tuyển liên kết" })}
              value={form.applicationId}
              disabled={!canManageFinance || !form.leadId || applicationsQuery.isLoading}
              onChange={(e) => chooseApplication(e.target.value)}
            >
              <option value="">{copy({ en: "Choose application", vi: "Chọn ứng tuyển" })}</option>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {applicationLabel(application, formatApplicationStatus)}
                </option>
              ))}
              {selectedApplication && !applications.some((application) => application.id === selectedApplication.id) ? (
                <option value={selectedApplication.id}>{applicationLabel(selectedApplication, formatApplicationStatus)}</option>
              ) : null}
            </Select>
            <Input
              label={copy({ en: "Order ID", vi: "Order ID" })}
              value={form.orderId}
              disabled={!canManageFinance || Boolean(form.applicationId)}
              onChange={(e) => setForm((s) => ({ ...s, orderId: e.target.value }))}
            />
            <Input label={copy({ en: "Order type", vi: "Loại đơn hàng" })} value={form.orderType} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, orderType: e.target.value }))} />
            <Input label={copy({ en: "Deposit status", vi: "Trạng thái đặt cọc" })} value={form.depositStatus} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, depositStatus: e.target.value }))} />
            <Input label={copy({ en: "Amount paid", vi: "Số tiền đã đóng" })} value={form.amountPaid} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, amountPaid: e.target.value }))} />
            <Input label={copy({ en: "Training start", vi: "Bắt đầu đào tạo" })} type="date" value={form.trainingStartDate} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, trainingStartDate: e.target.value }))} />
            <Input label={copy({ en: "Training progress", vi: "Tiến độ đào tạo" })} value={form.trainingProgress} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, trainingProgress: e.target.value }))} />
            <Input label={copy({ en: "Visa date", vi: "Ngày visa" })} type="date" value={form.visaDate} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, visaDate: e.target.value }))} />
            <Input label={copy({ en: "Departure date", vi: "Ngày xuất cảnh" })} type="date" value={form.departureDate} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, departureDate: e.target.value }))} />
          </FieldGroup>

          {!gateOk ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {copy({
                en: "Departure date requires a linked application marked Ready to depart.",
                vi: "Ngày xuất cảnh cần ứng tuyển liên kết ở trạng thái Sẵn sàng xuất cảnh.",
              })}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={!canSave}>
              {pending
                ? copy({ en: "Saving...", vi: "Đang lưu..." })
                : isNew
                  ? copy({ en: "Create milestone record", vi: "Tạo bản ghi tiến độ" })
                  : copy({ en: "Save milestone update", vi: "Lưu cập nhật tiến độ" })}
            </Button>
            <Button variant="secondary" onClick={() => setForm(isNew ? emptyForm : savedForm)} disabled={pending || !dirty}>
              {copy({ en: "Reset changes", vi: "Đặt lại thay đổi" })}
            </Button>
            {!form.leadId ? <span className="text-sm text-rose-600">{copy({ en: "Lead ID is required.", vi: "Cần mã lead." })}</span> : null}
            {!dirty && !isNew ? <span className="text-sm text-slate-500">{copy({ en: "No unsaved changes.", vi: "Không có thay đổi chưa lưu." })}</span> : null}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel
            title={<UiText id="tf.linked.title" />}
            subtitle={<UiText id="tf.linked.subtitle" />}
          >
            <div className="space-y-3">
              <InfoCard label={copy({ en: "Lead", vi: "Lead" })} value={selectedLeadName || copy({ en: "Not selected", vi: "Chưa chọn" })} className="bg-slate-50" />
              <InfoCard
                label={copy({ en: "Application", vi: "Ứng tuyển" })}
                value={selectedApplication ? applicationLabel(selectedApplication, formatApplicationStatus) : copy({ en: "Not linked", vi: "Chưa liên kết" })}
                className="bg-slate-50"
              />
              <InfoCard label={copy({ en: "Order", vi: "Đơn hàng" })} value={form.orderId || copy({ en: "Not set", vi: "Chưa đặt" })} className="bg-slate-50" />
              <InfoCard label={copy({ en: "Departure gate", vi: "Điều kiện xuất cảnh" })} value={gateOk ? "OK" : copy({ en: "Blocked", vi: "Đang chặn" })} className="bg-slate-50" />
            </div>
          </Panel>

          {!isNew && detailQuery.data ? (
            <Panel title={copy({ en: "Stored record", vi: "Bản ghi đã lưu" })}>
              <DescriptionList
                items={[
                  { label: copy({ en: "Record ID", vi: "Record ID" }), value: detailQuery.data.id },
                  { label: copy({ en: "Updated", vi: "Cập nhật" }), value: detailQuery.data.updatedAt || copy({ en: "Unknown", vi: "Chưa rõ" }) },
                  { label: copy({ en: "Created", vi: "Tạo lúc" }), value: detailQuery.data.createdAt || copy({ en: "Unknown", vi: "Chưa rõ" }) },
                ]}
              />
              {isAdmin ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                    {copy({
                      en: "Admin correction: delete only records created by mistake.",
                      vi: "Hiệu chỉnh admin: chỉ xóa bản ghi tạo nhầm.",
                    })}
                  </div>
                  <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={deleteTrainingFinance.isPending}>
                    {deleteTrainingFinance.isPending ? copy({ en: "Deleting...", vi: "Đang xóa..." }) : copy({ en: "Delete record", vi: "Xóa bản ghi" })}
                  </Button>
                </div>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </div>

      <ConfirmationDialog
        open={deleteOpen}
        title={copy({ en: "Delete training-finance record?", vi: "Xóa bản ghi đào tạo/tài chính?" })}
        description={copy({
          en: "This removes only the selected milestone record. Use it for admin corrections when the record was created by mistake.",
          vi: "Thao tác này chỉ xóa bản ghi tiến độ đang chọn. Chỉ dùng để hiệu chỉnh admin khi bản ghi được tạo nhầm.",
        })}
        details={[
          { label: copy({ en: "Lead", vi: "Lead" }), value: selectedLeadName || form.leadId || "—" },
          { label: copy({ en: "Application", vi: "Ứng tuyển" }), value: selectedApplication ? applicationLabel(selectedApplication, formatApplicationStatus) : copy({ en: "Not linked", vi: "Chưa liên kết" }) },
        ]}
        warning={copy({
          en: "If the linked application or order is wrong, correct those relationships before deleting records.",
          vi: "Nếu ứng tuyển hoặc đơn hàng liên kết bị sai, hãy chỉnh các liên kết đó trước khi xóa bản ghi.",
        })}
        confirmLabel={copy({ en: "Delete record", vi: "Xóa bản ghi" })}
        pendingLabel={copy({ en: "Deleting...", vi: "Đang xóa..." })}
        cancelLabel={copy({ en: "Cancel", vi: "Hủy" })}
        isPending={deleteTrainingFinance.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (!recordId || isNew) return;
          deleteTrainingFinance.mutate(recordId, {
            onSuccess: () => {
              setDeleteOpen(false);
              if (!embedded) navigate("/training-finance");
            },
          });
        }}
      />
    </div>
  );
}
