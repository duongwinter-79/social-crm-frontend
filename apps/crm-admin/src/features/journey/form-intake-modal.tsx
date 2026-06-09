import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n";
import { UiText } from "@/ui-text/ui-text";
import { ApplicationDetailPage } from "../applications/application-detail-page";

/**
 * Form intake modal — hosts the staged upload → verify → commit flow
 * (ApplicationDetailPage) in a popup instead of inline. Keeps the Journey
 * workbench short: §1 shows a compact status, and the long staging UI opens
 * here on demand. The component is the same one the standalone route used; it
 * runs in embedded mode (locked to this lead, no standalone chrome).
 */
export function FormIntakeModal(props: {
  leadId?: string;
  /** Create mode: no lead yet — host the standalone upload → create-lead flow. */
  createMode?: boolean;
  onLeadCommitted?: (leadId: string) => void;
  onClose: () => void;
  onViewDossier?: () => void;
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
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            <UiText id="modal.form-intake.title" />
          </h2>
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
          {props.createMode ? (
            <ApplicationDetailPage createMode onLeadCommitted={props.onLeadCommitted} />
          ) : (
            <ApplicationDetailPage embeddedLeadId={props.leadId} embeddedOnViewDossier={props.onViewDossier} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
