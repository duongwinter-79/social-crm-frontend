import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, DescriptionList, EmptyState, FieldGroup, InfoCard, Input, Panel, SectionHeader, Select } from "@social-crm/ui";
import {
  apiClient,
  useCreateOrderMutation,
  useDeleteOrderDocumentMutation,
  useOrderDetailQuery,
  useOrderDocumentsQuery,
  usePermissions,
  useUpdateOrderMutation,
  useUploadOrderDocumentMutation,
  type DocumentRecord,
  type Order,
  type OrderMutationPayload,
  type OrderRecruitmentStatus,
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import { UiText } from "@/ui-text/ui-text";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

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
};

export function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { copy, formatDocumentType, formatDocumentStatus } = useI18n();
  const { isAdmin } = usePermissions();
  const isNew = orderId === "new";

  useEffect(() => {
    if (isNew && !isAdmin) navigate("/orders", { replace: true });
  }, [isNew, isAdmin, navigate]);
  const orderQuery = useOrderDetailQuery(isNew ? undefined : orderId);
  const createOrder = useCreateOrderMutation();
  const updateOrder = useUpdateOrderMutation();
  const [form, setForm] = useState<OrderFormState>(emptyOrderForm);

  useEffect(() => {
    if (isNew) {
      setForm(emptyOrderForm);
      return;
    }
    if (orderQuery.data) {
      setForm(orderToForm(orderQuery.data));
    }
  }, [isNew, orderQuery.data]);

  const savedForm = useMemo(() => (orderQuery.data ? orderToForm(orderQuery.data) : emptyOrderForm), [orderQuery.data]);
  const dirty = isNew || JSON.stringify(form) !== JSON.stringify(savedForm);
  const canSubmit = isAdmin && form.name.trim().length > 0 && dirty;
  const pending = createOrder.isPending || updateOrder.isPending;
  const orderPayload = buildOrderPayload(form);

  function submitOrder() {
    if (!canSubmit || pending) return;
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
            {!isAdmin ? <Badge tone="neutral">{copy({ en: "Read only", vi: "Chỉ xem" })}</Badge> : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title={<UiText id="orders.requirement.title" />}
          subtitle={<UiText id="orders.requirement.subtitle" />}
        >
          <FieldGroup columns={3}>
            <Input label={copy({ en: "Order name", vi: "Tên đơn" })} value={form.name} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <Input label={copy({ en: "Region", vi: "Khu vực" })} value={form.region} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))} />
            <Input label={copy({ en: "Industry", vi: "Ngành" })} value={form.industry} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, industry: e.target.value }))} />
            <Select label={copy({ en: "Gender requirement", vi: "Yêu cầu giới tính" })} value={form.genderRequired} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, genderRequired: e.target.value as OrderFormState["genderRequired"] }))}>
              <option value="both">{copy({ en: "Both", vi: "Cả nam và nữ" })}</option>
              <option value="male">{copy({ en: "Male", vi: "Nam" })}</option>
              <option value="female">{copy({ en: "Female", vi: "Nữ" })}</option>
            </Select>
            <Input label={copy({ en: "Minimum age", vi: "Tuổi tối thiểu" })} type="number" min={0} value={form.ageMin} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, ageMin: e.target.value }))} />
            <Input label={copy({ en: "Maximum age", vi: "Tuổi tối đa" })} type="number" min={0} value={form.ageMax} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, ageMax: e.target.value }))} />
            <Input label={copy({ en: "Minimum height (cm)", vi: "Chiều cao tối thiểu (cm)" })} type="number" min={0} value={form.heightMin} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, heightMin: e.target.value }))} />
            <Select label={copy({ en: "Accepts returnees", vi: "Nhận lao động đi về" })} value={form.acceptsReturnees} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, acceptsReturnees: e.target.value as OrderFormState["acceptsReturnees"] }))}>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
              <option value="true">{copy({ en: "Accepted", vi: "Nhận" })}</option>
              <option value="false">{copy({ en: "Not accepted", vi: "Không nhận" })}</option>
            </Select>
            <Select label={copy({ en: "Requires experience", vi: "Yêu cầu kinh nghiệm" })} value={form.experienceRequired} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, experienceRequired: e.target.value as OrderFormState["experienceRequired"] }))}>
              <option value="true">{copy({ en: "Required", vi: "Bắt buộc" })}</option>
              <option value="false">{copy({ en: "Not required", vi: "Không bắt buộc" })}</option>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
            </Select>
            <Input label={copy({ en: "Salary range", vi: "Mức lương" })} value={form.salaryRange} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, salaryRange: e.target.value }))} />
            <Select label={copy({ en: "Recruitment status", vi: "Trạng thái tuyển dụng" })} value={form.recruitmentStatus} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, recruitmentStatus: e.target.value as OrderFormState["recruitmentStatus"] }))}>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
              <option value="recruiting">{copy({ en: "Recruiting", vi: "Đang tuyển" })}</option>
              <option value="recruitment_complete">{copy({ en: "Recruitment complete", vi: "Đã tuyển xong" })}</option>
            </Select>
          </FieldGroup>

          <FieldGroup className="mt-4" columns={2}>
            <Input label={copy({ en: "Description", vi: "Mô tả" })} value={form.description} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            <Input label={copy({ en: "Requirement notes", vi: "Ghi chú yêu cầu" })} value={form.requirements} disabled={!isAdmin} onChange={(e) => setForm((s) => ({ ...s, requirements: e.target.value }))} />
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

      {!isNew && orderId ? <OrderDocumentsPanel orderId={orderId} isAdmin={isAdmin} copy={copy} formatDocumentType={formatDocumentType} formatDocumentStatus={formatDocumentStatus} /> : null}
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
  isAdmin: boolean;
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
    if (!props.isAdmin || !file) return;
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
                {props.isAdmin ? (
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

      {props.isAdmin ? (
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
  };
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
