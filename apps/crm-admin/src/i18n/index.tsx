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
  formatDocumentType: (value: string) => string;
  formatDocumentStatus: (value: string) => string;
  formatTrainingMilestone: (value: string) => string;
  yesNoUnknown: (value: string) => string;
};

const STORAGE_KEY = "crm-admin-lang";

const I18nContext = createContext<I18nContextValue | null>(null);

const enumLabels: Record<string, Copy> = {
  NEW: { en: "New", vi: "Mới" },
  CONTACTED: { en: "Contacted", vi: "Đã liên hệ" },
  QUALIFIED: { en: "Qualified", vi: "Đủ điều kiện" },
  MATCHING: { en: "Matching", vi: "Đang ghép đơn" },
  MATCHED: { en: "Matched", vi: "Đã ghép đơn" },
  INTERVIEW_SCHEDULED: { en: "Interview scheduled", vi: "Đã lên lịch phỏng vấn" },
  INTERVIEWING: { en: "Interviewing", vi: "Đang phỏng vấn" },
  INTERVIEW_PASSED: { en: "Interview passed", vi: "Phỏng vấn đạt" },
  INTERVIEW_FAILED: { en: "Interview failed", vi: "Phỏng vấn trượt" },
  CONTRACT_SIGNED: { en: "Contract signed", vi: "Đã ký hợp đồng" },
  VISA_PROCESSING: { en: "Visa processing", vi: "Đang làm visa" },
  DEPARTED: { en: "Departed", vi: "Đã xuất cảnh" },
  DISQUALIFIED: { en: "Disqualified", vi: "Loại" },
  HOT: { en: "Hot", vi: "Nóng" },
  WARM: { en: "Warm", vi: "Ấm" },
  COLD: { en: "Cold", vi: "Lạnh" },
  matching: { en: "Matching", vi: "Đang ghép đơn" },
  referred: { en: "Referred", vi: "Đã giới thiệu" },
  interview_scheduled: { en: "Interview scheduled", vi: "Đã lên lịch phỏng vấn" },
  interview_passed: { en: "Interview passed", vi: "Phỏng vấn đạt" },
  interview_failed: { en: "Interview failed", vi: "Phỏng vấn trượt" },
  signing: { en: "Signing", vi: "Đang ký" },
  rejected: { en: "Rejected", vi: "Từ chối" },
  withdrawn: { en: "Withdrawn", vi: "Rút hồ sơ" },
  pending: { en: "Pending", vi: "Chờ xử lý" },
  submitted: { en: "Submitted", vi: "Đã nộp" },
  verified: { en: "Verified", vi: "Đã xác minh" },
  expired: { en: "Expired", vi: "Hết hạn" },
  passport: { en: "Passport", vi: "Hộ chiếu" },
  criminal_record: { en: "Criminal record", vi: "Lý lịch tư pháp" },
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
  staff: { en: "Staff", vi: "Nhân viên" },
  departed: { en: "Departed", vi: "Đã xuất cảnh" },
  disqualified: { en: "Disqualified", vi: "Loại" },
  interview_failed_stage: { en: "Interview failed", vi: "Phỏng vấn trượt" },
  visa_processing: { en: "Visa processing", vi: "Đang làm visa" },
  contract_signed: { en: "Contract signed", vi: "Đã ký hợp đồng" },
  interviewing: { en: "Interviewing", vi: "Đang phỏng vấn" }
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
