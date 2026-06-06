import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, EmptyState, Panel } from "@social-crm/ui";
import {
  useApplicationsQuery,
  useCandidateByLeadQuery,
  useFormStandardRegisterQuery,
  useLeadDetailQuery,
  useTrainingFinanceByLeadQuery,
} from "@social-crm/api";
import type { PipelineRow } from "@social-crm/api";
import { useI18n } from "@/i18n";
import { UiText } from "@/ui-text/ui-text";
import { getLeadDisplayName } from "@/lib/lead-display";
import { currentPhaseKey, derivePhases, PHASE_KEYS, type JourneyPhase, type PhaseKey, type PhaseState } from "./journey-phases";
import { ApplicationPhasePanel } from "./application-phase-panel";
import { FormIntakeModal } from "./form-intake-modal";
import { DossierModal } from "@/features/leads/dossier-modal";
import { TrainingFinanceDetailPage } from "../training-finance/training-finance-detail-page";

/**
 * Journey workbench — the single-candidate surface for `/journey/:leadId`.
 *
 * This is the spine that replaces module-hopping: a sticky phase rail on the
 * left, five stacked phase sections on the right. The rail is driven by the
 * same `derivePhases` logic as the cohort board, so a candidate's position is
 * described identically in both places.
 *
 * Step 2 scope: the shell, the rail (scroll-spy + click-to-scroll), and a live
 * summary per phase that deep-links into the existing working pages. Steps 3-4
 * inline the actual editing controls (form intake, status transitions, finance)
 * into the §1/§3/§4 sections, replacing the deep-link with in-place action.
 */

const NODE_RING: Record<PhaseState, string> = {
  complete: "border-emerald-500 bg-emerald-500 text-white",
  active: "border-indigo-500 bg-indigo-50 text-indigo-700",
  blocked: "border-rose-500 bg-rose-50 text-rose-700",
  failed: "border-rose-300 bg-rose-50 text-rose-400",
  pending: "border-slate-300 bg-white text-slate-400",
};

const STATE_TONE: Record<PhaseState, "success" | "accent" | "danger" | "warning" | "neutral"> = {
  complete: "success",
  active: "accent",
  blocked: "danger",
  failed: "danger",
  pending: "neutral",
};

function stateLabel(state: PhaseState, copy: (v: { en: string; vi: string }) => string) {
  switch (state) {
    case "complete":
      return copy({ en: "Complete", vi: "Hoàn tất" });
    case "active":
      return copy({ en: "In progress", vi: "Đang xử lý" });
    case "blocked":
      return copy({ en: "Blocked", vi: "Đang nghẽn" });
    case "failed":
      return copy({ en: "Closed", vi: "Đã đóng" });
    default:
      return copy({ en: "Pending", vi: "Chưa tới" });
  }
}

