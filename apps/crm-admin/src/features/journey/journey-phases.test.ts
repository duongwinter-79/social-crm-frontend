import { describe, expect, it } from "vitest";
import type { PipelineRow } from "@social-crm/api";
import { currentPhaseKey, derivePhases } from "./journey-phases";

function row(overrides: Partial<PipelineRow> = {}): PipelineRow {
  return {
    leadId: "L1",
    leadName: "Test",
    phone: "+84",
    source: "zalo",
    currentStage: "new",
    documents: { missingRequired: [], expired: [], total: 0 },
    blockers: [],
    nextAction: "—",
    ...overrides,
  };
}

describe("derivePhases", () => {
  it("a brand-new lead is active at intake, everything else pending", () => {
    const phases = derivePhases(row({ currentStage: "new" }));
    expect(phases.map((p) => p.state)).toEqual(["active", "pending", "pending", "pending", "pending"]);
    expect(currentPhaseKey(phases)).toBe("intake");
  });

  it("a qualified lead with a candidate has intake+dossier complete, application active", () => {
    const phases = derivePhases(
      row({ currentStage: "matching", candidateId: "C1", candidateCode: "SM-001", applicationStatus: "matching", applicationOrderName: "Order A" }),
    );
    expect(phases[0].state).toBe("complete"); // intake
    expect(phases[1].state).toBe("complete"); // dossier
    expect(phases[2].state).toBe("active"); // application
    expect(currentPhaseKey(phases)).toBe("application");
  });

  it("missing required documents keep the dossier phase active", () => {
    const phases = derivePhases(
      row({ currentStage: "qualified", candidateId: "C1", documents: { missingRequired: ["passport"], expired: [], total: 3 } }),
    );
    expect(phases[1].state).toBe("active");
    expect(phases[1].detailEn).toContain("1 document");
  });

  it("a failed application marks the application phase failed", () => {
    const phases = derivePhases(
      row({ currentStage: "interview_failed", candidateId: "C1", applicationStatus: "interview_failed" }),
    );
    expect(phases[2].state).toBe("failed");
    expect(currentPhaseKey(phases)).not.toBe("application");
  });

  it("training milestones advance the training phase; visa completes it", () => {
    const active = derivePhases(
      row({ candidateId: "C1", applicationStatus: "ready_to_depart", trainingFinance: { depositStatus: "paid", amountPaid: 100 } }),
    );
    expect(active[3].state).toBe("active");
    const visaDone = derivePhases(
      row({ candidateId: "C1", applicationStatus: "ready_to_depart", trainingFinance: { depositStatus: "paid", trainingProgress: "done", visaDate: "2026-06-01" } }),
    );
    expect(visaDone[3].state).toBe("complete");
    expect(visaDone[4].state).toBe("active"); // awaiting departure
  });

  it("a departure date completes the whole journey", () => {
    const phases = derivePhases(
      row({ currentStage: "departed", candidateId: "C1", applicationStatus: "ready_to_depart", trainingFinance: { visaDate: "2026-06-01", departureDate: "2026-07-01" } }),
    );
    expect(phases.map((p) => p.state)).toEqual(["complete", "complete", "complete", "complete", "complete"]);
    expect(currentPhaseKey(phases)).toBeNull();
  });

  it("blockers turn the current active phase into blocked", () => {
    const phases = derivePhases(
      row({ currentStage: "matching", candidateId: "C1", applicationStatus: "matching", blockers: ["form not verified"] }),
    );
    expect(phases[2].state).toBe("blocked");
    expect(currentPhaseKey(phases)).toBe("application");
  });
});
