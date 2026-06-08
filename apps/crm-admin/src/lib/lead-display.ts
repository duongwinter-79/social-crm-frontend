/** Placeholder values that are NOT shown as a secondary fullName label. */
const PLACEHOLDER_NAMES = new Set(["Zalo User"]);

/**
 * Returns the primary display label for a lead.
 *
 * Priority:
 *   1. displayName   — channel identity (Zalo display_name or "Zalo:<id>")
 *   2. fullName      — fallback for leads created before the displayName column
 *   3. fallback      — absolute fallback (pass a localized string; defaults to
 *                      "(Chưa có tên)" for callers without an i18n context)
 */
export function getLeadDisplayName(
  lead: { displayName?: string | null; fullName?: string | null },
  fallback = "(Chưa có tên)",
): string {
  return lead.displayName?.trim() || lead.fullName?.trim() || fallback;
}

/**
 * Returns the secondary label (legal full name) to show below the display
 * name, or null if it should be omitted.
 *
 * Rules:
 *   - Omit if fullName is null / empty
 *   - Omit if fullName is a placeholder ("Zalo User")
 *   - Omit if fullName equals displayName (avoid duplication)
 */
export function getLeadFullNameLabel(
  lead: { displayName?: string | null; fullName?: string | null },
): string | null {
  const full = lead.fullName?.trim();
  if (!full) return null;
  if (PLACEHOLDER_NAMES.has(full)) return null;
  if (full === lead.displayName?.trim()) return null;
  return full;
}
