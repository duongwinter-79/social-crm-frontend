import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  EmptyState,
  InfoStrip,
  Input,
  PaginationFooter,
  Panel,
  SectionHeader,
  Select,
} from "@social-crm/ui";
import { usePipelineQuery } from "@social-crm/api";
import type { PipelineRow } from "@social-crm/api";
import { useI18n } from "@/i18n";
import { getLeadDisplayName } from "@/lib/lead-display";
import { UiText } from "@/ui-text/ui-text";
import {
  currentPhaseKey,
  derivePhases,
  PHASE_KEYS,
  PHASE_LABELS,
  type JourneyPhase,
  type PhaseKey,
  type PhaseState,
} from "./journey-phases";

const PAGE_SIZE = 25;

/**
 * Stages shown in the Journey "Stage" filter, in lead-pipeline lifecycle order
 * (a subset of the backend `LeadStatus` enum — the milestones operators filter
 * by). Fixed list so the dropdown order is stable and independent of how many
 * candidates currently sit in each stage.
 */
const FILTER_STAGES = [
  "new", // Mới tiếp nhận
  "contacted", // Đã liên hệ
  "qualified", // Đã có form
  "visa_processing", // Đóng visa
  "departed", // Đã xuất cảnh
] as const;

/**
 * Journey — the unified candidate cohort view.
 *
 * Replaces the separate Pipeline / Applications-list / Training-finance-ledger
 * surfaces with one screen where every candidate is a single horizontal track
 * spanning Form → Dossier → Application → Training & Finance → Departure. Fed by
 * the aggregated `/pipeline` endpoint; phase derivation lives in journey-phases.
 */

const STATE_BAR: Record<PhaseState, string> = {
  complete: "bg-emerald-500",
  active: "bg-indigo-500",
  blocked: "bg-rose-500",
  failed: "bg-rose-300",
  pending: "bg-transparent",
};

const STATE_LABEL: Record<PhaseState, string> = {
  complete: "text-emerald-700",
  active: "text-indigo-700",
  blocked: "text-rose-700",
  failed: "text-rose-500",
  pending: "text-slate-400",
};

const STATE_DETAIL: Record<PhaseState, string> = {
  complete: "text-slate-600",
  active: "text-slate-800",
  blocked: "text-rose-600",
  failed: "text-rose-500",
  pending: "text-slate-400",
};

function PhaseSegment(props: {
  phase: JourneyPhase;
  copy: (value: { en: string; vi: string }) => string;
}) {
  const { phase, copy } = props;
  const fill = Math.round(phase.progress * 100);
  const isFailed = phase.state === "failed";
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-1">
        <span className={`truncate text-[10px] font-semibold uppercase tracking-[0.14em] ${STATE_LABEL[phase.state]}`}>
          {copy({ en: phase.labelEn, vi: phase.labelVi })}
        </span>
        {phase.state === "blocked" ? <span className="text-[10px] font-bold text-rose-600">!</span> : null}
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={`h-full rounded-full transition-all duration-500 ${STATE_BAR[phase.state]}`}
          style={{ width: `${phase.state === "pending" ? 0 : Math.max(fill, 6)}%` }}
        />
      </div>
      <div
        className={`mt-1 truncate text-[11px] leading-4 ${STATE_DETAIL[phase.state]} ${isFailed ? "line-through decoration-rose-300" : ""}`}
        title={copy({ en: phase.detailEn, vi: phase.detailVi })}
      >
        {copy({ en: phase.detailEn, vi: phase.detailVi })}
      </div>
    </div>
  );
}

function JourneyTrack(props: {
  phases: JourneyPhase[];
  copy: (value: { en: string; vi: string }) => string;
}) {
  return (
    <div className="flex items-start gap-3">
      {props.phases.map((phase) => (
        <PhaseSegment key={phase.key} phase={phase} copy={props.copy} />
      ))}
    </div>
  );
}

