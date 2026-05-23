import { useEffect, useState } from "react";
import { useEditSessionStatusQuery, useCloseEditSessionMutation } from "@social-crm/api";

interface EditSession {
  documentId: string;
  sessionId: string;
  editUrl: string;
}

interface Props {
  session: EditSession | null;
  onExpired: () => void;
  onClosed: () => void;
}

/**
 * Sticky banner shown while a Google Drive edit session is active.
 * Polls every 30 s; the backend syncs to R2 when Drive changes.
 * "Save & close" forces a final sync before deleting the Drive file.
 */
export function EditSessionBanner({ session, onExpired, onClosed }: Props) {
  const close = useCloseEditSessionMutation();
  const [closeError, setCloseError] = useState<string | null>(null);

  const { data } = useEditSessionStatusQuery(
    session?.documentId ?? null,
    session?.sessionId ?? null,
    session !== null,
  );

  useEffect(() => {
    if (data?.status === "expired") onExpired();
  }, [data?.status, onExpired]);

  if (!session) return null;

  const lastSynced = data?.lastSyncedAt
    ? new Date(data.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const syncLabel = lastSynced
    ? `Auto-saved at ${lastSynced}`
    : "Waiting for first save in Google Docs...";

  function handleClose() {
    setCloseError(null);
    close.mutate(
      { documentId: session!.documentId, sessionId: session!.sessionId },
      {
        onSuccess: onClosed,
        onError: () => {
          setCloseError("Could not save changes back to storage. Keep this session open and retry.");
        },
      },
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-base">Edit</span>
        <span className="flex-1">
          <span className="font-medium">Google Docs edit session active.</span>{" "}
          {syncLabel}
          {" - "}
          <a
            href={session.editUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-700"
          >
            Re-open Docs
          </a>
        </span>
        <button
          type="button"
          onClick={handleClose}
          disabled={close.isPending}
          className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          {close.isPending ? "Saving..." : "Save & close"}
        </button>
      </div>
      {closeError ? (
        <div className="mt-2 text-xs font-medium text-rose-700">{closeError}</div>
      ) : null}
    </div>
  );
}
