import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, DescriptionList, EmptyState, FieldGroup, InfoCard, Input, Panel, SectionHeader, Select } from "@social-crm/ui";
import {
  apiClient,
  useApplicationsQuery,
  useCancelOrderIntakePendingMutation,
  useCommitOrderIntakePendingMutation,
  useCreateOrderMutation,
  useDeleteOrderDocumentMutation,
  useOrderDetailQuery,
  useOrderDocumentsQuery,
  usePermissions,
  useStageOrderIntakeDocumentMutation,
  useUpdateOrderMutation,
  useUploadOrderDocumentMutation,
  useVerifyOrderIntakePendingMutation,
  type ApplicationRecord,
  type DocumentRecord,
  type Order,
  type OrderDocExtractedFields,
  type OrderMaritalStatusRequired,
  type OrderMutationPayload,
  type OrderRecruitmentStatus,
} from "@social-crm/api";
import { getLeadDisplayName } from "@/lib/lead-display";
import { useI18n } from "@/i18n";
import { UiText } from "@/ui-text/ui-text";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

// Applications that still tie a candidate to this order — anything not already
// closed. These are the candidates who need re-matching if the order is
// cancelled. Mirrors the backend's isApplicationWithdrawableForRematch.
const CLOSED_APPLICATION_STATUSES = new Set(["rejected", "withdrawn", "interview_failed"]);

