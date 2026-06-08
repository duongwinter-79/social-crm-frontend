import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, InfoStrip, Panel } from "@social-crm/ui";
import type { AiSuggestion, BackgroundExtractionStatus, Lead, LeadQualificationSnapshot } from "@social-crm/api";
import { useI18n } from "../../i18n";
import { findPhoneMergeCandidate } from "./field-with-provenance";
import {
    FIELD_DISPLAY_ALIASES,
    REVIEWABLE_AI_FIELDS,
    SUGGESTION_ROUTING,
    TRACKED_AI_FIELDS
} from "./field-policy.generated";

export type ScanMode = "new_only" | "include_scanned";

interface Props {
    lead: Lead;
    suggestions: AiSuggestion[];
    qualification: LeadQualificationSnapshot | undefined;
    /**
     * Apply verified suggestions. `patch` carries qualification-overlay fields
     * (saved immediately); `identityPatch` carries Lead identity fields
     * (fullName/phone) that the parent applies to the identity form display so
     * the operator can review and save them via "Save identity".
     */
    onVerifyAll: (patch: Record<string, unknown>, identityPatch: Record<string, unknown>) => void;
    onRerunExtraction: (scanMode: ScanMode) => void;
    /** Reject/dismiss the active suggestion for a field so it stops resurfacing. */
    onDismissSuggestion?: (fieldName: string) => void;
    isDismissing?: boolean;
    isVerifyAllPending: boolean;
    isRerunPending: boolean;
    extractionStatus: BackgroundExtractionStatus;
    className?: string;
}

type SectionId = "quick_scan" | "work_experience" | "other";

const SECTION_LABELS: Record<SectionId, { en: string; vi: string }> = {
    quick_scan: { en: "Quick scan", vi: "Sàng lọc nhanh" },
    work_experience: { en: "Work experience", vi: "Kinh nghiệm làm việc" },
    other: { en: "Other extracted fields", vi: "Trường khác" }
};

const FIELD_SECTION: Record<string, SectionId> = {
    fullName: "quick_scan",
    name: "quick_scan",
    phone: "quick_scan",
    address: "quick_scan",
    birthYear: "quick_scan",
    age: "quick_scan",
    gender: "quick_scan",
    heightCm: "quick_scan",
    height: "quick_scan",
    weightKg: "quick_scan",
    weight: "quick_scan",
    hasPassport: "quick_scan",
    tattooStatus: "quick_scan",
    healthMeetsCriteria: "quick_scan",
    experienceField: "work_experience",
    experienceLevel: "work_experience",
    experienceYears: "work_experience",
    experienceDetails: "work_experience",
    desiredIndustry: "work_experience",
    preferredRegion: "work_experience",
    preferredRegions: "work_experience",
    desiredSalary: "work_experience",
    hasWorkedAbroad: "work_experience"
};

// SUGGESTION_ROUTING / TRACKED_AI_FIELDS / FIELD_DISPLAY_ALIASES /
// REVIEWABLE_AI_FIELDS now live in `./field-policy.generated.ts`, generated from
// the backend's single FIELD_POLICY table (npm run gen:field-policy). Do not
// hand-edit them here — the backend drift guard (test:field-policy-codegen)
// keeps the generated mirror honest.

function extractionStatusCopy(status: BackgroundExtractionStatus, copy: ReturnType<typeof useI18n>["copy"]) {
    switch (status) {
        case "starting":
            return {
                tone: "neutral" as const,
                label: copy({ en: "Starting extraction", vi: "Đang bắt đầu trích xuất" }),
                description: copy({
                    en: "The backend accepted the request and is preparing the background extraction job.",
                    vi: "API đã nhận yêu cầu và đang chuẩn bị xử lý trích xuất nền."
                })
            };
        case "running":
            return {
                tone: "warning" as const,
                label: copy({ en: "Background extraction running", vi: "Đang trích xuất nền" }),
                description: copy({
                    en: "You can continue working. This card will refresh when suggestions, profile data, or scan status changes.",
                    vi: "Bạn có thể tiếp tục thao tác. Thẻ này sẽ tự cập nhật khi gợi ý, hồ sơ hoặc trạng thái quét thay đổi."
                })
            };
        case "completed":
            return {
                tone: "success" as const,
                label: copy({ en: "Extraction refreshed", vi: "Đã cập nhật trích xuất" }),
                description: copy({
                    en: "The background extraction run has finished and the latest lead data has been refreshed.",
                    vi: "Lượt trích xuất nền đã hoàn tất và dữ liệu ứng viên mới nhất đã được cập nhật."
                })
            };
        case "timeout":
            return {
                tone: "warning" as const,
                label: copy({ en: "Still processing", vi: "Vẫn đang xử lý" }),
                description: copy({
                    en: "The request is still running or did not report completion within 60 seconds. Refresh the page or check again shortly.",
                    vi: "Yêu cầu vẫn có thể đang chạy hoặc chưa báo hoàn tất trong 60 giây. Hãy tải lại trang hoặc kiểm tra lại sau."
                })
            };
        case "failed":
            return {
                tone: "danger" as const,
                label: copy({ en: "Extraction status unavailable", vi: "Không đọc được trạng thái trích xuất" }),
                description: copy({
                    en: "The extraction request or status polling failed. Existing data was not cleared.",
                    vi: "Yêu cầu trích xuất hoặc việc kiểm tra trạng thái bị lỗi. Dữ liệu hiện có không bị xóa."
                })
            };
        default:
            return null;
    }
}

