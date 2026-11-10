import { describe, expect, it } from "vitest";
import type { UiScreenLayout } from "@social-crm/api";
import {
  LEAD_DETAILS_BLOCK_IDS,
  defaultLeadDetailsLayout,
  isDefaultLeadDetailsLayout,
  layoutTabLabel,
  nextCustomTabId,
  resolveLeadDetailsLayout,
  toStoredLeadDetailsLayout,
  visibleLeadDetailsTabs
} from "./lead-details-layout";

const copyEn = (value: { en: string; vi: string }) => value.en;
const placed = (tabs: ReturnType<typeof resolveLeadDetailsLayout>) => tabs.flatMap((tab) => tab.blocks.map((block) => block.id));

describe("lead details layout", () => {
  it("is the built-in screen with no template", () => {
    const tabs = resolveLeadDetailsLayout(null);
    expect(tabs.map((tab) => tab.id)).toEqual(["formStandard", "documents", "application", "history"]);
    expect(tabs[0].blocks.map((block) => block.id)).toEqual(["aiExtraction", "formChuan"]);
    expect(tabs[3].blocks.map((block) => block.id)).toEqual(["summary", "verifiedSnapshot", "conversation", "aiQuestion"]);
    expect(isDefaultLeadDetailsLayout(tabs)).toBe(true);
  });

  it("applies a stored arrangement: order, tabs, widths, hidden blocks, custom tabs", () => {
    const layout: UiScreenLayout = {
      version: 1,
      tabs: [
        { id: "history", blocks: [{ id: "summary", width: "half" }, { id: "verifiedSnapshot", width: "half" }] },
        { id: "custom-1", label: { en: "Chat", vi: "Trò chuyện" }, blocks: [{ id: "conversation" }, { id: "aiQuestion", hidden: true }] },
        { id: "formStandard", blocks: [{ id: "formChuan" }, { id: "aiExtraction" }] }
      ]
    };
    const tabs = resolveLeadDetailsLayout(layout);
    expect(tabs.map((tab) => tab.id)).toEqual(["history", "custom-1", "formStandard", "documents", "application"]);
    expect(tabs[0].blocks).toEqual([
      { id: "summary", width: "half", hidden: false },
      { id: "verifiedSnapshot", width: "half", hidden: false }
    ]);
    expect(tabs[1]).toMatchObject({ builtIn: false, label: { en: "Chat", vi: "Trò chuyện" } });
    expect(tabs[1].blocks[1]).toEqual({ id: "aiQuestion", width: "full", hidden: true });
    expect(tabs[2].blocks.map((block) => block.id)).toEqual(["formChuan", "aiExtraction"]);
    // The layout did not mention these, so they are back in their own tabs.
    expect(tabs[3].blocks.map((block) => block.id)).toEqual(["dossierStatus", "documents"]);
    expect(tabs[4].blocks.map((block) => block.id)).toEqual(["applicationPhase", "trainingFinance"]);
    // Round trip: what the editor saves is what the backend normalises to.
    expect(toStoredLeadDetailsLayout(resolveLeadDetailsLayout(toStoredLeadDetailsLayout(tabs)))).toEqual(toStoredLeadDetailsLayout(tabs));
  });

  it("never loses or duplicates a block, whatever the stored layout says", () => {
    const junk = {
      version: 1,
      tabs: [
        { id: "history", blocks: [{ id: "summary" }, { id: "summary", width: "half" }, { id: "nope" }, null, { id: 7 }] },
        { id: "history", blocks: [{ id: "conversation" }] },
        { id: "Bad Id", blocks: [{ id: "documents" }] },
        { id: "dashboard", blocks: [{ id: "trainingFinance" }] },
        null
      ]
    } as unknown as UiScreenLayout;
    const tabs = resolveLeadDetailsLayout(junk);
    expect(placed(tabs).sort()).toEqual([...LEAD_DETAILS_BLOCK_IDS].sort());
    expect(tabs.filter((tab) => tab.id === "history")).toHaveLength(1);
    expect(tabs.find((tab) => tab.id === "history")?.blocks[0]).toEqual({ id: "summary", width: "full", hidden: false });
  });

  it("cannot hide the FORM CHUẨN entry", () => {
    const tabs = resolveLeadDetailsLayout({ version: 1, tabs: [{ id: "formStandard", blocks: [{ id: "formChuan", hidden: true }] }] });
    expect(tabs[0].blocks[0]).toEqual({ id: "formChuan", width: "full", hidden: false });
    tabs[0].blocks[0].hidden = true;
    expect(toStoredLeadDetailsLayout(tabs).tabs[0].blocks[0]).toEqual({ id: "formChuan" });
  });

  it("shows only tabs with a visible block", () => {
    const tabs = resolveLeadDetailsLayout({
      version: 1,
      tabs: [
        { id: "custom-1", label: { en: "Empty" }, blocks: [] },
        { id: "history", blocks: ["summary", "verifiedSnapshot", "conversation", "aiQuestion"].map((id) => ({ id, hidden: true as const })) }
      ]
    });
    const visible = visibleLeadDetailsTabs(tabs);
    expect(visible.map((tab) => tab.id)).toEqual(["formStandard", "documents", "application"]);
  });

  it("names custom tabs and labels them in either language", () => {
    const tabs = defaultLeadDetailsLayout();
    expect(nextCustomTabId(tabs)).toBe("custom-1");
    tabs.push({ id: "custom-1", builtIn: false, label: {}, blocks: [] });
    expect(nextCustomTabId(tabs)).toBe("custom-2");
    expect(layoutTabLabel({ vi: "Ghi chú" }, copyEn)).toBe("Ghi chú");
    expect(layoutTabLabel({}, copyEn)).toBe("New tab");
    expect(isDefaultLeadDetailsLayout(tabs)).toBe(false);
  });
});

