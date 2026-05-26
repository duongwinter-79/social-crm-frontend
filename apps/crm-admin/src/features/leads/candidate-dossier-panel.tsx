import { Panel } from "@social-crm/ui";
import { useI18n } from "@/i18n";

/**
 * Read-only "Hồ sơ ứng viên (từ form)" panel.
 *
 * Renders the form-derived dossier — the parsed mirror of the most recently
 * confirmed FORM_STANDARD upload, stored on `recruitment.candidate_profiles`.
 *
 * Form data is the candidate's full information; the Lead is intentionally
 * narrower (channel signal only). To edit anything here, the operator removes
 * the linked form on `/applications/detail?leadId=…` and re-uploads.
 *
 * Hides itself entirely when the candidate has no dossier yet (no form
 * uploaded AND no fields seeded via `syncProfileFromVerifiedLeadData`).
 */

type DossierProfile = Record<string, unknown> | null | undefined;

type FieldRow = {
  key: string;
  group: "typed" | "soft";
  section: "identity" | "physical" | "background" | "family" | "work" | "wishes";
  en: string;
  vi: string;
};

const ROWS: readonly FieldRow[] = [
  { key: "fullName",          group: "typed", section: "identity",   en: "Full name",          vi: "Họ và tên" },
  { key: "dateOfBirth",       group: "typed", section: "identity",   en: "Date of birth",      vi: "Ngày sinh" },
  { key: "birthYear",         group: "typed", section: "identity",   en: "Birth year",         vi: "Năm sinh" },
  { key: "gender",            group: "typed", section: "identity",   en: "Gender",             vi: "Giới tính" },

  { key: "heightCm",          group: "typed", section: "physical",   en: "Height (cm)",        vi: "Chiều cao (cm)" },
  { key: "weightKg",          group: "typed", section: "physical",   en: "Weight (kg)",        vi: "Cân nặng (kg)" },
  { key: "vision",            group: "soft",  section: "physical",   en: "Vision",             vi: "Thị lực" },
  { key: "handedness",        group: "soft",  section: "physical",   en: "Handedness",         vi: "Thuận tay" },
  { key: "tattooNote",        group: "soft",  section: "physical",   en: "Tattoo note",        vi: "Hình xăm" },

  { key: "hometownProvince",  group: "typed", section: "background", en: "Hometown",           vi: "Hộ khẩu" },
  { key: "address",           group: "typed", section: "background", en: "Address",            vi: "Địa chỉ" },
  { key: "education",         group: "soft",  section: "background", en: "Education",          vi: "Trình độ" },

  { key: "maritalStatus",     group: "soft",  section: "family",     en: "Marital status",     vi: "Tình trạng hôn nhân" },
  { key: "spouseName",        group: "soft",  section: "family",     en: "Spouse name",        vi: "Họ tên vợ/chồng" },
  { key: "spouseAge",         group: "soft",  section: "family",     en: "Spouse age",         vi: "Tuổi vợ/chồng" },
  { key: "childrenCount",     group: "soft",  section: "family",     en: "Children count",     vi: "Số con" },
  { key: "childrenAges",      group: "soft",  section: "family",     en: "Children ages",      vi: "Tuổi con" },
  { key: "fatherName",        group: "soft",  section: "family",     en: "Father's name",      vi: "Họ tên bố" },
  { key: "fatherAge",         group: "soft",  section: "family",     en: "Father's age",       vi: "Tuổi bố" },
  { key: "motherName",        group: "soft",  section: "family",     en: "Mother's name",      vi: "Họ tên mẹ" },
  { key: "motherAge",         group: "soft",  section: "family",     en: "Mother's age",       vi: "Tuổi mẹ" },
  { key: "siblingsCount",     group: "soft",  section: "family",     en: "Siblings count",     vi: "Số anh chị em" },
  { key: "birthOrder",        group: "soft",  section: "family",     en: "Birth order",        vi: "Thứ tự sinh" },

  { key: "experienceField",   group: "typed", section: "work",       en: "Experience field",   vi: "Ngành kinh nghiệm" },
  { key: "experienceDetails", group: "typed", section: "work",       en: "Experience details", vi: "Chi tiết kinh nghiệm" },
  { key: "experienceYears",   group: "typed", section: "work",       en: "Experience years",   vi: "Số năm KN" },
  { key: "hasBeenToTaiwan",   group: "soft",  section: "work",       en: "Has been to Taiwan", vi: "Đã qua Đài Loan" },

  { key: "desiredIndustry",   group: "typed", section: "wishes",     en: "Desired industry",   vi: "Ngành mong muốn" },
  { key: "preferredRegion",   group: "typed", section: "wishes",     en: "Preferred regions",  vi: "Khu vực mong muốn" },
  { key: "desiredSalary",     group: "typed", section: "wishes",     en: "Desired salary",     vi: "Lương mong muốn" },
];

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

function displayValue(v: unknown): string {
  if (!isNonEmpty(v)) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export function CandidateDossierPanel({ profile }: { profile: DossierProfile }) {
  const { copy } = useI18n();

  if (!profile || typeof profile !== "object") return null;

  // Only render the panel if at least one field has a non-empty value.
  const hasAnyValue = ROWS.some((row) => isNonEmpty(readDossierValue(profile, row)));
  if (!hasAnyValue) return null;

  const sections = (["identity", "physical", "background", "family", "work", "wishes"] as const)
    .map((section) => {
      const rows = ROWS.filter((r) => r.section === section);
      const populated = rows.filter((r) => isNonEmpty(readDossierValue(profile, r)));
      return { section, populated };
    })
    .filter(({ populated }) => populated.length > 0);

  return (
    <Panel
      title={copy({ en: "Candidate dossier (from form)", vi: "Hồ sơ ứng viên (từ form)" })}
      subtitle={copy({
        en: "Read-only. Sourced from the most recently confirmed FORM_STANDARD upload. To edit, remove the file from /applications/detail and re-upload.",
        vi: "Chỉ xem. Lấy từ form đã xác nhận gần nhất. Để sửa, xoá file ở /applications/detail rồi tải lại.",
      })}
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
                  <dd className="flex-1 text-slate-900">{displayValue(readDossierValue(profile, row))}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Panel>
  );
}
