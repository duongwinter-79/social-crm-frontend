import type { ReactNode } from "react";
import { Badge } from "@social-crm/ui";
import type { AiSuggestion } from "@social-crm/api";
import { useI18n } from "../../i18n";

/**
 * Step 7D — three-state provenance wrapper for any operator field on the lead
 * workbench.
 *
 *   Extracted             — AI proposed a value, operator hasn't reviewed.
 *   Needs verification    — AI value differs from current verified value.
 *   Verified              — operator confirmed (the field's key is in
 *                           lead.verifiedKeys, OR appliedToVerifiedAt is set).
 *
 * Renders the editor children plus a provenance badge, the AI suggestion line
 * (when relevant), and a small "Apply suggestion" hint button. The Apply
 * button is opt-in: pass an `onApplySuggestion` callback to enable it. Pure
 * display when omitted.
 */
export interface FieldWithProvenanceProps {
  /** Editor (Input / Select / textarea) for the verified value. */
  children: ReactNode;
  /** Manifest field key (e.g. "gender", "heightCm"). */
  fieldKey: string;
  /** Active AI suggestion for this field, or undefined if none. */
  suggestion?: AiSuggestion;
  /** True when the operator has explicitly verified this field. */
  isVerified: boolean;
  /** Current value the operator sees in the editor. Used to decide "needs verification". */
  currentValue: unknown;
  /** Optional click handler — receives suggestion.value to copy into the editor. */
  onApplySuggestion?: (value: unknown) => void;
  /** Optional one-line note shown below the editor (e.g. merge_candidate hint). */
  hint?: ReactNode;
}

function provenanceState(props: FieldWithProvenanceProps): "verified" | "needs_verification" | "extracted" | "none" {
  if (props.isVerified) return "verified";
  if (!props.suggestion || props.suggestion.value === null || props.suggestion.value === undefined) {
    return "none";
  }
  // AI has a value, operator hasn't verified yet.
  if (props.currentValue === null || props.currentValue === undefined || props.currentValue === "") {
    return "extracted";
  }
  // Both AI and current value exist — needs verification if they differ.
  return JSON.stringify(props.suggestion.value) === JSON.stringify(props.currentValue)
    ? "extracted"
    : "needs_verification";
}

function confidenceBadgeTone(confidence: AiSuggestion["confidence"]) {
  if (confidence === "high") return "success" as const;
  if (confidence === "medium") return "warning" as const;
  return "neutral" as const;
}

export function FieldWithProvenance(props: FieldWithProvenanceProps) {
  const { copy, formatFieldValue, formatConfidence, formatExtractionSource } = useI18n();
  const state = provenanceState(props);
  const sug = props.suggestion;

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">{props.children}</div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        {state === "verified" ? (
          <Badge tone="success">{copy({ en: "Verified", vi: "Đã xác minh" })}</Badge>
        ) : state === "needs_verification" ? (
          <Badge tone="warning">{copy({ en: "Needs verification", vi: "Cần xác minh" })}</Badge>
        ) : state === "extracted" ? (
          <Badge tone="accent">{copy({ en: "Extracted", vi: "Trích xuất" })}</Badge>
        ) : null}

        {sug ? (
          <>
            <Badge tone={confidenceBadgeTone(sug.confidence)}>
              {formatConfidence(sug.confidence)}
            </Badge>
            <Badge tone="neutral">{formatExtractionSource(sug.source)}</Badge>
          </>
        ) : null}

        {sug && sug.value !== null && sug.value !== undefined && state !== "verified" ? (
          <span className="text-slate-500">
            <span className="text-slate-400">{copy({ en: "AI suggested:", vi: "AI gợi ý:" })}</span>{" "}
            <span className="font-medium text-slate-700">{formatFieldValue(props.fieldKey, sug.value)}</span>
            {props.onApplySuggestion ? (
              <button
                type="button"
                className="ml-2 text-indigo-600 hover:text-indigo-500 underline"
                onClick={() => props.onApplySuggestion?.(sug.value)}
              >
                {copy({ en: "Apply", vi: "Áp dụng" })}
              </button>
            ) : null}
          </span>
        ) : null}

        {sug?.reason ? (
          <span className="text-rose-500" title={sug.reason}>
            {sug.reason.startsWith("merge_candidate:")
              ? copy({ en: "Merge required", vi: "Cần gộp ứng viên" })
              : sug.reason}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Helper — turn the array result of useLeadAiSuggestionsQuery into a lookup
 * keyed by manifest fieldName.
 */
export function indexSuggestions(suggestions: AiSuggestion[] | undefined): Record<string, AiSuggestion> {
  if (!suggestions) return {};
  const out: Record<string, AiSuggestion> = {};
  for (const s of suggestions) {
    out[s.fieldName] = s;
  }
  return out;
}

/**
 * Helper — find a phone merge_candidate in the suggestion list. Returns the
 * conflicting lead id or null.
 */
export function findPhoneMergeCandidate(suggestions: AiSuggestion[] | undefined): string | null {
  if (!suggestions) return null;
  const phoneSuggestion = suggestions.find((s) => s.fieldName === "phone");
  if (!phoneSuggestion?.reason) return null;
  const match = phoneSuggestion.reason.match(/merge_candidate:([\w-]+)/);
  return match?.[1] ?? null;
}
