import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, DataTable, Input, SectionHeader, Select, Toolbar, ToolbarActions } from "@social-crm/ui";
import { useLeadsQuery } from "@social-crm/api";
import { useI18n } from "@/i18n";

function toneForStatus(status: string) {
  const normalized = status.toLowerCase();
  if (["interview_failed", "disqualified"].includes(normalized)) return "danger" as const;
  if (["matched", "interview_passed", "contract_signed", "departed"].includes(normalized)) return "success" as const;
  if (["qualified", "matching", "interview_scheduled", "interviewing", "visa_processing"].includes(normalized)) return "warning" as const;
  return "accent" as const;
}

const LEAD_STATUS_OPTIONS = [
  "new",
  "contacted",
  "qualified",
  "matching",
  "matched",
  "interview_scheduled",
  "interviewing",
  "interview_passed",
  "interview_failed",
  "contract_signed",
  "visa_processing",
  "departed",
  "disqualified"
];

export function LeadsPage() {
  const { copy, formatLeadStatus, formatEnum } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const deferredSearch = useDeferredValue(search);

  const query = useLeadsQuery({
    offset: 0,
    limit: 50,
    search: deferredSearch || undefined,
    status: status || undefined,
    source: source || undefined
  });

  const leads = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  const stats = useMemo(() => {
    return {
      stale: leads.filter((lead) => !lead.updatedAt || lead.updatedAt === lead.createdAt).length,
      hot: leads.filter((lead) => (lead.leadScore ?? 0) >= 80).length,
      blocked: leads.filter((lead) => ["interview_failed", "disqualified"].includes(lead.status.toLowerCase())).length,
      worked: leads.filter((lead) => ["qualified", "matching", "matched", "interview_scheduled", "interviewing"].includes(lead.status.toLowerCase())).length
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Lead operations", vi: "Vận hành lead" })}
        title={copy({ en: "Lead inbox", vi: "Hộp thư lead" })}
        description={copy({
          en: "Source-style triage surface: compact filters, operational metrics, and a denser lead table driven by the current backend list APIs.",
          vi: "Bề mặt phân loại theo phong cách CRM gốc: bộ lọc gọn, chỉ số vận hành và bảng lead dày thông tin chạy từ API danh sách backend hiện tại."
        })}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Strip label={copy({ en: "Loaded", vi: "Đã tải" })} value={leads.length} hint={copy({ en: "Visible lead rows", vi: "Số dòng lead đang hiển thị" })} />
        <Strip label={copy({ en: "Total", vi: "Tổng" })} value={total} hint={copy({ en: "Backend result size", vi: "Kích thước kết quả từ backend" })} />
        <Strip label={copy({ en: "Hot", vi: "Nóng" })} value={stats.hot} hint={copy({ en: "Score >= 80", vi: "Điểm >= 80" })} tone="accent" />
        <Strip label={copy({ en: "Blocked", vi: "Bị chặn" })} value={stats.blocked} hint={copy({ en: "Failed or disqualified", vi: "Trượt hoặc bị loại" })} tone="danger" />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_auto]">
          <Input
            label={copy({ en: "Lead search", vi: "Tìm lead" })}
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => setSearch(value));
            }}
            placeholder={copy({ en: "Name or phone...", vi: "Tên hoặc số điện thoại..." })}
          />
          <Select label={copy({ en: "Status", vi: "Trạng thái" })} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{copy({ en: "All statuses", vi: "Tất cả trạng thái" })}</option>
            {LEAD_STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {formatLeadStatus(value)}
              </option>
            ))}
          </Select>
          <Select label={copy({ en: "Channel", vi: "Kênh" })} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">{copy({ en: "All channels", vi: "Tất cả kênh" })}</option>
            {["zalo", "facebook", "miniapp"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <ToolbarActions className="justify-start xl:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setStatus("");
                setSource("");
              }}
            >
              {copy({ en: "Reset", vi: "Đặt lại" })}
            </Button>
          </ToolbarActions>
        </div>
      </Toolbar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <DataTable>
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">{copy({ en: "Lead list", vi: "Danh sách lead" })}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {copy({
                    en: `Showing ${leads.length} records in the current filter window. ${stats.stale} still look untouched since capture.`,
                    vi: `Đang hiển thị ${leads.length} hồ sơ trong cửa sổ lọc hiện tại. ${stats.stale} hồ sơ vẫn chưa có thao tác kể từ lúc ghi nhận.`
                  })}
                </div>
              </div>
              <Badge tone="neutral">{copy({ en: `${stats.worked} active in pipeline`, vi: `${stats.worked} đang hoạt động trong pipeline` })}</Badge>
            </div>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-4">{copy({ en: "Lead", vi: "Lead" })}</th>
                <th className="py-4 pr-4">{copy({ en: "Channel", vi: "Kênh" })}</th>
                <th className="py-4 pr-4">{copy({ en: "Status", vi: "Trạng thái" })}</th>
                <th className="py-4 pr-4">{copy({ en: "Signal", vi: "Tín hiệu" })}</th>
                <th className="py-4 pr-4">{copy({ en: "Tags", vi: "Nhãn" })}</th>
                <th className="py-4 pr-6">{copy({ en: "Threads", vi: "Luồng" })}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-200 align-top transition-colors hover:bg-slate-50">
                  <td className="px-6 py-5 pr-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xs font-bold text-indigo-700">
                        {(lead.fullName || copy({ en: "Lead", vi: "Lead" })).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/leads/${lead.id}`} className="font-semibold text-slate-900 hover:text-indigo-700">
                          {lead.fullName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" })}
                        </Link>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{lead.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })} · {lead.region || copy({ en: "No region", vi: "Chưa có khu vực" })}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 pr-4 uppercase text-slate-600">{lead.source}</td>
                  <td className="py-5 pr-4">
                    <Badge tone={toneForStatus(lead.status)}>{formatLeadStatus(lead.status)}</Badge>
                  </td>
                  <td className="py-5 pr-4">
                    <div className="font-semibold text-slate-900">{lead.leadScore ?? "-"}</div>
                    <div className="mt-1 text-xs text-slate-500">{lead.leadClassification ? formatEnum(lead.leadClassification) : copy({ en: "Unclassified", vi: "Chưa phân loại" })}</div>
                  </td>
                  <td className="py-5 pr-4">
                    <div className="flex max-w-[220px] flex-wrap gap-2">
                      {(lead.tags ?? []).slice(0, 4).map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-5 pr-6 text-slate-500">{lead.threads?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{copy({ en: "Workboard notes", vi: "Ghi chú vận hành" })}</div>
          <div className="mt-4 space-y-3">
            <SideNote label={copy({ en: "High attention", vi: "Ưu tiên cao" })} value={stats.hot} description={copy({ en: "Score-driven follow-up priority.", vi: "Ưu tiên theo dõi theo điểm." })} />
            <SideNote label={copy({ en: "Blocked leads", vi: "Lead bị chặn" })} value={stats.blocked} description={copy({ en: "Review for recovery or exit.", vi: "Rà soát để cứu lại hoặc kết thúc." })} />
            <SideNote label={copy({ en: "Untouched", vi: "Chưa xử lý" })} value={stats.stale} description={copy({ en: "Candidates with no visible progression yet.", vi: "Ứng viên chưa có tiến triển rõ ràng." })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Strip(props: { label: string; value: string | number; hint: string; tone?: "neutral" | "accent" | "danger" }) {
  const accentClass =
    props.tone === "accent"
      ? "border-indigo-200 bg-indigo-50"
      : props.tone === "danger"
        ? "border-rose-200 bg-rose-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)] ${accentClass}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
      <div className="mt-2 text-xs text-slate-500">{props.hint}</div>
    </div>
  );
}

function SideNote(props: { label: string; value: string | number; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-800">{props.label}</div>
        <div className="text-lg font-bold text-slate-900">{props.value}</div>
      </div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{props.description}</div>
    </div>
  );
}
