import { describe, expect, it } from "vitest";
import type { ApplicationRecord } from "@social-crm/api";
import {
  applicationStatusOptions,
  applicationToDraft,
  hasApplicationNextStatus,
  hasVerifiedForm,
  isCreateStage,
  isDraftDirty,
  requiresInterviewDate,
  requiresRejectReason,
} from "./application-logic";

function app(overrides: Partial<ApplicationRecord> = {}): ApplicationRecord {
  return { id: "A1", lead_id: "L1", order_id: "O1", status: "matching", ...overrides };
}

describe("application state machine", () => {
  it("offers only valid next statuses plus the current one", () => {
    expect(applicationStatusOptions("matching")).toEqual(["matching", "referred", "rejected", "withdrawn"]);
    expect(applicationStatusOptions("interview_scheduled")).toEqual([
      "interview_scheduled",
      "interview_passed",
      "interview_failed",
      "rejected",
      "withdrawn",
    ]);
  });

  it("terminal statuses expose no further transitions", () => {
    expect(hasApplicationNextStatus("ready_to_depart")).toBe(false);
    expect(hasApplicationNextStatus("interview_failed")).toBe(false);
    expect(hasApplicationNextStatus("matching")).toBe(true);
  });

  it("interview_scheduled requires an interview date; closed outcomes require a reason", () => {
    expect(requiresInterviewDate("interview_scheduled")).toBe(true);
    expect(requiresInterviewDate("referred")).toBe(false);
    expect(requiresRejectReason("rejected")).toBe(true);
    expect(requiresRejectReason("withdrawn")).toBe(true);
    expect(requiresRejectReason("interview_failed")).toBe(true);
    expect(requiresRejectReason("signing")).toBe(false);
  });

  it("isCreateStage gates on qualified or matching only", () => {
    expect(isCreateStage("qualified")).toBe(true);
    expect(isCreateStage("matching")).toBe(true);
    expect(isCreateStage("new")).toBe(false);
    expect(isCreateStage(null)).toBe(false);
  });

  it("hasVerifiedForm needs both a file and verified status", () => {
    expect(hasVerifiedForm({ hasFile: true, documentStatus: "verified" } as never)).toBe(true);
    expect(hasVerifiedForm({ hasFile: false, documentStatus: "verified" } as never)).toBe(false);
    expect(hasVerifiedForm({ hasFile: true, documentStatus: "submitted" } as never)).toBe(false);
    expect(hasVerifiedForm(null)).toBe(false);
  });

  it("draft dirtiness ignores untouched values and reason whitespace", () => {
    const a = app({ status: "matching", interviewDate: null, rejectReason: null });
    const clean = applicationToDraft(a);
    expect(isDraftDirty(a, clean)).toBe(false);
    expect(isDraftDirty(a, { ...clean, rejectReason: "   " })).toBe(false);
    expect(isDraftDirty(a, { ...clean, status: "referred" })).toBe(true);
  });
});
