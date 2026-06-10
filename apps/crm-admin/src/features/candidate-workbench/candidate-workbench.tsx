import { useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { LeadStatusLine } from "@/features/leads/lead-status-line";

/**
 * Shared candidate workbench shell.
 *
 * One layout used by both the lead-workbench page (extraction-heavy) and the
 * order-side candidate modal. It owns the chrome — the horizontal status line,
 * the grouped section nav, and the active-section switching — while each
 * consumer supplies the actual section content. This keeps one consistent
 * "lead model" vocabulary everywhere (matches the reference LeadModal: data
 * sections on the left, pipeline stage on top), without forcing the same body
 * into both surfaces.
 *
 * The section keys/labels/groups are the single source of truth for how a
 * candidate is decomposed — see SECTION_META.
 */

export type WorkbenchSectionKey =
  | "basic"
  | "skills"
  | "documents"
  | "application"
  | "progressFinance"
  | "departure"
  | "history"
  | "extraction";

type SectionGroup = "profile" | "process" | "other";

export interface WorkbenchSection {
  key: WorkbenchSectionKey;
  content: ReactNode;
  /** Optional small indicator rendered next to the nav label (e.g. a count). */
  badge?: ReactNode;
  disabled?: boolean;
}

const GROUP_LABEL: Record<SectionGroup, { en: string; vi: string }> = {
  profile: { en: "Profile", vi: "Hồ sơ" },
  process: { en: "Process", vi: "Quy trình" },
  other: { en: "Other", vi: "Khác" },
};

const GROUP_ORDER: SectionGroup[] = ["profile", "process", "other"];

const SECTION_META: Record<
  WorkbenchSectionKey,
  { group: SectionGroup; en: string; vi: string; icon: ReactNode }
> = {
  basic: { group: "profile", en: "Basic info", vi: "Thông tin cơ bản", icon: <IconUser /> },
  skills: { group: "profile", en: "Skills & experience", vi: "Kỹ năng & KN", icon: <IconBriefcase /> },
  extraction: { group: "profile", en: "AI extraction", vi: "Trích xuất AI", icon: <IconSpark /> },
  documents: { group: "process", en: "Form & documents", vi: "Hồ sơ & Form", icon: <IconDoc /> },
  application: { group: "process", en: "Application", vi: "Ứng tuyển", icon: <IconCap /> },
  progressFinance: { group: "process", en: "Progress & finance", vi: "Tiến độ & Tài chính", icon: <IconMoney /> },
  departure: { group: "process", en: "Departure", vi: "Xuất cảnh", icon: <IconPlane /> },
  history: { group: "other", en: "History & notes", vi: "Lịch sử & Note", icon: <IconChat /> },
};

export function CandidateWorkbench(props: {
  /** Lead status for the top status line. Omit to hide it. */
  status?: string;
  sections: WorkbenchSection[];
  defaultSection?: WorkbenchSectionKey;
  /** Identity header (name, score, classification…). */
  header?: ReactNode;
  /** Action bar (Save / Cancel). */
  footer?: ReactNode;
  /** Sidebar footer — e.g. the score "System action" hint. */
  sidebarFooter?: ReactNode;
  className?: string;
}) {
  const { copy } = useI18n();
  const available = props.sections.filter((s) => !s.disabled);
  const firstKey = props.defaultSection ?? available[0]?.key ?? "basic";
  const [active, setActive] = useState<WorkbenchSectionKey>(firstKey);

  const activeSection = props.sections.find((s) => s.key === active) ?? available[0];

  // Group the provided sections in canonical order for the nav.
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: props.sections.filter((s) => SECTION_META[s.key].group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className={`flex flex-col ${props.className ?? ""}`}>
      {props.header ? <div className="shrink-0">{props.header}</div> : null}

      {props.status ? (
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-6 pt-4">
          <LeadStatusLine status={props.status} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Section nav — horizontal scroll strip on mobile, sidebar on lg. */}
        <nav className="flex shrink-0 gap-3 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-2 lg:w-60 lg:flex-col lg:gap-0 lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-0 lg:py-4">
          {grouped.map(({ group, items }) => (
            <div key={group} className="mb-0 shrink-0 px-0 lg:mb-4 lg:px-3">
              <div className="mb-1.5 hidden px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:block">
                {copy(GROUP_LABEL[group])}
              </div>
              <div className="flex gap-1.5 lg:block lg:space-y-0.5">
                {items.map((section) => {
                  const meta = SECTION_META[section.key];
                  const isActive = section.key === active;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      disabled={section.disabled}
                      onClick={() => setActive(section.key)}
                      className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-white hover:text-slate-900"
                      } ${section.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      <span className={isActive ? "text-white" : "text-slate-400"}>{meta.icon}</span>
                      <span className="lg:flex-1 lg:truncate">{copy({ en: meta.en, vi: meta.vi })}</span>
                      {section.badge ? <span>{section.badge}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {props.sidebarFooter ? (
            <div className="hidden px-3 lg:mt-auto lg:block lg:border-t lg:border-slate-200 lg:pt-3">{props.sidebarFooter}</div>
          ) : null}
        </nav>

        {/* Active section content */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-white p-6">{activeSection?.content}</div>
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
function IconUser() {
  return svg(<><circle cx="12" cy="8" r="3.2" /><path d="M5 19a7 7 0 0 1 14 0" /></>);
}
function IconBriefcase() {
  return svg(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>);
}
function IconSpark() {
  return svg(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></>);
}
function IconDoc() {
  return svg(<><path d="M8 3h6l4 4v14H6V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>);
}
function IconCap() {
  return svg(<><path d="M3 9l9-4 9 4-9 4-9-4Z" /><path d="M7 11v5c0 1 2.2 2 5 2s5-1 5-2v-5" /></>);
}
function IconMoney() {
  return svg(<><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>);
}
function IconPlane() {
  return svg(<><path d="M21 4 3 11l7 2.5L12.5 21 21 4Z" /><path d="M10 13.5 21 4" /></>);
}
function IconChat() {
  return svg(<><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H10l-4 3v-3a1 1 0 0 1-1-1z" /></>);
}
