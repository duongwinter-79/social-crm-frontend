import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Badge, Button, DataTable, Input, PaginationFooter, SectionHeader, Select, Toolbar, ToolbarActions } from "@social-crm/ui";
import { apiClient, triggerBlobDownload, useLeadsQuery, usePermissions, type Lead } from "@social-crm/api";
import { FormIntakeModal } from "@/features/journey/form-intake-modal";
import { createReturnState, saveRouteScroll, useRestoreRouteScroll } from "@/app/navigation-state";
import { applySearchParamUpdates, readNumberOption, readPageIndex, readStringOption, type SearchParamValue } from "@/app/search-params";
import { useI18n } from "@/i18n";
import { UiText } from "@/ui-text/ui-text";
import { getLeadDisplayName, getLeadFullNameLabel } from "@/lib/lead-display";
import { RefreshButton } from "@/components/refresh-button";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function toneForStatus(status: string) {
  const normalized = status.toLowerCase();
  if (["interview_failed", "disqualified"].includes(normalized)) return "danger" as const;
  if (["matched", "interview_passed", "contract_signed", "departed"].includes(normalized)) return "success" as const;
  if (["qualified", "matching", "interview_scheduled", "visa_processing"].includes(normalized)) return "warning" as const;
  return "accent" as const;
}

/**
 * Resolve a profile field by checking verified data first, then AI-extracted
 * data, then the typed column on the lead itself if applicable. Mirrors the
 * backend's profile-data util at a much smaller scope — we only need it for
 * a couple of display fields here.
 */
function resolveProfileField(lead: Lead, key: string): unknown {
  const verified = (lead.verifiedProfileData as Record<string, unknown> | null | undefined)?.[key];
  if (verified !== null && verified !== undefined && verified !== "") return verified;
  const typed = (lead as unknown as Record<string, unknown>)[key];
  if (typed !== null && typed !== undefined && typed !== "") return typed;
  const ai = (lead.aiExtractedData as Record<string, unknown> | null | undefined)?.[key];
  if (ai !== null && ai !== undefined && ai !== "") return ai;
  return null;
}

function readAge(lead: Lead): number | null {
  const byField = resolveProfileField(lead, "age");
  if (typeof byField === "number" && byField > 0) return byField;
  const birthYear = lead.birthYear ?? (resolveProfileField(lead, "birthYear") as number | null | undefined);
  if (typeof birthYear === "number" && birthYear > 1900) {
    return new Date().getFullYear() - birthYear;
  }
  return null;
}

function readPreferredRegions(lead: Lead): string[] {
  const raw =
    resolveProfileField(lead, "preferredRegion") ??
    resolveProfileField(lead, "preferredRegions");
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (typeof raw === "string" && raw.length > 0) return [raw];
  return [];
}

function scoreBarTone(score: number | null | undefined): { fill: string; text: string } {
  if (score == null) return { fill: "bg-slate-200", text: "text-slate-400" };
  if (score >= 80) return { fill: "bg-rose-500", text: "text-rose-600" };
  if (score >= 60) return { fill: "bg-amber-500", text: "text-amber-600" };
  return { fill: "bg-slate-300", text: "text-slate-600" };
}

const LEAD_STATUS_OPTIONS = [
  "new",
  "contacted",
  "qualified",
  "matching",
  "matched",
  "interview_scheduled",
  "interview_passed",
  "interview_failed",
  "contract_signed",
  "visa_processing",
  "departed",
  "disqualified"
] as const;

const LEAD_SOURCE_OPTIONS = ["zalo", "facebook", "miniapp"] as const;
const LEAD_PARAM_DEFAULTS = {
  page: 1,
  pageSize: 20,
  q: "",
  status: "",
  source: "",
  from: "",
  to: ""
};

