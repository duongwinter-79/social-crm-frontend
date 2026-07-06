import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

export type Lang = "en" | "vi";

type Copy = {
  en: string;
  vi: string;
};

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  copy: (value: Copy) => string;
  formatEnum: (value: string) => string;
  formatLeadStatus: (value: string) => string;
  formatPipelineStage: (value: string) => string;
  formatApplicationStatus: (value: string) => string;
  formatPipelineNextAction: (value: string) => string;
  formatPipelineBlocker: (value: string) => string;
  formatDocumentType: (value: string) => string;
  formatDocumentStatus: (value: string) => string;
  formatTrainingMilestone: (value: string) => string;
  formatChannel: (value: string) => string;
  formatConfidence: (value: string) => string;
  formatExtractionSource: (value: string) => string;
  formatExtractionSourceSummary: (value: string) => string;
  formatApplySkipReason: (value: string) => string;
  formatFieldLabel: (key: string) => string;
  formatFieldValue: (key: string, value: unknown) => string;
  yesNoUnknown: (value: string) => string;
};

const STORAGE_KEY = "crm-admin-lang";

const I18nContext = createContext<I18nContextValue | null>(null);

const enumLabels: Record<string, Copy> = {
  NEW: { en: "New", vi: "Mới tiếp nhận" },
  CONTACTED: { en: "Contacted", vi: "Đã liên hệ" },
  // 2026-05-14: relabelled per operator feedback. The backend enum value
  // stays `qualified` for stability; only the visible label changes to
  // match how operators talk about this state ("the form is ready").
  QUALIFIED: { en: "Form ready", vi: "Đã có form" },
  MATCHING: { en: "Matching", vi: "Đang ghép đơn" },
  MATCHED: { en: "Matched", vi: "Đã ghép đơn" },
  // 2026-05-14: INTERVIEW_SCHEDULED now covers both "scheduled" and
  // "completed but not yet evaluated" — INTERVIEWING was removed from the
  // state machine. The display label reflects the combined semantics.
  INTERVIEW_SCHEDULED: { en: "Interviewed", vi: "Đã phỏng vấn" },
  // 2026-05-18: pipeline labels aligned to standard XKLĐ vocabulary
  // (per "Bản dịch CRM tiếng Việt chuẩn" §3 — operators talk about
  // "đậu đơn / rớt đơn / ký giấy tờ / đóng visa", not the literal
  // translations the auto-translator produced.)
  INTERVIEW_PASSED: { en: "Interview passed", vi: "Đậu đơn" },
  INTERVIEW_FAILED: { en: "Interview failed", vi: "Rớt đơn" },
  CONTRACT_SIGNED: { en: "Contract signed", vi: "Đã ký giấy tờ" },
  VISA_PROCESSING: { en: "Visa processing", vi: "Đóng visa" },
  DEPARTED: { en: "Departed", vi: "Đã xuất cảnh" },
  DISQUALIFIED: { en: "Disqualified", vi: "Loại hồ sơ" },
  HOT: { en: "Hot", vi: "Nóng" },
  WARM: { en: "Warm", vi: "Ấm" },
  COLD: { en: "Cold", vi: "Cần nuôi dưỡng" },
  matching: { en: "Matching", vi: "Đang ghép đơn" },
  referred: { en: "Referred", vi: "Đã tiến cử" },
  interview_scheduled: { en: "Interviewed", vi: "Đã phỏng vấn" },
  interview_passed: { en: "Interview passed", vi: "Đậu đơn" },
  interview_failed: { en: "Interview failed", vi: "Rớt đơn" },
  signing: { en: "Signing", vi: "Ký giấy tờ" },
  ready_to_depart: { en: "Ready to depart", vi: "Sẵn sàng xuất cảnh" },
  rejected: { en: "Rejected", vi: "Từ chối" },
  withdrawn: { en: "Withdrawn", vi: "Rút hồ sơ" },
  pending: { en: "Pending", vi: "Chờ xử lý" },
  submitted: { en: "Submitted", vi: "Đã nộp" },
  verified: { en: "Verified", vi: "Đã xác minh" },
  expired: { en: "Expired", vi: "Hết hạn" },
  passport: { en: "Passport", vi: "Hộ chiếu" },
  form_standard: { en: "Standard worker form", vi: "Form chuẩn lao động" },
  criminal_record: { en: "Criminal record", vi: "Lý lịch tư pháp" },
  criminal_record_2: { en: "Criminal record #2", vi: "Lý lịch tư pháp số 2" },
  health_check: { en: "Health check", vi: "Khám sức khỏe" },
  diploma: { en: "Diploma", vi: "Bằng cấp" },
  work_permit: { en: "Work permit", vi: "Giấy phép lao động" },
  other: { en: "Other", vi: "Khác" },
  male: { en: "Male", vi: "Nam" },
  female: { en: "Female", vi: "Nữ" },
  other_gender: { en: "Other", vi: "Khác" },
  excellent: { en: "Excellent", vi: "Rất tốt" },
  good: { en: "Good", vi: "Tốt" },
  basic: { en: "Basic", vi: "Cơ bản" },
  none: { en: "None", vi: "Không có" },
  undisclosed: { en: "Undisclosed", vi: "Chưa khai báo" },
  hidden: { en: "Hidden", vi: "Ẩn" },
  small: { en: "Small / coverable", vi: "Nhỏ / có thể che" },
  visible: { en: "Visible", vi: "Lộ rõ" },
  offensive: { en: "Offensive", vi: "Phản cảm" },
  forbidden_zone: { en: "Forbidden zone", vi: "Vùng cấm" },
  dropped_deposit: { en: "Dropped deposit", vi: "Bỏ cọc" },
  canceled_late: { en: "Canceled late", vi: "Hủy muộn" },
  fake_profile: { en: "Fake profile", vi: "Hồ sơ giả" },
  active: { en: "Active", vi: "Hoạt động" },
  inactive: { en: "Inactive", vi: "Ngưng hoạt động" },
  admin: { en: "Admin", vi: "Quản trị" },
  staff: { en: "Staff (legacy)", vi: "Nhân viên (cũ)" },
  recruiter: { en: "Recruiter", vi: "Tuyển dụng" },
  document_staff: { en: "Document staff", vi: "Nhân viên hồ sơ" },
  finance_staff: { en: "Finance staff", vi: "Nhân viên tài chính" },
  user: { en: "User", vi: "Người dùng" },
  departed: { en: "Departed", vi: "Đã xuất cảnh" },
  disqualified: { en: "Disqualified", vi: "Loại hồ sơ" },
  interview_failed_stage: { en: "Interview failed", vi: "Rớt đơn" },
  visa_processing: { en: "Visa processing", vi: "Đóng visa" },
  contract_signed: { en: "Contract signed", vi: "Đã ký giấy tờ" },
  // Channels / lead sources
  zalo: { en: "Zalo", vi: "Zalo" },
  facebook: { en: "Facebook", vi: "Facebook" },
  miniapp: { en: "Mini App", vi: "Mini App" },
  tiktok: { en: "TikTok", vi: "TikTok" },
  website: { en: "Website", vi: "Website" },
  gioi_thieu: { en: "Referral", vi: "Giới thiệu" },
  // AI confidence levels
  high: { en: "High", vi: "Cao" },
  medium: { en: "Medium", vi: "Trung bình" },
  low: { en: "Low", vi: "Thấp" },
  // AI extraction source kinds
  deterministic: { en: "Template", vi: "Trích xuất quy tắc" },
  import: { en: "Import", vi: "Nhập liệu" },
  // Apply-skip reason codes surfaced by /extract page after apply-suggestions
  low_confidence: { en: "Low confidence", vi: "Độ tin cậy thấp" },
  name_already_set: { en: "Name already set", vi: "Đã có tên" },
  phone_already_set: { en: "Phone already set", vi: "Đã có số điện thoại" },
  typed_col_already_set: { en: "Field already set", vi: "Trường đã có giá trị" },
  operator_verified: { en: "Operator verified", vi: "Đã được nhân sự xác minh" },
  auto_apply_disabled: { en: "Auto-apply disabled", vi: "Không cho phép tự động áp dụng" },
  no_active_suggestion: { en: "No suggestion", vi: "Không có gợi ý" },
  ai_llm: { en: "AI", vi: "AI" },
  webhook: { en: "Webhook", vi: "Webhook" },
  // Job needs (Mini App / extraction values)
  labor_export: { en: "Labour export", vi: "Xuất khẩu lao động" },
  consultation: { en: "Consultation", vi: "Tư vấn" },
  domestic_job: { en: "Domestic job", vi: "Việc trong nước" },
  visa_only: { en: "Visa only", vi: "Chỉ xin visa" },
  // Regions
  north: { en: "North", vi: "Miền Bắc" },
  central: { en: "Central", vi: "Miền Trung" },
  south: { en: "South", vi: "Miền Nam" },
  // Lead-triage preliminary fit
  promising: { en: "Promising fit", vi: "Tiềm năng" },
  needs_review: { en: "Needs review", vi: "Cần xem xét" },
  insufficient_data: { en: "Insufficient verified data", vi: "Chưa đủ dữ liệu xác minh" },
  not_fit: { en: "Not a fit", vi: "Không phù hợp" },
  // Order-matching conclusions
  high_priority: { en: "High priority", vi: "Ưu tiên cao" },
  conditional: { en: "Conditional", vi: "Có điều kiện" },
  limited: { en: "Limited", vi: "Hạn chế" }
};

