import { useEffect } from "react";
import { createPortal } from "react-dom";
import { JourneyWorkbench } from "./journey-workbench-page";

/**
 * The Journey workbench as a modal overlay — opened from order-first matching
 * on the Orders page. Renders the exact same `JourneyWorkbench` component as
 * the `/journey/:leadId` page (one source of truth), with the target order
 * pre-locked and the Application phase open. The operator can still upload a
 * form (§1 opens its own popup) without leaving the order context.
 */
export function JourneyWorkbenchModal(props: {
  leadId: string;
  orderId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  // Portaled to <body> so the fixed backdrop always covers the full viewport,
  // regardless of any transform/backdrop-filter ancestor on the Orders page
  // (a `position: fixed` element is contained by such an ancestor otherwise).
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={props.onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <JourneyWorkbench
            leadId={props.leadId}
            presetOrderId={props.orderId}
            defaultPhase="application"
            onClose={props.onClose}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
