// ─────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Source of truth: social_crm_backend/src/features/ai-extraction/field-policy.ts
// Regenerate:      (in social_crm_backend) npm run gen:field-policy
//
// This mirrors the backend's FIELD_POLICY so the AI-snapshot panel routes and
// labels exactly the fields the backend can suggest. Editing this file by hand
// will be overwritten and will fail the backend drift guard
// (npm run test:field-policy-codegen).
// ─────────────────────────────────────────────────────────────────────────

export type VerifyTarget = "qualification" | "identity";

export interface SuggestionRoute {
    target: VerifyTarget;
    dtoKey: string;
}

/**
 * Suggestion fieldName → where "Verify all" applies the value.
 *   - "qualification" → UpdateLeadQualification DTO (dtoKey = DTO field)
 *   - "identity"      → Lead identity form (fullName/phone)
 */
export const SUGGESTION_ROUTING: Record<string, SuggestionRoute> = {
    "fullName": { target: "identity", dtoKey: "fullName" },
    "name": { target: "identity", dtoKey: "fullName" },
    "phone": { target: "identity", dtoKey: "phone" },
    "birthYear": { target: "qualification", dtoKey: "birthYear" },
    "gender": { target: "qualification", dtoKey: "gender" },
    "heightCm": { target: "qualification", dtoKey: "height" },
    "weightKg": { target: "qualification", dtoKey: "weight" },
    "experienceField": { target: "qualification", dtoKey: "experienceField" },
    "desiredIndustry": { target: "qualification", dtoKey: "desiredIndustry" },
    "preferredRegions": { target: "qualification", dtoKey: "preferredRegion" },
    "desiredSalary": { target: "qualification", dtoKey: "desiredSalary" }
};

/** JSONB/DTO twin key → canonical suggestion fieldName. */
export const FIELD_DISPLAY_ALIASES: Record<string, string> = {
    "name": "fullName",
    "height": "heightCm",
    "weight": "weightKg",
    "preferredRegion": "preferredRegions"
};

/** Canonical suggestion fields tracked for coverage stats. */
export const TRACKED_AI_FIELDS: readonly string[] = [
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

/**
 * The only fields that may render as reviewable rows on the AI-snapshot panel.
 * JSONB-only fields (age, dateOfBirth, address, jobNeeds, interests, …) are
 * scoring/merge inputs, NOT operator review tasks — gating Loop 2 on this set
 * keeps them out of the panel so they can't show a dead "Đã lưu" badge.
 */
export const REVIEWABLE_AI_FIELDS: ReadonlySet<string> = new Set([
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
]);