const fieldLabels: Record<string, Copy> = {
  fullName: { en: "Full name", vi: "Họ tên" },
  name: { en: "Name", vi: "Tên" },
  phone: { en: "Phone", vi: "Số điện thoại" },
  address: { en: "Address", vi: "Địa chỉ" },
  region: { en: "Region", vi: "Khu vực" },
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
  experienceDetails: { en: "Experience details", vi: "Chi tiết kinh nghiệm" },
  desiredIndustry: { en: "Desired industry", vi: "Ngành mong muốn" },
  preferredRegion: { en: "Preferred region", vi: "Khu vực mong muốn" },
  preferredRegions: { en: "Preferred regions", vi: "Khu vực mong muốn" },
  desiredSalary: { en: "Desired salary", vi: "Mức lương mong muốn" },
  tattooStatus: { en: "Tattoo status", vi: "Tình trạng hình xăm" },
  healthMeetsCriteria: { en: "Health fit", vi: "Sức khỏe đạt yêu cầu" },
  hasWorkedAbroad: { en: "Worked abroad", vi: "Từng đi nước ngoài" },
  hasCleanHistoryAbroad: { en: "Clean abroad history", vi: "Lịch sử đi nước ngoài tốt" },
  hasStrongSkills: { en: "Strong skills", vi: "Có kỹ năng nổi bật" },
  hasRiskHistory: { en: "Risk history", vi: "Lịch sử rủi ro" },
  readyToDepartInMonths: { en: "Ready to depart in", vi: "Sẵn sàng xuất cảnh trong" },
  understandsJobNature: { en: "Understands job nature", vi: "Hiểu tính chất công việc" },
  hasClearRegionPreference: { en: "Clear region preference", vi: "Định hướng khu vực rõ" },
  jobNeeds: { en: "Job needs", vi: "Nhu cầu việc làm" },
  leadSource: { en: "Acquisition source", vi: "Nguồn tiếp nhận" },
  interests: { en: "Interests", vi: "Nhu cầu quan tâm" },
  confidence: { en: "Confidence", vi: "Độ tin cậy" },
  extractedAt: { en: "Extracted at", vi: "Thời điểm trích xuất" },
  source: { en: "Channel", vi: "Kênh" }
};

