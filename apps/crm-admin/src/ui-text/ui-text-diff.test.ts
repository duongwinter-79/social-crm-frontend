import { describe, expect, it } from "vitest";
import { diffWords } from "./ui-text-diff";

describe("diffWords", () => {
  it("marks an identical string as all-same", () => {
    const result = diffWords("Candidate dossier", "Candidate dossier");
    expect(result.every((segment) => segment.type === "same")).toBe(true);
  });

  it("detects a replaced word", () => {
    const result = diffWords("Candidate dossier", "Worker dossier");
    const removed = result.filter((s) => s.type === "remove").map((s) => s.value).join("");
    const added = result.filter((s) => s.type === "add").map((s) => s.value).join("");
    expect(removed).toContain("Candidate");
    expect(added).toContain("Worker");
    // The shared trailing word is preserved.
    expect(result.some((s) => s.type === "same" && s.value.includes("dossier"))).toBe(true);
  });

  it("handles pure additions", () => {
    const result = diffWords("Open", "Open journey");
    expect(result.filter((s) => s.type === "remove")).toHaveLength(0);
    expect(result.some((s) => s.type === "add" && s.value.includes("journey"))).toBe(true);
  });

  it("diffs on word boundaries for Vietnamese without diacritic noise", () => {
    const result = diffWords("Hồ sơ ứng viên", "Hồ sơ ứng tuyển");
    const added = result.filter((s) => s.type === "add").map((s) => s.value).join("");
    const removed = result.filter((s) => s.type === "remove").map((s) => s.value).join("");
    expect(added).toContain("tuyển");
    expect(removed).toContain("viên");
    // "Hồ sơ ứng" stays unchanged rather than fragmenting across diacritics.
    expect(result.some((s) => s.type === "same" && s.value.includes("Hồ sơ"))).toBe(true);
  });
});
