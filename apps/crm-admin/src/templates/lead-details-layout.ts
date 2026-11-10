import type { UiLayoutTab, UiScreenLayout } from "@social-crm/api";

/**
 * Lead details (the lead workbench) as a layout: tabs holding content blocks.
 *
 * The blocks and the built-in tabs are defined here, in code. A template's
 * stored layout (`layouts.leadDetails`) only arranges them: which tab each
 * block sits in, in what order, at full or half width, and whether it is
 * shown. `resolveLeadDetailsLayout` reconciles a stored layout against this
 * registry so it can never lose a block: unknown ids are dropped, and a block
 * the layout does not mention (one added in a later release, say) goes back
 * to its default tab.
 */

type Copy = { en: string; vi: string };

export const LEAD_DETAILS_BUILT_IN_TABS = ["formStandard", "documents", "application", "history"] as const;
export type LeadDetailsBuiltInTab = (typeof LEAD_DETAILS_BUILT_IN_TABS)[number];

/** Tab label ids on the UI-text screen, where built-in tabs are renamed. */
export const LEAD_DETAILS_TAB_UI_TEXT: Record<LeadDetailsBuiltInTab, string> = {
  formStandard: "lead.section.form-standard",
  documents: "lead.section.documents",
  application: "lead.section.application",
  history: "lead.section.history"
};

export type LeadDetailsBlockDef = {
  tab: LeadDetailsBuiltInTab;
  label: Copy;
  description: Copy;
  /** Cannot be hidden: the screen exists to edit it. */
  locked?: boolean;
};

/** Every block, in the built-in order. */
export const LEAD_DETAILS_BLOCKS = {
  aiExtraction: {
    tab: "formStandard",
    label: { en: "AI extraction", vi: "Dữ liệu AI" },
    description: { en: "Unverified AI values, collapsed by default.", vi: "Giá trị AI chưa xác minh, thu gọn mặc định." }
  },
  formChuan: {
    tab: "formStandard",
    label: { en: "FORM CHUẨN entry", vi: "Nhập FORM CHUẨN" },
    description: { en: "The worker's form, field by field, and the export.", vi: "Form lao động từng trường, và nút xuất file." },
    locked: true
  },
  dossierStatus: {
    tab: "documents",
    label: { en: "Dossier & standard form", vi: "Hồ sơ & form chuẩn" },
    description: { en: "Candidate code, form status, upload and open dossier.", vi: "Mã ứng viên, trạng thái form, tải lên và mở hồ sơ." }
  },
  documents: {
    tab: "documents",
    label: { en: "Documents", vi: "Giấy tờ" },
    description: { en: "Passport, criminal record, health check and other papers.", vi: "Hộ chiếu, lý lịch tư pháp, khám sức khỏe và giấy tờ khác." }
  },
  applicationPhase: {
    tab: "application",
    label: { en: "Application", vi: "Ứng tuyển" },
    description: { en: "Matching and the order this lead is applying to.", vi: "Ghép đơn và đơn hàng ứng viên đang ứng tuyển." }
  },
  trainingFinance: {
    tab: "application",
    label: { en: "Training & finance", vi: "Đào tạo & tài chính" },
    description: { en: "Deposit, payments, visa and departure dates.", vi: "Đặt cọc, thanh toán, ngày visa và xuất cảnh." }
  },
  summary: {
    tab: "history",
    label: { en: "Lead summary", vi: "Tóm tắt" },
    description: { en: "Lead id, source, phone, region, dates.", vi: "Mã, nguồn, điện thoại, khu vực, ngày tạo." }
  },
  verifiedSnapshot: {
    tab: "history",
    label: { en: "Verified snapshot", vi: "Dữ liệu đã xác minh" },
    description: { en: "Passport, abroad, health and risk answers.", vi: "Hộ chiếu, từng đi nước ngoài, sức khỏe, rủi ro." }
  },
  conversation: {
    tab: "history",
    label: { en: "Conversation", vi: "Hội thoại" },
    description: { en: "The lead's Zalo thread, hidden until opened.", vi: "Luồng Zalo của ứng viên, ẩn tới khi mở." }
  },
  aiQuestion: {
    tab: "history",
    label: { en: "Ask AI", vi: "Hỏi AI" },
    description: { en: "A one-off question about the conversation.", vi: "Câu hỏi nhanh về hội thoại." }
  }
} as const satisfies Record<string, LeadDetailsBlockDef>;

export type LeadDetailsBlockId = keyof typeof LEAD_DETAILS_BLOCKS;
export const LEAD_DETAILS_BLOCK_IDS = Object.keys(LEAD_DETAILS_BLOCKS) as LeadDetailsBlockId[];

export const CUSTOM_TAB_PREFIX = "custom-";
export const MAX_LAYOUT_TABS = 12;
export const MAX_TAB_LABEL_LENGTH = 40;

export type LayoutBlockWidth = "full" | "half";

export type ResolvedLayoutBlock = {
  id: LeadDetailsBlockId;
  width: LayoutBlockWidth;
  hidden: boolean;
};

