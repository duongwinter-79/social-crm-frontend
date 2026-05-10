import { useMemo } from "react";
import { Badge, Button, EmptyState, Panel } from "@social-crm/ui";
import type { AiSuggestion, Lead, LeadQualificationSnapshot } from "@social-crm/api";
import { useI18n } from "../../i18n";
import { findPhoneMergeCandidate } from "./field-with-provenance";

interface Props {
    lead: Lead;
    suggestions: AiSuggestion[];
    qualification: LeadQualificationSnapshot | undefined;
    onVerifyAll: (patch: Record<string, unknown>) => void;
    onRerunExtraction: () => void;
    isVerifyAllPending: boolean;
    isRerunPending: boolean;
    className?: string;
}

type Language = "en" | "vi";
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

const FIELD_LABELS: Record<string, { en: string; vi: string }> = {
    fullName: { en: "Full name", vi: "Họ tên" },
    name: { en: "Name", vi: "Tên" },
    phone: { en: "Phone", vi: "Số điện thoại" },
    address: { en: "Address", vi: "Địa chỉ" },
    age: { en: "Age", vi: "Tuổi" },
    birthYear: { en: "Birth year", vi: "Năm sinh" },
    gender: { en: "Gender", vi: "Giới tính" },
    height: { en: "Height", vi: "Chiều cao" },
    heightCm: { en: "Height", vi: "Chiều cao" },
    weight: { en: "Weight", vi: "Cân nặng" },
    weightKg: { en: "Weight", vi: "Cân nặng" },
    hasPassport: { en: "Passport", vi: "Hộ chiếu" },
    experienceLevel: { en: "Experience level", vi: "Mức độ kinh nghiệm" },
    experienceYears: { en: "Experience years", vi: "Số năm kinh nghiệm" },
    experienceField: { en: "Experience field", vi: "Lĩnh vực kinh nghiệm" },
    desiredIndustry: { en: "Desired industry", vi: "Ngành mong muốn" },
    preferredRegion: { en: "Preferred region", vi: "Khu vực mong muốn" },
    preferredRegions: { en: "Preferred regions", vi: "Khu vực mong muốn" },
    desiredSalary: { en: "Desired salary", vi: "Mức lương mong muốn" },
    tattooStatus: { en: "Tattoo status", vi: "Tình trạng hình xăm" },
    healthMeetsCriteria: { en: "Health fit", vi: "Sức khỏe đạt yêu cầu" },
    hasWorkedAbroad: { en: "Worked abroad", vi: "Từng đi nước ngoài" }
};

const QUALIFICATION_DTO_FIELDS: ReadonlySet<string> = new Set([
    "age",
    "gender",
    "hasPassport",
    "height",
    "weight",
    "experienceLevel",
    "experienceYears",
    "experienceField",
    "experienceDetails",
    "preferredRegion",
    "tattooStatus",
    "healthMeetsCriteria",
    "hasWorkedAbroad",
    "hasCleanHistoryAbroad",
    "hasStrongSkills",
    "hasRiskHistory",
    "readyToDepartInMonths",
    "understandsJobNature",
    "hasClearRegionPreference"
]);

const TRACKED_AI_FIELDS: readonly string[] = [
    "fullName",
    "phone",
    "birthYear",
    "gender",
    "heightCm",
    "weightKg",
    "experienceField",
    "desiredIndustry",
    "preferredRegions",
    "desiredSalary"
];

const FIELD_DISPLAY_ALIASES: Record<string, string> = {
    name: "fullName",
    height: "heightCm",
    weight: "weightKg",
    preferredRegion: "preferredRegions"
};

function labelFor(key: string, lang: Language): string {
    return FIELD_LABELS[key]?.[lang] ?? titleFromKey(key);
}

function canonicalDisplayField(key: string): string {
    return FIELD_DISPLAY_ALIASES[key] ?? key;
}

function sectionFor(key: string): SectionId {
    return FIELD_SECTION[key] ?? "other";
}