function canonicalDisplayField(key: string): string {
    return FIELD_DISPLAY_ALIASES[key] ?? key;
}

function sectionFor(key: string): SectionId {
    return FIELD_SECTION[key] ?? "other";
}

function pickValue(suggestions: Map<string, AiSuggestion>, lead: Lead, ...keys: string[]): unknown {
    const leadVerifiedKeys = (lead as unknown as { verifiedKeys?: unknown }).verifiedKeys;
    const verifiedKeys = Array.isArray(leadVerifiedKeys) ? (leadVerifiedKeys as string[]) : [];

    for (const key of keys) {
        if (verifiedKeys.includes(key)) {
            const verified = (lead.verifiedProfileData as Record<string, unknown> | null | undefined)?.[key];
            if (verified !== undefined) return verified;
        }

        const typed = (lead as unknown as Record<string, unknown>)[key];
        if (typed !== null && typed !== undefined && typed !== "") return typed;

        const suggestion = suggestions.get(key);
        if (suggestion && suggestion.value !== null && suggestion.value !== undefined) return suggestion.value;

        const legacyVerified = (lead.verifiedProfileData as Record<string, unknown> | null | undefined)?.[key];
        if (legacyVerified !== null && legacyVerified !== undefined) return legacyVerified;

        const ai = (lead.aiExtractedData as Record<string, unknown> | null | undefined)?.[key];
        if (ai !== null && ai !== undefined) return ai;
    }

    return undefined;
}

function composeSnapshotSentences(lead: Lead, suggestionsByField: Map<string, AiSuggestion>): string[] {
    const sentences: string[] = [];
    const get = (...keys: string[]) => pickValue(suggestionsByField, lead, ...keys);

    const name = get("fullName", "name");
    const gender = get("gender");
    let age = get("age");
    if (!age) {
        const birthYear = get("birthYear");
        if (typeof birthYear === "number") age = new Date().getFullYear() - birthYear;
    }

    const phone = get("phone");
    const heightCm = get("heightCm", "height");
    const weightKg = get("weightKg", "weight");
    const region = get("region", "address");
    const experienceField = get("experienceField");
    const experienceYears = get("experienceYears");
    const desiredIndustry = get("desiredIndustry");
    const desiredSalary = get("desiredSalary");
    const preferredRegions = get("preferredRegions", "preferredRegion");
    const jobNeeds = get("jobNeeds");

    const identityParts: string[] = [];
    if (name) identityParts.push(String(name));
    if (gender === "male") identityParts.push("nam");
    if (gender === "female") identityParts.push("nữ");
    if (age) identityParts.push(`${age} tuổi`);
    if (identityParts.length) sentences.push(`${identityParts.join(", ")}.`);

    const profileParts: string[] = [];
    if (heightCm) profileParts.push(`cao ${heightCm} cm`);
    if (weightKg) profileParts.push(`nặng ${weightKg} kg`);
    if (region) profileParts.push(`địa chỉ ${region}`);
    if (profileParts.length) sentences.push(capitalize(`${profileParts.join(", ")}.`));

    const workParts: string[] = [];
    if (experienceField) {
        workParts.push(
            experienceYears
                ? `kinh nghiệm ${experienceField} (${experienceYears} năm)`
                : `kinh nghiệm ${experienceField}`
        );
    } else if (experienceYears) {
        workParts.push(`${experienceYears} năm kinh nghiệm`);
    }
    if (desiredIndustry) workParts.push(`mong muốn ${desiredIndustry}`);
    if (Array.isArray(preferredRegions) && preferredRegions.length) {
        workParts.push(`khu vực ${preferredRegions.join(", ")}`);
    } else if (preferredRegions) {
        workParts.push(`khu vực ${preferredRegions}`);
    }
    if (Array.isArray(jobNeeds) && jobNeeds.length) workParts.push(`công việc ${jobNeeds.join(", ")}`);
    if (desiredSalary) workParts.push(`lương ${desiredSalary}`);
    if (workParts.length) sentences.push(capitalize(`${workParts.join(", ")}.`));

    if (phone) sentences.push(`Liên hệ: ${phone}.`);

    return sentences;
}

function capitalize(value: string) {
    return value.replace(/^./, (c) => c.toUpperCase());
}

interface CoverageStats {
    extracted: number;
    total: number;
    pct: number;
}

function computeCoverage(suggestionsByField: Map<string, AiSuggestion>, lead: Lead): CoverageStats {
    let extracted = 0;
    for (const key of TRACKED_AI_FIELDS) {
        if (pickValue(suggestionsByField, lead, key) !== undefined) extracted++;
    }
    const total = TRACKED_AI_FIELDS.length;
    return { extracted, total, pct: total === 0 ? 0 : Math.round((extracted / total) * 100) };
}

