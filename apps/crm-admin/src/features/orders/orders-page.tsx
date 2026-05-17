import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, FieldGroup, InfoCard, Input, MetricCard, Panel, SectionHeader, Select, Toolbar } from "@social-crm/ui";
import {
  apiClient,
  triggerBlobDownload,
  useCreateOrderMutation,
  useLeadsQuery,
  useMatchingEvaluationMutation,
  useOrdersQuery,
  useSessionStore,
  useUpdateOrderMutation,
  type Order,
  type OrderMutationPayload
} from "@social-crm/api";
import { useI18n } from "@/i18n";

type OrderEditorMode = "create" | "edit";

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
  experienceRequired: "false"
};

export function OrdersPage() {
  const { copy, formatLeadStatus, lang } = useI18n();
  const user = useSessionStore((state) => state.user);
  const ordersQuery = useOrdersQuery();
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { blob, filename } = await apiClient.exportOrdersCsv({ lang });
      triggerBlobDownload(blob, filename);
    } finally {
      setIsExporting(false);
    }
  };
  const leadsQuery = useLeadsQuery({ offset: 0, limit: 50 });
  const evaluation = useMatchingEvaluationMutation();
  const createOrder = useCreateOrderMutation();
  const updateOrder = useUpdateOrderMutation();
  const isAdmin = user?.roles?.includes("admin") ?? false;

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedLeadByOrder, setSelectedLeadByOrder] = useState<Record<string, string>>({});
  const [editorMode, setEditorMode] = useState<OrderEditorMode>("create");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<OrderFormState>(emptyOrderForm);

  const orders = ordersQuery.data ?? [];
  const leads = leadsQuery.data?.data ?? [];

  const stats = useMemo(() => {
    return {
      total: orders.length,
      regions: new Set(orders.map((order) => order.region).filter(Boolean)).size,
      experienceRequired: orders.filter((order) => order.experienceRequired).length,
      openProfileMatches: leads.filter((lead) => ["QUALIFIED", "MATCHING", "MATCHED"].includes(lead.status)).length
    };
  }, [orders, leads]);

  const editorOpen = isAdmin && (editorMode === "create" || editingOrderId);
  const editorTitle = editorMode === "edit"
    ? copy({ en: "Edit recruitment order", vi: "Chỉnh sửa đơn hàng tuyển dụng" })
    : copy({ en: "Create recruitment order", vi: "Tạo đơn hàng tuyển dụng" });
  const orderPayload = buildOrderPayload(orderForm);
  const canSubmitOrder = orderForm.name.trim().length > 0;
  const orderMutationPending = createOrder.isPending || updateOrder.isPending;

  const resetEditor = () => {
    setEditorMode("create");
    setEditingOrderId(null);
    setOrderForm(emptyOrderForm);
  };

  const startEdit = (order: Order) => {
    setEditorMode("edit");
    setEditingOrderId(order.id);
    setOrderForm(orderToForm(order));
  };

  const submitOrder = () => {
    if (!canSubmitOrder) return;

    if (editorMode === "edit" && editingOrderId) {
      updateOrder.mutate(
        { id: editingOrderId, patch: orderPayload },
        { onSuccess: resetEditor }
      );
      return;
    }

    createOrder.mutate(
      { ...orderPayload, name: orderForm.name.trim() },
      { onSuccess: resetEditor }
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Demand", vi: "Nhu cầu" })}
        title={copy({ en: "Orders catalog", vi: "Danh mục đơn hàng" })}
        description={copy({
          en: "Phase 2 turns orders into a denser operational surface: requirement summaries, profile-fit checks, and a backend-backed triage action.",
          vi: "Giai đoạn 2 biến đơn hàng thành bề mặt vận hành dày thông tin hơn: tóm tắt yêu cầu, kiểm tra độ phù hợp hồ sơ và thao tác triage chạy bằng backend."
        })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={exportCsv} disabled={isExporting}>
              {isExporting
                ? copy({ en: "Exporting…", vi: "Đang xuất…" })
                : copy({ en: "Export CSV", vi: "Xuất CSV" })}
            </Button>
            {isAdmin ? (
              <Button onClick={resetEditor}>
                {copy({ en: "New order", vi: "Tạo đơn" })}
              </Button>
            ) : (
              <Badge tone="neutral">{copy({ en: "Order edits are admin-only", vi: "Chỉ admin được sửa đơn" })}</Badge>
            )}
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label={copy({ en: "Orders", vi: "Đơn hàng" })} value={stats.total} />
        <MetricCard label={copy({ en: "Regions", vi: "Khu vực" })} value={stats.regions} />
        <MetricCard label={copy({ en: "Experience req.", vi: "YC kinh nghiệm" })} value={stats.experienceRequired} />
        <MetricCard label={copy({ en: "Active lead pool", vi: "Nguồn lead hoạt động" })} value={stats.openProfileMatches} />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="text-sm leading-7 text-slate-500">
          {copy({
            en: "Admins can maintain the order criteria that feed matching. Staff users keep a read-only demand catalog plus fast lead triage.",
            vi: "Admin có thể quản lý tiêu chí đơn hàng dùng cho matching. Nhân viên dùng danh mục chỉ đọc và triage lead nhanh."
          })}
        </div>
      </Toolbar>

      {editorOpen ? (
        <Panel
          title={editorTitle}
          subtitle={copy({
            en: "These fields are persisted by the backend and used by matching gates where applicable.",
            vi: "Các trường này được backend lưu lại và dùng cho các cổng điều kiện matching khi phù hợp."
          })}
          action={
            editorMode === "edit" ? (
              <Button variant="ghost" onClick={resetEditor}>
                {copy({ en: "Cancel edit", vi: "Hủy sửa" })}
              </Button>
            ) : null
          }
        >
          <FieldGroup columns={3}>
            <Input label={copy({ en: "Order name", vi: "Tên đơn" })} value={orderForm.name} onChange={(e) => setOrderForm((s) => ({ ...s, name: e.target.value }))} />
            <Input label={copy({ en: "Region", vi: "Khu vực" })} value={orderForm.region} onChange={(e) => setOrderForm((s) => ({ ...s, region: e.target.value }))} />
            <Input label={copy({ en: "Industry", vi: "Ngành" })} value={orderForm.industry} onChange={(e) => setOrderForm((s) => ({ ...s, industry: e.target.value }))} />
            <Select label={copy({ en: "Gender requirement", vi: "Yêu cầu giới tính" })} value={orderForm.genderRequired} onChange={(e) => setOrderForm((s) => ({ ...s, genderRequired: e.target.value as OrderFormState["genderRequired"] }))}>
              <option value="both">{copy({ en: "Both", vi: "Cả nam và nữ" })}</option>
              <option value="male">{copy({ en: "Male", vi: "Nam" })}</option>
              <option value="female">{copy({ en: "Female", vi: "Nữ" })}</option>
            </Select>
            <Input label={copy({ en: "Minimum age", vi: "Tuổi tối thiểu" })} type="number" min={0} value={orderForm.ageMin} onChange={(e) => setOrderForm((s) => ({ ...s, ageMin: e.target.value }))} />
            <Input label={copy({ en: "Maximum age", vi: "Tuổi tối đa" })} type="number" min={0} value={orderForm.ageMax} onChange={(e) => setOrderForm((s) => ({ ...s, ageMax: e.target.value }))} />
            <Input label={copy({ en: "Minimum height (cm)", vi: "Chiều cao tối thiểu (cm)" })} type="number" min={0} value={orderForm.heightMin} onChange={(e) => setOrderForm((s) => ({ ...s, heightMin: e.target.value }))} />
            <Select label={copy({ en: "Accepts returnees", vi: "Nhận lao động đi về" })} value={orderForm.acceptsReturnees} onChange={(e) => setOrderForm((s) => ({ ...s, acceptsReturnees: e.target.value as OrderFormState["acceptsReturnees"] }))}>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
              <option value="true">{copy({ en: "Accepted", vi: "Nhận" })}</option>
              <option value="false">{copy({ en: "Not accepted", vi: "Không nhận" })}</option>
            </Select>
            <Select label={copy({ en: "Requires experience", vi: "Yêu cầu kinh nghiệm" })} value={orderForm.experienceRequired} onChange={(e) => setOrderForm((s) => ({ ...s, experienceRequired: e.target.value as OrderFormState["experienceRequired"] }))}>
              <option value="true">{copy({ en: "Required", vi: "Bắt buộc" })}</option>
              <option value="false">{copy({ en: "Not required", vi: "Không bắt buộc" })}</option>
              <option value="">{copy({ en: "Not set", vi: "Chưa đặt" })}</option>
            </Select>
            <Input label={copy({ en: "Salary range", vi: "Mức lương" })} value={orderForm.salaryRange} onChange={(e) => setOrderForm((s) => ({ ...s, salaryRange: e.target.value }))} />
          </FieldGroup>

          <FieldGroup className="mt-4" columns={2}>
            <Input label={copy({ en: "Description", vi: "Mô tả" })} value={orderForm.description} onChange={(e) => setOrderForm((s) => ({ ...s, description: e.target.value }))} />
            <Input label={copy({ en: "Requirement notes", vi: "Ghi chú yêu cầu" })} value={orderForm.requirements} onChange={(e) => setOrderForm((s) => ({ ...s, requirements: e.target.value }))} />
          </FieldGroup>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={submitOrder} disabled={!canSubmitOrder || orderMutationPending}>
              {orderMutationPending
                ? copy({ en: "Saving order...", vi: "Đang lưu đơn..." })
                : editorMode === "edit"
                  ? copy({ en: "Save order changes", vi: "Lưu thay đổi đơn" })
                  : copy({ en: "Create order", vi: "Tạo đơn" })}
            </Button>
            <Button variant="secondary" onClick={resetEditor} disabled={orderMutationPending}>
              {copy({ en: "Reset", vi: "Đặt lại" })}
            </Button>
            {!canSubmitOrder ? <span className="text-sm text-rose-600">{copy({ en: "Order name is required.", vi: "Tên đơn là bắt buộc." })}</span> : null}
            {createOrder.isError || updateOrder.isError ? (
              <span className="text-sm text-rose-600">{copy({ en: "Order save failed. Check the field values and permissions.", vi: "Lưu đơn thất bại. Hãy kiểm tra dữ liệu và quyền truy cập." })}</span>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {orders.length ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const selectedLeadId = selectedLeadByOrder[order.id] ?? "";
            const selectedLead = leads.find((lead) => lead.id === selectedLeadId);
            const evaluationKeyMatch =
              evaluation.variables?.orderId === order.id &&
              evaluation.variables?.leadId === selectedLeadId;

            return (
              <section
                key={order.id}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_34px_rgba(15,23,42,0.05)]"
              >
                <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">{order.name}</h3>
                      <Badge tone="accent">{order.genderRequired}</Badge>
                      <Badge tone={order.experienceRequired ? "warning" : "neutral"}>
                        {order.experienceRequired ? copy({ en: "Experience required", vi: "Yêu cầu kinh nghiệm" }) : copy({ en: "Open to mixed profiles", vi: "Mở cho nhiều dạng hồ sơ" })}
                      </Badge>
                    </div>
                    <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500">
                      {order.description || copy({ en: "No description provided by the current orders endpoint.", vi: "Endpoint đơn hàng hiện tại chưa cung cấp mô tả." })}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                      <Chip label={copy({ en: "Region", vi: "Khu vực" })} value={order.region || copy({ en: "Not set", vi: "Chưa đặt" })} />
                      <Chip label={copy({ en: "Industry", vi: "Ngành" })} value={order.industry || copy({ en: "Not set", vi: "Chưa đặt" })} />
                      <Chip label={copy({ en: "Age", vi: "Tuổi" })} value={order.ageRange ? `${order.ageRange.min}-${order.ageRange.max}` : copy({ en: "Not set", vi: "Chưa đặt" })} />
                      <Chip label={copy({ en: "Min height", vi: "Chiều cao tối thiểu" })} value={order.heightMin ? `${order.heightMin} cm` : copy({ en: "Not set", vi: "Chưa đặt" })} />
                      <Chip
                        label={copy({ en: "Returnees", vi: "Lao động đi về" })}
                        value={
                          typeof order.acceptsReturnees === "boolean"
                            ? order.acceptsReturnees
                              ? copy({ en: "Accepted", vi: "Nhận" })
                              : copy({ en: "Not accepted", vi: "Không nhận" })
                            : copy({ en: "Not set", vi: "Chưa đặt" })
                        }
                      />
                      <Chip label={copy({ en: "Salary", vi: "Lương" })} value={order.salaryRange || copy({ en: "Not set", vi: "Chưa đặt" })} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isAdmin ? (
                      <Button variant="secondary" onClick={() => startEdit(order)}>
                        {copy({ en: "Edit", vi: "Sửa" })}
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                    >
                      {isExpanded ? copy({ en: "Hide details", vi: "Ẩn chi tiết" }) : copy({ en: "Open workbench", vi: "Mở bàn xử lý" })}
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="grid gap-6 bg-slate-50 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{copy({ en: "Requirement breakdown", vi: "Phân rã yêu cầu" })}</div>
                        <FieldGroup className="mt-4" columns={2}>
                          <InfoCard label={copy({ en: "Region", vi: "Khu vực" })} value={order.region || copy({ en: "Not set", vi: "Chưa đặt" })} className="bg-slate-50" />
                          <InfoCard label={copy({ en: "Industry", vi: "Ngành" })} value={order.industry || copy({ en: "Not set", vi: "Chưa đặt" })} className="bg-slate-50" />
                          <InfoCard label={copy({ en: "Gender", vi: "Giới tính" })} value={order.genderRequired} className="bg-slate-50" />
                          <InfoCard label={copy({ en: "Age range", vi: "Khoảng tuổi" })} value={order.ageRange ? `${order.ageRange.min}-${order.ageRange.max}` : copy({ en: "Not set", vi: "Chưa đặt" })} className="bg-slate-50" />
                          <InfoCard label={copy({ en: "Min height", vi: "Chiều cao tối thiểu" })} value={order.heightMin ? `${order.heightMin} cm` : copy({ en: "Not set", vi: "Chưa đặt" })} className="bg-slate-50" />
                          <InfoCard
                            label={copy({ en: "Returnees", vi: "Lao động đi về" })}
                            value={
                              typeof order.acceptsReturnees === "boolean"
                                ? order.acceptsReturnees
                                  ? copy({ en: "Accepted", vi: "Nhận" })
                                  : copy({ en: "Not accepted", vi: "Không nhận" })
                                : copy({ en: "Not set", vi: "Chưa đặt" })
                            }
                            className="bg-slate-50"
                          />
                        </FieldGroup>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                          {order.requirements || copy({ en: "This order has no extended requirement text in the current backend payload.", vi: "Đơn hàng này chưa có mô tả yêu cầu mở rộng trong payload backend hiện tại." })}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{copy({ en: "Quick triage", vi: "Triage nhanh" })}</div>
                        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                          <Select
                            label={copy({ en: "Select lead for backend triage", vi: "Chọn lead để triage backend" })}
                            value={selectedLeadId}
                            onChange={(e) => setSelectedLeadByOrder((state) => ({ ...state, [order.id]: e.target.value }))}
                          >
                            <option value="">{copy({ en: "Select a lead", vi: "Chọn lead" })}</option>
                            {leads.map((lead) => (
                              <option key={lead.id} value={lead.id}>
                                {lead.fullName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" })} - {formatLeadStatus(lead.status)}
                              </option>
                            ))}
                          </Select>
                          <div className="flex items-end">
                            <Button
                              onClick={() => selectedLeadId && evaluation.mutate({ leadId: selectedLeadId, orderId: order.id })}
                              disabled={!selectedLeadId || evaluation.isPending}
                            >
                              {evaluation.isPending && evaluationKeyMatch ? copy({ en: "Evaluating...", vi: "Đang đánh giá..." }) : copy({ en: "Run triage", vi: "Chạy triage" })}
                            </Button>
                          </div>
                        </div>

                        {selectedLead ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                            <div className="font-semibold text-slate-800">{selectedLead.fullName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" })}</div>
                            <div className="mt-1">{selectedLead.region || copy({ en: "No region", vi: "Chưa có khu vực" })} · {selectedLead.source} · {copy({ en: "score", vi: "điểm" })} {selectedLead.leadScore ?? "-"}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{copy({ en: "Triage result", vi: "Kết quả triage" })}</div>
                        {evaluation.data && evaluationKeyMatch ? (
                          <div className="mt-4 space-y-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge tone={evaluation.data.matching.isEligible ? "success" : "danger"}>
                                {evaluation.data.matching.isEligible ? copy({ en: "Eligible", vi: "Đủ điều kiện" }) : copy({ en: "Rejected", vi: "Từ chối" })}
                              </Badge>
                              <Badge tone="accent">{evaluation.data.matching.conclusion}</Badge>
                              <Badge tone="neutral">{evaluation.data.preliminaryFit.replace(/_/g, " ")}</Badge>
                            </div>
                            <FieldGroup columns={2}>
                              <InfoCard label={copy({ en: "Score", vi: "Điểm" })} value={evaluation.data.matching.totalScore} className="bg-slate-50" />
                              <InfoCard label={copy({ en: "Data quality", vi: "Chất lượng dữ liệu" })} value={`${evaluation.data.dataQuality.completeness}%`} className="bg-slate-50" />
                              <InfoCard label={copy({ en: "Foundation", vi: "Nền tảng" })} value={evaluation.data.matching.breakdown.foundation} className="bg-slate-50" />
                              <InfoCard label={copy({ en: "Experience", vi: "Kinh nghiệm" })} value={evaluation.data.matching.breakdown.experience} className="bg-slate-50" />
                            </FieldGroup>
                            {evaluation.data.matching.rejectReason ? (
                              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                                {evaluation.data.matching.rejectReason}
                              </div>
                            ) : null}
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                              <div className="font-semibold">{copy({ en: "Missing requirements", vi: "Yêu cầu còn thiếu" })}</div>
                              <div className="mt-1">
                                {evaluation.data.missingRequirements.length
                                  ? evaluation.data.missingRequirements.join(", ")
                                  : copy({ en: "No required triage signals are missing.", vi: "Không thiếu tín hiệu triage bắt buộc nào." })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 text-sm leading-7 text-slate-500">
                            {copy({ en: "Select a lead and run backend triage to inspect eligibility, penalties, and missing requirements for this order.", vi: "Chọn một lead và chạy triage backend để xem mức đủ điều kiện, điểm trừ và yêu cầu còn thiếu cho đơn hàng này." })}
                          </div>
                        )}
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{copy({ en: "Operational note", vi: "Ghi chú vận hành" })}</div>
                        <div className="mt-4 text-sm leading-7 text-slate-500">
                          {copy({ en: "This Phase 2 surface keeps the source app's operator-first layout, but it does not fabricate quotas, assignment counts, or pipeline states that the backend does not yet expose.", vi: "Bề mặt giai đoạn 2 này giữ cách bố trí ưu tiên vận hành như ứng dụng gốc, nhưng không dựng giả chỉ tiêu, số lượng phân công hay trạng thái pipeline mà backend chưa cung cấp." })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState title={copy({ en: "No orders returned", vi: "Không có đơn hàng trả về" })} description={copy({ en: "The backend orders endpoint may be empty or unavailable in the current environment.", vi: "Endpoint đơn hàng của backend có thể đang trống hoặc chưa khả dụng trong môi trường hiện tại." })} />
      )}
    </div>
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
    experienceRequired: typeof order.experienceRequired === "boolean" ? String(order.experienceRequired) as OrderFormState["experienceRequired"] : ""
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
    experienceRequired: parseOptionalBoolean(form.experienceRequired) ?? false
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

function Chip(props: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
      <span className="font-semibold text-slate-700">{props.label}:</span> {props.value}
    </div>
  );
}
