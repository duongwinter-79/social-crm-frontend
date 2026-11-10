import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Button } from "@social-crm/ui";
import { useI18n } from "@/i18n";
import { useUiText } from "@/ui-text/ui-text-provider";
import {
  LEAD_DETAILS_BLOCKS,
  LEAD_DETAILS_TAB_UI_TEXT,
  MAX_LAYOUT_TABS,
  MAX_TAB_LABEL_LENGTH,
  addCustomTab,
  findBlockTab,
  isBuiltInTab,
  isLeadDetailsBlock,
  isLockedBlock,
  layoutTabLabel,
  moveLayoutBlock,
  moveLayoutTab,
  removeCustomTab,
  renameCustomTab,
  updateLayoutBlock,
  type LeadDetailsBlockId,
  type ResolvedLayoutBlock,
  type ResolvedLayoutTab
} from "@/templates/lead-details-layout";

/**
 * Drag-and-drop editor for the lead details layout.
 *
 * Each tab of the lead details screen is a column ("lane"). Blocks are
 * dragged within a lane to reorder them and between lanes to move them to
 * another tab; lanes are dragged by their handle to reorder the tabs. Inside
 * a lane, blocks sit on the same two-column grid the page uses, so a
 * half-width block pairs up with its neighbour here as it will there.
 *
 * Pointer, touch and keyboard all drag (focus a handle, Space to pick up,
 * arrows to move, Space to drop, Escape to cancel); every move is also
 * available from the "Move to" menu for anyone who prefers not to drag.
 */

type Tabs = ResolvedLayoutTab[];
type Updater = (update: (tabs: Tabs) => Tabs) => void;

const TAB_PREFIX = "tab:";
const BLOCK_PREFIX = "block:";
const tabDndId = (id: string) => `${TAB_PREFIX}${id}`;
const blockDndId = (id: string) => `${BLOCK_PREFIX}${id}`;

function parseDndId(id: UniqueIdentifier): { kind: "tab" | "block"; id: string } | null {
  const value = String(id);
  if (value.startsWith(TAB_PREFIX)) return { kind: "tab", id: value.slice(TAB_PREFIX.length) };
  if (value.startsWith(BLOCK_PREFIX)) return { kind: "block", id: value.slice(BLOCK_PREFIX.length) };
  return null;
}

/**
 * Tabs only collide with tabs. A dragged block prefers the block under the
 * pointer, then the lane under it (so an empty lane still takes a drop).
 */
const collisionDetection: CollisionDetection = (args) => {
  const active = parseDndId(args.active.id);
  if (active?.kind === "tab") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) => parseDndId(container.id)?.kind === "tab")
    });
  }
  const containers = args.droppableContainers.filter((container) => container.id !== args.active.id);
  const pointerHits = pointerWithin({ ...args, droppableContainers: containers });
  const hits = pointerHits.length > 0 ? pointerHits : rectIntersection({ ...args, droppableContainers: containers });
  const blockHit = hits.find((hit) => parseDndId(hit.id)?.kind === "block");
  if (blockHit) return [blockHit];
  const laneHit = hits.find((hit) => parseDndId(hit.id)?.kind === "tab");
  if (laneHit) return [laneHit];
  // Keyboard drags have no pointer: fall back to the nearest block or lane.
  return closestCenter({ ...args, droppableContainers: containers });
};