function OrderLinkedCandidates(props: { orderId: string; cancelling: boolean }) {
  const { copy, formatLeadStatus, formatApplicationStatus } = useI18n();
  const applicationsQuery = useApplicationsQuery(
    { offset: 0, limit: 100, orderId: props.orderId },
    { enabled: Boolean(props.orderId) },
  );
  const all = applicationsQuery.data?.data ?? [];
  const inFlight = all.filter((a: ApplicationRecord) => !CLOSED_APPLICATION_STATUSES.has(a.status));

  if (applicationsQuery.isLoading || inFlight.length === 0) {
    // Nothing at stake — when cancelling with no linked candidates, reassure briefly.
    if (props.cancelling && !applicationsQuery.isLoading) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {copy({ en: "No active candidates are linked to this order — safe to cancel.", vi: "Không có ứng viên nào đang gắn với đơn hàng này — có thể hủy an toàn." })}
        </div>
      );
    }
    return null;
  }

  const cancelling = props.cancelling;

  return (
    <div className={`rounded-2xl border p-4 ${cancelling ? "border-rose-200 bg-rose-50/70" : "border-amber-200 bg-amber-50/70"}`}>
      <div className={`text-sm font-semibold ${cancelling ? "text-rose-900" : "text-amber-900"}`}>
        {cancelling
          ? copy({
              en: `Cancelling affects ${inFlight.length} matched candidate${inFlight.length === 1 ? "" : "s"}`,
              vi: `Việc hủy ảnh hưởng ${inFlight.length} ứng viên đã ghép`,
            })
          : copy({
              en: `${inFlight.length} candidate${inFlight.length === 1 ? "" : "s"} matched to this order`,
              vi: `${inFlight.length} ứng viên đang ghép với đơn hàng này`,
            })}
      </div>
      <p className={`mt-1 text-xs leading-5 ${cancelling ? "text-rose-800" : "text-amber-800"}`}>
        {cancelling
          ? copy({
              en: "Cancelling the order does not move these candidates automatically. Open each one and use “Withdraw & re-consult” on the Application tab to return them to consulting for a new order — their documents are kept.",
              vi: "Hủy đơn hàng không tự chuyển các ứng viên này. Hãy mở từng ứng viên và dùng “Rút & tư vấn lại” ở tab Ứng tuyển để đưa họ về trạng thái tư vấn cho đơn mới — giấy tờ được giữ nguyên.",
            })
          : copy({
              en: "If this order is cancelled, each candidate must be re-matched individually from their Application tab.",
              vi: "Nếu đơn hàng bị hủy, mỗi ứng viên cần được ghép lại thủ công từ tab Ứng tuyển của họ.",
            })}
      </p>

      <ul className={`mt-3 divide-y overflow-hidden rounded-xl border bg-white/70 ${cancelling ? "border-rose-200 divide-rose-100" : "border-amber-200 divide-amber-100"}`}>
        {inFlight.map((application: ApplicationRecord) => {
          const name = application.lead ? getLeadDisplayName(application.lead) : application.lead_id;
          const code = application.candidate?.code ?? application.candidate?.id ?? null;
          return (
            <li key={application.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <Link to={`/leads/${application.lead_id}`} className="font-semibold text-indigo-700 no-underline hover:underline">
                {name}
              </Link>
              {code ? <span className="text-xs text-slate-500">{code}</span> : null}
              <span className="ml-auto flex flex-wrap items-center gap-2">
                {application.lead?.status ? <Badge tone="neutral">{formatLeadStatus(application.lead.status)}</Badge> : null}
                <Badge tone={cancelling ? "danger" : "warning"}>{formatApplicationStatus(application.status)}</Badge>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type OrderFormState = {
  name: string;
  description: string;
  region: string;
  industry: string;
  salaryRange: string;
  requirements: string;
  genderRequired: "male" | "female" | "both";
  ageMin: string;
  ageMax: string;
  heightMin: string;
  acceptsReturnees: "" | "true" | "false";
  experienceRequired: "" | "true" | "false";
  recruitmentStatus: "" | OrderRecruitmentStatus;
  // ── Order-detail fields (from the real per-order spec .docx) ────────────
  agentName: string;
  dateReceived: string;
  quantity: string;
  factoryAddress: string;
  factoryNameLocal: string;
  referenceWebsite: string;
  existingVnWorkers: "" | "true" | "false";
  workShiftPattern: string;
  housingMealsInfo: string;
  overtimeInfo: string;
  weightMin: string;
  educationLevel: string;
  maritalStatusRequired: "" | OrderMaritalStatusRequired;
  selectionMethod: string;
  expectedDeparture: string;
  /** Comma-separated in the UI; split/joined to/from string[] on the wire. */
  excludedCandidateRegions: string;
};

const emptyOrderForm: OrderFormState = {
  name: "",
  description: "",
  region: "",
  industry: "",
  salaryRange: "",
  requirements: "",
  genderRequired: "both",
  ageMin: "",
  ageMax: "",
  heightMin: "",
  acceptsReturnees: "",
  experienceRequired: "false",
  recruitmentStatus: "",
  agentName: "",
  dateReceived: "",
  quantity: "",
  factoryAddress: "",
  factoryNameLocal: "",
  referenceWebsite: "",
  existingVnWorkers: "",
  workShiftPattern: "",
  housingMealsInfo: "",
  overtimeInfo: "",
  weightMin: "",
  educationLevel: "",
  maritalStatusRequired: "",
  selectionMethod: "",
  expectedDeparture: "",
  excludedCandidateRegions: "",
};

export function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { copy, formatDocumentType, formatDocumentStatus } = useI18n();
  const { canManageOrders } = usePermissions();
  const isNew = orderId === "new";

  useEffect(() => {
    if (isNew && !canManageOrders) navigate("/orders", { replace: true });
  }, [isNew, canManageOrders, navigate]);
  const orderQuery = useOrderDetailQuery(isNew ? undefined : orderId);
  const createOrder = useCreateOrderMutation();
  const updateOrder = useUpdateOrderMutation();
  const [form, setForm] = useState<OrderFormState>(emptyOrderForm);

  // ── Order-document intake (upload → extract → review → commit) ───────────
  // Only offered on the "new order" screen. Staging + extraction pre-fill the
  // same manual form below so the operator reviews/edits using the existing
  // field-by-field UI rather than a separate preview screen.
  const stageIntake = useStageOrderIntakeDocumentMutation();
  const verifyIntake = useVerifyOrderIntakePendingMutation();
  const commitIntake = useCommitOrderIntakePendingMutation();
  const cancelIntake = useCancelOrderIntakePendingMutation();
  const [intakeFile, setIntakeFile] = useState<File | null>(null);
  const [intakeError, setIntakeError] = useState("");
  const [pendingUpload, setPendingUpload] = useState<{ pendingId: string; originalFilename: string } | null>(null);
  const [unrecognizedLines, setUnrecognizedLines] = useState<string[]>([]);
  const isExtracting = stageIntake.isPending || verifyIntake.isPending;

  async function handleUploadIntakeDocument() {
    if (!intakeFile) return;
    setIntakeError("");
    try {
      const staged = await stageIntake.mutateAsync({ file: intakeFile });
      const result = await verifyIntake.mutateAsync(staged.pendingId);
      setPendingUpload({ pendingId: staged.pendingId, originalFilename: staged.originalFilename });
      setUnrecognizedLines(result.unrecognizedLines);
      setForm((s) => applyExtractedFieldsToForm(s, result.fields));
      setIntakeFile(null);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setIntakeError(message ?? copy({ en: "Could not extract this document.", vi: "Không trích xuất được tài liệu này." }));
    }
  }

  function handleCancelIntake() {
    if (pendingUpload) cancelIntake.mutate(pendingUpload.pendingId);
    setPendingUpload(null);
    setUnrecognizedLines([]);
    setIntakeFile(null);
    setIntakeError("");
    setForm(emptyOrderForm);
  }

  useEffect(() => {
    if (isNew) {
      setForm(emptyOrderForm);
      setPendingUpload(null);
      setUnrecognizedLines([]);
      return;
    }
    if (orderQuery.data) {
      setForm(orderToForm(orderQuery.data));
    }
  }, [isNew, orderQuery.data]);

  const savedForm = useMemo(() => (orderQuery.data ? orderToForm(orderQuery.data) : emptyOrderForm), [orderQuery.data]);
  const dirty = isNew || JSON.stringify(form) !== JSON.stringify(savedForm);
  const canSubmit = canManageOrders && form.name.trim().length > 0 && dirty;
  const pending = createOrder.isPending || updateOrder.isPending || commitIntake.isPending;
  const orderPayload = buildOrderPayload(form);

  function submitOrder() {
    if (!canSubmit || pending) return;
    if (isNew && pendingUpload) {
      commitIntake.mutate(
        { pendingId: pendingUpload.pendingId, payload: { ...orderPayload, name: form.name.trim() } },
        { onSuccess: (created) => navigate(`/orders/${created.id}`) },
      );
      return;
    }
    if (isNew) {
      createOrder.mutate(
        { ...orderPayload, name: form.name.trim() },
        { onSuccess: (created) => navigate(`/orders/${created.id}`) },
      );
      return;
    }
    if (!orderId) return;
    updateOrder.mutate({ id: orderId, patch: orderPayload });
  }

  if (!isNew && orderQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title={<UiText id="orders.detail.loading" />} />
      </div>
    );
  }

  if (!isNew && !orderQuery.data) {
    return (
      <EmptyState
        title={<UiText id="orders.detail.not-found.title" />}
        description={<UiText id="orders.detail.not-found.desc" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={<UiText id="orders.detail.eyebrow" />}
        title={isNew ? <UiText id="orders.detail.new-title" /> : form.name || <UiText id="orders.detail.eyebrow" />}
        description={<UiText id="orders.detail.desc" />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/orders" className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 no-underline hover:bg-slate-50">
              <UiText id="orders.detail.back" />
            </Link>
            {!canManageOrders ? <Badge tone="neutral">{copy({ en: "Read only", vi: "Chỉ xem" })}</Badge> : null}
          </div>
        }
      />

      {!isNew && orderId ? (
        <OrderLinkedCandidates orderId={orderId} cancelling={form.recruitmentStatus === "cancelled"} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title={<UiText id="orders.requirement.title" />}
          subtitle={<UiText id="orders.requirement.subtitle" />}
        >
          {isNew ? (
            <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
              <div className="text-sm font-semibold text-indigo-900">
                {copy({ en: "Upload order document to auto-fill", vi: "Tải lên tài liệu đơn hàng để tự động điền" })}
              </div>
              <p className="mt-1 text-xs text-indigo-800/80">
                {copy({
                  en: "Upload the per-order spec .docx — fields below will be pre-filled from it for you to review and correct before creating the order.",
                  vi: "Tải lên file .docx thông tin chi tiết đơn hàng — các trường bên dưới sẽ được điền sẵn để bạn kiểm tra và sửa trước khi tạo đơn.",
                })}
              </p>
              {pendingUpload ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Badge tone="success">{pendingUpload.originalFilename}</Badge>
                  <span className="text-xs text-indigo-800">
                    {copy({ en: "Fields below have been pre-filled — review before creating.", vi: "Các trường bên dưới đã được điền sẵn — hãy kiểm tra trước khi tạo." })}
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleCancelIntake} disabled={cancelIntake.isPending}>
                    {copy({ en: "Start over", vi: "Làm lại từ đầu" })}
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setIntakeFile(e.target.files?.[0] ?? null)}
                    className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <Button onClick={handleUploadIntakeDocument} disabled={!intakeFile || isExtracting}>
                    {isExtracting ? copy({ en: "Extracting...", vi: "Đang trích xuất..." }) : copy({ en: "Extract fields", vi: "Trích xuất dữ liệu" })}
                  </Button>
                  {intakeError ? <span className="text-sm text-red-600">{intakeError}</span> : null}
                </div>
              )}
              {unrecognizedLines.length > 0 ? (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="font-semibold">
                    {copy({ en: "Could not parse these lines — check manually:", vi: "Không trích xuất được các dòng sau — vui lòng kiểm tra thủ công:" })}
                  </div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {unrecognizedLines.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <FieldGroup columns={3}>
            <Input label={copy({ en: "Order name", vi: "Tên đơn" })} value={form.name} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <Input label={copy({ en: "Region", vi: "Khu vực" })} value={form.region} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))} />
            <Input label={copy({ en: "Industry", vi: "Ngành" })} value={form.industry} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, industry: e.target.value }))} />
            <Select label={copy({ en: "Gender requirement", vi: "Yêu cầu giới tính" })} value={form.genderRequired} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, genderRequired: e.target.value as OrderFormState["genderRequired"] }))}>
              <option value="both">{copy({ en: "Both", vi: "Cả nam và nữ" })}</option>
              <option value="male">{copy({ en: "Male", vi: "Nam" })}</option>
              <option value="female">{copy({ en: "Female", vi: "Nữ" })}</option>
            </Select>
            <Input label={copy({ en: "Minimum age", vi: "Tuổi tối thiểu" })} type="number" min={0} value={form.ageMin} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, ageMin: e.target.value }))} />
            <Input label={copy({ en: "Maximum age", vi: "Tuổi tối đa" })} type="number" min={0} value={form.ageMax} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, ageMax: e.target.value }))} />
            <Input label={copy({ en: "Minimum height (cm)", vi: "Chiều cao tối thiểu (cm)" })} type="number" min={0} value={form.heightMin} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, heightMin: e.target.value }))} />
            <Select label={copy({ en: "Accepts returnees", vi: "Nhận lao động đi về" })} value={form.acceptsReturnees} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, acceptsReturnees: e.target.value as OrderFormState["acceptsReturnees"] }))}>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
              <option value="true">{copy({ en: "Accepted", vi: "Nhận" })}</option>
              <option value="false">{copy({ en: "Not accepted", vi: "Không nhận" })}</option>
            </Select>
            <Select label={copy({ en: "Requires experience", vi: "Yêu cầu kinh nghiệm" })} value={form.experienceRequired} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, experienceRequired: e.target.value as OrderFormState["experienceRequired"] }))}>
              <option value="true">{copy({ en: "Required", vi: "Bắt buộc" })}</option>
              <option value="false">{copy({ en: "Not required", vi: "Không bắt buộc" })}</option>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
            </Select>
            <Input label={copy({ en: "Salary range", vi: "Mức lương" })} value={form.salaryRange} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, salaryRange: e.target.value }))} />
            <Select label={copy({ en: "Recruitment status", vi: "Trạng thái tuyển dụng" })} value={form.recruitmentStatus} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, recruitmentStatus: e.target.value as OrderFormState["recruitmentStatus"] }))}>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
              <option value="recruiting">{copy({ en: "Recruiting", vi: "Đang tuyển" })}</option>
              <option value="recruitment_complete">{copy({ en: "Recruitment complete", vi: "Đã tuyển xong" })}</option>
              <option value="cancelled">{copy({ en: "Cancelled", vi: "Đã hủy" })}</option>
            </Select>
          </FieldGroup>

          <FieldGroup className="mt-4" columns={2}>
            <Input label={copy({ en: "Description", vi: "Mô tả" })} value={form.description} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            <Input label={copy({ en: "Requirement notes", vi: "Ghi chú yêu cầu" })} value={form.requirements} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, requirements: e.target.value }))} />
          </FieldGroup>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {copy({ en: "Order intake", vi: "Tiếp nhận đơn hàng" })}
          </h3>
          <FieldGroup className="mt-2" columns={3}>
            <Input label={copy({ en: "Agent / broker", vi: "Môi giới" })} value={form.agentName} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, agentName: e.target.value }))} />
            <Input label={copy({ en: "Date received", vi: "Ngày nhận đơn" })} type="date" value={form.dateReceived} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, dateReceived: e.target.value }))} />
            <Input label={copy({ en: "Quantity", vi: "Số lượng" })} type="number" min={0} value={form.quantity} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))} />
          </FieldGroup>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {copy({ en: "Employer / factory", vi: "Chủ sử dụng / Nhà máy" })}
          </h3>
          <FieldGroup className="mt-2" columns={3}>
            <Input label={copy({ en: "Factory address", vi: "Địa chỉ nhà máy" })} value={form.factoryAddress} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, factoryAddress: e.target.value }))} />
            <Input label={copy({ en: "Factory name (local)", vi: "Tên nhà máy (bản địa)" })} value={form.factoryNameLocal} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, factoryNameLocal: e.target.value }))} />
            <Input label={copy({ en: "Reference website", vi: "Website tham khảo" })} value={form.referenceWebsite} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, referenceWebsite: e.target.value }))} />
            <Select label={copy({ en: "Has Vietnamese workers already", vi: "Đã có lao động Việt Nam" })} value={form.existingVnWorkers} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, existingVnWorkers: e.target.value as OrderFormState["existingVnWorkers"] }))}>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
              <option value="true">{copy({ en: "Yes", vi: "Có" })}</option>
              <option value="false">{copy({ en: "No", vi: "Không" })}</option>
            </Select>
            <Input label={copy({ en: "Work shift pattern", vi: "Chế độ ca làm việc" })} value={form.workShiftPattern} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, workShiftPattern: e.target.value }))} />
          </FieldGroup>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {copy({ en: "Benefits", vi: "Chế độ phúc lợi" })}
          </h3>
          <FieldGroup className="mt-2" columns={2}>
            <Input label={copy({ en: "Housing / meals", vi: "Ăn ở" })} value={form.housingMealsInfo} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, housingMealsInfo: e.target.value }))} />
            <Input label={copy({ en: "Overtime", vi: "Tăng ca" })} value={form.overtimeInfo} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, overtimeInfo: e.target.value }))} />
          </FieldGroup>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {copy({ en: "Candidate criteria & process", vi: "Điều kiện tuyển & quy trình" })}
          </h3>
          <FieldGroup className="mt-2" columns={3}>
            <Input label={copy({ en: "Minimum weight (kg)", vi: "Cân nặng tối thiểu (kg)" })} type="number" min={0} value={form.weightMin} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, weightMin: e.target.value }))} />
            <Input label={copy({ en: "Education level", vi: "Trình độ" })} value={form.educationLevel} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, educationLevel: e.target.value }))} />
            <Select label={copy({ en: "Marital status requirement", vi: "Yêu cầu hôn nhân" })} value={form.maritalStatusRequired} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, maritalStatusRequired: e.target.value as OrderFormState["maritalStatusRequired"] }))}>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
              <option value="any">{copy({ en: "Any", vi: "Không yêu cầu" })}</option>
              <option value="single">{copy({ en: "Single", vi: "Độc thân" })}</option>
              <option value="married">{copy({ en: "Married", vi: "Đã kết hôn" })}</option>
              <option value="married_with_children">{copy({ en: "Married with children", vi: "Đã kết hôn và có con" })}</option>
            </Select>
            <Input label={copy({ en: "Selection method", vi: "Hình thức tuyển chọn" })} value={form.selectionMethod} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, selectionMethod: e.target.value }))} />
            <Input label={copy({ en: "Expected departure", vi: "Dự kiến xuất cảnh" })} value={form.expectedDeparture} disabled={!canManageOrders} onChange={(e) => setForm((s) => ({ ...s, expectedDeparture: e.target.value }))} />
            <Input
              label={copy({ en: "Excluded candidate regions", vi: "Khu vực ứng viên không nhận" })}
              hint={copy({ en: "Comma-separated, e.g. Miền Trung, Nghệ An", vi: "Cách nhau bằng dấu phẩy, VD: Miền Trung, Nghệ An" })}
              value={form.excludedCandidateRegions}
              disabled={!canManageOrders}
              onChange={(e) => setForm((s) => ({ ...s, excludedCandidateRegions: e.target.value }))}
            />
          </FieldGroup>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={submitOrder} disabled={!canSubmit || pending}>
              {pending
                ? copy({ en: "Saving...", vi: "Đang lưu..." })
                : isNew
                  ? copy({ en: "Create order", vi: "Tạo đơn" })
                  : copy({ en: "Save order changes", vi: "Lưu thay đổi đơn" })}
            </Button>
            <Button variant="secondary" onClick={() => setForm(isNew ? emptyOrderForm : savedForm)} disabled={pending || !dirty}>
              {copy({ en: "Reset changes", vi: "Đặt lại thay đổi" })}
            </Button>
            {!form.name.trim() ? <span className="text-sm text-rose-600">{copy({ en: "Order name is required.", vi: "Tên đơn là bắt buộc." })}</span> : null}
            {!dirty && !isNew ? <span className="text-sm text-slate-500">{copy({ en: "No unsaved changes.", vi: "Không có thay đổi chưa lưu." })}</span> : null}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel
            title={<UiText id="orders.summary.title" />}
            subtitle={<UiText id="orders.summary.subtitle" />}
          >
            <div className="space-y-3">
              <InfoCard label={copy({ en: "Region", vi: "Khu vực" })} value={form.region || copy({ en: "Not set", vi: "Chưa đặt" })} className="bg-slate-50" />
              <InfoCard label={copy({ en: "Industry", vi: "Ngành" })} value={form.industry || copy({ en: "Not set", vi: "Chưa đặt" })} className="bg-slate-50" />
              <InfoCard label={copy({ en: "Age", vi: "Tuổi" })} value={form.ageMin || form.ageMax ? `${form.ageMin || "?"}-${form.ageMax || "?"}` : copy({ en: "Not set", vi: "Chưa đặt" })} className="bg-slate-50" />
              <InfoCard label={copy({ en: "Height", vi: "Chiều cao" })} value={form.heightMin ? `${form.heightMin} cm+` : copy({ en: "Not set", vi: "Chưa đặt" })} className="bg-slate-50" />
            </div>
          </Panel>

          {!isNew && orderQuery.data ? <ReadOnlyMetadata order={orderQuery.data} copy={copy} /> : null}
        </div>
      </div>

      {!isNew && orderId ? <OrderDocumentsPanel orderId={orderId} canManageOrders={canManageOrders} copy={copy} formatDocumentType={formatDocumentType} formatDocumentStatus={formatDocumentStatus} /> : null}
    </div>
  );
}