function titleFromKey(key: string) {
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]+/g, " ")
        .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(key: string, value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Có" : "Không";
    if (typeof value === "number") {
        if (key === "height" || key === "heightCm") return `${value} cm`;
        if (key === "weight" || key === "weightKg") return `${value} kg`;
        if (key === "readyToDepartInMonths") return `${value} tháng`;
        return String(value);
    }
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.length === 0 ? "—" : value.map((v) => String(v)).join(", ");
    return JSON.stringify(value);
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

function composeVerifyAllPatch(suggestions: AiSuggestion[], verifiedKeys: string[]): Record<string, unknown> {
    const patch: Record<string, unknown> = {};

    for (const suggestion of suggestions) {
        if (verifiedKeys.includes(suggestion.fieldName)) continue;
        if (suggestion.value === null || suggestion.value === undefined) continue;

        let dtoKey = suggestion.fieldName;
        if (suggestion.fieldName === "heightCm") dtoKey = "height";
        if (suggestion.fieldName === "weightKg") dtoKey = "weight";
        if (suggestion.fieldName === "preferredRegions") dtoKey = "preferredRegion";

        if (QUALIFICATION_DTO_FIELDS.has(dtoKey)) {
            patch[dtoKey] = suggestion.value;
        }
    }

    return patch;
}

interface RowState {
    fieldName: string;
    value: unknown;
    suggestion?: AiSuggestion;
    isVerified: boolean;
    verifiedValueDiffers: boolean;
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

        map.set(fieldName, {
            fieldName,
            value: suggestion.value,
            suggestion,
            isVerified,
            verifiedValueDiffers:
                !isVerified &&
                verifiedValue !== null &&
                verifiedValue !== undefined &&
                JSON.stringify(verifiedValue) !== JSON.stringify(suggestion.value),
            section: sectionFor(fieldName)
        });
    }

    const jsonb = (lead.aiExtractedData ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(jsonb)) {
        const fieldName = canonicalDisplayField(key);
        const canonicalValue = jsonb[fieldName];

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

function FieldRow({
    row,
    verified,
    copy,
    lang
}: {
    row: RowState;
    verified: Record<string, unknown>;
    copy: (v: { en: string; vi: string }) => string;
    lang: Language;
}) {
    const suggestion = row.suggestion;
    const verifiedValue = row.isVerified ? verified[row.fieldName] : undefined;
    const tone = row.isVerified
        ? "success"
        : row.verifiedValueDiffers
            ? "danger"
            : suggestion
                ? "warning"
                : "neutral";
    const stateLabel = row.isVerified
        ? copy({ en: "Verified", vi: "Đã xác minh" })
        : row.verifiedValueDiffers
            ? copy({ en: "Conflict", vi: "Mâu thuẫn" })
            : suggestion
                ? copy({ en: "Pending", vi: "Chờ xác minh" })
                : copy({ en: "Stored", vi: "Đã lưu" });

    return (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="break-words font-medium text-slate-900">{labelFor(row.fieldName, lang)}</div>
                    <div className="mt-1 font-mono text-[11px] text-slate-400">{row.fieldName}</div>
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
                            {suggestion.confidence}
                        </Badge>
                    ) : null}
                    {suggestion ? (
                        <Badge tone="neutral">
                            {suggestion.source === "deterministic"
                                ? "Regex"
                                : suggestion.source === "ai_llm"
                                    ? "AI"
                                    : "Webhook"}
                        </Badge>
                    ) : null}
                </div>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-5">
                <div className="min-w-0 text-slate-500">
                    <span className="text-slate-400">{copy({ en: "AI:", vi: "AI:" })}</span>{" "}
                    <span className="break-words font-medium text-slate-800">{formatValue(row.fieldName, row.value)}</span>
                </div>
                {row.isVerified || row.verifiedValueDiffers ? (
                    <div className="min-w-0 text-slate-500">
                        <span className="text-slate-400">
                            {copy({ en: "Verified:", vi: "Đã xác minh:" })}
                        </span>{" "}
                        <span className="break-words font-medium text-slate-800">
                            {formatValue(row.fieldName, verifiedValue ?? verified[row.fieldName])}
                        </span>
                    </div>
                ) : null}
                {suggestion?.reason ? (
                    <div className="break-words text-rose-600" title={suggestion.reason}>
                        {suggestion.reason.startsWith("merge_candidate:")
                            ? copy({ en: "Merge required", vi: "Cần gộp lead" })
                            : suggestion.reason}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export function LeadAiSnapshotCard(props: Props) {
    const { copy, lang } = useI18n();

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
    const verifyAllPatch = useMemo(
        () => composeVerifyAllPatch(props.suggestions, verifiedKeys),
        [props.suggestions, verifiedKeys]
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

    const verifyAllCount = Object.keys(verifyAllPatch).length;
    const phoneMergeConflictId = findPhoneMergeCandidate(props.suggestions);

    return (
        <Panel
            title={copy({ en: "AI snapshot", vi: "Tóm tắt AI" })}
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
                        vi: "Bấm trích xuất AI sau khi lead có tin nhắn đến."
                    })}
                />
            )}

            {phoneMergeConflictId ? (
                <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                    <Badge tone="danger">{copy({ en: "Merge required", vi: "Cần gộp lead" })}</Badge>{" "}
                    {copy({
                        en: "AI extracted a phone number that already belongs to another lead.",
                        vi: "AI trích xuất số điện thoại trùng với lead khác."
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
                        vi: "Thao tác này cập nhật dữ liệu trích xuất đã lưu, gợi ý AI, tín hiệu hồ sơ, điểm lead và dữ liệu ghép đơn."
                    })}
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        onClick={() => props.onVerifyAll(verifyAllPatch)}
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
                    <Button variant="secondary" onClick={props.onRerunExtraction} disabled={props.isRerunPending}>
                        {props.isRerunPending
                            ? copy({ en: "Extracting...", vi: "Đang trích xuất..." })
                            : copy({ en: "Refresh structured extraction", vi: "Cập nhật trích xuất có cấu trúc" })}
                    </Button>
                </div>
                {conflicts.length > 0 ? (
                    <div className="max-w-2xl break-words text-xs leading-5 text-amber-700">
                        {copy({ en: "Conflicts:", vi: "Mâu thuẫn:" })}{" "}
                        {conflicts.map((conflict) => labelFor(conflict.fieldName, lang)).join(", ")}
                    </div>
                ) : null}
                </div>
            </div>

            {rows.length > 0 ? (
                <div className="mt-6 space-y-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold text-slate-900">
                                {copy({ en: "Extracted attributes", vi: "Thuộc tính đã trích xuất" })}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                                {copy({
                                    en: "Review AI values against staff-verified values before using them for scoring or matching.",
                                    vi: "Kiểm tra dữ liệu AI với dữ liệu đã xác minh trước khi dùng để tính điểm hoặc ghép đơn."
                                })}
                            </div>
                        </div>
                        <Badge tone="neutral">
                            {copy({ en: `${rows.length} fields`, vi: `${rows.length} trường` })}
                        </Badge>
                    </div>

                    {sectionedRows.map((section) => (
                        <div key={section.id}>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    {copy(section.label)}
                                </div>
                                <Badge tone="neutral">{section.rows.length}</Badge>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                {section.rows.map((row) => (
                                    <FieldRow
                                        key={row.fieldName}
                                        row={row}
                                        verified={verified}
                                        copy={copy}
                                        lang={lang}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
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