export type ResolvedLayoutTab = {
  id: string;
  builtIn: boolean;
  /** Custom tabs only. */
  label: { en?: string; vi?: string };
  blocks: ResolvedLayoutBlock[];
};

export function isBuiltInTab(id: string): id is LeadDetailsBuiltInTab {
  return (LEAD_DETAILS_BUILT_IN_TABS as readonly string[]).includes(id);
}

export function isLeadDetailsBlock(id: string): id is LeadDetailsBlockId {
  return Object.prototype.hasOwnProperty.call(LEAD_DETAILS_BLOCKS, id);
}

export function isLockedBlock(id: LeadDetailsBlockId) {
  return Boolean((LEAD_DETAILS_BLOCKS[id] as LeadDetailsBlockDef).locked);
}

function isCustomTabId(id: string) {
  return id.startsWith(CUSTOM_TAB_PREFIX) && /^[a-z][a-zA-Z0-9-]{0,39}$/.test(id);
}

/** The screen as it looks with no template (and the starting point for a new layout). */
export function defaultLeadDetailsLayout(): ResolvedLayoutTab[] {
  return LEAD_DETAILS_BUILT_IN_TABS.map((tab) => ({
    id: tab,
    builtIn: true,
    label: {},
    blocks: LEAD_DETAILS_BLOCK_IDS.filter((id) => LEAD_DETAILS_BLOCKS[id].tab === tab).map((id) => ({
      id,
      width: "full" as const,
      hidden: false
    }))
  }));
}

/**
 * Stored layout → the tabs to render. Never throws: preview drafts and old
 * layouts are reconciled, not trusted.
 */
export function resolveLeadDetailsLayout(layout: UiScreenLayout | null | undefined): ResolvedLayoutTab[] {
  if (!layout || !Array.isArray(layout.tabs) || layout.tabs.length === 0) return defaultLeadDetailsLayout();

  const tabs: ResolvedLayoutTab[] = [];
  const seenTabs = new Set<string>();
  const placed = new Set<LeadDetailsBlockId>();

  for (const stored of layout.tabs as Array<Partial<UiLayoutTab> | null>) {
    const id = typeof stored?.id === "string" ? stored.id : "";
    if (!id || seenTabs.has(id) || (!isBuiltInTab(id) && !isCustomTabId(id))) continue;
    if (tabs.length >= MAX_LAYOUT_TABS) break;
    seenTabs.add(id);
    const blocks: ResolvedLayoutBlock[] = [];
    for (const block of Array.isArray(stored?.blocks) ? stored.blocks : []) {
      const blockId = typeof block?.id === "string" ? block.id : "";
      if (!isLeadDetailsBlock(blockId) || placed.has(blockId)) continue;
      placed.add(blockId);
      blocks.push({
        id: blockId,
        width: block.width === "half" ? "half" : "full",
        hidden: block.hidden === true && !isLockedBlock(blockId)
      });
    }
    const label: ResolvedLayoutTab["label"] = {};
    if (!isBuiltInTab(id)) {
      const en = typeof stored?.label?.en === "string" ? stored.label.en.trim().slice(0, MAX_TAB_LABEL_LENGTH) : "";
      const vi = typeof stored?.label?.vi === "string" ? stored.label.vi.trim().slice(0, MAX_TAB_LABEL_LENGTH) : "";
      if (en) label.en = en;
      if (vi) label.vi = vi;
    }
    tabs.push({ id, builtIn: isBuiltInTab(id), label, blocks });
  }

  // Built-in tabs the layout left out come back (empty tabs are not shown).
  for (const tab of LEAD_DETAILS_BUILT_IN_TABS) {
    if (!seenTabs.has(tab)) tabs.push({ id: tab, builtIn: true, label: {}, blocks: [] });
  }
  // Blocks the layout does not place go back to the end of their own tab.
  for (const id of LEAD_DETAILS_BLOCK_IDS) {
    if (placed.has(id)) continue;
    tabs.find((tab) => tab.id === LEAD_DETAILS_BLOCKS[id].tab)?.blocks.push({ id, width: "full", hidden: false });
  }
  return tabs;
}

/** Tabs → the canonical stored form (defaults omitted), as the backend normalises it. */
export function toStoredLeadDetailsLayout(tabs: ResolvedLayoutTab[]): UiScreenLayout {
  return {
    version: 1,
    tabs: tabs.map((tab) => {
      const stored: UiLayoutTab = {
        id: tab.id,
        blocks: tab.blocks.map((block) => ({
          id: block.id,
          ...(block.width === "half" ? { width: "half" as const } : {}),
          ...(block.hidden && !isLockedBlock(block.id) ? { hidden: true as const } : {})
        }))
      };
      if (!tab.builtIn) {
        const label: { en?: string; vi?: string } = {};
        if (tab.label.en?.trim()) label.en = tab.label.en.trim();
        if (tab.label.vi?.trim()) label.vi = tab.label.vi.trim();
        if (label.en || label.vi) stored.label = label;
      }
      return stored;
    })
  };
}

export function isDefaultLeadDetailsLayout(tabs: ResolvedLayoutTab[]) {
  return JSON.stringify(toStoredLeadDetailsLayout(tabs)) === JSON.stringify(toStoredLeadDetailsLayout(defaultLeadDetailsLayout()));
}