function computeAverageConfidence(suggestions: AiSuggestion[]): number {
    if (suggestions.length === 0) return 0;
    const score = (confidence: AiSuggestion["confidence"]) =>
        confidence === "high" ? 1 : confidence === "medium" ? 0.6 : 0.3;
    return suggestions.reduce((acc, suggestion) => acc + score(suggestion.confidence), 0) / suggestions.length;
}

interface ConflictRow {
    fieldName: string;
    aiValue: unknown;
    verifiedValue: unknown;
    confidence: AiSuggestion["confidence"];
}

function findConflicts(
    suggestions: AiSuggestion[],
    verifiedKeys: string[],
    verified: Record<string, unknown>
): ConflictRow[] {
    const out: ConflictRow[] = [];
    for (const suggestion of suggestions) {
        if (verifiedKeys.includes(suggestion.fieldName)) continue;
        const verifiedValue = verified[suggestion.fieldName];
        if (verifiedValue === null || verifiedValue === undefined) continue;
        if (suggestion.value === null || suggestion.value === undefined) continue;
        if (JSON.stringify(verifiedValue) === JSON.stringify(suggestion.value)) continue;
        out.push({
            fieldName: suggestion.fieldName,
            aiValue: suggestion.value,
            verifiedValue,
            confidence: suggestion.confidence
        });
    }
    return out;
}

interface VerifyAllPatches {
    /** Fields saved to the qualification overlay via the qualification mutation. */
    qualification: Record<string, unknown>;
    /** Lead identity fields (fullName/phone) applied to the identity form display. */
    identity: Record<string, unknown>;
    /**
     * Canonical display-field names that "Verify all" will actually apply — the
     * single source of truth for the button count, the per-row "pending" badge,
     * and the section/panel pending counts, so they can never disagree. A
     * suggestion that is already verified, already matches the saved value, or
     * has no routing is NOT in this set even though it still renders as a row.
     */
    actionable: Set<string>;
    /**
     * Subset of `actionable` that is already verified but whose newer AI value
     * differs from the verified one — applying these OVERWRITES an operator's
     * earlier correction, so the UI warns before "Verify all" runs.
     */
    reSuggested: Set<string>;
}

/**
 * Partitions every active AI suggestion into the qualification patch and the
 * identity patch via SUGGESTION_ROUTING, so "Verify all" applies ALL suggested
 * fields — nothing shown as "Pending" is silently dropped.
 *
 * Idempotency guards:
 *   - qualification: skip fields the operator already verified. verifiedKeys is
 *     stamped with DTO keys (e.g. `height`, not `heightCm`), so we check both
 *     the suggestion fieldName and the routed dtoKey.
 *   - identity: skip suggestions that already match the saved Lead value.
 */
function composeVerifyAllPatches(
    suggestions: AiSuggestion[],
    verifiedKeys: string[],
    lead: Lead,
    verified: Record<string, unknown>
): VerifyAllPatches {
    const qualification: Record<string, unknown> = {};
    const identity: Record<string, unknown> = {};
    const actionable = new Set<string>();
    const reSuggested = new Set<string>();

    for (const suggestion of suggestions) {
        if (suggestion.value === null || suggestion.value === undefined || suggestion.value === "") continue;

        const route = SUGGESTION_ROUTING[suggestion.fieldName];
        if (!route) {
            // A suggestion the routing table doesn't know about would be dropped
            // by "Verify all". Surface it in dev so backend drift is caught.
            if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
                // eslint-disable-next-line no-console
                console.warn(
                    `[verify-all] No routing for AI suggestion field "${suggestion.fieldName}" — it will NOT be applied.`
                );
            }
            continue;
        }

        if (route.target === "qualification") {
            const isVerified =
                verifiedKeys.includes(suggestion.fieldName) || verifiedKeys.includes(route.dtoKey);
            if (isVerified) {
                // Already verified: skip only when the new suggestion still matches
                // the verified value. If it DIFFERS, it's a re-suggestion — include
                // it (Verify all overwrites) but flag it so the UI can warn.
                const vv = verified[route.dtoKey] ?? verified[suggestion.fieldName];
                if (
                    vv === null ||
                    vv === undefined ||
                    JSON.stringify(vv) === JSON.stringify(suggestion.value)
                ) {
                    continue;
                }
                reSuggested.add(canonicalDisplayField(suggestion.fieldName));
            }
            qualification[route.dtoKey] = suggestion.value;
        } else {
            // Identity: skip if the suggestion already matches the saved value.
            const current = (lead as unknown as Record<string, unknown>)[route.dtoKey];
            if (
                current !== null &&
                current !== undefined &&
                current !== "" &&
                JSON.stringify(current) === JSON.stringify(suggestion.value)
            ) {
                continue;
            }
            identity[route.dtoKey] = suggestion.value;
        }

        // Reached only when the suggestion is actually applied above. Track it by
        // its display-field name so the row badge + counts line up with the patch.
        actionable.add(canonicalDisplayField(suggestion.fieldName));
    }

    return { qualification, identity, actionable, reSuggested };
}

