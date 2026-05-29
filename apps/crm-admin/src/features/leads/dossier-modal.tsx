import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n";
import { CandidateDossierPanel } from "./candidate-dossier-panel";

/**
 * Candidate dossier in a popup — the read-only form-derived dossier shown
 * without leaving the current workbench. Wraps the same CandidateDossierPanel
 * the standalone dossier page uses.
 */
export function DossierModal(props: {
  name: string;
  profile: Record<string, unknown> | null | undefined;
  onClose: () => void;
}) {
  const { copy } = useI18n();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={props.onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {copy({ en: "Candidate dossier", vi: "Hồ sơ ứng viên" })}
            </div>
            <h2 className="truncate text-lg font-semibold text-slate-900">{props.name}</h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={copy({ en: "Close", vi: "Đóng" })}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/40 p-5">
          <CandidateDossierPanel profile={props.profile} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
