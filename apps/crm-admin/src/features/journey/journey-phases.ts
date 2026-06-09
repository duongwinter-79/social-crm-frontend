import type { PipelineRow } from "@social-crm/api";

/**
 * Journey phase model.
 *
 * The backend `/pipeline` endpoint already aggregates every downstream signal
 * per lead (stage, candidate linkage, application status, document blockers,
 * training-finance milestones). This module collapses that flat row into the
 * five-phase timeline the Journey UI renders — one horizontal track per
 * candidate. Keeping the derivation pure (PipelineRow → JourneyPhase[]) makes
 * the visual layer dumb and the rules unit-testable in isolation.
 */

export type PhaseKey = "intake" | "dossier" | "application" | "training" | "departure";

/**
 * - complete : phase finished, nothing left to do here
 * - active   : phase is where the case currently lives
 * - blocked  : active phase has an operational blocker (see row.blockers)
 * - failed   : terminal negative outcome (interview failed / rejected / withdrawn)
 * - pending  : not reached yet
 */
export type PhaseState = "complete" | "active" | "blocked" | "failed" | "pending";

export interface JourneyPhase {
  key: PhaseKey;
  labelEn: string;
  labelVi: string;
  state: PhaseState;
  /** 0..1 fill for the segment bar. */
  progress: number;
  /** One-line caption shown under the segment. */
  detailEn: string;
  detailVi: string;
}

const INTAKE_REACHED_STAGES = new Set([
  "qualified",
  "matching",
  "matched",
  "interview_scheduled",
  "interview_passed",
  "interview_failed",
  "contract_signed",
  "signing",
  "visa_processing",
  "ready_to_depart",
  "departed",
]);

const APPLICATION_ORDER = [
  "matching",
  "referred",
  "interview_scheduled",
  "interview_passed",
  "signing",
  "ready_to_depart",
] as const;

const APPLICATION_FAILED = new Set(["interview_failed", "rejected", "withdrawn"]);

const DASH = "—";

function intakePhase(row: PipelineRow): JourneyPhase {
  const reached = INTAKE_REACHED_STAGES.has(row.currentStage) || Boolean(row.candidateId);
  if (reached) {
    return {
      key: "intake",
      labelEn: "Form",
      labelVi: "Form",
      state: "complete",
      progress: 1,
      detailEn: "Form ready",
      detailVi: "Đã có form",
    };
  }
  const contacted = row.currentStage === "contacted";
  return {
    key: "intake",
    labelEn: "Form",
    labelVi: "Form",
    state: "active",
    progress: contacted ? 0.6 : 0.3,
    detailEn: contacted ? "Contacted, form pending" : "New — awaiting form",
    detailVi: contacted ? "Đã liên hệ, chờ form" : "Mới — chờ form",
  };
}

function dossierPhase(row: PipelineRow, intakeDone: boolean): JourneyPhase {
  if (row.candidateId) {
    const missing = row.documents.missingRequired.length;
    return {
      key: "dossier",
      labelEn: "Dossier",
      labelVi: "Hồ sơ",
      state: missing > 0 ? "active" : "complete",
      progress: missing > 0 ? 0.7 : 1,
      detailEn: missing > 0 ? `${missing} document(s) missing` : row.candidateCode || "Dossier ready",
      detailVi: missing > 0 ? `Thiếu ${missing} giấy tờ` : row.candidateCode || "Đã có hồ sơ",
    };
  }
  return {
    key: "dossier",
    labelEn: "Dossier",
    labelVi: "Hồ sơ",
    state: intakeDone ? "active" : "pending",
    progress: 0,
    detailEn: intakeDone ? "Not created" : DASH,
    detailVi: intakeDone ? "Chưa tạo" : DASH,
  };
}

function applicationPhase(row: PipelineRow, dossierDone: boolean): JourneyPhase {
  const status = row.applicationStatus ?? "";
  const base = {
    key: "application" as const,
    labelEn: "Application",
    labelVi: "Ứng tuyển",
  };

  if (!status) {
    return {
      ...base,
      state: dossierDone ? "active" : "pending",
      progress: 0,
      detailEn: dossierDone ? "Ready to create" : DASH,
      detailVi: dossierDone ? "Sẵn sàng tạo" : DASH,
    };
  }

  if (APPLICATION_FAILED.has(status)) {
    return {
      ...base,
      state: "failed",
      progress: 1,
      detailEn: row.applicationOrderName ? `Closed · ${row.applicationOrderName}` : "Closed",
      detailVi: row.applicationOrderName ? `Đã đóng · ${row.applicationOrderName}` : "Đã đóng",
    };
  }

  const index = APPLICATION_ORDER.indexOf(status as (typeof APPLICATION_ORDER)[number]);
  const progress = index >= 0 ? (index + 1) / APPLICATION_ORDER.length : 0.5;
  const done = status === "ready_to_depart";
  return {
    ...base,
    state: done ? "complete" : "active",
    progress,
    detailEn: row.applicationOrderName || "In progress",
    detailVi: row.applicationOrderName || "Đang xử lý",
  };
}