interface RowState {
    fieldName: string;
    value: unknown;
    suggestion?: AiSuggestion;
    isVerified: boolean;
    /** The operator's saved verified value (when verified). */
    verifiedValue?: unknown;
    /** Not-yet-verified AI value differs from a saved value. */
    verifiedValueDiffers: boolean;
    /**
     * Already verified, but a NEWER extraction produced a value that differs
     * from the verified one. Needs an explicit operator decision (use AI / keep)
     * — otherwise the field is locked on the stale verified value.
     */
    reSuggested: boolean;
    section: SectionId;
}

function buildRows(
    lead: Lead,
    suggestions: AiSuggestion[],
    verifiedKeys: string[],
    verified: Record<string, unknown>
): RowState[] {
    const map: Map<string, RowState> = new Map();

    for (const suggestion of suggestions) {
        const fieldName = canonicalDisplayField(suggestion.fieldName);
        const isVerified = verifiedKeys.includes(fieldName) || verifiedKeys.includes(suggestion.fieldName);
        const verifiedValue = verified[fieldName] ?? verified[suggestion.fieldName];

        const diffsFromVerified =
            verifiedValue !== null &&
            verifiedValue !== undefined &&
            suggestion.value !== null &&
            suggestion.value !== undefined &&
            JSON.stringify(verifiedValue) !== JSON.stringify(suggestion.value);

        map.set(fieldName, {
            fieldName,
            value: suggestion.value,
            suggestion,
            isVerified,
            verifiedValue,
            verifiedValueDiffers: !isVerified && diffsFromVerified,
            reSuggested: isVerified && diffsFromVerified,
            section: sectionFor(fieldName)
        });
    }

    const jsonb = (lead.aiExtractedData ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(jsonb)) {
        const fieldName = canonicalDisplayField(key);
        const canonicalValue = jsonb[fieldName];

        // Only reviewable fields belong on the panel. JSONB also carries
        // scoring/merge inputs (age, dateOfBirth, address, jobNeeds, interests,
        // behaviour signals) that can NEVER become a suggestion — surfacing them
        // here produced dead "Đã lưu" rows with no path forward. Gate on the
        // generated REVIEWABLE_AI_FIELDS so they stay out of the review surface.
        if (!REVIEWABLE_AI_FIELDS.has(fieldName)) continue;

        // Prefer canonical keys like `fullName` over legacy aliases like `name`.
        if (fieldName !== key && canonicalValue !== null && canonicalValue !== undefined && canonicalValue !== "") {
            continue;
        }
        if (map.has(fieldName)) continue;
        if (key.startsWith("_") || key === "source" || key === "extractedAt" || key === "confidence") continue;
        if (value === null || value === undefined || value === "") continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (typeof value === "object" && Object.keys(value as object).length === 0) continue;
        map.set(fieldName, {
            fieldName,
            value,
            isVerified: verifiedKeys.includes(fieldName) || verifiedKeys.includes(key),
            verifiedValueDiffers: false,
            reSuggested: false,
            section: sectionFor(fieldName)
        });
    }

    return [...map.values()].sort((a, b) => {
        const order: Record<SectionId, number> = { quick_scan: 0, work_experience: 1, other: 2 };
        const sectionOrder = order[a.section] - order[b.section];
        return sectionOrder !== 0 ? sectionOrder : a.fieldName.localeCompare(b.fieldName);
    });
}

function ConfidenceBar({ pct, copy }: { pct: number; copy: (v: { en: string; vi: string }) => string }) {
    const percentage = Math.round(pct * 100);
    const tone = pct >= 0.8 ? "success" : pct >= 0.5 ? "warning" : "neutral";

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {copy({ en: "AI confidence", vi: "Độ tin cậy AI" })}
                </div>
                <Badge tone={tone}>{percentage}%</Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}

function CoveragePill({
    cov,
    copy
}: {
    cov: CoverageStats;
    copy: (v: { en: string; vi: string }) => string;
}) {
    const tone = cov.pct >= 70 ? "success" : cov.pct >= 40 ? "warning" : "neutral";
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {copy({ en: "Coverage", vi: "Độ phủ dữ liệu" })}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                    {cov.extracted}/{cov.total}
                </span>
                <Badge tone={tone}>{cov.pct}%</Badge>
            </div>
        </div>
    );
}

function ConflictsPill({
    count,
    copy
}: {
    count: number;
    copy: (v: { en: string; vi: string }) => string;
}) {
    const tone = count === 0 ? "success" : count <= 2 ? "warning" : "danger";
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {copy({ en: "Conflicts", vi: "Mâu thuẫn" })}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">{count}</span>
                <Badge tone={tone}>
                    {count === 0
                        ? copy({ en: "Clean", vi: "Không có" })
                        : copy({ en: "Review", vi: "Cần xem" })}
                </Badge>
            </div>
        </div>
    );
}