function ReadOnlyMetadata(props: { order: Order; copy: (value: { en: string; vi: string }) => string }) {
  return (
    <Panel title={<UiText id="orders.stored-record.title" />}>
      <DescriptionList
        items={[
          { label: props.copy({ en: "Order ID", vi: "Order ID" }), value: props.order.id },
          { label: props.copy({ en: "Gender", vi: "Giới tính" }), value: props.order.genderRequired },
          { label: props.copy({ en: "Experience required", vi: "Yêu cầu kinh nghiệm" }), value: props.order.experienceRequired ? props.copy({ en: "Yes", vi: "Có" }) : props.copy({ en: "No", vi: "Không" }) },
        ]}
      />
    </Panel>
  );
}

const ORDER_DOC_TYPES = ["other", "work_permit", "diploma"] as const;
const ORDER_DOCS_PAGE_SIZE = 20;

function OrderDocumentsPanel(props: {
  orderId: string;
  canManageOrders: boolean;
  copy: (value: { en: string; vi: string }) => string;
  formatDocumentType: (value: string) => string;
  formatDocumentStatus: (value: string) => string;
}) {
  const { copy, formatDocumentType, formatDocumentStatus } = props;
  const [offset, setOffset] = useState(0);
  const docsQuery = useOrderDocumentsQuery(props.orderId, { offset, limit: ORDER_DOCS_PAGE_SIZE });
  const uploadDoc = useUploadOrderDocumentMutation();
  const deleteDoc = useDeleteOrderDocumentMutation();
  const [addDocType, setAddDocType] = useState("other");
  const [addIssueDate, setAddIssueDate] = useState("");
  const [addExpiryDate, setAddExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const docs: DocumentRecord[] = docsQuery.data?.data ?? [];
  const total = docsQuery.data?.total ?? 0;

  function handleUpload() {
    if (!props.canManageOrders || !file) return;
    setUploadError("");
    uploadDoc.mutate(
      { orderId: props.orderId, file, docType: addDocType, issueDate: addIssueDate || undefined, expiryDate: addExpiryDate || undefined },
      {
        onSuccess: () => { setFile(null); setAddIssueDate(""); setAddExpiryDate(""); setOffset(0); },
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setUploadError(message ?? copy({ en: "Upload failed.", vi: "Tải lên thất bại." }));
        },
      },
    );
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    deleteDoc.mutate(
      { id: deleteTarget.id, orderId: props.orderId },
      {
        onSuccess: () => setDeleteTarget(null),
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setDeleteError(message ?? copy({ en: "Delete failed.", vi: "Xoá thất bại." }));
        },
      },
    );
  }

  async function handleOpen(doc: DocumentRecord) {
    setOpeningId(doc.id);
    try {
      const { url, isObjectUrl } = await apiClient.getDocumentUrl(doc.id);
      window.open(url, "_blank", "noopener,noreferrer");
      if (isObjectUrl) window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      setUploadError(copy({ en: "Could not open this file.", vi: "Không mở được file này." }));
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <Panel
      title={copy({ en: "Order documents", vi: "Tài liệu đơn hàng" })}
      subtitle={copy({ en: "Contracts and supporting files for this order.", vi: "Hợp đồng và tài liệu liên quan đến đơn hàng." })}
    >
      {docs.length > 0 ? (
        <div className="mb-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {docs.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">{formatDocumentType(doc.docType)}</span>
              <Badge tone="neutral">{formatDocumentStatus(doc.status)}</Badge>
              {doc.issueDate ? <span className="text-slate-500">{copy({ en: "Issued", vi: "Phát hành" })}: {doc.issueDate}</span> : null}
              {doc.expiryDate ? <span className="text-slate-500">{copy({ en: "Expires", vi: "Hết hạn" })}: {doc.expiryDate}</span> : null}
              <div className="ml-auto flex items-center gap-3">
                {doc.fileUrl || doc.fileKey ? (
                  <button
                    type="button"
                    className="font-semibold text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-700 disabled:opacity-50"
                    onClick={() => handleOpen(doc)}
                    disabled={openingId === doc.id}
                  >
                    {openingId === doc.id ? copy({ en: "Opening...", vi: "Đang mở..." }) : copy({ en: "Open file", vi: "Mở file" })}
                  </button>
                ) : null}
                {props.canManageOrders ? (
                  <button
                    type="button"
                    className="font-semibold text-red-600 underline decoration-red-300 underline-offset-4 hover:text-red-700"
                    onClick={() => { setDeleteError(""); setDeleteTarget(doc); }}
                  >
                    {copy({ en: "Delete", vi: "Xoá" })}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-500">{copy({ en: "No documents yet.", vi: "Chưa có tài liệu." })}</p>
      )}

      {total > ORDER_DOCS_PAGE_SIZE ? (
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            {copy({ en: "Showing", vi: "Hiển thị" })} {docs.length ? offset + 1 : 0}–{offset + docs.length} {copy({ en: "of", vi: "trong" })} {total}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - ORDER_DOCS_PAGE_SIZE))}>
              {copy({ en: "Prev", vi: "Trước" })}
            </Button>
            <Button variant="secondary" size="sm" disabled={offset + ORDER_DOCS_PAGE_SIZE >= total} onClick={() => setOffset(offset + ORDER_DOCS_PAGE_SIZE)}>
              {copy({ en: "Next", vi: "Sau" })}
            </Button>
          </div>
        </div>
      ) : null}

      {props.canManageOrders ? (
        <>
          <FieldGroup columns={4}>
            <Select label={copy({ en: "Document type", vi: "Loại tài liệu" })} value={addDocType} onChange={(e) => setAddDocType(e.target.value)}>
              {ORDER_DOC_TYPES.map((t) => (
                <option key={t} value={t}>{formatDocumentType(t)}</option>
              ))}
            </Select>
            <Input label={copy({ en: "Issue date", vi: "Ngày phát hành" })} type="date" value={addIssueDate} onChange={(e) => setAddIssueDate(e.target.value)} />
            <Input label={copy({ en: "Expiry date", vi: "Ngày hết hạn" })} type="date" value={addExpiryDate} onChange={(e) => setAddExpiryDate(e.target.value)} />
            <div className="flex flex-col justify-end gap-1">
              <label className="text-xs font-medium text-slate-600">{copy({ en: "File", vi: "Tệp" })}</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>
          </FieldGroup>
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={handleUpload} disabled={!file || uploadDoc.isPending}>
              {uploadDoc.isPending ? copy({ en: "Uploading...", vi: "Đang tải lên..." }) : copy({ en: "Upload document", vi: "Tải lên tài liệu" })}
            </Button>
            {uploadError ? <span className="text-sm text-red-600">{uploadError}</span> : null}
          </div>
        </>
      ) : null}

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title={copy({ en: "Delete document?", vi: "Xoá tài liệu?" })}
        description={copy({
          en: "This permanently removes the file and its record. This cannot be undone.",
          vi: "Thao tác này sẽ xoá vĩnh viễn tệp và bản ghi. Không thể hoàn tác.",
        })}
        details={deleteTarget ? [{ label: copy({ en: "Type", vi: "Loại" }), value: formatDocumentType(deleteTarget.docType) }] : []}
        warning={deleteError || undefined}
        confirmLabel={copy({ en: "Delete", vi: "Xoá" })}
        cancelLabel={copy({ en: "Cancel", vi: "Hủy" })}
        pendingLabel={copy({ en: "Deleting...", vi: "Đang xoá..." })}
        isPending={deleteDoc.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Panel>
  );
}

