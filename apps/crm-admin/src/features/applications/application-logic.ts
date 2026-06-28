import type { ApplicationRecord, CandidateRef, FormStandardRegisterRow } from "@social-crm/api";

/**
 * Application state-machine + draft helpers.
 *
 * Extracted from applications-page so the same transition rules drive both the
 * legacy Applications table and the unified Journey workbench (§3). This is the
 * single source of truth for the candidate-to-order application status flow —
 * do not re-declare the transition map elsewhere.
 */

export const APPLICATION_STATUSES = [
  "",
  "matching",
  "referred",
  "interview_scheduled",
  "interview_passed",
  "interview_failed",
  "signing",
  "ready_to_depart",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatusValue = Exclude<(typeof APPLICATION_STATUSES)[number], "">;

export type ApplicationDraft = {
  status: string;
  interviewDate: string;
  rejectReason: string;
};

export const APPLICATION_STATUS_TRANSITIONS: Record<ApplicationStatusValue, ApplicationStatusValue[]> = {
  matching: ["referred", "rejected", "withdrawn"],
  referred: ["interview_scheduled", "rejected", "withdrawn"],
  interview_scheduled: ["interview_passed", "interview_failed", "rejected", "withdrawn"],
  interview_passed: ["signing", "rejected", "withdrawn"],
  signing: ["ready_to_depart", "rejected", "withdrawn"],
  interview_failed: [],
  ready_to_depart: [],
  rejected: [],
  withdrawn: [],
};

export function isApplicationStatus(value: string): value is ApplicationStatusValue {
  return value !== "" && APPLICATION_STATUSES.includes(value as (typeof APPLICATION_STATUSES)[number]);
}

export function applicationStatusOptions(currentStatus: string) {
  const options = new Set<string>();
  if (currentStatus) options.add(currentStatus);
  if (isApplicationStatus(currentStatus)) {
    APPLICATION_STATUS_TRANSITIONS[currentStatus].forEach((status) => options.add(status));
  }
  return Array.from(options);
}

export function hasApplicationNextStatus(currentStatus: string) {
  return isApplicationStatus(currentStatus) && APPLICATION_STATUS_TRANSITIONS[currentStatus].length > 0;
}

export function toneForApplicationStatus(status: string) {
  if (["interview_failed", "rejected", "withdrawn"].includes(status)) return "danger" as const;
  if (["interview_passed", "signing", "ready_to_depart"].includes(status)) return "success" as const;
  if (["referred", "interview_scheduled"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function requiresInterviewDate(status: string) {
  return status === "interview_scheduled";
}

export function requiresRejectReason(status: string) {
  return ["interview_failed", "rejected", "withdrawn"].includes(status);
}

// Mirrors the backend application creation gate: any non-terminal lead status
// at or beyond QUALIFIED may create a replacement application (e.g. re-linking
// after a previous application was deleted or withdrawn at VISA_PROCESSING).
const APPLICATION_CREATE_STAGES = new Set([
  "qualified",
  "matching",
  "matched",
  "interview_scheduled",
  "interview_passed",
  "interview_failed",
  "contract_signed",
  "visa_processing",
]);

export function isCreateStage(status?: string | null) {
  return Boolean(status && APPLICATION_CREATE_STAGES.has(status));
}

export function readCandidateLeadId(candidate?: CandidateRef | null) {
  return candidate?.lead_id ?? candidate?.lead?.id ?? "";
}

export function hasVerifiedForm(row?: FormStandardRegisterRow | null) {
  return Boolean(row?.hasFile && row.documentStatus === "verified");
}

export function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function applicationToDraft(application: ApplicationRecord): ApplicationDraft {
  return {
    status: application.status,
    interviewDate: toDateInputValue(application.interviewDate),
    rejectReason: application.rejectReason ?? "",
  };
}

export function isDraftDirty(application: ApplicationRecord, draft: ApplicationDraft) {
  const saved = applicationToDraft(application);
  return (
    draft.status !== saved.status ||
    draft.interviewDate !== saved.interviewDate ||
    draft.rejectReason.trim() !== saved.rejectReason.trim()
  );
}
