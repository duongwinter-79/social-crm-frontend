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
  type DepositStatusMode,
  type TrainingFinanceCurrency,
  type TrainingFinanceRecord,
  type VisaStatus,
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
  depositStatusMode: DepositStatusMode;
  depositStatus: string;
  amountPaid: string;
  amountDue: string;
  depositRefunded: boolean;
  currency: TrainingFinanceCurrency;
  trainingStartDate: string;
  trainingProgress: string;
  visaStatus: string;
  visaDate: string;
  departureDate: string;
};

const CURRENCY_OPTIONS: TrainingFinanceCurrency[] = ["VND", "TWD", "USD"];

// Canonical manifest codes (PDF Sec V) with operator-facing labels. The stored
// value is always the code; only the label is localized. A leading blank option
// keeps each field optional (matches the prior free-text "unset" behavior).
type EnumOption = { value: string; en: string; vi: string };

const ORDER_TYPE_OPTIONS: EnumOption[] = [
  { value: "standard", en: "Standard", vi: "Tiêu chuẩn" },
  { value: "engineer", en: "Engineer", vi: "Kỹ sư" },
  { value: "free", en: "Free", vi: "Miễn phí" },
];

// Deposit status codes (manifest). Used for the auto-mode read-only label and
// the manual-mode dropdown.
const DEPOSIT_STATUS_VALUES = ["none", "partial", "full", "refunded"] as const;
const DEPOSIT_STATUS_LABELS: Record<string, { en: string; vi: string }> = {
  none: { en: "No deposit", vi: "Chưa đặt cọc" },
  partial: { en: "Partial deposit", vi: "Đặt cọc một phần" },
  full: { en: "Paid in full", vi: "Đã đặt cọc đủ" },
  refunded: { en: "Refunded", vi: "Đã hoàn cọc" },
};

const VISA_STATUS_OPTIONS: { value: VisaStatus; en: string; vi: string }[] = [
  { value: "none", en: "Not applied", vi: "Chưa nộp" },
  { value: "in_progress", en: "In progress", vi: "Đang xử lý" },
  { value: "received", en: "Received", vi: "Đã nhận" },
  { value: "rejected", en: "Rejected", vi: "Bị từ chối" },
];

const emptyForm: MilestoneForm = {
  leadId: "",
  orderId: "",
  applicationId: "",
  orderType: "",
  depositStatusMode: "auto",
  depositStatus: "",
  amountPaid: "",
  amountDue: "",
  depositRefunded: false,
  currency: "VND",
  trainingStartDate: "",
  trainingProgress: "",
  visaStatus: "",
  visaDate: "",
  departureDate: "",
};

// Money is currency-flexible: VND (whole amounts) plus TWD/USD (up to 2
// decimals). We keep the raw text in form state so the operator can type freely
// (with thousands separators), and parse to a real number only at submit time.
// `numeric(14,2)` on the backend caps the value.
const MONEY_MAX = 999999999999.99;

// VND has no subunit in practice — render and round to whole numbers; TWD/USD
// carry cents (2 decimals).
function moneyDecimals(currency: TrainingFinanceCurrency): number {
  return currency === "VND" ? 0 : 2;
}

function parseMoney(raw: string, currency: TrainingFinanceCurrency): number | undefined {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > MONEY_MAX) return undefined;
  const factor = currency === "VND" ? 1 : 100;
  return Math.round(value * factor) / factor;
}