/**
 * Merges deterministically extracted order-document fields into the current
 * form state. Only overwrites keys the extractor actually matched (undefined
 * fields are left as whatever the operator already had) — see
 * OrderDocExtractionService on the backend for what "matched" means and why
 * unmatched sections are surfaced separately rather than guessed.
 *
 * Fields the source document never carries — region, agentName, dateReceived,
 * acceptsReturnees, recruitmentStatus, excludedCandidateRegions — are left
 * untouched; those come from the order register (xlsx) or operator judgment,
 * not the per-order spec document.
 */
function applyExtractedFieldsToForm(current: OrderFormState, fields: OrderDocExtractedFields): OrderFormState {
  const next = { ...current };
  if (fields.name !== undefined) next.name = fields.name;
  if (fields.factoryNameLocal !== undefined) next.factoryNameLocal = fields.factoryNameLocal;
  if (fields.factoryAddress !== undefined) next.factoryAddress = fields.factoryAddress;
  if (fields.industry !== undefined) next.industry = fields.industry;
  if (fields.referenceWebsite !== undefined) next.referenceWebsite = fields.referenceWebsite;
  if (fields.description !== undefined) next.description = fields.description;
  if (fields.existingVnWorkers !== undefined) next.existingVnWorkers = String(fields.existingVnWorkers) as OrderFormState["existingVnWorkers"];
  if (fields.salaryRange !== undefined) next.salaryRange = fields.salaryRange;
  if (fields.workShiftPattern !== undefined) next.workShiftPattern = fields.workShiftPattern;
  if (fields.housingMealsInfo !== undefined) next.housingMealsInfo = fields.housingMealsInfo;
  if (fields.overtimeInfo !== undefined) next.overtimeInfo = fields.overtimeInfo;
  if (fields.quantity !== undefined) next.quantity = String(fields.quantity);
  if (fields.genderRequired !== undefined) next.genderRequired = fields.genderRequired;
  if (fields.ageMin !== undefined) next.ageMin = String(fields.ageMin);
  if (fields.ageMax !== undefined) next.ageMax = String(fields.ageMax);
  if (fields.maritalStatusRequired !== undefined) next.maritalStatusRequired = fields.maritalStatusRequired;
  if (fields.heightMin !== undefined) next.heightMin = String(fields.heightMin);
  if (fields.weightMin !== undefined) next.weightMin = String(fields.weightMin);
  if (fields.educationLevel !== undefined) next.educationLevel = fields.educationLevel;
  if (fields.requirements !== undefined) next.requirements = fields.requirements;
  if (fields.selectionMethod !== undefined) next.selectionMethod = fields.selectionMethod;
  if (fields.expectedDeparture !== undefined) next.expectedDeparture = fields.expectedDeparture;
  return next;
}