export function LeadsPage() {
  const { copy, formatLeadStatus, formatEnum, formatChannel, lang } = useI18n();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const status = readStringOption(searchParams, "status", LEAD_STATUS_OPTIONS);
  const source = readStringOption(searchParams, "source", LEAD_SOURCE_OPTIONS);
  const page = readPageIndex(searchParams);
  const pageSize = readNumberOption(searchParams, "pageSize", PAGE_SIZE_OPTIONS, 20) as PageSize;
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  // Default ON: unidentified Zalo intake rows (placeholder name, no phone/
  // fullName) are hidden unless the operator opts in via ?hideUnnamed=0.
  const hideUnnamed = searchParams.get("hideUnnamed") !== "0";
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  // Create-from-form: the Journey "new" mode now lives here as a modal.
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const navigate = useNavigate();
  const { canEditLeads } = usePermissions();
  const deferredSearch = useDeferredValue(search);
  const leadReturnState = createReturnState(location, copy({ en: "Leads", vi: "Danh sách ứng viên" }));

  const updateLeadParams = (
    updates: Record<string, SearchParamValue>,
    options: { replace?: boolean } = {}
  ) => {
    setSearchParams(
      (current) => applySearchParamUpdates(current, updates, LEAD_PARAM_DEFAULTS),
      { replace: options.replace }
    );
  };

  const query = useLeadsQuery({
    offset: page * pageSize,
    limit: pageSize,
    search: deferredSearch || undefined,
    status: status || undefined,
    source: source || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    hidePlaceholderNames: hideUnnamed || undefined
  });

  const leads = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  useRestoreRouteScroll(location, !query.isLoading);
  const currentStart = total === 0 ? 0 : page * pageSize + 1;
  const currentEnd = Math.min((page + 1) * pageSize, total);

  const exportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { blob, filename } = await apiClient.exportLeadsCsv({
        search: deferredSearch || undefined,
        status: status || undefined,
        source: source || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        lang
      });
      triggerBlobDownload(blob, filename);
    } finally {
      setIsExporting(false);
    }
  };

  const resetPageUpdate = { page: null };

  const pageLeadIds = leads.map((lead) => lead.id);
  const allSelectedOnPage = pageLeadIds.length > 0 && pageLeadIds.every((id) => selectedIds.has(id));
  const someSelectedOnPage = !allSelectedOnPage && pageLeadIds.some((id) => selectedIds.has(id));
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        pageLeadIds.forEach((id) => next.delete(id));
      } else {
        pageLeadIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stats = useMemo(() => {
    return {
      stale: leads.filter((lead) => !lead.updatedAt || lead.updatedAt === lead.createdAt).length,
      hot: leads.filter((lead) => (lead.leadScore ?? 0) >= 80).length,
      blocked: leads.filter((lead) => ["interview_failed", "disqualified"].includes(lead.status.toLowerCase())).length,
      worked: leads.filter((lead) => ["qualified", "matching", "matched", "interview_scheduled"].includes(lead.status.toLowerCase())).length
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={<UiText id="leads.inbox.eyebrow" />}
        title={<UiText id="leads.inbox.title" />}
        description={<UiText id="leads.inbox.desc" />}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Strip label={copy({ en: "Loaded", vi: "Đã tải" })} value={leads.length} hint={copy({ en: "Rows on this page", vi: "Số dòng trên trang này" })} />
      <Strip label={copy({ en: "Total", vi: "Tổng" })} value={total} hint={copy({ en: "Backend result size", vi: "Tổng kết quả từ API" })} />
        <Strip label={copy({ en: "Hot", vi: "Nóng" })} value={stats.hot} hint={copy({ en: "Score >= 80 on this page", vi: "Điểm >= 80 trên trang này" })} tone="accent" />
        <Strip label={copy({ en: "Blocked", vi: "Bị chặn" })} value={stats.blocked} hint={copy({ en: "Failed or disqualified on this page", vi: "Trượt hoặc bị loại trên trang này" })} tone="danger" />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_auto]">
            <Input
              label={copy({ en: "Name or phone", vi: "Tên hoặc SĐT ứng viên" })}
              value={search}
              onChange={(event) => {
                const value = event.target.value;
                startTransition(() => {
                  updateLeadParams({ q: value, ...resetPageUpdate }, { replace: true });
                });
              }}
              placeholder={copy({ en: "Name or phone number...", vi: "Tên hoặc số điện thoại..." })}
            />
            <Select
              label={copy({ en: "Status", vi: "Trạng thái" })}
              value={status}
              onChange={(event) => {
                updateLeadParams({ status: event.target.value, ...resetPageUpdate });
              }}
            >
              <option value="">{copy({ en: "All statuses", vi: "Tất cả trạng thái" })}</option>
              {LEAD_STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatLeadStatus(value)}
                </option>
              ))}
            </Select>
            <Select
              label={copy({ en: "Channel", vi: "Kênh" })}
              value={source}
              onChange={(event) => {
                updateLeadParams({ source: event.target.value, ...resetPageUpdate });
              }}
            >
              <option value="">{copy({ en: "All channels", vi: "Tất cả kênh" })}</option>
              {LEAD_SOURCE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatChannel(value)}
                </option>
              ))}
            </Select>
            <ToolbarActions className="justify-start xl:justify-end">
              {canEditLeads ? (
                <Button onClick={() => setCreateFormOpen(true)}>
                  {copy({ en: "Create from form", vi: "Tạo từ form" })}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={exportCsv} disabled={isExporting}>
                {isExporting
                  ? copy({ en: "Exporting...", vi: "Đang xuất..." })
                  : copy({ en: "Export CSV", vi: "Xuất CSV" })}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  updateLeadParams({
                    q: null,
                    status: null,
                    source: null,
                    from: null,
                    to: null,
                    page: null,
                    pageSize: null,
                    hideUnnamed: null
                  });
                }}
              >
                {copy({ en: "Reset", vi: "Đặt lại" })}
              </Button>
            </ToolbarActions>
          </div>

          <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-[1fr_1fr_1fr_auto]">
            <Select
              label={copy({ en: "Unidentified Zalo accounts", vi: "Tài khoản Zalo chưa định danh" })}
              value={hideUnnamed ? "hide" : "show"}
              onChange={(event) => {
                updateLeadParams({
                  hideUnnamed: event.target.value === "hide" ? null : "0",
                  ...resetPageUpdate
                });
              }}
            >
              <option value="hide">{copy({ en: "Hide", vi: "Ẩn" })}</option>
              <option value="show">{copy({ en: "Show", vi: "Hiện" })}</option>
            </Select>
            <Input
              type="date"
              label={copy({ en: "Created from", vi: "Tạo từ" })}
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => {
                updateLeadParams({ from: event.target.value, ...resetPageUpdate });
              }}
            />
            <Input
              type="date"
              label={copy({ en: "Created to", vi: "Tạo đến" })}
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => {
                updateLeadParams({ to: event.target.value, ...resetPageUpdate });
              }}
            />
            <Select
              label={copy({ en: "Rows per page", vi: "Số dòng / trang" })}
              value={String(pageSize)}
              onChange={(event) => {
                const next = Number(event.target.value) as PageSize;
                updateLeadParams({ pageSize: next, ...resetPageUpdate });
              }}
              className="min-w-[8rem] xl:w-40"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Toolbar>

      <div>
        <DataTable>
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">{copy({ en: "Lead list", vi: "Danh sách ứng viên" })}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {copy({
                    en: `Showing ${currentStart}-${currentEnd} of ${total} records. ${stats.stale} on this page still look untouched since capture.`,
                    vi: `Đang hiển thị ${currentStart}-${currentEnd} / ${total} hồ sơ. ${stats.stale} hồ sơ trên trang này vẫn chưa có thao tác kể từ lúc ghi nhận.`
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RefreshButton
                  label={copy({ en: "Refresh lead list", vi: "Tải lại danh sách ứng viên" })}
                  refreshingLabel={copy({ en: "Refreshing lead list", vi: "Đang tải lại danh sách ứng viên" })}
                  isRefreshing={query.isFetching}
                  onRefresh={() => void query.refetch()}
                />
                {query.isFetching ? <Badge tone="warning">{copy({ en: "Refreshing", vi: "Đang tải lại" })}</Badge> : null}
                <Badge tone="neutral">{copy({ en: `${stats.worked} active in pipeline`, vi: `${stats.worked} đang hoạt động trong pipeline` })}</Badge>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-28rem)] min-h-[360px] overflow-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 shadow-[0_1px_0_rgba(226,232,240,1)]">
                <tr>
                  <th className="w-10 px-6 py-4">
                    <input
                      type="checkbox"
                      aria-label={copy({ en: "Select all on this page", vi: "Chọn tất cả trang này" })}
                      checked={allSelectedOnPage}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelectedOnPage;
                      }}
                      onChange={toggleSelectAllOnPage}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="py-4 pr-4">{copy({ en: "Candidate", vi: "Ứng viên tiềm năng" })}</th>
                  <th className="py-4 pr-4">{copy({ en: "Source", vi: "Nguồn" })}</th>
                  <th className="py-4 pr-4">{copy({ en: "Experience & education", vi: "Kinh nghiệm & học vấn" })}</th>
                  <th className="py-4 pr-4">{copy({ en: "Job needs", vi: "Nhu cầu" })}</th>
                  <th className="py-4 pr-4">{copy({ en: "Assignee", vi: "Phụ trách" })}</th>
                  <th className="py-4 pr-4">{copy({ en: "Status", vi: "Trạng thái" })}</th>
                  <th className="py-4 pr-4">{copy({ en: "Score", vi: "Điểm số" })}</th>
                  <th className="py-4 pr-6" />
                </tr>
              </thead>
              <tbody>
                {leads.length ? (
                  leads.map((lead) => {
                    const isSelected = selectedIds.has(lead.id);
                    const age = readAge(lead);
                    const gender = (resolveProfileField(lead, "gender") as string | null) ?? lead.gender ?? null;
                    const experienceField =
                      (resolveProfileField(lead, "experienceField") as string | null) ?? null;
                    const experienceLevelRaw =
                      (resolveProfileField(lead, "experienceLevel") as string | null) ??
                      lead.experienceLevel ??
                      null;
                    const desiredIndustry =
                      (resolveProfileField(lead, "desiredIndustry") as string | null) ?? null;
                    const preferredRegions = readPreferredRegions(lead);
                    const score = lead.leadScore ?? null;
                    const scoreTone = scoreBarTone(score);
                    const scorePct = Math.max(0, Math.min(100, score ?? 0));
                    return (
                      <tr
                        key={lead.id}
                        className={`border-t border-slate-200 align-top transition-colors ${isSelected ? "bg-indigo-50/40" : "hover:bg-slate-50"}`}
                      >
                        <td className="w-10 px-6 py-5">
                          <input
                            type="checkbox"
                            aria-label={copy({
                              en: `Select ${getLeadDisplayName(lead)}`,
                              vi: `Chọn ${getLeadDisplayName(lead)}`
                            })}
                            checked={isSelected}
                            onChange={() => toggleSelectOne(lead.id)}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-5 pr-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                              {getLeadDisplayName(lead).slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/leads/${lead.id}`}
                                state={leadReturnState}
                                onClick={() => saveRouteScroll(location)}
                                className="font-semibold text-slate-900 hover:text-indigo-700"
                              >
                                {getLeadDisplayName(lead)}
                              </Link>
                              {getLeadFullNameLabel(lead) && (
                                <div className="text-xs text-slate-500 truncate">{getLeadFullNameLabel(lead)}</div>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-slate-500">
                                <span>{lead.phone || copy({ en: "No phone", vi: "Chưa có số" })}</span>
                                {age != null ? (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span>{copy({ en: `${age}y`, vi: `${age}t` })}</span>
                                  </>
                                ) : null}
                                {gender ? (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span>{formatEnum(gender)}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 pr-4">
                          <Badge tone="neutral">{formatChannel(lead.source)}</Badge>
                        </td>
                        <td className="py-5 pr-4">
                          {experienceField ? (
                            <Badge tone="success">{String(experienceField).toUpperCase()}</Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          {experienceLevelRaw ? (
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {formatEnum(experienceLevelRaw)}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-5 pr-4">
                          {desiredIndustry ? (
                            <div className="text-sm text-slate-700">{formatEnum(desiredIndustry)}</div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          {preferredRegions.length > 0 ? (
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {formatEnum(preferredRegions[0])}
                              {preferredRegions.length > 1 ? ` (+${preferredRegions.length - 1})` : ""}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-5 pr-4">
                          {lead.assignee?.username ? (
                            <span className="text-sm text-slate-700">{lead.assignee.username}</span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {copy({ en: "Unassigned", vi: "Chưa phân công" })}
                            </span>
                          )}
                        </td>
                        <td className="py-5 pr-4">
                          <Badge tone={toneForStatus(lead.status)}>{formatLeadStatus(lead.status)}</Badge>
                        </td>
                        <td className="py-5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className={`min-w-[2ch] text-sm font-semibold ${scoreTone.text}`}>
                              {score ?? "—"}
                            </div>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${scoreTone.fill}`}
                                style={{ width: `${scorePct}%` }}
                              />
                            </div>
                          </div>
                          {lead.leadClassification ? (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                              {formatEnum(lead.leadClassification)}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-5 pr-6 text-right">
                          <Link
                            to={`/leads/${lead.id}`}
                            state={leadReturnState}
                            onClick={() => saveRouteScroll(location)}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                          >
                            {copy({ en: "Details", vi: "Chi tiết" })}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                      {copy({ en: "No leads match the current filters.", vi: "Không có ứng viên phù hợp với bộ lọc hiện tại." })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationFooter
            page={page}
            pageSize={pageSize}
            total={total}
            isFetching={query.isFetching}
            itemLabel={copy({ en: "leads", vi: "Ứng viên" })}
            pageLabel={copy({ en: "Page", vi: "Trang" })}
            previousLabel={copy({ en: "Previous", vi: "Trước" })}
            nextLabel={copy({ en: "Next", vi: "Sau" })}
            onPrevious={() => updateLeadParams({ page: Math.max(1, page) })}
            onNext={() => updateLeadParams({ page: page + 2 })}
          />
        </DataTable>

      </div>
      {createFormOpen ? (
        <FormIntakeModal
          createMode
          onLeadCommitted={(newLeadId) => {
            setCreateFormOpen(false);
            navigate(`/leads/${newLeadId}`, { state: leadReturnState });
          }}
          onClose={() => setCreateFormOpen(false)}
        />
      ) : null}
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

