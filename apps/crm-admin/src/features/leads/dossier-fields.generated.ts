// ─────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Source of truth: social_crm_backend/src/core/taiwan-crm/taiwan-crm-field-manifest.ts
//                  (DOSSIER_LAYOUT + getDossierFields)
// Regenerate:      (in social_crm_backend) npm run gen:field-policy
//
// The read-only candidate dossier renders these rows. Editing by hand will be
// overwritten and will fail the backend drift guard
// (npm run test:field-policy-codegen).
// ─────────────────────────────────────────────────────────────────────────

export type DossierGroup = "typed" | "soft";
export type DossierSection =
    | "identity"
    | "physical"
    | "background"
    | "family"
    | "work"
    | "wishes";

export interface DossierFieldRow {
    /** CandidateProfile property (typed) or softFields key (soft) to read. */
    key: string;
    /** typed → profile[key]; soft → profile.softFields[key]. */
    group: DossierGroup;
    section: DossierSection;
    en: string;
    vi: string;
}

export const DOSSIER_FIELD_ROWS: readonly DossierFieldRow[] = [
    { key: "fullName", group: "typed", section: "identity", en: "Full name", vi: "Họ tên" },
    { key: "dateOfBirth", group: "typed", section: "identity", en: "Date of birth", vi: "Ngày sinh" },
    { key: "birthYear", group: "typed", section: "identity", en: "Birth year", vi: "Năm sinh" },
    { key: "gender", group: "typed", section: "identity", en: "Gender", vi: "Giới tính" },
    { key: "heightCm", group: "typed", section: "physical", en: "Height (cm)", vi: "Chiều cao (cm)" },
    { key: "weightKg", group: "typed", section: "physical", en: "Weight (kg)", vi: "Cân nặng (kg)" },
    { key: "vision", group: "soft", section: "physical", en: "Vision", vi: "Thị lực" },
    { key: "handedness", group: "soft", section: "physical", en: "Handedness", vi: "Thuận tay" },
    { key: "tattooNote", group: "soft", section: "physical", en: "Tattoo note", vi: "Hình xăm (ghi chú)" },
    { key: "alcohol", group: "soft", section: "physical", en: "Drinks alcohol", vi: "Uống rượu" },
    { key: "smoking", group: "soft", section: "physical", en: "Smokes", vi: "Hút thuốc" },
    { key: "surgery", group: "soft", section: "physical", en: "Surgery history", vi: "Phẫu thuật" },
    { key: "birthDefect", group: "soft", section: "physical", en: "Birth defect", vi: "Dị tật" },
    { key: "hometownProvince", group: "typed", section: "background", en: "Hometown province", vi: "Hộ khẩu (tỉnh/thành)" },
    { key: "address", group: "typed", section: "background", en: "Address", vi: "Địa chỉ" },
    { key: "education", group: "soft", section: "background", en: "Education", vi: "Trình độ học vấn" },
    { key: "languages", group: "soft", section: "background", en: "Foreign languages", vi: "Ngoại ngữ" },
    { key: "referrer", group: "soft", section: "background", en: "Referrer", vi: "Người giới thiệu" },
    { key: "maritalStatus", group: "soft", section: "family", en: "Marital status", vi: "Tình trạng hôn nhân" },
    { key: "spouseName", group: "soft", section: "family", en: "Spouse name", vi: "Họ tên vợ/chồng" },
    { key: "spouseAge", group: "soft", section: "family", en: "Spouse age", vi: "Tuổi vợ/chồng" },
    { key: "childrenCount", group: "soft", section: "family", en: "Children count", vi: "Số con" },
    { key: "childrenAges", group: "soft", section: "family", en: "Children ages", vi: "Tuổi các con" },
    { key: "fatherName", group: "soft", section: "family", en: "Father's name", vi: "Họ tên bố" },
    { key: "fatherAge", group: "soft", section: "family", en: "Father's age", vi: "Tuổi bố" },
    { key: "motherName", group: "soft", section: "family", en: "Mother's name", vi: "Họ tên mẹ" },
    { key: "motherAge", group: "soft", section: "family", en: "Mother's age", vi: "Tuổi mẹ" },
    { key: "siblingsCount", group: "soft", section: "family", en: "Siblings count", vi: "Số anh chị em" },
    { key: "birthOrder", group: "soft", section: "family", en: "Birth order", vi: "Thứ tự sinh" },
    { key: "experienceField", group: "typed", section: "work", en: "Experience field", vi: "Lĩnh vực kinh nghiệm" },
    { key: "experienceDetails", group: "typed", section: "work", en: "Experience details (skill description)", vi: "Kinh nghiệm công việc (chi tiết kỹ năng)" },
    { key: "experienceYears", group: "typed", section: "work", en: "Experience years (structured)", vi: "Số năm kinh nghiệm (cấu trúc)" },
    { key: "hasBeenToTaiwan", group: "soft", section: "work", en: "Has been to Taiwan", vi: "Đã từng đi Đài Loan" },
    { key: "desiredIndustry", group: "typed", section: "wishes", en: "Desired industry in Taiwan", vi: "Mong muốn ngành khi đi Đài Loan" },
    { key: "preferredRegion", group: "typed", section: "wishes", en: "Preferred regions", vi: "Ưu tiên khu vực" },
    { key: "desiredSalary", group: "typed", section: "wishes", en: "Desired salary / overtime", vi: "Mong muốn mức lương / tăng ca" }
];