export function LeadDetailsLayoutEditor(props: {
  tabs: Tabs;
  onChange: Updater;
  onReset: () => void;
  isCustomised: boolean;
}) {
  const { copy } = useI18n();
  const [activeDrag, setActiveDrag] = useState<{ kind: "tab" | "block"; id: string } | null>(null);
  // Tabs at drag start, restored if the drag is cancelled (cross-lane moves
  // are applied live while dragging).
  const snapshot = useRef<Tabs | null>(null);

  // Arrow keys step a block to the next block (or into an empty tab), and a
  // tab to the next tab. Left to itself the sortable helper also treats the
  // lanes around a block, and the block's own slot, as targets.
  const tabsRef = useRef(props.tabs);
  tabsRef.current = props.tabs;
  const keyboardCoordinates = useRef<KeyboardCoordinateGetter>((event, args) => {
    const draggingTab = parseDndId(args.active)?.kind === "tab";
    const { droppableContainers } = args.context;
    const allowed = (id: UniqueIdentifier) => {
      const target = parseDndId(id);
      // The drag overlay sits a little off the item it lifted, so the item's
      // own slot can look like the nearest neighbour; never step onto it.
      if (!target || id === args.active) return false;
      if (draggingTab) return target.kind === "tab";
      if (target.kind === "block") return true;
      return tabsRef.current.some((tab) => tab.id === target.id && tab.blocks.length === 0);
    };
    const filtered = {
      getEnabled: () => droppableContainers.getEnabled().filter((entry) => allowed(entry.id)),
      get: (id: UniqueIdentifier) => droppableContainers.get(id)
    } as unknown as typeof droppableContainers;
    return sortableKeyboardCoordinates(event, { ...args, context: { ...args.context, droppableContainers: filtered } });
  }).current;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates })
  );

  const { text } = useUiText();
  // Built-in tab names come from the UI-text screen, so a renamed tab is
  // renamed here too.
  const tabName = (tab: ResolvedLayoutTab) =>
    tab.builtIn && isBuiltInTab(tab.id) ? text(LEAD_DETAILS_TAB_UI_TEXT[tab.id]) : layoutTabLabel(tab.label, copy);

  const onDragStart = (event: DragStartEvent) => {
    snapshot.current = props.tabs;
    setActiveDrag(parseDndId(event.active.id));
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const dragged = parseDndId(active.id);
    const target = over ? parseDndId(over.id) : null;
    if (dragged?.kind !== "block" || !target || !isLeadDetailsBlock(dragged.id)) return;
    const blockId = dragged.id;
    props.onChange((tabs) => {
      const from = findBlockTab(tabs, blockId);
      const to = target.kind === "tab" ? tabs.find((tab) => tab.id === target.id) : isLeadDetailsBlock(target.id) ? findBlockTab(tabs, target.id) : null;
      if (!from || !to || from.id === to.id) return tabs;
      // Dropping on a block puts it before that block, or after it when the
      // pointer is past the block's middle.
      let index = to.blocks.length;
      if (target.kind === "block" && over) {
        const overIndex = to.blocks.findIndex((block) => block.id === target.id);
        const translated = active.rect.current.translated;
        const below = translated ? translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2 : false;
        index = overIndex + (below ? 1 : 0);
      }
      return moveLayoutBlock(tabs, blockId, to.id, index);
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDrag(null);
    snapshot.current = null;
    const dragged = parseDndId(active.id);
    const target = over ? parseDndId(over.id) : null;
    if (!dragged || !target) return;
    props.onChange((tabs) => {
      if (dragged.kind === "tab") {
        if (target.kind !== "tab") return tabs;
        return moveLayoutTab(
          tabs,
          tabs.findIndex((tab) => tab.id === dragged.id),
          tabs.findIndex((tab) => tab.id === target.id)
        );
      }
      if (!isLeadDetailsBlock(dragged.id) || target.kind !== "block" || !isLeadDetailsBlock(target.id)) return tabs;
      // Cross-lane moves already happened in onDragOver; this reorders within the lane.
      const lane = findBlockTab(tabs, dragged.id);
      if (!lane || lane.id !== findBlockTab(tabs, target.id)?.id) return tabs;
      const overIndex = lane.blocks.findIndex((block) => block.id === target.id);
      return moveLayoutBlock(tabs, dragged.id, lane.id, overIndex);
    });
  };

  const onDragCancel = () => {
    const previous = snapshot.current;
    snapshot.current = null;
    setActiveDrag(null);
    if (previous) props.onChange(() => previous);
  };

  const draggedBlock =
    activeDrag?.kind === "block" && isLeadDetailsBlock(activeDrag.id)
      ? props.tabs.flatMap((tab) => tab.blocks).find((block) => block.id === activeDrag.id) ?? null
      : null;
  const draggedTab = activeDrag?.kind === "tab" ? props.tabs.find((tab) => tab.id === activeDrag.id) ?? null : null;

  const announcements = useMemo(
    () => ({
      onDragStart: ({ active }: { active: { id: UniqueIdentifier } }) => describeDnd(active.id, copy, props.tabs, tabName, "pick"),
      onDragOver: ({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) =>
        over ? describeDnd(active.id, copy, props.tabs, tabName, "over", over.id) : undefined,
      onDragEnd: ({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) =>
        over ? describeDnd(active.id, copy, props.tabs, tabName, "drop", over.id) : undefined,
      onDragCancel: ({ active }: { active: { id: UniqueIdentifier } }) => describeDnd(active.id, copy, props.tabs, tabName, "cancel")
    }),
    // tabName follows copy and text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [copy, text, props.tabs]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl text-sm leading-6 text-slate-500">
          {copy({
            en: "Arrange the lead details screen. Drag a block to reorder it or move it to another tab, drag a tab by its handle to reorder tabs, set blocks to full or half width, and hide the ones your team does not use. Tabs with nothing to show are left off the page. Blocks only move — what each one does stays the same.",
            vi: "Sắp xếp màn hình chi tiết ứng viên. Kéo khối để đổi thứ tự hoặc chuyển sang mục khác, kéo mục bằng tay nắm để đổi thứ tự mục, chọn khối rộng toàn phần hoặc một nửa, và ẩn khối không dùng. Mục không có gì để hiển thị sẽ không xuất hiện trên trang. Khối chỉ đổi vị trí — chức năng giữ nguyên."
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={props.tabs.length >= MAX_LAYOUT_TABS}
            onClick={() => props.onChange((tabs) => addCustomTab(tabs))}
          >
            {copy({ en: "Add tab", vi: "Thêm mục" })}
          </Button>
          <Button size="sm" variant="ghost" disabled={!props.isCustomised} onClick={props.onReset}>
            {copy({ en: "Reset to built-in", vi: "Về bố cục mặc định" })}
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        // Measured up front, so the first arrow key after picking a block up
        // already knows where its neighbours are.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: copy({
              en: "To pick up, press Space or Enter. Use the arrow keys to move, Space or Enter to drop, Escape to cancel.",
              vi: "Nhấn Space hoặc Enter để nhấc. Dùng phím mũi tên để di chuyển, Space hoặc Enter để thả, Escape để hủy."
            })
          }
        }}
      >
        <SortableContext items={props.tabs.map((tab) => tabDndId(tab.id))} strategy={rectSortingStrategy}>
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))]" data-crm-layout-editor="leadDetails">
            {props.tabs.map((tab, index) => (
              <Lane key={tab.id} tab={tab} name={tabName(tab)} index={index} tabs={props.tabs} tabName={tabName} onChange={props.onChange} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {draggedBlock ? <BlockCardBody block={draggedBlock} overlay /> : null}
          {draggedTab ? (
            <div className="rounded-2xl border border-indigo-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl">
              {tabName(draggedTab)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span>
          {copy({
            en: "Built-in tab names are edited on the UI text screen. To see the layout on a real lead, start Live preview, then open any lead.",
            vi: "Tên các mục có sẵn được sửa ở màn hình Chữ giao diện. Để xem bố cục trên ứng viên thật, bật Xem thử rồi mở một ứng viên bất kỳ."
          })}
        </span>
        <Link to="/ui-text-overrides" className="font-medium text-indigo-700 hover:underline">
          {copy({ en: "UI text", vi: "Chữ giao diện" })}
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/leads" className="font-medium text-indigo-700 hover:underline">
          {copy({ en: "Open leads", vi: "Mở danh sách ứng viên" })}
        </Link>
      </div>
    </div>
  );
}

function Lane(props: { tab: ResolvedLayoutTab; name: string; index: number; tabs: Tabs; tabName: (tab: ResolvedLayoutTab) => string; onChange: Updater }) {
  const { copy } = useI18n();
  const { tab } = props;
  // The whole lane is the tab's sortable node and also its drop target, so an
  // empty tab still takes a block.
  const sortable = useSortable({ id: tabDndId(tab.id), data: { kind: "tab" } });
  const visibleCount = tab.blocks.filter((block) => !block.hidden).length;

  return (
    <section
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className={`flex min-w-0 flex-col rounded-2xl border bg-slate-50/70 ${
        sortable.isDragging ? "border-indigo-300 opacity-40" : sortable.isOver ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200"
      }`}
      aria-label={props.name}
      data-crm-layout-tab={tab.id}
    >
      <header className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5">
        <button
          type="button"
          ref={sortable.setActivatorNodeRef}
          {...sortable.attributes}
          {...sortable.listeners}
          className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 active:cursor-grabbing"
          aria-label={copy({ en: `Drag to reorder tab ${props.name}`, vi: `Kéo để đổi thứ tự mục ${props.name}` })}
        >
          <GripIcon />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold tabular-nums text-slate-400">{props.index + 1}</span>
            <span className="truncate text-sm font-semibold text-slate-800">{props.name}</span>
          </div>
          {visibleCount === 0 ? (
            <div className="text-[11px] text-amber-700">{copy({ en: "Not shown: nothing visible in it", vi: "Không hiển thị: không có khối nào" })}</div>
          ) : null}
        </div>
        {!tab.builtIn ? (
          <Button size="sm" variant="ghost" onClick={() => props.onChange((tabs) => removeCustomTab(tabs, tab.id))}>
            {copy({ en: "Remove", vi: "Xóa" })}
          </Button>
        ) : (
          <Badge>{copy({ en: "Built-in", vi: "Có sẵn" })}</Badge>
        )}
      </header>

      {!tab.builtIn ? (
        <div className="grid gap-2 border-b border-slate-200 px-3 py-2.5 sm:grid-cols-2">
          {(["vi", "en"] as const).map((lang) => (
            <label key={lang} className="min-w-0 text-[11px] font-medium text-slate-500">
              {lang === "vi" ? copy({ en: "Name (Vietnamese)", vi: "Tên (tiếng Việt)" }) : copy({ en: "Name (English)", vi: "Tên (tiếng Anh)" })}
              <input
                className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                value={tab.label[lang] ?? ""}
                maxLength={MAX_TAB_LABEL_LENGTH}
                onChange={(event) => props.onChange((tabs) => renameCustomTab(tabs, tab.id, lang, event.target.value))}
              />
            </label>
          ))}
        </div>
      ) : null}

      <SortableContext items={tab.blocks.map((block) => blockDndId(block.id))} strategy={rectSortingStrategy}>
        <div className="grid flex-1 grid-cols-2 content-start gap-2 p-3">
          {tab.blocks.map((block) => (
            <BlockCard key={block.id} block={block} tab={tab} tabs={props.tabs} tabName={props.tabName} onChange={props.onChange} />
          ))}
          {tab.blocks.length === 0 ? (
            <div className="col-span-2 rounded-xl border-2 border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
              {copy({ en: "Drop blocks here", vi: "Thả khối vào đây" })}
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

function BlockCard(props: {
  block: ResolvedLayoutBlock;
  tab: ResolvedLayoutTab;
  tabs: Tabs;
  tabName: (tab: ResolvedLayoutTab) => string;
  onChange: Updater;
}) {
  const { copy } = useI18n();
  const { block } = props;
  const sortable = useSortable({ id: blockDndId(block.id), data: { kind: "block" } });
  const locked = isLockedBlock(block.id);
  const label = copy(LEAD_DETAILS_BLOCKS[block.id].label);

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className={`${block.width === "half" ? "col-span-1" : "col-span-2"} min-w-0 ${sortable.isDragging ? "opacity-30" : ""}`}
      data-crm-layout-block={block.id}
    >
      <BlockCardBody
        block={block}
        handle={
          <button
            type="button"
            ref={sortable.setActivatorNodeRef}
            {...sortable.attributes}
            {...sortable.listeners}
            className="flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 active:cursor-grabbing"
            aria-label={copy({ en: `Drag ${label}`, vi: `Kéo ${label}` })}
          >
            <GripIcon />
          </button>
        }
        controls={
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200" role="group" aria-label={copy({ en: "Width", vi: "Độ rộng" })}>
              {(["full", "half"] as const).map((width) => (
                <button
                  key={width}
                  type="button"
                  aria-pressed={block.width === width}
                  onClick={() => props.onChange((tabs) => updateLayoutBlock(tabs, block.id, { width }))}
                  className={`px-2 py-1 text-[11px] font-medium ${block.width === width ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {width === "full" ? copy({ en: "Full", vi: "Toàn phần" }) : copy({ en: "Half", vi: "Một nửa" })}
                </button>
              ))}
            </div>
            {locked ? (
              <span className="text-[11px] text-slate-400" title={copy({ en: "This block is what the screen is for, so it cannot be hidden.", vi: "Đây là khối chính của màn hình nên không thể ẩn." })}>
                {copy({ en: "Always shown", vi: "Luôn hiển thị" })}
              </span>
            ) : (
              <button
                type="button"
                aria-pressed={block.hidden}
                onClick={() => props.onChange((tabs) => updateLayoutBlock(tabs, block.id, { hidden: !block.hidden }))}
                className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${
                  block.hidden ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {block.hidden ? copy({ en: "Hidden — show", vi: "Đang ẩn — hiện" }) : copy({ en: "Hide", vi: "Ẩn" })}
              </button>
            )}
            <select
              aria-label={copy({ en: `Move ${label} to tab`, vi: `Chuyển ${label} sang mục` })}
              className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600"
              value={props.tab.id}
              onChange={(event) => props.onChange((tabs) => moveLayoutBlock(tabs, block.id, event.target.value))}
            >
              {props.tabs.map((tab, index) => (
                <option key={tab.id} value={tab.id}>
                  {index + 1}. {props.tabName(tab)}
                </option>
              ))}
            </select>
          </div>
        }
      />
    </div>
  );
}

function BlockCardBody(props: { block: ResolvedLayoutBlock; handle?: ReactNode; controls?: ReactNode; overlay?: boolean }) {
  const { copy } = useI18n();
  const def = LEAD_DETAILS_BLOCKS[props.block.id as LeadDetailsBlockId];
  return (
    <div
      className={`rounded-xl border bg-white px-2.5 py-2 ${props.block.hidden ? "border-dashed border-slate-300 opacity-70" : "border-slate-200"} ${
        props.overlay ? "cursor-grabbing shadow-xl ring-2 ring-indigo-300" : "shadow-sm"
      }`}
    >
      <div className="flex items-start gap-1.5">
        {props.handle ?? (
          <span className="flex h-7 w-5 shrink-0 items-center justify-center text-slate-400">
            <GripIcon />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-slate-800">{copy(def.label)}</span>
            {isLockedBlock(props.block.id) ? <LockIcon /> : null}
          </div>
          <div className="line-clamp-2 text-[11px] leading-4 text-slate-500">{copy(def.description)}</div>
        </div>
      </div>
      {props.controls}
    </div>
  );
}

function describeDnd(
  activeId: UniqueIdentifier,
  copy: (value: { en: string; vi: string }) => string,
  tabs: Tabs,
  tabName: (tab: ResolvedLayoutTab) => string,
  phase: "pick" | "over" | "drop" | "cancel",
  overId?: UniqueIdentifier
) {
  const name = (id: UniqueIdentifier | undefined) => {
    const parsed = id === undefined ? null : parseDndId(id);
    if (!parsed) return "";
    if (parsed.kind === "block" && isLeadDetailsBlock(parsed.id)) return copy(LEAD_DETAILS_BLOCKS[parsed.id].label);
    const tab = tabs.find((candidate) => candidate.id === parsed.id);
    return tab ? `${copy({ en: "tab", vi: "mục" })} ${tabName(tab)}` : "";
  };
  const active = name(activeId);
  const over = name(overId);
  switch (phase) {
    case "pick":
      return copy({ en: `Picked up ${active}.`, vi: `Đã nhấc ${active}.` });
    case "over":
      return copy({ en: `${active} is over ${over}.`, vi: `${active} đang ở trên ${over}.` });
    case "drop":
      return copy({ en: `Dropped ${active} on ${over}.`, vi: `Đã thả ${active} vào ${over}.` });
    default:
      return copy({ en: `Cancelled. ${active} is back where it was.`, vi: `Đã hủy. ${active} về vị trí cũ.` });
  }
}

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
      <circle cx="5.5" cy="3.5" r="1.3" />
      <circle cx="10.5" cy="3.5" r="1.3" />
      <circle cx="5.5" cy="8" r="1.3" />
      <circle cx="10.5" cy="8" r="1.3" />
      <circle cx="5.5" cy="12.5" r="1.3" />
      <circle cx="10.5" cy="12.5" r="1.3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