// VND renders as whole numbers; TWD/USD carry 2 decimals — mirrors the
// training-finance form so the rail summary and the editor agree.
function formatAmount(value: number, currency: string): string {
  const decimals = currency === "VND" ? 0 : 2;
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Friendly deposit-status labels for the rail (journey-phases is i18n-free, so
// each language is built inline). Mirrors the training-finance form labels.
const DEPOSIT_LABELS_EN: Record<string, string> = {
  none: "No deposit",
  partial: "Partial deposit",
  full: "Paid in full",
  refunded: "Refunded",
};
const DEPOSIT_LABELS_VI: Record<string, string> = {
  none: "Chưa đặt cọc",
  partial: "Đặt cọc một phần",
  full: "Đã đặt cọc đủ",
  refunded: "Đã hoàn cọc",
};

// Deposit summary line for the rail, e.g. "Partial deposit · 10,000,000 /
// 25,000,000 VND". Shows paid/due when both are known, paid alone otherwise, and
// falls back to a default label when no amount is recorded.
function depositDetail(tf: PipelineRow["trainingFinance"], labels: Record<string, string>, fallback: string): string {
  const status = tf?.depositStatus ?? undefined;
  const label = (status && labels[status]) || fallback;
  if (tf?.amountPaid == null) return label;
  const currency = tf.currency ?? "VND";
  const paid = formatAmount(tf.amountPaid, currency);
  if (tf.amountDue != null) {
    return `${label} · ${paid} / ${formatAmount(tf.amountDue, currency)} ${currency}`;
  }
  return `${label} · ${paid} ${currency}`;
}

function trainingPhase(row: PipelineRow, applicationDone: boolean): JourneyPhase {
  const tf = row.trainingFinance;
  const base = {
    key: "training" as const,
    labelEn: "Training & Finance",
    labelVi: "Đào tạo & tài chính",
  };

  const hasDeposit = Boolean(tf?.depositStatus || tf?.amountPaid);
  const hasTraining = Boolean(tf?.trainingProgress);
  const hasVisa = Boolean(tf?.visaDate);
  const steps = [hasDeposit, hasTraining, hasVisa].filter(Boolean).length;

  if (steps === 0) {
    return {
      ...base,
      state: applicationDone ? "active" : "pending",
      progress: 0,
      detailEn: applicationDone ? "Not started" : DASH,
      detailVi: applicationDone ? "Chưa bắt đầu" : DASH,
    };
  }

  const detailEn = hasVisa
    ? `Visa · ${tf?.visaDate}`
    : hasTraining
      ? String(tf?.trainingProgress)
      : depositDetail(tf, DEPOSIT_LABELS_EN, "Deposit tracked");
  const detailVi = hasVisa
    ? `Visa · ${tf?.visaDate}`
    : hasTraining
      ? String(tf?.trainingProgress)
      : depositDetail(tf, DEPOSIT_LABELS_VI, "Đã theo dõi cọc");

  return {
    ...base,
    state: hasVisa ? "complete" : "active",
    progress: steps / 3,
    detailEn,
    detailVi,
  };
}

function departurePhase(row: PipelineRow): JourneyPhase {
  const tf = row.trainingFinance;
  const base = {
    key: "departure" as const,
    labelEn: "Departure",
    labelVi: "Xuất cảnh",
  };

  if (tf?.departureDate || row.currentStage === "departed") {
    return {
      ...base,
      state: "complete",
      progress: 1,
      detailEn: tf?.departureDate ? `Departed ${tf.departureDate}` : "Departed",
      detailVi: tf?.departureDate ? `Xuất cảnh ${tf.departureDate}` : "Đã xuất cảnh",
    };
  }
  if (tf?.visaDate) {
    return {
      ...base,
      state: "active",
      progress: 0.5,
      detailEn: "Awaiting departure",
      detailVi: "Chờ xuất cảnh",
    };
  }
  return {
    ...base,
    state: "pending",
    progress: 0,
    detailEn: DASH,
    detailVi: DASH,
  };
}

/**
 * Collapse one aggregated pipeline row into the five-phase journey track.
 * Blockers are attached to the first non-complete phase so the UI can flag
 * exactly where the case is stuck.
 */
export function derivePhases(row: PipelineRow): JourneyPhase[] {
  const intake = intakePhase(row);
  const dossier = dossierPhase(row, intake.state === "complete");
  const application = applicationPhase(row, dossier.state === "complete");
  const training = trainingPhase(row, application.state === "complete");
  const departure = departurePhase(row);

  const phases = [intake, dossier, application, training, departure];

  if (row.blockers.length) {
    const stuck =
      phases.find((phase) => phase.state === "active") ??
      phases.find((phase) => phase.state === "pending");
    if (stuck && stuck.state !== "failed") {
      stuck.state = "blocked";
    }
  }

  return phases;
}

/** The phase the case currently lives in (active/blocked), for filtering. */
export function currentPhaseKey(phases: JourneyPhase[]): PhaseKey | null {
  const here = phases.find((phase) => phase.state === "active" || phase.state === "blocked");
  return here?.key ?? null;
}

export const PHASE_KEYS: PhaseKey[] = ["intake", "dossier", "application", "training", "departure"];

export const PHASE_LABELS: Record<PhaseKey, { en: string; vi: string }> = {
  intake: { en: "Form", vi: "Form" },
  dossier: { en: "Dossier", vi: "Hồ sơ" },
  application: { en: "Application", vi: "Ứng tuyển" },
  training: { en: "Training & Finance", vi: "Đào tạo & tài chính" },
  departure: { en: "Departure", vi: "Xuất cảnh" },
};
