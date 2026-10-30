/**
 * FORM CHUẨN entry screen ↔ stored values.
 *
 * The paper form asks yes/no and pick-one questions; several of the matching
 * dossier fields predate the screen and hold free text written by the AI or an
 * older form upload ("không xăm", "12/12 (đại học điện lực)", "cận 2 độ"). These
 * readers map both shapes onto the form's options the same way the backend
 * export does (social-crm-backend: form-standard/form-chuan-data.ts), so what
 * the screen shows ticked is what the printed form ticks.
 */

/** Lowercase, strip Vietnamese diacritics: "Không" / "khong" / "KHÔNG" compare equal. */
export function fold(v: unknown): string {
  if (typeof v !== "string" && typeof v !== "number") return "";
  return String(v)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

export function text(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return typeof v === "string" ? v : "";
}

const NO_WORDS = /^(k|ko|khong|chua|none|no|false)\b/;

/** Free-text yes/no declaration → answer + any detail the text itself carries. */
export function readYesNoText(raw: unknown): { answer: "yes" | "no" | null; detail: string } {
  const f = fold(raw);
  if (!f) return { answer: null, detail: "" };
  if (NO_WORDS.test(f) || f.includes("khong xam") || f === "k xam") return { answer: "no", detail: "" };
  if (f === "co" || f === "yes" || f === "true") return { answer: "yes", detail: "" };
  return { answer: "yes", detail: text(raw) };
}

export const MARITAL_OPTIONS = ["Chưa kết hôn", "Kết hôn", "Ly hôn"] as const;
export function readMarital(raw: unknown): (typeof MARITAL_OPTIONS)[number] | null {
  const f = fold(raw);
  if (!f) return null;
  if (f.includes("ly hon") || f.includes("ly than")) return "Ly hôn";
  if (f.includes("chua") || f.includes("doc than")) return "Chưa kết hôn";
  if (f.includes("ket hon") || f.includes("co gia dinh") || f.includes("co vo") || f.includes("co chong")) return "Kết hôn";
  return null;
}

export const VISION_OPTIONS = ["Bình thường", "Cận", "Loạn", "Mù màu"] as const;
export function readVision(raw: unknown): (typeof VISION_OPTIONS)[number] | null {
  const f = fold(raw);
  if (!f) return null;
  if (f.includes("mu mau")) return "Mù màu";
  if (f.includes("loan")) return "Loạn";
  if (f.includes("can")) return "Cận";
  if (f.includes("binh thuong") || f.includes("10/10") || f === "tot") return "Bình thường";
  return null;
}

/**
 * Older vision text carries its own detail ("cận 2 độ"). Show it as the detail
 * until a visionNote is written; a bare option label ("Cận") carries none.
 */
export function visionLegacyDetail(raw: unknown): string {
  const f = fold(raw);
  if (!f || VISION_OPTIONS.some((o) => fold(o) === f)) return "";
  return text(raw);
}

export const EDUCATION_OPTIONS = ["Tiểu học", "THCS", "THPT", "Trung cấp", "CĐ", "Đại học"] as const;
const EDUCATION_RANK: ReadonlyArray<[(typeof EDUCATION_OPTIONS)[number], RegExp]> = [
  ["Đại học", /dai hoc|\bdh\b|cu nhan|ky su/],
  ["CĐ", /cao dang|\bcd\b/],
  ["Trung cấp", /trung cap/],
  ["THPT", /thpt|cap 3|12\/12|trung hoc pho thong/],
  ["THCS", /thcs|cap 2|9\/12|trung hoc co so/],
  ["Tiểu học", /tieu hoc|cap 1|5\/12/],
];
export function readEducation(raw: unknown): (typeof EDUCATION_OPTIONS)[number] | null {
  const f = fold(raw);
  if (!f) return null;
  return EDUCATION_RANK.find(([, re]) => re.test(f))?.[0] ?? null;
}

export const ENGLISH_OPTIONS = ["Không biết", "Hiểu đơn giản", "Nghe nói cơ bản"] as const;
const ENGLISH_PREFIX = "Tiếng Anh: ";
export function readEnglish(languages: unknown): (typeof ENGLISH_OPTIONS)[number] | null {
  if (!Array.isArray(languages)) return null;
  const entry = languages.map(fold).find((l) => l.includes("anh"));
  if (!entry) return null;
  if (entry.includes("nghe noi")) return "Nghe nói cơ bản";
  if (entry.includes("don gian") || entry.includes("co ban")) return "Hiểu đơn giản";
  if (entry.includes("khong")) return "Không biết";
  return null;
}
/** Replace (or add) one language's entry, keeping every other language as written. */
function writeLanguage(languages: unknown, isIt: (folded: string) => boolean, entry: string): string[] {
  const others = (Array.isArray(languages) ? languages : []).filter(
    (l): l is string => typeof l === "string" && !isIt(fold(l)),
  );
  return [...others, entry];
}

const isEnglish = (f: string) => f.includes("anh");
const isChinese = (f: string) => f.includes("trung") || f.includes("hoa");

export function writeEnglish(languages: unknown, level: (typeof ENGLISH_OPTIONS)[number]): string[] {
  return writeLanguage(languages, isEnglish, `${ENGLISH_PREFIX}${level}`);
}

/** The form's five Chinese levels, lowest first. */
export const CHINESE_OPTIONS = ["Bắt đầu học", "Hiểu đơn giản", "Nghe nói cơ bản", "Nghe nói lưu loát", "Thông thạo 4 kỹ năng"] as const;
export function readChinese(languages: unknown): (typeof CHINESE_OPTIONS)[number] | null {
  if (!Array.isArray(languages)) return null;
  const entry = languages.map(fold).find(isChinese);
  if (!entry) return null;
  if (entry.includes("thong thao") || entry.includes("4 ky nang")) return "Thông thạo 4 kỹ năng";
  if (entry.includes("luu loat")) return "Nghe nói lưu loát";
  if (entry.includes("nghe noi")) return "Nghe nói cơ bản";
  if (entry.includes("don gian") || entry.includes("co ban")) return "Hiểu đơn giản";
  if (entry.includes("bat dau")) return "Bắt đầu học";
  return null;
}
export function writeChinese(languages: unknown, level: (typeof CHINESE_OPTIONS)[number]): string[] {
  return writeLanguage(languages, isChinese, `Tiếng Trung: ${level}`);
}

export const HAND_OPTIONS = ["Trái", "Phải"] as const;
export function readHand(raw: unknown): (typeof HAND_OPTIONS)[number] | null {
  const f = fold(raw);
  if (f.includes("trai")) return "Trái";
  if (f.includes("phai")) return "Phải";
  return null;
}

export const VACCINATION_OPTIONS = [
  { value: "have", label: "Đã tiêm" },
  { value: "in_progress", label: "Đang tiêm" },
  { value: "none", label: "Chưa" },
] as const;

export const CONTRACT_OPTIONS = [
  { value: "completed", label: "Mãn hạn HĐ" },
  { value: "not_completed", label: "Không hết HĐ" },
] as const;

export const REGION_OPTIONS = [
  { value: "dai_bac", label: "Đài Bắc" },
  { value: "dai_trung", label: "Đài Trung" },
  { value: "dai_nam", label: "Đài Nam" },
  { value: "cao_hung", label: "Cao Hùng" },
  { value: "khac", label: "Khác" },
] as const;

/** Lead.leadSource (or channel) → the form's "Phương thức liên hệ ĐK". */
export function contactChannelLabel(source: unknown): string {
  if (source === "website") return "Website";
  if (source === "facebook" || source === "zalo" || source === "tiktok") return "Mạng XH";
  if (source === "gioi_thieu") return "Người giới thiệu";
  if (typeof source === "string" && source) return "Khác";
  return "";
}

export interface WorkRow {
  occupation: string;
  location: string;
  company: string;
  description: string;
  period: string;
}

export const EMPTY_WORK_ROW: WorkRow = { occupation: "", location: "", company: "", description: "", period: "" };

export function readWorkRows(raw: unknown): WorkRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      occupation: text(r.occupation),
      location: text(r.location),
      company: text(r.company),
      description: text(r.description),
      period: text(r.period),
    }));
}

/** A four-digit year, blank = cleared. Returns undefined while it is not one yet. */
export function parseYear(v: string): number | null | undefined {
  const t = v.trim();
  if (t === "") return null;
  return /^(19|20)\d{2}$/.test(t) ? Number(t) : undefined;
}

/** Age today from an ISO birth date, else from a birth year. */
export function ageFrom(dateOfBirth: string, birthYear: string, today = new Date()): string {
  const m = dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const before = today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d);
    return String(today.getFullYear() - y - (before ? 1 : 0));
  }
  return /^\d{4}$/.test(birthYear.trim()) ? String(today.getFullYear() - Number(birthYear)) : "";
}

/** Integer input: digits only, blank = cleared. Returns undefined when not a number. */
export function parseWholeNumber(v: string): number | null | undefined {
  const t = v.trim();
  if (t === "") return null;
  return /^\d{1,3}$/.test(t) ? Number(t) : undefined;
}