const fieldsWithEnumValues: ReadonlySet<string> = new Set([
  "gender",
  "experienceLevel",
  "tattooStatus",
  "hasRiskHistory",
  "leadSource",
  "jobNeeds",
  "preferredRegion",
  "preferredRegions",
  "source"
]);

const booleanFields: ReadonlySet<string> = new Set([
  "hasPassport",
  "hasWorkedAbroad",
  "healthMeetsCriteria",
  "hasCleanHistoryAbroad",
  "hasStrongSkills",
  "understandsJobNature",
  "hasClearRegionPreference"
]);

const numericUnits: Record<string, Copy> = {
  height: { en: "cm", vi: "cm" },
  heightCm: { en: "cm", vi: "cm" },
  weight: { en: "kg", vi: "kg" },
  weightKg: { en: "kg", vi: "kg" },
  readyToDepartInMonths: { en: "months", vi: "tháng" },
  experienceYears: { en: "yrs", vi: "năm" }
};

function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "vi" ? "vi" : "en";
}

function titleCase(text: string) {
  return text
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatEnumLabel(value: string) {
  return titleCase(value.replaceAll("_", " "));
}

export function I18nProvider(props: PropsWithChildren) {
  const [lang, setLang] = useState<Lang>(getStoredLang);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === "vi" ? "vi" : "en";
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const copy = (input: Copy) => input[lang];
    const fromMap = (key: string, fallback?: string) => {
      const found = enumLabels[key] ?? enumLabels[key.toUpperCase()];
      return found ? found[lang] : fallback ?? formatEnumLabel(key);
    };
    const formatChannel = (value: string) => fromMap(String(value).toLowerCase());
    const formatConfidence = (value: string) => fromMap(String(value).toLowerCase());
    const formatExtractionSource = (value: string) => fromMap(String(value).toLowerCase());

    // Composite source strings like "import+zalo_text_deterministic+gemini"
    // collapse to operator-friendly summaries. Tokens recognised:
    //   AI providers: gemini, groq, openrouter, ai_llm, ai
    //   deterministic / template: deterministic, zalo_text_deterministic, regex
    //   webhook
    const formatExtractionSourceSummary = (raw: string): string => {
      const tokens = String(raw ?? "")
        .toLowerCase()
        .split(/[+,\s]+/)
        .filter(Boolean);
      const hasAi = tokens.some((t) =>
        /(^|_)(ai|gemini|groq|openrouter|ai_llm|llm)(_|$)/.test(t)
      );
      const hasDet = tokens.some((t) => /deterministic|regex|template/.test(t));
      const hasWebhook = tokens.some((t) => /webhook/.test(t));
      if (hasAi && hasDet) return copy({ en: "AI + Template", vi: "AI + trích xuất quy tắc" });
      if (hasAi) return copy({ en: "AI", vi: "AI" });
      if (hasDet) return copy({ en: "Template", vi: "Trích xuất quy tắc" });
      if (hasWebhook) return copy({ en: "Webhook", vi: "webhook" });
      return raw || "—";
    };

    const formatApplySkipReason = (value: string) => fromMap(String(value).toLowerCase());

    const formatFieldLabel = (key: string): string => {
      const entry = fieldLabels[key];
      if (entry) return entry[lang];
      // Last-resort fallback for unmapped keys. Translate snake/camel separators
      // to whitespace so the visible string is at least readable. Add the key to
      // `fieldLabels` above to give it a real Vietnamese label.
      return key.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase()).trim();
    };

    const formatScalarValue = (key: string, value: string | number): string => {
      if (typeof value === "number") {
        const unit = numericUnits[key];
        return unit ? `${value} ${unit[lang]}` : String(value);
      }
      if (fieldsWithEnumValues.has(key)) {
        return fromMap(String(value).toLowerCase());
      }
      return String(value);
    };

    const formatFieldValue = (key: string, value: unknown): string => {
      if (value === null || value === undefined || value === "") return "—";
      if (typeof value === "boolean") {
        if (booleanFields.has(key)) {
          return value ? copy({ en: "Yes", vi: "Có" }) : copy({ en: "No", vi: "Không" });
        }
        return value ? copy({ en: "Yes", vi: "Có" }) : copy({ en: "No", vi: "Không" });
      }
      if (Array.isArray(value)) {
        if (value.length === 0) return "—";
        return value
          .map((item) =>
            typeof item === "string" || typeof item === "number"
              ? formatScalarValue(key, item)
              : JSON.stringify(item)
          )
          .join(", ");
      }
      if (typeof value === "string" || typeof value === "number") {
        return formatScalarValue(key, value);
      }
      return JSON.stringify(value);
    };

    return {
      lang,
      setLang,
      copy,
      formatEnum: (value) => fromMap(value),
      formatLeadStatus: (value) => fromMap(value),
      formatPipelineStage: (value) => {
        if (value === "interview_failed") return fromMap("interview_failed_stage");
        return fromMap(value);
      },
      formatApplicationStatus: (value) => fromMap(value),
      formatDocumentType: (value) => fromMap(value),
      formatDocumentStatus: (value) => fromMap(value),
      // Backend `/pipeline` emits English next-action + blocker strings; localize
      // them here (the set is fixed in pipeline.service.ts).
      formatPipelineNextAction: (value) => {
        const map: Record<string, Copy> = {
          "Continue qualification": { en: "Continue qualification", vi: "Tiếp tục xác minh điều kiện" },
          "Promote lead to candidate": { en: "Promote lead to candidate", vi: "Chuyển thành hồ sơ ứng viên" },
          "Create application": { en: "Create application", vi: "Tạo ứng tuyển" },
          "Complete required documents": { en: "Complete required documents", vi: "Hoàn thiện giấy tờ bắt buộc" },
          "Create training-finance record": { en: "Create training-finance record", vi: "Tạo bản ghi đào tạo & tài chính" },
          "Advance visa readiness": { en: "Advance visa readiness", vi: "Đẩy tiến độ visa" },
          "Schedule departure": { en: "Schedule departure", vi: "Lên lịch xuất cảnh" },
          "Monitor departure completion": { en: "Monitor departure completion", vi: "Theo dõi hoàn tất xuất cảnh" },
        };
        return map[value] ? map[value][lang] : value;
      },
      formatPipelineBlocker: (value) => {
        if (value === "Candidate record missing") {
          return copy({ en: "Candidate record missing", vi: "Chưa có hồ sơ ứng viên" });
        }
        const docList = (raw: string) =>
          raw
            .split(",")
            .map((token) => fromMap(token.trim()))
            .filter(Boolean)
            .join(", ");
        let m = value.match(/^Missing docs:\s*(.+)$/);
        if (m) return `${copy({ en: "Missing docs", vi: "Thiếu giấy tờ" })}: ${docList(m[1])}`;
        m = value.match(/^Expired docs:\s*(.+)$/);
        if (m) return `${copy({ en: "Expired docs", vi: "Giấy tờ hết hạn" })}: ${docList(m[1])}`;
        m = value.match(/^Application outcome:\s*(.+)$/);
        if (m) return `${copy({ en: "Application outcome", vi: "Kết quả ứng tuyển" })}: ${fromMap(m[1].trim())}`;
        return value;
      },
      formatTrainingMilestone: (value) =>
        copy({
          en: formatEnumLabel(value),
          vi:
            value === "departure scheduled"
              ? "Đã lên lịch xuất cảnh"
              : value === "visa ready"
                ? "Visa sẵn sàng"
                : value === "training in progress"
                  ? "Đang đào tạo"
                  : value === "deposit tracked"
                    ? "Đã theo dõi đặt cọc"
                    : value === "not started"
                      ? "Chưa bắt đầu"
                      : formatEnumLabel(value)
        }),
      formatChannel,
      formatConfidence,
      formatExtractionSource,
      formatExtractionSourceSummary,
      formatApplySkipReason,
      formatFieldLabel,
      formatFieldValue,
      yesNoUnknown: (value) =>
        value === "true"
          ? copy({ en: "Yes", vi: "Có" })
          : value === "false"
            ? copy({ en: "No", vi: "Không" })
            : copy({ en: "Unknown", vi: "Chưa rõ" })
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
