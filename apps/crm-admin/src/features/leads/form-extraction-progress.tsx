import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFormExtractionStatusQuery } from "@social-crm/api";
import { useI18n } from "../../i18n";
import { useRequestNotifications } from "../../app/request-notifications";

/**
 * Shows a progress indicator in the lead information panel while the server
 * extracts structured fields from a just-committed standard form. Polls the
 * lead's form-extraction status (see useFormExtractionStatusQuery) and:
 *   - on entering `processing` → info toast + indeterminate progress bar
 *   - on `done`   → refresh all lead-scoped queries + success toast
 *   - on `failed` → refresh (deterministic data may still be present) + error toast
 *
 * Toasts and the lead refresh are gated on having actually observed
 * `processing` this session, so a lead that loads already-`done` does not
 * fire a spurious toast.
 */
export function FormExtractionProgress(props: { leadId?: string }) {
  const { leadId } = props;
  const { copy } = useI18n();
  const queryClient = useQueryClient();
  const { notify, notifyInfo, notifySuccess } = useRequestNotifications();
  const statusQuery = useFormExtractionStatusQuery(leadId);
  const status = statusQuery.data?.status ?? null;
  const sawProcessing = useRef(false);

  useEffect(() => {
    if (!leadId) return;
    if (status === "processing") {
      if (!sawProcessing.current) {
        sawProcessing.current = true;
        notifyInfo(copy({ en: "Extracting data from the form…", vi: "Đang trích xuất dữ liệu từ form…" }));
      }
      return;
    }
    if (!sawProcessing.current) return;
    if (status === "done") {
      sawProcessing.current = false;
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      notifySuccess(copy({ en: "Form data extracted", vi: "Đã trích xuất xong dữ liệu từ form" }));
    } else if (status === "failed") {
      sawProcessing.current = false;
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      notify({
        message: copy({
          en: "Form data extraction failed. Some fields may still need manual entry.",
          vi: "Trích xuất dữ liệu form thất bại. Một số trường có thể cần nhập thủ công.",
        }),
        tone: "error",
      });
    }
  }, [status, leadId, copy, queryClient, notify, notifyInfo, notifySuccess]);

  if (status !== "processing") return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
        <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        {copy({ en: "Extracting data from the form…", vi: "Đang trích xuất dữ liệu từ form…" })}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500" />
      </div>
    </div>
  );
}
