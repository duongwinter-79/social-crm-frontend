import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, DescriptionList, EmptyState, FieldGroup, InfoCard, Input, Panel, SectionHeader, Select } from "@social-crm/ui";
import {
  useCreateOrderMutation,
  useOrderDetailQuery,
  useSessionStore,
  useUpdateOrderMutation,
  type Order,
  type OrderMutationPayload,
} from "@social-crm/api";
import { useI18n } from "@/i18n";

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
};

export function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { copy } = useI18n();
  const user = useSessionStore((state) => state.user);
  const isAdmin = user?.roles?.includes("admin") ?? false;
  const isNew = orderId === "new";
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
        <SectionHeader title={copy({ en: "Loading order", vi: "Đang tải đơn hàng" })} />
      </div>
    );
  }

  if (!isNew && !orderQuery.data) {
    return (
      <EmptyState
        title={copy({ en: "Order not found", vi: "Không tìm thấy đơn hàng" })}
        description={copy({
          en: "The order may have been removed or the backend did not return it.",
          vi: "Đơn hàng có thể đã bị xoá hoặc backend không trả về dữ liệu.",
        })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Order detail", vi: "Chi tiết đơn hàng" })}
        title={isNew ? copy({ en: "New order", vi: "Tạo đơn hàng" }) : form.name || copy({ en: "Order detail", vi: "Chi tiết đơn hàng" })}
        description={copy({
          en: "View and maintain the requirement profile used by matching and application creation.",
          vi: "Xem và chỉnh hồ sơ yêu cầu dùng cho ghép đơn và tạo ứng tuyển.",
        })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/orders" className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 no-underline hover:bg-slate-50">
              {copy({ en: "Back to orders", vi: "Về danh sách đơn" })}
            </Link>
            {!isAdmin ? <Badge tone="neutral">{copy({ en: "Read only", vi: "Chỉ xem" })}</Badge> : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title={copy({ en: "Requirement profile", vi: "Hồ sơ yêu cầu" })}
          subtitle={copy({
            en: "Keep this page focused on real order data. Empty fields are saved as unset.",
            vi: "Màn hình này chỉ chỉnh dữ liệu thật của đơn hàng. Trường trống sẽ được lưu là chưa đặt.",
          })}
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
            title={copy({ en: "Order summary", vi: "Tóm tắt đơn hàng" })}
            subtitle={copy({
              en: "Fast read-only view of the fields that matter during matching.",
              vi: "Tóm tắt nhanh các trường quan trọng khi ghép đơn.",
            })}
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
    </div>
  );
}

function ReadOnlyMetadata(props: { order: Order; copy: (value: { en: string; vi: string }) => string }) {
  return (
    <Panel title={props.copy({ en: "Stored record", vi: "Bản ghi đã lưu" })}>
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
