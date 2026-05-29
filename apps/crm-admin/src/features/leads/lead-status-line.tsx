import { useI18n } from "@/i18n";

/**
 * Lead pipeline status line — horizontal numbered stepper.
 *
 * Grounded in the REAL backend lead state machine (src/features/leads/
 * lead-state-machine.ts), NOT the 9-step mockup. The happy path is the linear
 * spine below; the two branch states (INTERVIEW_FAILED, DISQUALIFIED) are off
 * the spine and are surfaced as a banner rather than a fake step, because the
 * state machine does not let them flow forward.
 *
 *   NEW → CONTACTED → QUALIFIED → MATCHING → MATCHED → INTERVIEW_SCHEDULED
 *   → INTERVIEW_PASSED → CONTRACT_SIGNED → VISA_PROCESSING → DEPARTED
 */

const SPINE = [
  "new",
  "contacted",
  "qualified",
  "matching",
  "matched",
  "interview_scheduled",
  "interview_passed",
  "contract_signed",
  "visa_processing",
  "departed",
] as const;

type SpineStatus = (typeof SPINE)[number];

/** Where a branch state visually sits on the spine, for the banner copy. */
const BRANCH_ANCHOR: Record<string, SpineStatus> = {
  interview_failed: "interview_scheduled",
  disqualified: "new",
};

function normalize(status: string): string {
  return status.toLowerCase();
}

export function LeadStatusLine(props: { status: string; className?: string }) {
  const { copy, formatLeadStatus } = useI18n();
  const status = normalize(props.status);

  const isBranch = status in BRANCH_ANCHOR;
  // For a branch state, light the spine up to the anchor so the operator still
  // sees how far the case got before it went off-track.
  const activeStatus = isBranch ? BRANCH_ANCHOR[status] : (status as SpineStatus);
  const currentIndex = SPINE.indexOf(activeStatus);
  const isDisqualified = status === "disqualified";

  return (
    <div className={props.className}>
      <div className="overflow-x-auto pb-6 pt-1">
        <div className="flex min-w-max items-center px-1">
          {SPINE.map((step, index) => {
            const isCompleted = index <= currentIndex && !isDisqualified;
            const isCurrent = index === currentIndex && !isBranch;
            return (
              <div key={step} className="flex items-center">
                <div className="relative flex flex-col items-center">
                  <div
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                      isCompleted
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white text-slate-400",
                      isCurrent ? "ring-4 ring-indigo-100" : "",
                    ].join(" ")}
                  >
                    {isCompleted && !isCurrent ? "✓" : index + 1}
                  </div>
                  <span
                    className={[
                      "absolute top-9 w-24 text-center text-[10px] font-medium leading-tight",
                      isCurrent ? "text-indigo-700" : "text-slate-500",
                    ].join(" ")}
                  >
                    {formatLeadStatus(step)}
                  </span>
                </div>
                {index < SPINE.length - 1 ? (
                  <div className={`mx-2 h-1 w-10 rounded-full ${index < currentIndex && !isDisqualified ? "bg-indigo-600" : "bg-slate-200"}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {isBranch ? (
        <div
          className={`mt-1 rounded-xl border px-3 py-2 text-sm font-medium ${
            isDisqualified
              ? "border-slate-800 bg-slate-900 text-white"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {isDisqualified
            ? copy({ en: "Off pipeline — disqualified.", vi: "Ngoài quy trình — đã bị loại." })
            : copy({
                en: "Off pipeline — interview failed. The only allowed move is back to Contacted.",
                vi: "Ngoài quy trình — rớt đơn. Chỉ được phép quay lại Đã liên hệ.",
              })}{" "}
          <span className="font-bold">{formatLeadStatus(status)}</span>
        </div>
      ) : null}
    </div>
  );
}
