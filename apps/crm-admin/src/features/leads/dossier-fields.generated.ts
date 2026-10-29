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
    /** Registry field kind — drives value formatting (boolean, date, record_list, …). */
    kind: string;
    en: string;
    vi: string;
}

export const DOSSIER_FIELD_ROWS: readonly DossierFieldRow[] = [
    { key: "fullName", group: "typed", section: "identity", kind: "string", en: "Full name", vi: "Họ tên" },
    { key: "dateOfBirth", group: "typed", section: "identity", kind: "date", en: "Date of birth", vi: "Ngày sinh" },
    { key: "birthYear", group: "typed", section: "identity", kind: "integer", en: "Birth year", vi: "Năm sinh" },
    { key: "gender", group: "typed", section: "identity", kind: "enum", en: "Gender", vi: "Giới tính" },
    { key: "heightCm", group: "typed", section: "physical", kind: "integer", en: "Height (cm)", vi: "Chiều cao (cm)" },
    { key: "weightKg", group: "typed", section: "physical", kind: "integer", en: "Weight (kg)", vi: "Cân nặng (kg)" },
    { key: "vision", group: "soft", section: "physical", kind: "string", en: "Vision", vi: "Thị lực" },
    { key: "visionNote", group: "soft", section: "physical", kind: "text", en: "Vision detail", vi: "Thị lực (chi tiết)" },
    { key: "handedness", group: "soft", section: "physical", kind: "string", en: "Handedness", vi: "Thuận tay" },
    { key: "tattooNote", group: "soft", section: "physical", kind: "text", en: "Tattoo note", vi: "Hình xăm (ghi chú)" },
    { key: "alcohol", group: "soft", section: "physical", kind: "boolean", en: "Drinks alcohol", vi: "Uống rượu" },
    { key: "smoking", group: "soft", section: "physical", kind: "boolean", en: "Smokes", vi: "Hút thuốc" },
    { key: "surgery", group: "soft", section: "physical", kind: "text", en: "Surgery history", vi: "Phẫu thuật" },
    { key: "surgeryNote", group: "soft", section: "physical", kind: "text", en: "Surgery detail", vi: "Phẫu thuật (chi tiết)" },
    { key: "birthDefect", group: "soft", section: "physical", kind: "text", en: "Birth defect", vi: "Dị tật" },
    { key: "birthDefectNote", group: "soft", section: "physical", kind: "text", en: "Birth defect detail", vi: "Dị tật (chi tiết)" },
    { key: "vaccinationStatus", group: "soft", section: "physical", kind: "enum", en: "Vaccination status", vi: "Tiêm chủng" },
    { key: "vaccinationDate", group: "soft", section: "physical", kind: "date", en: "Vaccination date", vi: "Tiêm chủng (thời gian)" },
    { key: "hometownProvince", group: "typed", section: "background", kind: "string", en: "Hometown province", vi: "Hộ khẩu (tỉnh/thành)" },
    { key: "address", group: "typed", section: "background", kind: "text", en: "Address", vi: "Địa chỉ" },
    { key: "education", group: "soft", section: "background", kind: "string", en: "Education", vi: "Trình độ học vấn" },
    { key: "educationMajor", group: "soft", section: "background", kind: "string", en: "Field of study", vi: "Chuyên ngành" },
    { key: "languages", group: "soft", section: "background", kind: "multi_string", en: "Foreign languages", vi: "Ngoại ngữ" },
    { key: "legalViolation", group: "soft", section: "background", kind: "boolean", en: "Has violated the law", vi: "Vi phạm pháp luật" },
    { key: "legalViolationNote", group: "soft", section: "background", kind: "text", en: "Law violation detail", vi: "Vi phạm pháp luật (chi tiết)" },
    { key: "referrer", group: "soft", section: "background", kind: "string", en: "Referrer", vi: "Người giới thiệu" },
    { key: "maritalStatus", group: "soft", section: "family", kind: "string", en: "Marital status", vi: "Tình trạng hôn nhân" },
    { key: "marriageRegisteredAt", group: "soft", section: "family", kind: "date", en: "Marriage registration date", vi: "Ngày đăng ký kết hôn" },
    { key: "spouseName", group: "soft", section: "family", kind: "string", en: "Spouse name", vi: "Họ tên vợ/chồng" },
    { key: "spouseAge", group: "soft", section: "family", kind: "integer", en: "Spouse age", vi: "Tuổi vợ/chồng" },
    { key: "childrenCount", group: "soft", section: "family", kind: "integer", en: "Children count", vi: "Số con" },
    { key: "childrenAges", group: "soft", section: "family", kind: "string", en: "Children ages", vi: "Tuổi các con" },
    { key: "fatherName", group: "soft", section: "family", kind: "string", en: "Father's name", vi: "Họ tên bố" },
    { key: "fatherAge", group: "soft", section: "family", kind: "integer", en: "Father's age", vi: "Tuổi bố" },
    { key: "motherName", group: "soft", section: "family", kind: "string", en: "Mother's name", vi: "Họ tên mẹ" },
    { key: "motherAge", group: "soft", section: "family", kind: "integer", en: "Mother's age", vi: "Tuổi mẹ" },
    { key: "siblingsCount", group: "soft", section: "family", kind: "integer", en: "Siblings count", vi: "Số anh chị em" },
    { key: "birthOrder", group: "soft", section: "family", kind: "string", en: "Birth order", vi: "Thứ tự sinh" },
    { key: "experienceField", group: "typed", section: "work", kind: "enum", en: "Experience field", vi: "Lĩnh vực kinh nghiệm" },
    { key: "experienceDetails", group: "typed", section: "work", kind: "text", en: "Experience details (skill description)", vi: "Kinh nghiệm công việc (chi tiết kỹ năng)" },
    { key: "experienceYears", group: "typed", section: "work", kind: "integer", en: "Experience years (structured)", vi: "Số năm kinh nghiệm (cấu trúc)" },
    { key: "workExperience", group: "soft", section: "work", kind: "record_list", en: "Work history (table)", vi: "Kinh nghiệm làm việc (bảng)" },
    { key: "hasBeenToTaiwan", group: "soft", section: "work", kind: "boolean", en: "Has been to Taiwan", vi: "Đã từng đi Đài Loan" },
    { key: "contractCompletion", group: "soft", section: "work", kind: "enum", en: "Previous Taiwan contract", vi: "Tình trạng hợp đồng (Đài Loan)" },
    { key: "contractIncompleteReason", group: "soft", section: "work", kind: "text", en: "Reason contract not completed", vi: "Lý do không hết hợp đồng" },
    { key: "desiredIndustry", group: "typed", section: "wishes", kind: "enum", en: "Desired industry in Taiwan", vi: "Mong muốn ngành khi đi Đài Loan" },
    { key: "preferredRegion", group: "typed", section: "wishes", kind: "multi_enum", en: "Preferred regions", vi: "Ưu tiên khu vực" },
    { key: "desiredSalary", group: "typed", section: "wishes", kind: "string", en: "Desired salary / overtime", vi: "Mong muốn mức lương / tăng ca" }
];