function orderToForm(order: Order): OrderFormState {
  return {
    name: order.name ?? "",
    description: order.description ?? "",
    region: order.region ?? "",
    industry: order.industry ?? "",
    salaryRange: order.salaryRange ?? "",
    requirements: order.requirements ?? "",
    genderRequired: normalizeGender(order.genderRequired),
    ageMin: order.ageRange?.min != null ? String(order.ageRange.min) : "",
    ageMax: order.ageRange?.max != null ? String(order.ageRange.max) : "",
    heightMin: order.heightMin != null ? String(order.heightMin) : "",
    acceptsReturnees: typeof order.acceptsReturnees === "boolean" ? String(order.acceptsReturnees) as OrderFormState["acceptsReturnees"] : "",
    experienceRequired: typeof order.experienceRequired === "boolean" ? String(order.experienceRequired) as OrderFormState["experienceRequired"] : "",
    recruitmentStatus: order.recruitmentStatus ?? "",
    agentName: order.agentName ?? "",
    dateReceived: order.dateReceived ?? "",
    quantity: order.quantity != null ? String(order.quantity) : "",
    factoryAddress: order.factoryAddress ?? "",
    factoryNameLocal: order.factoryNameLocal ?? "",
    referenceWebsite: order.referenceWebsite ?? "",
    existingVnWorkers: typeof order.existingVnWorkers === "boolean" ? String(order.existingVnWorkers) as OrderFormState["existingVnWorkers"] : "",
    workShiftPattern: order.workShiftPattern ?? "",
    housingMealsInfo: order.housingMealsInfo ?? "",
    overtimeInfo: order.overtimeInfo ?? "",
    weightMin: order.weightMin != null ? String(order.weightMin) : "",
    educationLevel: order.educationLevel ?? "",
    maritalStatusRequired: order.maritalStatusRequired ?? "",
    selectionMethod: order.selectionMethod ?? "",
    expectedDeparture: order.expectedDeparture ?? "",
    excludedCandidateRegions: (order.excludedCandidateRegions ?? []).join(", "),
  };
}