describe("lead details layout editing", () => {
  it("moves blocks within and across tabs", async () => {
    const { moveLayoutBlock, findBlockTab } = await import("./lead-details-layout");
    let tabs = defaultLeadDetailsLayout();
    tabs = moveLayoutBlock(tabs, "aiQuestion", "history", 0);
    expect(tabs[3].blocks.map((b) => b.id)).toEqual(["aiQuestion", "summary", "verifiedSnapshot", "conversation"]);
    tabs = moveLayoutBlock(tabs, "conversation", "formStandard", 1);
    expect(tabs[0].blocks.map((b) => b.id)).toEqual(["aiExtraction", "conversation", "formChuan"]);
    expect(findBlockTab(tabs, "conversation")?.id).toBe("formStandard");
    expect(moveLayoutBlock(tabs, "summary", "nowhere")).toBe(tabs);
    expect(placed(moveLayoutBlock(tabs, "summary", "documents", 99)).sort()).toEqual([...LEAD_DETAILS_BLOCK_IDS].sort());
  });

  it("resizes, hides (except FORM CHUẨN), reorders and removes tabs", async () => {
    const { updateLayoutBlock, moveLayoutTab, addCustomTab, removeCustomTab, renameCustomTab, moveLayoutBlock } = await import("./lead-details-layout");
    let tabs = defaultLeadDetailsLayout();
    tabs = updateLayoutBlock(tabs, "summary", { width: "half", hidden: true });
    expect(tabs[3].blocks[0]).toEqual({ id: "summary", width: "half", hidden: true });
    tabs = updateLayoutBlock(tabs, "formChuan", { hidden: true });
    expect(tabs[0].blocks[1].hidden).toBe(false);
    tabs = moveLayoutTab(tabs, 3, 0);
    expect(tabs.map((t) => t.id)).toEqual(["history", "formStandard", "documents", "application"]);
    tabs = addCustomTab(tabs);
    tabs = renameCustomTab(tabs, "custom-1", "en", "Chat");
    tabs = moveLayoutBlock(tabs, "conversation", "custom-1");
    expect(tabs[4]).toMatchObject({ id: "custom-1", label: { en: "Chat" }, blocks: [{ id: "conversation" }] });
    expect(removeCustomTab(tabs, "history")).toBe(tabs);
    tabs = removeCustomTab(tabs, "custom-1");
    expect(tabs.map((t) => t.id)).toEqual(["history", "formStandard", "documents", "application"]);
    expect(tabs[0].blocks.map((b) => b.id)).toContain("conversation");
  });
});
