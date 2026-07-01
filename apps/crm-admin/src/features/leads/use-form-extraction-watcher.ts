import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFormExtractionStatusQuery } from "@social-crm/api";
import { useI18n } from "../../i18n";
import { useRequestNotifications } from "../../app/request-notifications";

/**
 * Watches a lead's form-extraction status (processing/done/failed) for the
 * lifetime of the lead workbench page, independent of which tab is active.
 *
 * Must be mounted at the page level, not inside the "extraction" tab's
 * content — TanStack Query's refetchInterval polling only runs while a query
 * has an active observer, so scoping this to a conditionally-rendered tab
 * meant leaving that tab (or switching leads) silently dropped the
 * done/failed toast and the lead-data refresh. FormExtractionProgress still
 * renders the visual indicator only inside that tab, but reads from the same
 * query key, so it shows current state without re-triggering the poll.
 */
export function useFormExtractionWatcher(leadId?: string) {
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
}
