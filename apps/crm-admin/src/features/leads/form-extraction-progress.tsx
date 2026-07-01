import { useFormExtractionStatusQuery } from "@social-crm/api";
import { useI18n } from "../../i18n";

/**
 * Visual indicator shown in the "extraction" tab while a just-committed
 * standard form is being processed. Purely presentational — reads the same
 * query key that useFormExtractionWatcher keeps polling at the page level,
 * so it reflects live status without owning the poll, toast, or lead-data
 * refresh itself (see useFormExtractionWatcher for why that split matters).
 */
export function FormExtractionProgress(props: { leadId?: string }) {
  const { leadId } = props;
  const { copy } = useI18n();
  const statusQuery = useFormExtractionStatusQuery(leadId);
  const status = statusQuery.data?.status ?? null;

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