function ChevronDownIcon(props: { open: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${props.open ? "rotate-180" : ""}`}
        >
            <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
    );
}

function FieldRow({
    row,
    verified,
    isActionable,
    copy,
    formatFieldLabel,
    formatFieldValue,
    formatConfidence,
    formatExtractionSource,
    onDismiss,
    onAccept,
    isDismissing
}: {
    row: RowState;
    verified: Record<string, unknown>;
    /** True iff "Verify all" would actually apply this row (drives the badge). */
    isActionable: boolean;
    copy: (v: { en: string; vi: string }) => string;
    formatFieldLabel: (key: string) => string;
    formatFieldValue: (key: string, value: unknown) => string;
    formatConfidence: (value: string) => string;
    formatExtractionSource: (value: string) => string;
    onDismiss?: (fieldName: string) => void;
    /** Re-verify this single field to its newer AI value (re-suggested rows). */
    onAccept?: (row: RowState) => void;
    isDismissing?: boolean;
}) {
    const suggestion = row.suggestion;
    const verifiedValue = row.isVerified ? verified[row.fieldName] : undefined;
    // Only an *actionable* suggestion (one "Verify all" would actually apply) is
    // "Pending". A suggestion that isn't actionable already matches the saved
    // value (or has no writable target), so it falls through to the neutral
    // "Stored" badge — to an operator a suggestion that equals the saved value
    // and a plain stored value are the same thing, so the UI shows one label
    // instead of splitting them. This still keeps no-op suggestions out of the
    // "Pending" bucket, reconciling the badges with the Verify-all count.
    const pending = Boolean(suggestion) && isActionable;
    // A non-actionable, non-conflict suggestion already equals the saved value —
    // there's nothing to verify AND nothing to reject (rejecting wouldn't change
    // the saved data). Used to disable the Reject button so the row reads as the
    // passive "Stored" state it is.
    const matchesSaved =
        Boolean(suggestion) && !isActionable && !row.isVerified && !row.verifiedValueDiffers;
    const tone = row.reSuggested
        ? "warning"
        : row.isVerified
            ? "success"
            : row.verifiedValueDiffers
                ? "danger"
                : pending
                    ? "warning"
                    : "neutral";
    const stateLabel = row.reSuggested
        ? copy({ en: "Re-suggested", vi: "Cần xem lại" })
        : row.isVerified
        ? copy({ en: "Verified", vi: "Đã xác minh" })
        : row.verifiedValueDiffers
            ? copy({ en: "Conflict", vi: "Mâu thuẫn" })
            : pending
                ? copy({ en: "Pending", vi: "Chờ xác minh" })
                : copy({ en: "Stored", vi: "Đã lưu" });

    return (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="break-words font-medium text-slate-900" title={row.fieldName}>
                        {formatFieldLabel(row.fieldName)}
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Badge tone={tone}>{stateLabel}</Badge>
                    {suggestion ? (
                        <Badge
                            tone={
                                suggestion.confidence === "high"
                                    ? "success"
                                    : suggestion.confidence === "medium"
                                        ? "warning"
                                        : "neutral"
                            }
                        >
                            {formatConfidence(suggestion.confidence)}
                        </Badge>
                    ) : null}
                    {suggestion ? (
                        <Badge tone="neutral">{formatExtractionSource(suggestion.source)}</Badge>
                    ) : null}
                </div>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-5">
                <div className="min-w-0 text-slate-500">
                    <span className="text-slate-400">{copy({ en: "AI:", vi: "AI:" })}</span>{" "}
                    <span className="break-words font-medium text-slate-800">{formatFieldValue(row.fieldName, row.value)}</span>
                </div>
                {row.isVerified || row.verifiedValueDiffers ? (
                    <div className="min-w-0 text-slate-500">
                        <span className="text-slate-400">
                            {copy({ en: "Verified:", vi: "Đã xác minh:" })}
                        </span>{" "}
                        <span className="break-words font-medium text-slate-800">
                            {formatFieldValue(row.fieldName, verifiedValue ?? verified[row.fieldName])}
                        </span>
                    </div>
                ) : null}
                {suggestion?.reason ? (
                    <div className="break-words text-rose-600" title={suggestion.reason}>
                        {suggestion.reason.startsWith("merge_candidate:")
                            ? copy({ en: "Merge required", vi: "Cần gộp ứng viên" })
                            : suggestion.reason}
                    </div>
                ) : null}
                {row.reSuggested ? (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        <span className="text-amber-700">
                            {copy({
                                en: "AI re-extracted a different value:",
                                vi: "AI trích xuất lại giá trị khác:"
                            })}
                        </span>
                        {onAccept ? (
                            <button
                                type="button"
                                className="font-medium text-indigo-600 underline hover:text-indigo-500"
                                onClick={() => onAccept(row)}
                                title={copy({
                                    en: "Replace your verified value with the new AI value",
                                    vi: "Thay giá trị đã xác minh bằng giá trị AI mới"
                                })}
                            >
                                {copy({ en: "Use AI value", vi: "Dùng giá trị AI" })}
                            </button>
                        ) : null}
                        {onDismiss ? (
                            <button
                                type="button"
                                disabled={isDismissing}
                                className="text-slate-600 underline hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => onDismiss(row.fieldName)}
                                title={copy({
                                    en: "Keep your verified value and dismiss the new AI suggestion",
                                    vi: "Giữ giá trị đã xác minh và bỏ qua gợi ý AI mới"
                                })}
                            >
                                {copy({ en: "Keep mine", vi: "Giữ giá trị hiện tại" })}
                            </button>
                        ) : null}
                    </div>
                ) : suggestion && !row.isVerified && onDismiss ? (
                    <div className="pt-1">
                        <button
                            type="button"
                            disabled={isDismissing || matchesSaved}
                            className="text-rose-500 underline hover:text-rose-600 disabled:no-underline disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => onDismiss(row.fieldName)}
                            title={
                                matchesSaved
                                    ? copy({
                                          en: "Nothing to reject — this already matches the saved value",
                                          vi: "Không có gì để từ chối — đã khớp với giá trị đã lưu"
                                      })
                                    : copy({ en: "Reject this suggestion so it stops showing", vi: "Từ chối gợi ý để không hiển thị lại" })
                            }
                        >
                            {copy({ en: "Reject", vi: "Từ chối" })}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export function LeadAiSnapshotCard(props: Props) {
    const {
        copy,
        formatFieldLabel,
        formatFieldValue,
        formatConfidence,
        formatExtractionSource
    } = useI18n();

    // Refresh dialog state. The "Refresh structured extraction" button no
    // longer triggers the rerun directly — it opens a dialog where the
    // operator picks new_only (cheap, default) vs include_scanned (full
    // rescan, useful after prompt/model changes).
    const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
    const [pendingScanMode, setPendingScanMode] = useState<ScanMode>("new_only");

    const extractionInFlight =
        props.isRerunPending ||
        props.extractionStatus === "starting" ||
        props.extractionStatus === "running";

    const verifiedKeys: string[] = Array.isArray((props.lead as unknown as { verifiedKeys?: unknown }).verifiedKeys)
        ? ((props.lead as unknown as { verifiedKeys: string[] }).verifiedKeys)
        : [];
    const verified: Record<string, unknown> =
        (props.qualification?.verifiedData as Record<string, unknown> | undefined) ??
        ((props.lead.verifiedProfileData as Record<string, unknown> | null | undefined) ?? {});

    const suggestionsByField = useMemo(() => {
        const map = new Map<string, AiSuggestion>();
        for (const suggestion of props.suggestions) map.set(suggestion.fieldName, suggestion);
        return map;
    }, [props.suggestions]);

    const sentences = useMemo(
        () => composeSnapshotSentences(props.lead, suggestionsByField),
        [props.lead, suggestionsByField]
    );
    const coverage = useMemo(
        () => computeCoverage(suggestionsByField, props.lead),
        [props.lead, suggestionsByField]
    );
    const avgConfidence = useMemo(
        () => computeAverageConfidence(props.suggestions),
        [props.suggestions]
    );
    const conflicts = useMemo(
        () => findConflicts(props.suggestions, verifiedKeys, verified),
        [props.suggestions, verifiedKeys, verified]
    );
    const {
        qualification: verifyAllPatch,
        identity: identityPatch,
        actionable: actionableFields,
        reSuggested: reSuggestedFields,
    } = useMemo(
        () => composeVerifyAllPatches(props.suggestions, verifiedKeys, props.lead, verified),
        [props.suggestions, verifiedKeys, props.lead, verified]
    );
    const rows = useMemo(
        () => buildRows(props.lead, props.suggestions, verifiedKeys, verified),
        [props.lead, props.suggestions, verifiedKeys, verified]
    );
    const sectionedRows = useMemo(() => {
        const groups: Record<SectionId, RowState[]> = {
            quick_scan: [],
            work_experience: [],
            other: []
        };
        for (const row of rows) groups[row.section].push(row);
        return (Object.keys(groups) as SectionId[])
            .filter((sectionId) => groups[sectionId].length > 0)
            .map((sectionId) => ({
                id: sectionId,
                label: SECTION_LABELS[sectionId],
                rows: groups[sectionId]
            }));
    }, [rows]);

    // Count from the single actionable set so the button always equals the
    // per-row "pending" badges and the section/panel counts.
    const verifyAllCount = actionableFields.size;
    const phoneMergeConflictId = findPhoneMergeCandidate(props.suggestions);
    const extractionStatus = extractionStatusCopy(props.extractionStatus, copy);

    // Per-field "Use AI value" — re-verify ONE field to its newer AI value by
    // routing it through the same verify path "Verify all" uses.
    const acceptRow = (row: RowState) => {
        const sug = row.suggestion;
        if (!sug) return;
        const route = SUGGESTION_ROUTING[sug.fieldName];
        if (!route) return;
        if (route.target === "identity") {
            props.onVerifyAll({}, { [route.dtoKey]: sug.value });
        } else {
            props.onVerifyAll({ [route.dtoKey]: sug.value }, {});
        }
    };

    return (
        <Panel
            title={copy({ en: "AI snapshot", vi: "Dữ liệu AI" })}
            subtitle={copy({
                en: "What AI understood from inbound messages. Staff-verified fields still override AI data when reading.",
                vi: "Những gì AI hiểu từ tin nhắn đến. Trường đã được nhân viên xác minh vẫn được ưu tiên khi đọc dữ liệu."
            })}
            className={props.className}
        >
            {sentences.length > 0 ? (
                <div className="rounded-2xl border border-indigo-100 bg-white/85 p-4 text-sm leading-7 text-slate-800 shadow-sm">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">
                        {copy({ en: "Fast read", vi: "Tóm tắt nhanh" })}
                    </div>
                    <div className="grid gap-1 lg:grid-cols-2">
                        {sentences.map((sentence) => (
                            <p key={sentence} className="break-words">
                                {sentence}
                            </p>
                        ))}
                    </div>
                </div>
            ) : (
                <EmptyState
                    title={copy({ en: "Nothing extracted yet", vi: "AI chưa trích xuất dữ liệu" })}
                    description={copy({
                        en: "Run AI extraction after inbound messages arrive.",
                        vi: "Bấm trích xuất AI sau khi ứng viên có tin nhắn đến."
                    })}
                />
            )}

            {phoneMergeConflictId ? (
                <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                    <Badge tone="danger">{copy({ en: "Merge required", vi: "Cần gộp ứng viên" })}</Badge>{" "}
                    {copy({
                        en: "AI extracted a phone number that already belongs to another lead.",
                        vi: "AI trích xuất số điện thoại trùng với ứng viên khác."
                    })}{" "}
                    <code className="rounded bg-rose-100 px-1.5 text-xs">{phoneMergeConflictId}</code>
                </div>
            ) : null}

            {props.suggestions.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <ConfidenceBar pct={avgConfidence} copy={copy} />
                    <CoveragePill cov={coverage} copy={copy} />
                    <ConflictsPill count={conflicts.length} copy={copy} />
                </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-indigo-100 bg-white/70 px-4 py-3">
                <div className="mb-3 text-xs leading-5 text-slate-500">
                    {copy({
                        en: "This action rebuilds saved extraction data, AI suggestions, profile signals, score, and matching inputs.",
                        vi: "Thao tác này cập nhật dữ liệu trích xuất đã lưu, gợi ý AI, tín hiệu hồ sơ, điểm ứng viên và dữ liệu ghép đơn."
                    })}
                </div>
                {extractionStatus ? (
                    <InfoStrip
                        className={
                            props.extractionStatus === "failed"
                                ? "mb-3 border-rose-300 bg-rose-50 text-rose-900"
                                : props.extractionStatus === "completed"
                                    ? "mb-3 border-emerald-300 bg-emerald-50 text-emerald-900"
                                    : "mb-3 border-amber-300 bg-amber-50 text-amber-900"
                        }
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge tone={extractionStatus.tone}>{extractionStatus.label}</Badge>
                            <span className="text-sm leading-6">{extractionStatus.description}</span>
                        </div>
                    </InfoStrip>
                ) : null}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        onClick={() => props.onVerifyAll(verifyAllPatch, identityPatch)}
                        disabled={props.isVerifyAllPending || verifyAllCount === 0}
                    >
                        {props.isVerifyAllPending
                            ? copy({ en: "Verifying...", vi: "Đang xác minh..." })
                            : verifyAllCount === 0
                                ? copy({ en: "Nothing to verify", vi: "Không có dữ liệu cần xác minh" })
                                : copy({
                                    en: `Verify all (${verifyAllCount})`,
                                    vi: `Xác minh tất cả (${verifyAllCount})`
                                })}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setPendingScanMode("new_only");
                            setRefreshDialogOpen(true);
                        }}
                        disabled={extractionInFlight}
                    >
                        {extractionInFlight
                            ? copy({ en: "Extracting...", vi: "Đang trích xuất..." })
                            : copy({ en: "Refresh structured extraction", vi: "Cập nhật trích xuất có cấu trúc" })}
                    </Button>
                </div>

                {reSuggestedFields.size > 0 ? (
                    <div className="mt-3 max-w-2xl rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                        <span className="font-semibold">{copy({ en: "Heads up: ", vi: "Lưu ý: " })}</span>
                        {copy({
                            en: `"Verify all" will OVERWRITE ${reSuggestedFields.size} field(s) you previously verified with newer AI values (`,
                            vi: `"Xác minh tất cả" sẽ GHI ĐÈ ${reSuggestedFields.size} trường bạn đã xác minh trước đó bằng giá trị AI mới (`
                        })}
                        {[...reSuggestedFields].map(formatFieldLabel).join(", ")}
                        {copy({
                            en: "). Use the per-field “Keep mine” / “Use AI value” buttons below to decide individually.",
                            vi: "). Dùng nút “Giữ giá trị hiện tại” / “Dùng giá trị AI” ở từng trường bên dưới để quyết định riêng."
                        })}
                    </div>
                ) : null}

                {refreshDialogOpen ? (
                    <div className="mt-4 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
                        <div className="mb-3">
                            <div className="text-sm font-semibold text-slate-900">
                                {copy({ en: "Refresh structured extraction", vi: "Cập nhật trích xuất có cấu trúc" })}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                                {copy({
                                    en: "Choose which messages the AI should process. Verified lead fields are protected in either mode.",
                                    vi: "Chọn phạm vi tin nhắn AI sẽ xử lý. Trường đã xác minh được bảo vệ trong cả hai chế độ."
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label
                                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
                                    pendingScanMode === "new_only"
                                        ? "border-indigo-500 bg-indigo-50/60"
                                        : "border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="scanMode"
                                    value="new_only"
                                    checked={pendingScanMode === "new_only"}
                                    onChange={() => setPendingScanMode("new_only")}
                                    className="mt-1"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium text-slate-900">
                                            {copy({ en: "New messages only", vi: "Chỉ tin nhắn mới" })}
                                        </span>
                                        <Badge tone="accent">{copy({ en: "Recommended", vi: "Khuyến nghị" })}</Badge>
                                    </div>
                                    <div className="mt-1 text-xs leading-5 text-slate-500">
                                        {copy({
                                            en: "Faster and lower AI cost. Only scans messages that have not been processed before.",
                                            vi: "Nhanh hơn và tốn ít AI hơn. Chỉ quét tin nhắn chưa được xử lý."
                                        })}
                                    </div>
                                </div>
                            </label>

                            <label
                                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
                                    pendingScanMode === "include_scanned"
                                        ? "border-indigo-500 bg-indigo-50/60"
                                        : "border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="scanMode"
                                    value="include_scanned"
                                    checked={pendingScanMode === "include_scanned"}
                                    onChange={() => setPendingScanMode("include_scanned")}
                                    className="mt-1"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-slate-900">
                                        {copy({ en: "Old + new messages", vi: "Tin nhắn cũ + mới" })}
                                    </div>
                                    <div className="mt-1 text-xs leading-5 text-slate-500">
                                        {copy({
                                            en: "Reprocesses previously scanned messages too. Useful after prompt/model changes or to fix missed extraction.",
                                            vi: "Xử lý lại cả tin nhắn đã quét trước đó. Hữu ích sau khi thay đổi prompt/model hoặc khi trích xuất bị bỏ sót."
                                        })}
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                                onClick={() => {
                                    props.onRerunExtraction(pendingScanMode);
                                    setRefreshDialogOpen(false);
                                }}
                                disabled={extractionInFlight}
                            >
                                {copy({ en: "Start refresh", vi: "Bắt đầu cập nhật" })}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setRefreshDialogOpen(false)}
                                disabled={extractionInFlight}
                            >
                                {copy({ en: "Cancel", vi: "Hủy" })}
                            </Button>
                        </div>
                    </div>
                ) : null}
                {conflicts.length > 0 ? (
                    <div className="max-w-2xl break-words text-xs leading-5 text-amber-700">
                        {copy({ en: "Conflicts:", vi: "Mâu thuẫn:" })}{" "}
                        {conflicts.map((conflict) => formatFieldLabel(conflict.fieldName)).join(", ")}
                    </div>
                ) : null}
                </div>
            </div>

            {rows.length > 0 ? (
                <details className="group mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100 [&::-webkit-details-marker]:hidden">
                        <div>
                            <div className="text-sm font-semibold text-slate-900">
                                {copy({ en: "Extracted attributes", vi: "Thuộc tính đã trích xuất" })}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Badge tone="neutral">
                                {copy({ en: `${rows.length} fields`, vi: `${rows.length} trường` })}
                            </Badge>
                            {verifyAllCount > 0 ? (
                                <Badge tone="accent">
                                    {copy({
                                        en: `${verifyAllCount} pending`,
                                        vi: `${verifyAllCount} chờ xác minh`
                                    })}
                                </Badge>
                            ) : null}
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-transform group-open:rotate-180">
                                <ChevronDownIcon open={false} />
                            </span>
                        </div>
                    </summary>

                    <div className="space-y-5 border-t border-slate-200 bg-slate-50/80 p-4">
                        {sectionedRows.map((section) => {
                            const sectionPending = section.rows.filter((row) =>
                                actionableFields.has(row.fieldName)
                            ).length;
                            return (
                                <div key={section.id}>
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            {copy(section.label)}
                                        </div>
                                        <Badge tone="neutral">{section.rows.length}</Badge>
                                        {sectionPending > 0 ? (
                                            <Badge tone="accent">
                                                {copy({
                                                    en: `${sectionPending} pending`,
                                                    vi: `${sectionPending} chờ xác minh`
                                                })}
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                        {section.rows.map((row) => (
                                            <FieldRow
                                                key={row.fieldName}
                                                row={row}
                                                verified={verified}
                                                isActionable={actionableFields.has(row.fieldName)}
                                                copy={copy}
                                                formatFieldLabel={formatFieldLabel}
                                                formatFieldValue={formatFieldValue}
                                                formatConfidence={formatConfidence}
                                                formatExtractionSource={formatExtractionSource}
                                                onDismiss={props.onDismissSuggestion}
                                                onAccept={acceptRow}
                                                isDismissing={props.isDismissing}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </details>
            ) : null}

            <details className="mt-5 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {copy({ en: "Raw JSONB", vi: "JSONB thô" })}
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                    {JSON.stringify(props.lead.aiExtractedData ?? {}, null, 2)}
                </pre>
            </details>
        </Panel>
    );
}
