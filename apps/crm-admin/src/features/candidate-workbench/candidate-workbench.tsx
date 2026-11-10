import { useState, type ReactNode } from "react";
import { UiText } from "@/ui-text/ui-text";
import { LeadStatusLine } from "@/features/leads/lead-status-line";

/**
 * Candidate workbench shell.
 *
 * It owns the chrome — the horizontal status line, the grouped section nav,
 * and the active-section switching — while the consumer supplies the actual
 * section content (data sections on the left, pipeline stage on top).
 *
 * The section keys/labels/groups are the single source of truth for how a
 * candidate is decomposed — see SECTION_META. A key only belongs here once
 * something renders it: `skills` sat in this list unrendered by anyone.
 *
 * NOTE: lead-workbench-page is the only consumer. An earlier version of this
 * comment claimed the order-side candidate modal shared the shell; it does
 * not, so changes here affect exactly one screen.
 */

export type WorkbenchSectionKey =
  | "formStandard"
  | "documents"
  | "application"
  | "history";

export interface WorkbenchSection {
  /** A built-in key, or the id of a tab a UI template's layout adds. */
  key: string;
  content: ReactNode;
  /** Nav label; built-in keys default to their UI-text label. */
  label?: ReactNode;
  /** Optional small indicator rendered next to the nav label (e.g. a count). */
  badge?: ReactNode;
  disabled?: boolean;
}

/**
 * The four built-in sections, no group headers. Three headers over eight
 * entries was scaffolding for a decomposition that no longer exists: the
 * worker's record is one thing (`formStandard`), and the rest are the jobs
 * around it.
 *
 * The labels live in ui-text.registry.ts under these ids, not here, so the
 * customer can rename a section from the UI-text screen without a deploy.
 * Which sections exist, their order and what each holds comes from the
 * lead-details layout (templates/lead-details-layout.ts), which a UI template
 * can rearrange; this shell renders the sections in the order it is given.
 */
const SECTION_META: Record<WorkbenchSectionKey, { uiTextId: string; icon: ReactNode }> = {
  formStandard: { uiTextId: "lead.section.form-standard", icon: <IconDoc /> },
  documents: { uiTextId: "lead.section.documents", icon: <IconFolder /> },
  application: { uiTextId: "lead.section.application", icon: <IconCap /> },
  history: { uiTextId: "lead.section.history", icon: <IconChat /> },
};

function builtInMeta(key: string) {
  return Object.prototype.hasOwnProperty.call(SECTION_META, key) ? SECTION_META[key as WorkbenchSectionKey] : null;
}

export function CandidateWorkbench(props: {
  /** Lead status for the top status line. Omit to hide it. */
  status?: string;
  sections: WorkbenchSection[];
  defaultSection?: string;
  /** Identity header (name, score, classification…). */
  header?: ReactNode;
  /** Action bar (Save / Cancel). */
  footer?: ReactNode;
  /** Sidebar footer — e.g. the score "System action" hint. */
  sidebarFooter?: ReactNode;
  className?: string;
}) {
  const available = props.sections.filter((s) => !s.disabled);
  const [active, setActive] = useState<string>(props.defaultSection ?? available[0]?.key ?? "formStandard");

  // A layout change (template switched or previewed) can remove the open
  // section; fall back to the first one rather than showing nothing.
  const activeSection = available.find((s) => s.key === active) ?? available[0];
  const activeKey = activeSection?.key;
  const items = props.sections;

  return (
    <div className={`flex flex-col ${props.className ?? ""}`}>
      {props.header ? <div className="shrink-0">{props.header}</div> : null}

      {props.status ? (
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-4 pt-4 sm:px-6">
          <LeadStatusLine status={props.status} />
        </div>
      ) : null}

      {/*
        The cap is what makes this shell's scrolling work at all. `nav` and the
        content pane below both carry `overflow-y-auto`, but overflow only
        scrolls an element whose height is constrained — and nothing above
        constrains it, because this layout came from a modal, where the dialog
        supplied the height. On a page it had none, so the pane simply grew and
        pushed the whole document down: this screen measured 5291px tall.

        `max-h` rather than `h` so a short section (History on a quiet lead)
        still collapses to its content instead of padding out a fixed box.
        Capped only from `lg`: on mobile the nav is a horizontal strip and the
        page should scroll normally.
      */}
      <div className="flex min-h-0 flex-1 flex-col lg:max-h-[calc(100vh-6rem)] lg:flex-row">
        {/* Section nav — wrapping buttons on small screens (never a sideways
            scroll strip), sidebar on lg. */}
        <nav className="flex shrink-0 gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 lg:w-60 lg:flex-col lg:gap-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-0 lg:py-4">
          <div className="flex flex-wrap gap-1.5 lg:block lg:space-y-1 lg:px-3">
            {items.map((section) => {
              const meta = builtInMeta(section.key);
              const isActive = section.key === activeKey;
              return (
                <button
                  key={section.key}
                  type="button"
                  data-crm-section={section.key}
                  aria-current={isActive ? "true" : undefined}
                  disabled={section.disabled}
                  onClick={() => setActive(section.key)}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors lg:w-full ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  } ${section.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <span className={isActive ? "text-white" : "text-slate-400"}>{meta?.icon ?? <IconGrid />}</span>
                  <span className="lg:flex-1 lg:truncate">
                    {section.label ?? (meta ? <UiText id={meta.uiTextId} /> : section.key)}
                  </span>
                  {section.badge ? <span>{section.badge}</span> : null}
                </button>
              );
            })}
          </div>

          {props.sidebarFooter ? (
            <div className="hidden px-3 lg:mt-auto lg:block lg:border-t lg:border-slate-200 lg:pt-3">{props.sidebarFooter}</div>
          ) : null}
        </nav>

        {/* Active section content */}
        {/* overflow-x-hidden backs up the layouts inside: this pane scrolls
            up and down only. */}
        <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 sm:p-6">{activeSection?.content}</div>
      </div>

      {props.footer ? <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">{props.footer}</div> : null}
    </div>
  );
}

// ── Minimal inline icons (the app avoids an icon dependency) ────────────────

function svg(path: ReactNode) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}
function IconFolder() {
  return svg(<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>);
}
function IconDoc() {
  return svg(<><path d="M8 3h6l4 4v14H6V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>);
}
function IconCap() {
  return svg(<><path d="M3 9l9-4 9 4-9 4-9-4Z" /><path d="M7 11v5c0 1 2.2 2 5 2s5-1 5-2v-5" /></>);
}
function IconGrid() {
  return svg(<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>);
}
function IconChat() {
  return svg(<><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H10l-4 3v-3a1 1 0 0 1-1-1z" /></>);
}
