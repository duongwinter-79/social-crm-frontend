import type { ReactNode } from "react";
import { Panel } from "@social-crm/ui";
import { useI18n } from "@/i18n";
import { DOSSIER_FIELD_ROWS, type DossierFieldRow } from "./dossier-fields.generated";

/**
 * Read-only "Hồ sơ ứng viên (từ form)" panel.
 *
 * Renders the dossier stored on `recruitment.candidate_profiles` — written by
 * a confirmed FORM_STANDARD upload or typed on the FORM CHUẨN entry screen.
 *
 * Form data is the candidate's full information; the Lead is intentionally
 * narrower (channel signal only). Editing happens on the FORM CHUẨN section. When rendered inside the journey modal an
 * `onEditForm` callback opens the upload-form modal directly, so the subtitle
 * links to that action instead of exposing a raw route path to the operator.
 *
 * Hides itself entirely when the candidate has no dossier yet (no form
 * uploaded AND no fields seeded via `syncProfileFromVerifiedLeadData`).
 */

type DossierProfile = Record<string, unknown> | null | undefined;

// The dossier field list (ROWS) + section/group are generated from the backend
// field registry — see `dossier-fields.generated.ts` (npm run gen:field-policy).
// Add a dossier field by adding a manifest entry + a DOSSIER_LAYOUT line; do not
// hand-edit the generated list here.
type FieldRow = DossierFieldRow;

const SECTION_LABELS: Record<FieldRow["section"], { en: string; vi: string }> = {
  identity:   { en: "Identity",   vi: "Thông tin cơ bản" },
  physical:   { en: "Physical",   vi: "Thể chất" },
  background: { en: "Background", vi: "Hoàn cảnh" },
  family:     { en: "Family",     vi: "Gia đình" },
  work:       { en: "Work",       vi: "Nghề nghiệp" },
  wishes:     { en: "Wishes",     vi: "Nguyện vọng" },
};

function readDossierValue(profile: Record<string, unknown>, row: FieldRow): unknown {
  if (row.group === "typed") return profile[row.key];
  const soft = profile.softFields;
  if (soft && typeof soft === "object" && !Array.isArray(soft)) {
    return (soft as Record<string, unknown>)[row.key];
  }
  return null;
}

function isNonEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function displayValue(v: unknown, row: FieldRow, yesNo: (v: boolean) => string): ReactNode {
  if (!isNonEmpty(v)) return "—";
  if (row.kind === "record_list" && Array.isArray(v)) {
    // FORM CHUẨN work table: one line per job.
    return (
      <ul className="space-y-1">
        {v.map((r, i) => (
          <li key={i}>
            {r && typeof r === "object"
              ? Object.values(r as Record<string, unknown>).filter((x) => typeof x === "string" && x.trim()).join(" · ")
              : String(r)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof v === "boolean") return yesNo(v);
  if (row.kind === "date" && typeof v === "string") {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
  }
  if (Array.isArray(v)) return v.join(", ");
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export function CandidateDossierPanel({
  profile,
  onEditForm,
}: {
  profile: DossierProfile;
  /** Opens the upload-form modal. When set, the subtitle links to it. */
  onEditForm?: () => void;
}) {
  const { copy } = useI18n();

  if (!profile || typeof profile !== "object") return null;

  // Only render the panel if at least one field has a non-empty value.
  const hasAnyValue = DOSSIER_FIELD_ROWS.some((row) => isNonEmpty(readDossierValue(profile, row)));
  if (!hasAnyValue) return null;

  const sections = (["identity", "physical", "background", "family", "work", "wishes"] as const)
    .map((section) => {
      const rows = DOSSIER_FIELD_ROWS.filter((r) => r.section === section);
      const populated = rows.filter((r) => isNonEmpty(readDossierValue(profile, r)));
      return { section, populated };
    })
    .filter(({ populated }) => populated.length > 0);

  const subtitle = onEditForm ? (
    <>
      {copy({
        en: "Read-only here. Edit on the FORM CHUẨN section of the lead, or ",
        vi: "Chỉ xem. Sửa ở mục FORM CHUẨN của hồ sơ, hoặc ",
      })}
      <button
        type="button"
        onClick={onEditForm}
        className="font-medium text-indigo-600 underline underline-offset-2 transition-colors hover:text-indigo-700"
      >
        {copy({ en: "upload a form", vi: "tải form lên" })}
      </button>
      {copy({ en: ".", vi: "." })}
    </>
  ) : (
    copy({
      en: "Read-only here. Edit on the FORM CHUẨN section of the lead, or upload a form.",
      vi: "Chỉ xem. Sửa ở mục FORM CHUẨN của hồ sơ, hoặc tải form lên.",
    })
  );

  return (
    <Panel
      title={copy({ en: "Candidate dossier (from form)", vi: "Hồ sơ ứng viên (từ form)" })}
      subtitle={subtitle}
    >
      <div className="space-y-5">
        {sections.map(({ section, populated }) => (
          <div key={section}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {copy(SECTION_LABELS[section])}
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {populated.map((row) => (
                <div key={row.key} className="flex gap-2 border-b border-slate-100 pb-1.5">
                  <dt className="min-w-[180px] text-slate-500">{copy(row)}</dt>
                  <dd className="flex-1 text-slate-900">
                    {displayValue(readDossierValue(profile, row), row, (b) => copy(b ? { en: "Yes", vi: "Có" } : { en: "No", vi: "Không" }))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Panel>
  );
}