function normalizeGender(value: string): OrderFormState["genderRequired"] {
  return value === "male" || value === "female" || value === "both" ? value : "both";
}

function buildOrderPayload(form: OrderFormState): OrderMutationPayload {
  const ageMin = parseOptionalNumber(form.ageMin);
  const ageMax = parseOptionalNumber(form.ageMax);

  return {
    name: form.name.trim(),
    description: optionalText(form.description),
    region: optionalText(form.region),
    industry: optionalText(form.industry),
    salaryRange: optionalText(form.salaryRange),
    requirements: optionalText(form.requirements),
    genderRequired: form.genderRequired,
    ageRange: ageMin != null && ageMax != null ? { min: ageMin, max: ageMax } : null,
    heightMin: parseOptionalNumber(form.heightMin),
    acceptsReturnees: parseOptionalBoolean(form.acceptsReturnees),
    experienceRequired: parseOptionalBoolean(form.experienceRequired) ?? false,
    recruitmentStatus: (form.recruitmentStatus as OrderRecruitmentStatus) || null,
    agentName: optionalText(form.agentName),
    dateReceived: optionalText(form.dateReceived),
    quantity: parseOptionalNumber(form.quantity),
    factoryAddress: optionalText(form.factoryAddress),
    factoryNameLocal: optionalText(form.factoryNameLocal),
    referenceWebsite: optionalText(form.referenceWebsite),
    existingVnWorkers: parseOptionalBoolean(form.existingVnWorkers),
    workShiftPattern: optionalText(form.workShiftPattern),
    housingMealsInfo: optionalText(form.housingMealsInfo),
    overtimeInfo: optionalText(form.overtimeInfo),
    weightMin: parseOptionalNumber(form.weightMin),
    educationLevel: optionalText(form.educationLevel),
    maritalStatusRequired: (form.maritalStatusRequired as OrderMaritalStatusRequired) || null,
    selectionMethod: optionalText(form.selectionMethod),
    expectedDeparture: optionalText(form.expectedDeparture),
    excludedCandidateRegions: parseOptionalStringList(form.excludedCandidateRegions),
  };
}

function parseOptionalStringList(value: string): string[] | null {
  const items = value.split(",").map((v) => v.trim()).filter(Boolean);
  return items.length ? items : null;
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalBoolean(value: "" | "true" | "false") {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