function PhaseRail(props: {
  phases: JourneyPhase[];
  activeKey: PhaseKey;
  onSelect: (key: PhaseKey) => void;
  copy: (v: { en: string; vi: string }) => string;
}) {
  const { phases, activeKey, onSelect, copy } = props;
  return (
    <nav aria-label={copy({ en: "Phase navigation", vi: "Điều hướng giai đoạn" })} className="lg:sticky lg:top-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="hidden px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 lg:block">
          {copy({ en: "Journey", vi: "Hành trình" })}
        </div>
        {/* Horizontal scroll strip on mobile; sticky vertical list on lg. */}
        <ol className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
          {phases.map((phase, index) => {
            const selected = phase.key === activeKey;
            return (
              <li key={phase.key} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => onSelect(phase.key)}
                  aria-current={selected ? "true" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${selected ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-slate-50"}`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${NODE_RING[phase.state]}`}
                  >
                    {phase.state === "complete" ? "✓" : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${selected ? "text-indigo-900" : "text-slate-700"}`}>
                      {copy({ en: phase.labelEn, vi: phase.labelVi })}
                    </span>
                    <span className="mt-0.5 hidden truncate text-xs text-slate-500 lg:block">
                      {copy({ en: phase.detailEn, vi: phase.detailVi })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

/**
 * Accordion-style phase panel: only the active phase renders its body; the
 * rest collapse to a clickable header. This keeps the workbench short — the
 * operator focuses one phase at a time instead of scrolling through all five.
 */
function PhaseSection(props: {
  phase: JourneyPhase;
  index: number;
  activeKey: PhaseKey;
  onSelect: (key: PhaseKey) => void;
  copy: (v: { en: string; vi: string }) => string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { phase, index, activeKey, onSelect, copy, children, action } = props;
  const open = phase.key === activeKey;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${open ? "border-b border-slate-100" : ""}`}>
        <button
          type="button"
          onClick={() => onSelect(phase.key)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${NODE_RING[phase.state]}`}>
            {phase.state === "complete" ? "✓" : index + 1}
          </span>
          <h2 className="truncate text-base font-semibold text-slate-900">{copy({ en: phase.labelEn, vi: phase.labelVi })}</h2>
          <Badge tone={STATE_TONE[phase.state]}>{stateLabel(phase.state, copy)}</Badge>
          <span className="ml-1 text-slate-400">{open ? "▾" : "▸"}</span>
        </button>
        {open ? action : null}
      </div>
      {open ? <div className="px-5 py-4">{children}</div> : null}
    </section>
  );
}

function SummaryRow(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-[0.1em] text-slate-400">{props.label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{props.value}</span>
    </div>
  );
}

/** Thin route wrapper — reads the lead id from the URL and renders the
 *  workbench as a full page. */
export function JourneyWorkbenchPage() {
  const { leadId = "" } = useParams();
  return <JourneyWorkbench leadId={leadId} />;
}

/**
 * The candidate workbench. One component, two presentations:
 *  - page (default) at /journey/:leadId
 *  - modal (when `onClose` is passed) opened from Orders order-first matching,
 *    with `presetOrderId` locking the target order and `defaultPhase` opening
 *    on the Application phase.
 */
export function JourneyWorkbench(props: {
  leadId: string;
  presetOrderId?: string;
  defaultPhase?: PhaseKey;
  onClose?: () => void;
}) {
  const { leadId, presetOrderId, onClose } = props;
  const isModal = Boolean(onClose);
  const { copy, formatLeadStatus, formatDocumentStatus } = useI18n();

  const leadQuery = useLeadDetailQuery(leadId);
  const candidateQuery = useCandidateByLeadQuery(leadId);
  const applicationsQuery = useApplicationsQuery({ offset: 0, limit: 1, leadId: leadId || undefined }, { enabled: Boolean(leadId) });
  const formQuery = useFormStandardRegisterQuery(leadId ? { offset: 0, limit: 1, leadId } : undefined, { enabled: Boolean(leadId) });
  const tfQuery = useTrainingFinanceByLeadQuery(leadId || undefined);

  const lead = leadQuery.data;
  const candidate = candidateQuery.data ?? null;
  const application = applicationsQuery.data?.data?.[0] ?? null;
  const form = formQuery.data?.data?.[0] ?? null;
  const tf = tfQuery.data?.[0] ?? null;

  // Synthesize a PipelineRow so the rail uses the exact same derivation as the
  // cohort board. The section cards below carry the precise live data.
  const phases = useMemo<JourneyPhase[]>(() => {
    if (!lead) return [];
    const row: PipelineRow = {
      leadId,
      leadName: getLeadDisplayName(lead),
      phone: lead.phone,
      source: lead.source,
      currentStage: (lead.status ?? "new").toLowerCase(),
      candidateId: candidate?.id ?? null,
      candidateCode: candidate?.code ?? null,
      applicationStatus: application?.status ?? null,
      applicationOrderName: application?.order?.name ?? null,
      documents: { missingRequired: [], expired: [], total: form ? 1 : 0 },
      trainingFinance: tf
        ? {
            depositStatus: tf.depositStatus,
            amountPaid: tf.amountPaid,
            trainingProgress: tf.trainingProgress,
            visaDate: tf.visaDate,
            departureDate: tf.departureDate,
          }
        : null,
      blockers: [],
      nextAction: "",
    };
    return derivePhases(row);
  }, [lead, leadId, candidate, application, form, tf]);

  // The rail switches the active phase; only the active section renders its
  // body (accordion), so the page stays short instead of stacking all five.
  // Until the operator picks a phase, default to where the case actually is.
  const [activeOverride, setActiveOverride] = useState<PhaseKey | null>(props.defaultPhase ?? null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);

  if (!lead && leadQuery.isLoading) {
    return (
      <Panel title={<UiText id="journey.workbench.title" />}>
        <div className="text-sm text-slate-500">{copy({ en: "Loading candidate...", vi: "Đang tải ứng viên..." })}</div>
      </Panel>
    );
  }

  if (!lead) {
    return (
      <Panel title={<UiText id="journey.workbench.title" />}>
        <EmptyState
          title={<UiText id="journey.workbench.not-found.title" />}
          description={<UiText id="journey.workbench.not-found.desc" />}
        />
      </Panel>
    );
  }

  const completeCount = phases.filter((p) => p.state === "complete").length;
  const byKey = (key: PhaseKey) => phases.find((p) => p.key === key)!;
  const activeKey: PhaseKey = activeOverride ?? currentPhaseKey(phases) ?? "intake";
  const activeIdx = PHASE_KEYS.indexOf(activeKey);
  const prevKey = activeIdx > 0 ? PHASE_KEYS[activeIdx - 1] : null;
  const nextKey = activeIdx >= 0 && activeIdx < PHASE_KEYS.length - 1 ? PHASE_KEYS[activeIdx + 1] : null;

  return (
    <div className="space-y-5">
      {/* Candidate header */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {isModal ? (
              <Link to={`/journey/${leadId}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                <UiText id="journey.workbench.open-full" />
              </Link>
            ) : (
              <Link to="/journey" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                ← <UiText id="journey.workbench.back-to-board" />
              </Link>
            )}
            <h1 className="mt-1 truncate text-xl font-semibold text-slate-900">{getLeadDisplayName(lead)}</h1>
            <div className="mt-0.5 truncate text-sm text-slate-500">
              {lead.source?.toUpperCase()} · {lead.phone || copy({ en: "No phone", vi: "Chưa có SĐT" })}
              {candidate?.code ? ` · ${candidate.code}` : ""}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-end gap-2">
              <Badge tone="neutral">{formatLeadStatus(lead.status)}</Badge>
              <span className="text-xs text-slate-500">
                {copy({ en: `${completeCount} of ${phases.length} phases complete`, vi: `Hoàn tất ${completeCount}/${phases.length} giai đoạn` })}
              </span>
            </div>
            {isModal ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label={copy({ en: "Close", vi: "Đóng" })}
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <PhaseRail phases={phases} activeKey={activeKey} onSelect={setActiveOverride} copy={copy} />

        <div className="space-y-5">
          {/* §1 Form intake — compact status; staging flow opens in a modal */}
          <PhaseSection
            phase={byKey("intake")}
            index={0}
            activeKey={activeKey} onSelect={setActiveOverride}
            copy={copy}
            action={
              <button
                type="button"
                onClick={() => setFormModalOpen(true)}
                className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
              >
                {form?.hasFile
                  ? <UiText id="journey.workbench.form.manage" />
                  : <UiText id="journey.workbench.form.upload" />}
              </button>
            }
          >
            <div className="space-y-1">
              <SummaryRow
                label={copy({ en: "Standard form", vi: "Form chuẩn" })}
                value={form ? (form.hasFile ? formatDocumentStatus(form.documentStatus) : copy({ en: "No file", vi: "Chưa có file" })) : copy({ en: "Not staged", vi: "Chưa có form" })}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              <UiText id="journey.workbench.form.helper" />
            </p>
          </PhaseSection>

          {/* §2 Dossier */}
          <PhaseSection
            phase={byKey("dossier")}
            index={1}
            activeKey={activeKey} onSelect={setActiveOverride}
            copy={copy}
            action={
              <button
                type="button"
                onClick={() => setDossierOpen(true)}
                disabled={!candidate?.profile}
                className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <UiText id="journey.workbench.dossier.view" />
              </button>
            }
          >
            <div className="space-y-1">
              <SummaryRow
                label={copy({ en: "Candidate", vi: "Ứng viên" })}
                value={candidate ? candidate.code || candidate.id : copy({ en: "Not created", vi: "Chưa tạo" })}
              />
              <SummaryRow
                label={copy({ en: "Dossier", vi: "Hồ sơ" })}
                value={candidate?.profile ? copy({ en: "Ready", vi: "Đã có" }) : copy({ en: "Empty", vi: "Trống" })}
              />
            </div>
          </PhaseSection>

          {/* §3 Application — create gate + status transitions, inlined */}
          <PhaseSection phase={byKey("application")} index={2} activeKey={activeKey} onSelect={setActiveOverride} copy={copy}>
            <ApplicationPhasePanel
              leadId={leadId}
              leadStatus={lead.status}
              candidate={candidate}
              form={form}
              application={application}
              presetOrderId={presetOrderId}
            />
          </PhaseSection>

          {/* §4 Training & Finance — milestone record editor, inlined */}
          <PhaseSection phase={byKey("training")} index={3} activeKey={activeKey} onSelect={setActiveOverride} copy={copy}>
            <TrainingFinanceDetailPage embeddedRecordId={tf ? tf.id : "new"} embeddedLeadId={leadId} />
          </PhaseSection>

          {/* §5 Departure — status summary; departure date is edited in §4 above. */}
          <PhaseSection phase={byKey("departure")} index={4} activeKey={activeKey} onSelect={setActiveOverride} copy={copy}>
            <div className="space-y-1">
              <SummaryRow label={copy({ en: "Departure date", vi: "Ngày xuất cảnh" })} value={tf?.departureDate || copy({ en: "Not scheduled", vi: "Chưa lên lịch" })} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              <UiText id="journey.workbench.departure.helper" />
            </p>
          </PhaseSection>
        </div>
      </div>

      {/* Phase navigation: move between phases, plus Close in modal mode. */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          disabled={!prevKey}
          onClick={() => prevKey && setActiveOverride(prevKey)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← {prevKey ? copy({ en: byKey(prevKey).labelEn, vi: byKey(prevKey).labelVi }) : copy({ en: "Back", vi: "Quay lại" })}
        </button>
        <div className="flex items-center gap-2">
          {isModal ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <UiText id="journey.workbench.close" />
            </button>
          ) : null}
          <button
            type="button"
            disabled={!nextKey}
            onClick={() => nextKey && setActiveOverride(nextKey)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextKey ? copy({ en: byKey(nextKey).labelEn, vi: byKey(nextKey).labelVi }) : copy({ en: "Last phase", vi: "Giai đoạn cuối" })} →
          </button>
        </div>
      </div>

      {formModalOpen ? (
        <FormIntakeModal
          leadId={leadId}
          onClose={() => setFormModalOpen(false)}
          onViewDossier={() => {
            setFormModalOpen(false);
            setDossierOpen(true);
          }}
        />
      ) : null}
      {dossierOpen ? (
        <DossierModal
          name={getLeadDisplayName(lead)}
          profile={candidate?.profile}
          onClose={() => setDossierOpen(false)}
          onEditForm={() => {
            setDossierOpen(false);
            setFormModalOpen(true);
          }}
        />
      ) : null}
    </div>
  );
}
