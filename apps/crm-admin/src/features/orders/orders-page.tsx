import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, FieldGroup, InfoCard, MetricCard, SectionHeader, Select, Toolbar } from "@social-crm/ui";
import { useLeadsQuery, useMatchingEvaluationMutation, useOrdersQuery } from "@social-crm/api";
import { useI18n } from "@/i18n";

export function OrdersPage() {
  const { copy, formatLeadStatus } = useI18n();
  const ordersQuery = useOrdersQuery();
  const leadsQuery = useLeadsQuery({ offset: 0, limit: 50 });
  const evaluation = useMatchingEvaluationMutation();

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedLeadByOrder, setSelectedLeadByOrder] = useState<Record<string, string>>({});

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

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Demand", vi: "Nhu cầu" })}
        title={copy({ en: "Orders catalog", vi: "Danh mục đơn hàng" })}
        description={copy({
          en: "Phase 2 turns orders into a denser operational surface: requirement summaries, profile-fit checks, and a backend-backed triage action.",
          vi: "Giai đoạn 2 biến đơn hàng thành bề mặt vận hành dày thông tin hơn: tóm tắt yêu cầu, kiểm tra độ phù hợp hồ sơ và thao tác triage chạy bằng backend."
        })}
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
            en: "Create and edit flows remain off until backend CRUD expands. This page is focused on demand visibility and fast operator triage using current APIs.",
            vi: "Các luồng tạo và chỉnh sửa vẫn tắt cho tới khi CRUD backend mở rộng. Trang này hiện tập trung vào khả năng nhìn thấy nhu cầu và triage nhanh cho nhân sự bằng các API hiện có."
          })}
        </div>
      </Toolbar>

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
                      <Chip label={copy({ en: "Salary", vi: "Lương" })} value={order.salaryRange || copy({ en: "Not set", vi: "Chưa đặt" })} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
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

function Chip(props: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
      <span className="font-semibold text-slate-700">{props.label}:</span> {props.value}
    </div>
  );
}