function JourneyRow(props: {
  row: PipelineRow;
  phases: JourneyPhase[];
  copy: (value: { en: string; vi: string }) => string;
  formatPipelineStage: (value: string) => string;
  formatPipelineNextAction: (value: string) => string;
  formatPipelineBlocker: (value: string) => string;
}) {
  const { row, phases, copy, formatPipelineStage, formatPipelineNextAction, formatPipelineBlocker } = props;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Identity */}
        <div className="w-full shrink-0 lg:w-56">
          <div className="truncate font-semibold text-slate-900">
            {getLeadDisplayName({ displayName: row.displayName ?? row.leadName, fullName: row.fullName })}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {row.phone || copy({ en: "No phone", vi: "Chưa có SĐT" })} · {row.source}
          </div>
          <div className="mt-2">
            <Badge tone="neutral">{formatPipelineStage(row.currentStage)}</Badge>
          </div>
        </div>

        {/* Journey track */}
        <div className="min-w-0 flex-1">
          <JourneyTrack phases={phases} copy={copy} />
        </div>

        {/* Next action + open */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2 lg:w-52 lg:items-end">
          <div className="text-right text-xs text-slate-500 lg:text-right">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {copy({ en: "Next action", vi: "Việc tiếp theo" })}
            </span>
            <span className="mt-0.5 block font-medium text-slate-700">{formatPipelineNextAction(row.nextAction)}</span>
          </div>
          <Link
            to={`/journey/${row.leadId}`}
            className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
          >
            <UiText id="journey.board.open.button" />
          </Link>
        </div>
      </div>

      {row.blockers.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-500">
            {copy({ en: "Blockers", vi: "Điểm nghẽn" })}
          </span>
          {row.blockers.map((blocker) => (
            <Badge key={blocker} tone="danger">
              {formatPipelineBlocker(blocker)}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function JourneyPage() {
  const { copy, formatPipelineStage, formatPipelineNextAction, formatPipelineBlocker } = useI18n();
  const [filters, setFilters] = useState({ stage: "", search: "" });
  const [phaseFilter, setPhaseFilter] = useState<PhaseKey | "">("");
  const [page, setPage] = useState(0);

  const pipelineQuery = usePipelineQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    stage: filters.stage || undefined,
    search: filters.search || undefined,
  });

  const rows = pipelineQuery.data?.data ?? [];

  // Phase derivation + the optional "stuck at phase" client filter. The stage
  // and text filters hit the server; the phase filter is a view over the page.
  const decorated = useMemo(
    () => rows.map((row) => ({ row, phases: derivePhases(row) })),
    [rows],
  );
  const phaseCounts = useMemo(() => {
    const counts: Record<PhaseKey, number> = {
      intake: 0,
      dossier: 0,
      application: 0,
      training: 0,
      departure: 0,
    };
    for (const { phases } of decorated) {
      const here = currentPhaseKey(phases);
      if (here) counts[here] += 1;
    }
    return counts;
  }, [decorated]);
  const visible = useMemo(
    () => (phaseFilter ? decorated.filter(({ phases }) => currentPhaseKey(phases) === phaseFilter) : decorated),
    [decorated, phaseFilter],
  );

  useEffect(() => {
    setPage(0);
  }, [filters.stage, filters.search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Journey", vi: "Hành trình" })}
        title={<UiText id="journey.board.title" />}
        description={copy({
          en: "One continuous view of every candidate from form intake through dossier, application, training & finance, and departure — no module hopping.",
          vi: "Một góc nhìn liền mạch cho từng ứng viên: từ nhận form, hồ sơ, ứng tuyển, đào tạo & tài chính đến xuất cảnh — không cần nhảy qua nhiều màn hình.",
        })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {copy({
              en: "Each row is one candidate. The track shows where they are across the whole pipeline.",
              vi: "Mỗi dòng là một ứng viên. Thanh tiến trình cho biết họ đang ở đâu trong toàn bộ quy trình.",
            })}
          </span>
          <Badge tone="neutral">
            {pipelineQuery.data?.total ?? 0} {copy({ en: "candidates", vi: "ứng viên" })}
          </Badge>
        </div>
      </InfoStrip>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label={copy({ en: "Stage", vi: "Giai đoạn" })}
            value={filters.stage}
            onChange={(e) => setFilters((s) => ({ ...s, stage: e.target.value }))}
          >
            <option value="">{copy({ en: "All stages", vi: "Tất cả giai đoạn" })}</option>
            {FILTER_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {formatPipelineStage(stage)}
              </option>
            ))}
          </Select>
          <Input
            label={copy({ en: "Search", vi: "Tìm kiếm" })}
            value={filters.search}
            onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
          />
        </div>

        {/* Phase filter — click a phase to see only candidates currently parked there. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {copy({ en: "Stuck at", vi: "Đang dừng ở" })}
          </span>
          <button
            type="button"
            onClick={() => setPhaseFilter("")}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
              phaseFilter === ""
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            {copy({ en: "All", vi: "Tất cả" })}
          </button>
          {PHASE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPhaseFilter((current) => (current === key ? "" : key))}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                phaseFilter === key
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {copy(PHASE_LABELS[key])}
              <span className="ml-1.5 text-slate-400">{phaseCounts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      <Panel
        title={<UiText id="journey.board.cohort.title" />}
        subtitle={copy({
          en: "Sorted by the active pipeline page. Open any candidate to act on their current phase.",
          vi: "Theo trang hiện tại của quy trình. Mở ứng viên để xử lý ngay giai đoạn họ đang ở.",
        })}
      >
        {visible.length ? (
          <div className="space-y-3">
            {visible.map(({ row, phases }) => (
              <JourneyRow
                key={row.leadId}
                row={row}
                phases={phases}
                copy={copy}
                formatPipelineStage={formatPipelineStage}
                formatPipelineNextAction={formatPipelineNextAction}
                formatPipelineBlocker={formatPipelineBlocker}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={copy({ en: "No candidates match", vi: "Không có ứng viên phù hợp" })}
            description={copy({
              en: "Adjust the stage, search, or phase filter to see candidates in the journey board.",
              vi: "Điều chỉnh giai đoạn, tìm kiếm hoặc bộ lọc giai đoạn để xem ứng viên trên bảng hành trình.",
            })}
          />
        )}
        <PaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={pipelineQuery.data?.total ?? 0}
          isFetching={pipelineQuery.isFetching}
          itemLabel={copy({ en: "candidates", vi: "ứng viên" })}
          pageLabel={copy({ en: "Page", vi: "Trang" })}
          previousLabel={copy({ en: "Previous", vi: "Trước" })}
          nextLabel={copy({ en: "Next", vi: "Sau" })}
          onPrevious={() => setPage((current) => Math.max(0, current - 1))}
          onNext={() => setPage((current) => current + 1)}
          className="mt-4 border-slate-100 px-0 pb-0 pt-4"
        />
      </Panel>
    </div>
  );
}