/** Tabs that have something to show; the page skips the rest. */
export function visibleLeadDetailsTabs(tabs: ResolvedLayoutTab[]) {
  return tabs
    .map((tab) => ({ ...tab, blocks: tab.blocks.filter((block) => !block.hidden) }))
    .filter((tab) => tab.blocks.length > 0);
}

export function nextCustomTabId(tabs: ResolvedLayoutTab[]) {
  const taken = new Set(tabs.map((tab) => tab.id));
  let n = 1;
  while (taken.has(`${CUSTOM_TAB_PREFIX}${n}`)) n += 1;
  return `${CUSTOM_TAB_PREFIX}${n}`;
}

/** A custom tab's label in the current language, falling back to the other one. */
export function layoutTabLabel(label: { en?: string; vi?: string }, copy: (value: Copy) => string) {
  const en = label.en?.trim() || label.vi?.trim() || "";
  const vi = label.vi?.trim() || label.en?.trim() || "";
  return copy({ en: en || "New tab", vi: vi || "Mục mới" });
}

/** Where the block-wrapper grid puts a block: half-width blocks pair up when the pane is wide enough. */
export function blockSpanClass(width: LayoutBlockWidth) {
  return width === "half" ? "min-w-0" : "col-[1/-1] min-w-0";
}

/**
 * Two columns at most, and only when the content pane (not the viewport) is
 * at least 48rem wide: each track is at least half the pane, or 24rem.
 */
export const LAYOUT_GRID_CLASS =
  "grid items-start gap-6 grid-cols-[repeat(auto-fill,minmax(max(min(100%,24rem),calc(50%_-_0.75rem)),1fr))]";

// ── Editing (pure; the drag-and-drop editor calls these) ───────────────────

export function findBlockTab(tabs: ResolvedLayoutTab[], blockId: LeadDetailsBlockId) {
  return tabs.find((tab) => tab.blocks.some((block) => block.id === blockId)) ?? null;
}

/** Moves a block to `toTabId` at `toIndex` (clamped; end when omitted). */
export function moveLayoutBlock(
  tabs: ResolvedLayoutTab[],
  blockId: LeadDetailsBlockId,
  toTabId: string,
  toIndex?: number
): ResolvedLayoutTab[] {
  const from = findBlockTab(tabs, blockId);
  if (!from || !tabs.some((tab) => tab.id === toTabId)) return tabs;
  const block = from.blocks.find((candidate) => candidate.id === blockId)!;
  const without = tabs.map((tab) => (tab.id === from.id ? { ...tab, blocks: tab.blocks.filter((b) => b.id !== blockId) } : tab));
  return without.map((tab) => {
    if (tab.id !== toTabId) return tab;
    const index = Math.max(0, Math.min(toIndex ?? tab.blocks.length, tab.blocks.length));
    return { ...tab, blocks: [...tab.blocks.slice(0, index), block, ...tab.blocks.slice(index)] };
  });
}

export function updateLayoutBlock(
  tabs: ResolvedLayoutTab[],
  blockId: LeadDetailsBlockId,
  patch: Partial<Pick<ResolvedLayoutBlock, "width" | "hidden">>
): ResolvedLayoutTab[] {
  const next = { ...patch };
  if (next.hidden && isLockedBlock(blockId)) delete next.hidden;
  return tabs.map((tab) => ({
    ...tab,
    blocks: tab.blocks.map((block) => (block.id === blockId ? { ...block, ...next } : block))
  }));
}

export function moveLayoutTab(tabs: ResolvedLayoutTab[], fromIndex: number, toIndex: number): ResolvedLayoutTab[] {
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= tabs.length) return tabs;
  const next = [...tabs];
  const [tab] = next.splice(fromIndex, 1);
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, tab);
  return next;
}

export function addCustomTab(tabs: ResolvedLayoutTab[], label: { en?: string; vi?: string } = {}): ResolvedLayoutTab[] {
  if (tabs.length >= MAX_LAYOUT_TABS) return tabs;
  return [...tabs, { id: nextCustomTabId(tabs), builtIn: false, label, blocks: [] }];
}

/** Removes a custom tab; its blocks go back to their own tabs rather than disappearing. */
export function removeCustomTab(tabs: ResolvedLayoutTab[], tabId: string): ResolvedLayoutTab[] {
  const target = tabs.find((tab) => tab.id === tabId);
  if (!target || target.builtIn) return tabs;
  let next = tabs;
  for (const block of target.blocks) next = moveLayoutBlock(next, block.id, LEAD_DETAILS_BLOCKS[block.id].tab);
  return next.filter((tab) => tab.id !== tabId);
}

export function renameCustomTab(tabs: ResolvedLayoutTab[], tabId: string, lang: "en" | "vi", text: string): ResolvedLayoutTab[] {
  return tabs.map((tab) =>
    tab.id === tabId && !tab.builtIn ? { ...tab, label: { ...tab.label, [lang]: text.slice(0, MAX_TAB_LABEL_LENGTH) } } : tab
  );
}