// Group with thousands separators; decimals follow the currency (VND whole —
// 25,000,000; TWD/USD always 2 — 1,500.50).
function formatMoney(value: number, currency: TrainingFinanceCurrency): string {
  const decimals = moneyDecimals(currency);
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Strip anything that isn't a digit, comma, or a single decimal point so the
// field can never hold characters that would parse to NaN.
function sanitizeMoneyInput(raw: string): string {
  const filtered = raw.replace(/[^\d.,]/g, "");
  const firstDot = filtered.indexOf(".");
  if (firstDot === -1) return filtered;
  // collapse any decimal points after the first
  return filtered.slice(0, firstDot + 1) + filtered.slice(firstDot + 1).replace(/\./g, "");
}

// Mirror of the backend deriveDepositStatus (training-finance-rules.ts) so the
// form previews the status the server will compute on save.
function deriveDepositStatus(paid?: number, due?: number, refunded?: boolean): string {
  if (refunded) return "refunded";
  if (paid == null || paid <= 0) return "none";
  if (due != null && due > 0 && paid >= due) return "full";
  return "partial";
}

function applicationLabel(application: ApplicationRecord, formatApplicationStatus: (value: string) => string) {
  const orderName = application.order?.name ?? application.order_id;
  return `${orderName} · ${formatApplicationStatus(application.status)}`;
}

function recordToForm(record: TrainingFinanceRecord): MilestoneForm {
  const currency: TrainingFinanceCurrency = record.currency ?? "VND";
  return {
    leadId: record.lead_id ?? "",
    orderId: record.order_id ?? "",
    applicationId: record.application_id ?? "",
    orderType: record.orderType ?? "",
    depositStatusMode: record.depositStatusMode ?? "auto",
    depositStatus: record.depositStatus ?? "",
    amountPaid: record.amountPaid != null ? formatMoney(record.amountPaid, currency) : "",
    amountDue: record.amountDue != null ? formatMoney(record.amountDue, currency) : "",
    depositRefunded: record.depositRefunded ?? false,
    currency,
    trainingStartDate: record.trainingStartDate ?? "",
    trainingProgress: record.trainingProgress ?? "",
    visaStatus: record.visaStatus ?? "",
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
    depositStatusMode: form.depositStatusMode,
    depositStatus: form.depositStatusMode === "manual" ? form.depositStatus || "none" : undefined,
    amountPaid: parseMoney(form.amountPaid, form.currency),
    amountDue: parseMoney(form.amountDue, form.currency),
    depositRefunded: form.depositRefunded,
    currency: form.currency,
    trainingStartDate: form.trainingStartDate || undefined,
    trainingProgress: form.trainingProgress || undefined,
    visaStatus: form.visaStatus || undefined,
    visaDate: form.visaDate || undefined,
    departureDate: form.departureDate || undefined,
  };
}

function buildPatch(form: MilestoneForm) {
  return {
    orderId: form.orderId || null,
    applicationId: form.applicationId || null,
    orderType: form.orderType || null,
    depositStatusMode: form.depositStatusMode,
    depositStatus: form.depositStatusMode === "manual" ? form.depositStatus || "none" : undefined,
    amountPaid: parseMoney(form.amountPaid, form.currency) ?? null,
    amountDue: parseMoney(form.amountDue, form.currency) ?? null,
    depositRefunded: form.depositRefunded,
    currency: form.currency,
    trainingStartDate: form.trainingStartDate || null,
    trainingProgress: form.trainingProgress || null,
    visaStatus: form.visaStatus || null,
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
  const paidValue = parseMoney(form.amountPaid, form.currency);
  const dueValue = parseMoney(form.amountDue, form.currency);
  const amountInvalid =
    (form.amountPaid.trim() !== "" && paidValue === undefined) ||
    (form.amountDue.trim() !== "" && dueValue === undefined);
  // Entry pre-gate: a new record needs a linked application (which presupposes a
  // matched candidate). The backend enforces both; the UI blocks early.
  const needsApplication = isNew && !form.applicationId;
  const noApplicationsForLead = isNew && Boolean(form.leadId) && !applicationsQuery.isLoading && applications.length === 0;
  const canSave = canManageFinance && Boolean(form.leadId) && gateOk && dirty && !pending && !amountInvalid && !needsApplication;
  const selectedLeadName = detailQuery.data?.lead ? getLeadDisplayName(detailQuery.data.lead) : form.leadId;

  // Live preview of what the server will store + the outstanding balance.
  const derivedStatus =
    form.depositStatusMode === "manual"
      ? form.depositStatus || "none"
      : deriveDepositStatus(paidValue, dueValue, form.depositRefunded);
  const remaining = dueValue != null ? Math.max(0, Math.round((dueValue - (paidValue ?? 0)) * 100) / 100) : null;

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
            <Select label={copy({ en: "Order type", vi: "Loại đơn hàng" })} value={form.orderType} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, orderType: e.target.value }))}>
              <option value="">{copy({ en: "— Not set —", vi: "— Chưa đặt —" })}</option>
              {ORDER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {copy({ en: option.en, vi: option.vi })}
                </option>
              ))}
            </Select>
            <Select
              label={copy({ en: "Currency", vi: "Loại tiền tệ" })}
              value={form.currency}
              disabled={!canManageFinance}
              onChange={(e) =>
                setForm((s) => {
                  const currency = e.target.value as TrainingFinanceCurrency;
                  // Re-render both amounts under the new currency's decimal rules.
                  const paid = parseMoney(s.amountPaid, currency);
                  const due = parseMoney(s.amountDue, currency);
                  return {
                    ...s,
                    currency,
                    amountPaid: paid === undefined ? s.amountPaid : formatMoney(paid, currency),
                    amountDue: due === undefined ? s.amountDue : formatMoney(due, currency),
                  };
                })
              }
            >
              {CURRENCY_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
            <Input
              label={copy({ en: "Amount due (total)", vi: "Tổng phải đóng" })}
              hint={copy({
                en: "Total the candidate must pay for this placement, in the selected currency.",
                vi: "Tổng số tiền ứng viên phải đóng cho suất này, theo loại tiền đã chọn.",
              })}
              value={form.amountDue}
              disabled={!canManageFinance}
              inputMode="decimal"
              placeholder="0"
              onChange={(e) => setForm((s) => ({ ...s, amountDue: sanitizeMoneyInput(e.target.value) }))}
              onBlur={() =>
                setForm((s) => {
                  const value = parseMoney(s.amountDue, s.currency);
                  return value === undefined ? s : { ...s, amountDue: formatMoney(value, s.currency) };
                })
              }
            />
            <Input
              label={copy({ en: "Amount paid", vi: "Số tiền đã đóng" })}
              hint={copy({
                en: "Total received so far. Numbers only — grouping is added automatically.",
                vi: "Tổng đã thu đến nay. Chỉ nhập số — dấu phân cách tự thêm.",
              })}
              value={form.amountPaid}
              disabled={!canManageFinance}
              inputMode="decimal"
              placeholder="0"
              onChange={(e) => setForm((s) => ({ ...s, amountPaid: sanitizeMoneyInput(e.target.value) }))}
              onBlur={() =>
                setForm((s) => {
                  const value = parseMoney(s.amountPaid, s.currency);
                  return value === undefined ? s : { ...s, amountPaid: formatMoney(value, s.currency) };
                })
              }
            />
            <Select
              label={copy({ en: "Deposit status mode", vi: "Chế độ trạng thái cọc" })}
              value={form.depositStatusMode}
              disabled={!canManageFinance}
              onChange={(e) =>
                setForm((s) => {
                  const mode = e.target.value as DepositStatusMode;
                  // Switching to manual seeds the pick with whatever auto shows now.
                  if (mode === "manual" && !s.depositStatus) {
                    const seeded = deriveDepositStatus(parseMoney(s.amountPaid, s.currency), parseMoney(s.amountDue, s.currency), s.depositRefunded);
                    return { ...s, depositStatusMode: mode, depositStatus: seeded };
                  }
                  return { ...s, depositStatusMode: mode };
                })
              }
            >
              <option value="auto">{copy({ en: "Auto (from amounts)", vi: "Tự động (theo số tiền)" })}</option>
              <option value="manual">{copy({ en: "Manual", vi: "Thủ công" })}</option>
            </Select>
            {form.depositStatusMode === "manual" ? (
              <Select
                label={copy({ en: "Deposit status", vi: "Trạng thái đặt cọc" })}
                value={form.depositStatus || "none"}
                disabled={!canManageFinance}
                onChange={(e) => setForm((s) => ({ ...s, depositStatus: e.target.value }))}
              >
                {DEPOSIT_STATUS_VALUES.map((code) => (
                  <option key={code} value={code}>
                    {copy(DEPOSIT_STATUS_LABELS[code])}
                  </option>
                ))}
              </Select>
            ) : (
              <>
                <Select
                  label={copy({ en: "Deposit refunded?", vi: "Đã hoàn cọc?" })}
                  value={form.depositRefunded ? "yes" : "no"}
                  disabled={!canManageFinance}
                  onChange={(e) => setForm((s) => ({ ...s, depositRefunded: e.target.value === "yes" }))}
                >
                  <option value="no">{copy({ en: "No", vi: "Không" })}</option>
                  <option value="yes">{copy({ en: "Yes", vi: "Có" })}</option>
                </Select>
                <Input
                  label={copy({ en: "Deposit status (auto)", vi: "Trạng thái cọc (tự động)" })}
                  value={copy(DEPOSIT_STATUS_LABELS[derivedStatus] ?? { en: derivedStatus, vi: derivedStatus })}
                  disabled
                  readOnly
                />
              </>
            )}
            <Input label={copy({ en: "Training start", vi: "Bắt đầu đào tạo" })} type="date" value={form.trainingStartDate} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, trainingStartDate: e.target.value }))} />
            <Input
              label={copy({ en: "Training progress", vi: "Tiến độ đào tạo" })}
              hint={copy({
                en: "Short note on the training stage — e.g. course/module, week or % complete, pass/fail.",
                vi: "Ghi chú ngắn về tiến độ đào tạo — ví dụ: khóa/học phần, tuần hoặc % hoàn thành, kết quả đạt/không đạt.",
              })}
              value={form.trainingProgress}
              disabled={!canManageFinance}
              onChange={(e) => setForm((s) => ({ ...s, trainingProgress: e.target.value }))}
            />
            <Select label={copy({ en: "Visa status", vi: "Trạng thái visa" })} value={form.visaStatus} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, visaStatus: e.target.value }))}>
              <option value="">{copy({ en: "— Not set —", vi: "— Chưa đặt —" })}</option>
              {VISA_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {copy({ en: option.en, vi: option.vi })}
                </option>
              ))}
            </Select>
            <Input label={copy({ en: "Visa date", vi: "Ngày visa" })} type="date" value={form.visaDate} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, visaDate: e.target.value }))} />
            <Input label={copy({ en: "Departure date", vi: "Ngày xuất cảnh" })} type="date" value={form.departureDate} disabled={!canManageFinance} onChange={(e) => setForm((s) => ({ ...s, departureDate: e.target.value }))} />
          </FieldGroup>

          {remaining != null ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {remaining > 0
                ? copy({
                    en: `Remaining balance: ${formatMoney(remaining, form.currency)} ${form.currency}`,
                    vi: `Còn lại phải đóng: ${formatMoney(remaining, form.currency)} ${form.currency}`,
                  })
                : copy({ en: "Fully paid — no balance remaining.", vi: "Đã đóng đủ — không còn dư nợ." })}
            </div>
          ) : null}

          {needsApplication ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {noApplicationsForLead
                ? copy({
                    en: "This lead has no application yet. Match the candidate to an order first — training-finance starts after an application exists.",
                    vi: "Lead này chưa có ứng tuyển. Hãy ghép ứng viên với đơn hàng trước — đào tạo/tài chính chỉ bắt đầu sau khi có ứng tuyển.",
                  })
                : copy({
                    en: "Link an application above before creating a training-finance record.",
                    vi: "Hãy liên kết một ứng tuyển ở trên trước khi tạo bản ghi đào tạo/tài chính.",
                  })}
            </div>
          ) : null}

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
            <Button variant="secondary" onClick={() => setForm((s) => (isNew ? { ...emptyForm, leadId: props.embeddedLeadId ?? s.leadId } : savedForm))} disabled={pending || !dirty}>
              {copy({ en: "Reset changes", vi: "Đặt lại thay đổi" })}
            </Button>
            {!form.leadId ? <span className="text-sm text-rose-600">{copy({ en: "Lead ID is required.", vi: "Cần mã lead." })}</span> : null}
            {amountInvalid ? <span className="text-sm text-rose-600">{copy({ en: "Amount paid must be a number ≥ 0 with up to 2 decimals.", vi: "Số tiền đã đóng phải là số ≥ 0, tối đa 2 chữ số thập phân." })}</span> : null}
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
