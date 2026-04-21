import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  InfoStrip,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import { useLeadsQuery, useMatchingEvaluationMutation, useOrdersQuery } from "@social-crm/api";
import { useI18n } from "@/i18n";

function toneForStatus(status: string) {
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(status)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED", "DEPARTED"].includes(status)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "INTERVIEWING", "VISA_PROCESSING"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function MatchingPage() {
  const { copy, formatLeadStatus } = useI18n();
  const leads = useLeadsQuery({ offset: 0, limit: 50 });
  const orders = useOrdersQuery();
  const evaluation = useMatchingEvaluationMutation();
  const [leadId, setLeadId] = useState("");
  const [orderId, setOrderId] = useState("");

  const selectedLead = useMemo(() => (leads.data?.data ?? []).find((lead) => lead.id === leadId), [leads.data, leadId]);
  const selectedOrder = useMemo(() => (orders.data ?? []).find((order) => order.id === orderId), [orders.data, orderId]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Matching", vi: "Ghép đơn" })}
        title={copy({ en: "Matching workbench", vi: "Bàn xử lý ghép đơn" })}
        description={copy({ en: "Run the backend triage engine against one lead and one order, then inspect scoring, hard fails, missing inputs, and next-action guidance in a source-style operator surface.", vi: "Chạy máy triage của backend cho một lead và một đơn hàng, sau đó xem điểm số, lỗi cứng, dữ liệu còn thiếu và gợi ý hành động tiếp theo trên bề mặt vận hành theo phong cách CRM gốc." })}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TopStat label={copy({ en: "Leads loaded", vi: "Lead đã tải" })} value={leads.data?.data?.length ?? 0} />
        <TopStat label={copy({ en: "Orders loaded", vi: "Đơn hàng đã tải" })} value={orders.data?.length ?? 0} />
        <TopStat label={copy({ en: "Mode", vi: "Chế độ" })} value={copy({ en: "Lead triage", vi: "Triage lead" })} tone="accent" />
        <TopStat label={copy({ en: "Result", vi: "Kết quả" })} value={evaluation.data?.matching.isEligible ? copy({ en: "Eligible", vi: "Đủ điều kiện" }) : evaluation.data ? copy({ en: "Rejected", vi: "Từ chối" }) : copy({ en: "Waiting", vi: "Đang chờ" })} tone={evaluation.data ? (evaluation.data.matching.isEligible ? "success" : "danger") : "neutral"} />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
          <Select label={copy({ en: "Lead", vi: "Lead" })} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">{copy({ en: "Select a lead", vi: "Chọn lead" })}</option>
            {(leads.data?.data ?? []).map((lead) => (
              <option key={lead.id} value={lead.id}>
                {(lead.fullName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" }))} - {formatLeadStatus(lead.status)}
              </option>
            ))}
          </Select>
          <Select label={copy({ en: "Order", vi: "Đơn hàng" })} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">{copy({ en: "Select an order", vi: "Chọn đơn hàng" })}</option>
            {(orders.data ?? []).map((order) => (
              <option key={order.id} value={order.id}>
                {order.name} - {order.region || copy({ en: "No region", vi: "Chưa có khu vực" })}
              </option>
            ))}
          </Select>
          <ToolbarActions className="justify-start xl:justify-end">
            <Button onClick={() => evaluation.mutate({ leadId, orderId })} disabled={!leadId || !orderId || evaluation.isPending}>
              {evaluation.isPending ? copy({ en: "Evaluating...", vi: "Đang đánh giá..." }) : copy({ en: "Evaluate match", vi: "Đánh giá ghép đơn" })}
            </Button>
          </ToolbarActions>
        </div>
      </Toolbar>

      <InfoStrip>
        {copy({ en: "Matching is currently driven by structured lead data and AI extraction quality. If a result looks weak, correct the lead profile and extracted snapshot before making an order decision.", vi: "Kết quả ghép đơn hiện phụ thuộc vào dữ liệu lead có cấu trúc và chất lượng trích xuất AI. Nếu kết quả chưa tốt, hãy chỉnh lại hồ sơ lead và dữ liệu trích xuất trước khi ra quyết định." })}
      </InfoStrip>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Panel title={copy({ en: "Selected context", vi: "Ngữ cảnh đã chọn" })} subtitle={copy({ en: "Operator-side summary before running backend triage.", vi: "Tóm tắt phía vận hành trước khi chạy triage backend." })}>
            {selectedLead && selectedOrder ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <ContextCard label={copy({ en: "Lead", vi: "Lead" })} value={selectedLead.fullName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" })} note={selectedLead.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })} />
                  <ContextCard label={copy({ en: "Order", vi: "Đơn hàng" })} value={selectedOrder.name} note={selectedOrder.region || copy({ en: "No region", vi: "Chưa có khu vực" })} />
                </div>
                <DescriptionList
                  items={[
                    { label: copy({ en: "Lead status", vi: "Trạng thái lead" }), value: <Badge tone={toneForStatus(selectedLead.status)}>{formatLeadStatus(selectedLead.status)}</Badge> },
                    { label: copy({ en: "Lead score", vi: "Điểm lead" }), value: selectedLead.leadScore ?? "-" },
                    { label: copy({ en: "Classification", vi: "Phân loại" }), value: selectedLead.leadClassification ?? copy({ en: "Unclassified", vi: "Chưa phân loại" }) },
                    { label: copy({ en: "Industry", vi: "Ngành" }), value: selectedOrder.industry || copy({ en: "No industry", vi: "Chưa có ngành" }) },
                    { label: copy({ en: "Gender rule", vi: "Yêu cầu giới tính" }), value: selectedOrder.genderRequired },
                    { label: copy({ en: "Experience", vi: "Kinh nghiệm" }), value: selectedOrder.experienceRequired ? copy({ en: "Required", vi: "Bắt buộc" }) : copy({ en: "Open", vi: "Mở" }) }
                  ]}
                />
              </div>
            ) : (
              <EmptyState title={copy({ en: "Choose lead and order", vi: "Chọn lead và đơn hàng" })} description={copy({ en: "Select both entities to inspect a preliminary triage result.", vi: "Chọn cả hai đối tượng để xem kết quả triage sơ bộ." })} />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={copy({ en: "Triage result", vi: "Kết quả triage" })} subtitle={copy({ en: "The backend result exposes hard-fail reasons, flex penalties, missing inputs, and data quality.", vi: "Kết quả backend hiển thị lý do fail cứng, điểm trừ mềm, dữ liệu thiếu và chất lượng dữ liệu." })}>
            {evaluation.data ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={evaluation.data.matching.isEligible ? "success" : "danger"}>
                    {evaluation.data.matching.isEligible ? copy({ en: "Eligible", vi: "Đủ điều kiện" }) : copy({ en: "Rejected", vi: "Từ chối" })}
                  </Badge>
                  <Badge tone="accent">{evaluation.data.matching.conclusion}</Badge>
                  <Badge tone="neutral">{evaluation.data.preliminaryFit.replace(/_/g, " ")}</Badge>
                  <Badge tone="neutral">{copy({ en: `Data quality ${evaluation.data.dataQuality.completeness}%`, vi: `Chất lượng dữ liệu ${evaluation.data.dataQuality.completeness}%` })}</Badge>
                  {evaluation.data.matching.requiresManagerApproval ? <Badge tone="warning">{copy({ en: "Manager approval required", vi: "Cần quản lý phê duyệt" })}</Badge> : null}
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <Metric label={copy({ en: "Score", vi: "Điểm" })} value={evaluation.data.matching.totalScore} />
                  <Metric label={copy({ en: "Foundation", vi: "Nền tảng" })} value={evaluation.data.matching.breakdown.foundation} />
                  <Metric label={copy({ en: "Experience", vi: "Kinh nghiệm" })} value={evaluation.data.matching.breakdown.experience} />
                  <Metric label={copy({ en: "Penalties", vi: "Điểm trừ" })} value={evaluation.data.matching.breakdown.penalties} />
                </div>

                {evaluation.data.matching.rejectReason ? (
                  <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{evaluation.data.matching.rejectReason}</div>
                ) : null}

                <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="font-semibold">{copy({ en: "Missing requirements", vi: "Yêu cầu còn thiếu" })}</div>
                  <div className="mt-1">
                    {evaluation.data.missingRequirements.length
                      ? evaluation.data.missingRequirements.join(", ")
                      : copy({ en: "No required triage signals are missing.", vi: "Không thiếu tín hiệu triage bắt buộc nào." })}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title={copy({ en: "No triage yet", vi: "Chưa có triage" })} description={copy({ en: "Run lead triage to see score, flags, penalties, missing inputs, and reject reasons.", vi: "Hãy chạy triage lead để xem điểm, cờ cảnh báo, điểm trừ, dữ liệu thiếu và lý do từ chối." })} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TopStat(props: { label: string; value: string | number; tone?: "neutral" | "accent" | "success" | "danger" }) {
  const accentClass =
    props.tone === "accent"
      ? "border-indigo-200 bg-indigo-50"
      : props.tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : props.tone === "danger"
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)] ${accentClass}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
    </div>
  );
}

function ContextCard(props: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{props.value}</div>
      <div className="mt-1 text-xs text-slate-500">{props.note}</div>
    </div>
  );
}

function Metric(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
    </div>
  );
}
