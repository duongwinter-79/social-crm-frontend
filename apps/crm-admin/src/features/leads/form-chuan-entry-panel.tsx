import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Input } from "@social-crm/ui";
import {
  useExportFormStandardMutation,
  useFormStandardReadinessQuery,
  useUpdateLeadDossierMutation,
  useUpdateLeadMutation,
  useUpdateLeadQualificationMutation,
  type Lead,
  type LeadQualificationSnapshot
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import {
  CONTRACT_OPTIONS,
  EDUCATION_OPTIONS,
  EMPTY_WORK_ROW,
  ENGLISH_OPTIONS,
  HAND_OPTIONS,
  MARITAL_OPTIONS,
  REGION_OPTIONS,
  VACCINATION_OPTIONS,
  VISION_OPTIONS,
  contactChannelLabel,
  parseWholeNumber,
  readEducation,
  readEnglish,
  readHand,
  readMarital,
  readVision,
  readWorkRows,
  visionLegacyDetail,
  ageFrom,
  CHINESE_OPTIONS,
  parseYear,
  readChinese,
  writeChinese,
  readYesNoText,
  text,
  writeEnglish,
  type WorkRow
} from "./form-chuan-values";

/**
 * FORM CHUẨN entry screen — the worker's form, filled on screen in the order of
 * the paper "PHIẾU ĐĂNG KÝ HỒ SƠ VÀ CAM KẾT", then exported as a .docx to print
 * and sign.
 *
 * Every input shows the VERIFIED value only — the same layer the export prints
 * and the QUALIFIED → MATCHING gate reads. An unconfirmed AI value is offered
 * beside the input ("Dùng"), never pre-filled, so nothing reaches the signed
 * form without a person choosing it. Saving writes each field to where it
 * lives: identity → lead, scoring fields → qualification (both stamp them
 * verified), everything else → the dossier. Only changed fields are sent.
 */

type Soft = Record<string, unknown>;

interface Draft {
  fullName: string;
  phone: string;
  birthYear: string;
  gender: string;
  height: string;
  weight: string;
  experienceField: string;
  desiredIndustry: string;
  desiredSalary: string;
  preferredRegion: string[];
  address: string;
  /** Dossier date of birth, ISO yyyy-mm-dd. */
  dateOfBirth: string;
  soft: Soft;
}

/** Lead fields on this screen → the keys the verified layer may hold them under. */
const VERIFIED_KEYS: Record<Exclude<keyof Draft, "address" | "dateOfBirth" | "soft">, string[]> = {
  fullName: ["fullName"],
  phone: ["phone"],
  birthYear: ["birthYear", "age"],
  gender: ["gender"],
  height: ["height", "heightCm"],
  weight: ["weight", "weightKg"],
  experienceField: ["experienceField"],
  desiredIndustry: ["desiredIndustry"],
  desiredSalary: ["desiredSalary"],
  preferredRegion: ["preferredRegion", "preferredRegions"]
};

function verifiedValue(lead: Lead, verifiedData: Record<string, unknown>, keys: string[]): unknown {
  const listed = Array.isArray(lead.verifiedKeys) ? lead.verifiedKeys : null;
  for (const k of keys) {
    if (listed ? listed.includes(k) : verifiedData[k] != null) {
      const v = verifiedData[k];
      // `age` is the legacy spelling of a verified birth year.
      if (k === "age" && typeof v === "number") return new Date().getFullYear() - v;
      return v;
    }
  }
  return undefined;
}

function buildBaseline(lead: Lead, snapshot: LeadQualificationSnapshot | undefined, profile: Soft | null): Draft {
  const vd = snapshot?.verifiedData ?? lead.verifiedProfileData ?? {};
  const v = (k: keyof typeof VERIFIED_KEYS) => verifiedValue(lead, vd, VERIFIED_KEYS[k]);
  const regions = v("preferredRegion");
  const soft = profile?.softFields;
  return {
    fullName: text(v("fullName")),
    phone: text(v("phone")),
    birthYear: text(v("birthYear")),
    gender: text(v("gender")),
    height: text(v("height")),
    weight: text(v("weight")),
    experienceField: text(v("experienceField")),
    desiredIndustry: text(v("desiredIndustry")),
    desiredSalary: text(v("desiredSalary")),
    preferredRegion: Array.isArray(regions) ? regions.filter((r): r is string => typeof r === "string") : [],
    address: text(profile?.address),
    dateOfBirth: text(profile?.dateOfBirth).slice(0, 10),
    soft: soft && typeof soft === "object" && !Array.isArray(soft) ? { ...(soft as Soft) } : {}
  };
}

/** Unverified values the operator may adopt: lead merged layer (AI / typed), then the dossier. */
function buildSuggestions(lead: Lead, snapshot: LeadQualificationSnapshot | undefined, profile: Soft | null) {
  const m = snapshot?.mergedData ?? {};
  const p = profile ?? {};
  const pick = (...vals: unknown[]) => vals.map(text).find((x) => x.trim() !== "") ?? "";
  return {
    fullName: pick(lead.fullName, p.fullName),
    phone: pick(lead.phone),
    birthYear: pick(m.birthYear, lead.birthYear, p.birthYear),
    gender: pick(m.gender, lead.gender, p.gender),
    height: pick(m.height, m.heightCm, p.heightCm),
    weight: pick(m.weight, m.weightKg, p.weightKg),
    experienceField: pick(m.experienceField, p.experienceField),
    desiredIndustry: pick(m.desiredIndustry, p.desiredIndustry),
    desiredSalary: pick(m.desiredSalary, p.desiredSalary)
  } as Record<string, string>;
}

/** Family birth years: typed as text, sent as a 4-digit year. */
const YEAR_KEYS: ReadonlySet<string> = new Set(["fatherBirthYear", "motherBirthYear", "spouseBirthYear"]);

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function blankToNull(v: unknown): unknown {
  if (typeof v === "string" && v.trim() === "") return null;
  if (Array.isArray(v) && v.length === 0) return null;
  return v ?? null;
}

// ── small controls ──────────────────────────────────────────────────────

function Seg<T extends string>(props: {
  label: string;
  options: ReadonlyArray<T | { value: T; label: string }>;
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-slate-600">
        {props.label}
        {props.required ? <span className="ml-0.5 text-amber-700">*</span> : null}
      </span>
      <div role="group" aria-label={props.label} className="flex flex-wrap gap-1.5">
        {props.options.map((o) => {
          const value = typeof o === "string" ? o : o.value;
          const label = typeof o === "string" ? o : o.label;
          const on = props.value === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              disabled={props.disabled}
              onClick={() => props.onChange(value)}
              className={`min-h-[40px] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                on
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "AI gợi ý" line under a lead field whose shown value is not verified yet. */
function Unverified(props: { value: string; current: string; onUse: () => void; disabled?: boolean }) {
  const { copy } = useI18n();
  if (!props.value || props.value === props.current) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span>
        {copy({ en: "Unverified:", vi: "Chưa xác minh:" })} <span className="font-medium text-slate-700">{props.value}</span>
      </span>
      <button
        type="button"
        disabled={props.disabled}
        onClick={props.onUse}
        className="font-semibold text-indigo-600 underline-offset-2 hover:underline disabled:opacity-50"
      >
        {copy({ en: "Use", vi: "Dùng" })}
      </button>
    </div>
  );
}

function Section(props: { id: string; num: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={props.id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-base font-bold text-slate-900">
        {props.num} · {props.title}
      </h3>
      {props.hint ? <p className="mt-1 text-sm text-slate-500">{props.hint}</p> : null}
      <div className="mt-4 space-y-4">{props.children}</div>
    </section>
  );
}

// ── the panel ───────────────────────────────────────────────────────────

export function FormChuanEntryPanel(props: {
  leadId: string;
  lead: Lead;
  qualification: LeadQualificationSnapshot | undefined;
  /** CandidateProfile row (null until the lead has a dossier). */
  profile: Soft | null;
  canEdit: boolean;
  canViewPii: boolean;
}) {
  const { copy } = useI18n();
  const { leadId, lead, qualification, profile, canEdit, canViewPii } = props;
  const queryClient = useQueryClient();
  const readiness = useFormStandardReadinessQuery(leadId);
  const updateLead = useUpdateLeadMutation();
  const updateQualification = useUpdateLeadQualificationMutation(leadId);
  const updateDossier = useUpdateLeadDossierMutation(leadId);
  const exportForm = useExportFormStandardMutation(leadId);

  const baseline = useMemo(() => buildBaseline(lead, qualification, profile), [lead, qualification, profile]);
  const suggestions = useMemo(() => buildSuggestions(lead, qualification, profile), [lead, qualification, profile]);
  // Unsaved edits, layered over the server values. Holding only the edits (not
  // a copy of everything) means a background refetch never fights the
  // operator's typing, and a save simply clears them once the refreshed server
  // values are in.
  const [edits, setEdits] = useState<Partial<Omit<Draft, "soft">> & { soft?: Soft }>({});
  const draft: Draft = useMemo(
    () => ({ ...baseline, ...edits, soft: { ...baseline.soft, ...(edits.soft ?? {}) } }),
    [baseline, edits]
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  // Hình xăm keeps its answer and detail in one text field (tattooNote), so a
  // detail being typed ("K…") could read back as "Không" and hide its own box.
  // The clicked answer is held here until the next save.
  const [tattooAnswer, setTattooAnswer] = useState<"yes" | "no" | null>(null);

  const set = <K extends keyof Omit<Draft, "soft">>(k: K, v: Draft[K]) => setEdits((e) => ({ ...e, [k]: v }));
  const soft = draft.soft;
  const setSoft = (patch: Soft) => setEdits((e) => ({ ...e, soft: { ...(e.soft ?? {}), ...patch } }));
  const dirty = !sameJson(draft, baseline);
  const disabled = !canEdit;

  const saving = updateLead.isPending || updateQualification.isPending || updateDossier.isPending;

  async function save(): Promise<boolean> {
    setSaveError(null);
    const changed = (k: keyof Draft) => !sameJson(draft[k], baseline[k]);
    try {
      const identity: Record<string, unknown> = {};
      if (changed("fullName")) identity.fullName = draft.fullName.trim();
      // A caller who only sees a masked phone must never send it back.
      if (canViewPii && changed("phone")) identity.phone = draft.phone.trim();

      const q: Record<string, unknown> = {};
      for (const k of ["birthYear", "height", "weight"] as const) {
        if (!changed(k)) continue;
        const n = parseWholeNumber(draft[k]) ?? (/^\d{4}$/.test(draft[k].trim()) ? Number(draft[k].trim()) : undefined);
        if (n === undefined) throw new Error(copy({ en: `${k} must be a number`, vi: `${k} phải là số` }));
        q[k] = n;
      }
      if (changed("gender")) q.gender = draft.gender || null;
      for (const k of ["experienceField", "desiredIndustry", "desiredSalary"] as const) {
        if (changed(k)) q[k] = draft[k].trim() || null;
      }
      if (changed("preferredRegion")) q.preferredRegion = draft.preferredRegion;

      const softPatch: Soft = {};
      for (const k of new Set([...Object.keys(draft.soft), ...Object.keys(baseline.soft)])) {
        if (sameJson(draft.soft[k], baseline.soft[k])) continue;
        let v = blankToNull(draft.soft[k]);
        // Year inputs hold the text being typed; send it as a year, or stop.
        if (YEAR_KEYS.has(k) && typeof v === "string") {
          const y = parseYear(v);
          if (y === undefined) throw new Error(copy({ en: `${k}: enter a 4-digit year`, vi: `Năm sinh phải gồm 4 chữ số (${v})` }));
          v = y;
        }
        softPatch[k] = v;
      }
      const typedPatch: Record<string, string | null> = {};
      if (changed("address")) typedPatch.address = draft.address.trim() || null;
      if (changed("dateOfBirth")) typedPatch.dateOfBirth = draft.dateOfBirth || null;
      const typed = Object.keys(typedPatch).length ? typedPatch : undefined;

      // One after another, never in parallel: the identity and qualification
      // writes both extend the lead's verifiedKeys, and concurrent writes would
      // drop one side's keys.
      if (Object.keys(identity).length) await updateLead.mutateAsync({ id: leadId, patch: identity });
      if (Object.keys(q).length) await updateQualification.mutateAsync(q);
      if (typed || Object.keys(softPatch).length) {
        await updateDossier.mutateAsync({ ...(typed ? { typed } : {}), ...(Object.keys(softPatch).length ? { softFields: softPatch } : {}) });
      }
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["lead", leadId] }),
        queryClient.refetchQueries({ queryKey: ["candidate", "by-lead", leadId] }),
        readiness.refetch()
      ]);
      setEdits({});
      setTattooAnswer(null);
      return true;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? (err as Error)?.message;
      setSaveError(Array.isArray(message) ? message.join("; ") : String(message ?? "Save failed"));
      return false;
    }
  }

  async function saveAndExport() {
    if (dirty && !(await save())) return;
    exportForm.mutate();
  }

  // ── derived view state ────────────────────────────────────────────────
  const tattooRead = readYesNoText(soft.tattooNote);
  const tattoo = { answer: tattooAnswer ?? tattooRead.answer, detail: tattooRead.detail };
  const surgery = readYesNoText(soft.surgery);
  const defect = readYesNoText(soft.birthDefect);
  const vision = readVision(soft.vision);
  const marital = readMarital(soft.maritalStatus);
  const workRows = readWorkRows(soft.workExperience);
  const shownRows = workRows.length ? workRows : [EMPTY_WORK_ROW];
  const beenToTaiwan = soft.hasBeenToTaiwan === true ? "Đã từng" : soft.hasBeenToTaiwan === false ? "Chưa" : null;

  const missing = readiness.data?.requiredMissing ?? [];
  const exportedAt = readiness.data?.formExportedAt;
  const awaitingSignature = readiness.data?.awaitingSignature ?? false;

  const setWorkRows = (rows: WorkRow[]) => setSoft({ workExperience: rows });
  const yesNoDetail = (
    label: string,
    answer: "yes" | "no" | null,
    onAnswer: (yes: boolean) => void,
    detail: string,
    onDetail: (v: string) => void,
    placeholder: string
  ) => (
    <div className="flex flex-col gap-2">
      <Seg label={label} options={["Không", "Có"] as const} value={answer === "yes" ? "Có" : answer === "no" ? "Không" : null} onChange={(v) => onAnswer(v === "Có")} disabled={disabled} />
      {answer === "yes" ? (
        <Input label={copy({ en: "Detail", vi: "Chi tiết" })} value={detail} placeholder={placeholder} onChange={(e) => onDetail(e.target.value)} disabled={disabled} />
      ) : null}
    </div>
  );

  const sectionNav = [
    { id: "fc-s1", label: copy({ en: "Personal", vi: "Cá nhân" }) },
    { id: "fc-s2", label: copy({ en: "Family", vi: "Gia đình" }) },
    { id: "fc-s3", label: copy({ en: "Education", vi: "Học vấn" }) },
    { id: "fc-s4", label: copy({ en: "Experience", vi: "Kinh nghiệm" }) },
    { id: "fc-s5", label: copy({ en: "Wishes", vi: "Nguyện vọng" }) },
    { id: "fc-s6", label: copy({ en: "Confirmation", vi: "Xác nhận" }) }
  ];

  const exportButton = (
    <Button onClick={saveAndExport} disabled={exportForm.isPending || saving || (dirty && !canEdit)}>
      {exportForm.isPending
        ? copy({ en: "Exporting…", vi: "Đang xuất…" })
        : dirty
          ? copy({ en: "Save & export FORM CHUẨN", vi: "Lưu & xuất FORM CHUẨN" })
          : copy({ en: "Export FORM CHUẨN (.docx)", vi: "Xuất FORM CHUẨN (.docx)" })}
    </Button>
  );

  return (
    <div className="space-y-5">
      {/* Header: what is still missing, export state, the primary action. */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{copy({ en: "Standard form", vi: "Hồ sơ lao động — FORM CHUẨN" })}</span>
            {awaitingSignature ? <Badge tone="warning">Đã xuất form · chờ ký</Badge> : null}
            {readiness.data?.signedFormDocumentId ? <Badge tone="success">{copy({ en: "Signed form on file", vi: "Đã có form đã ký" })}</Badge> : null}
          </div>
          <div className="text-sm text-slate-600">
            {readiness.isLoading
              ? copy({ en: "Checking required fields…", vi: "Đang kiểm tra trường bắt buộc…" })
              : missing.length === 0
                ? copy({ en: "All required fields are verified.", vi: "Đã đủ các trường bắt buộc (đã xác minh)." })
                : `${copy({ en: "Required, not verified yet:", vi: "Bắt buộc còn thiếu:" })} ${missing.map((m) => m.labelVi).join(", ")}`}
          </div>
          {exportedAt ? (
            <div className="text-xs text-slate-500">
              {copy({ en: "Last exported", vi: "Xuất lần cuối" })}: {new Date(exportedAt).toLocaleString("vi-VN")}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canEdit ? (
            <Button variant="secondary" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? copy({ en: "Saving…", vi: "Đang lưu…" }) : copy({ en: "Save", vi: "Lưu" })}
            </Button>
          ) : null}
          {canViewPii ? exportButton : null}
        </div>
      </div>

      {saveError ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {saveError}
        </div>
      ) : null}

      <nav aria-label={copy({ en: "Form sections", vi: "Các mục của form" })} className="flex flex-wrap gap-2">
        {sectionNav.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700">
            {i + 1} · {s.label}
          </a>
        ))}
      </nav>

      <p className="text-xs text-slate-500">
        {copy({
          en: "Only verified values print. An unverified AI value appears under its field — press Use to adopt it, then Save.",
          vi: "Bản xuất chỉ in giá trị đã xác minh. Giá trị AI chưa xác minh hiện dưới ô — bấm Dùng để chọn, rồi Lưu."
        })}
      </p>

      <Section id="fc-s1" num={1} title={copy({ en: "Personal information", vi: "Thông tin cá nhân" })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input label={`${copy({ en: "Full name", vi: "Họ tên" })} *`} value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} disabled={disabled} />
            <Unverified value={suggestions.fullName} current={draft.fullName} onUse={() => set("fullName", suggestions.fullName)} disabled={disabled} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px]">
            <div>
              <Input label={`${copy({ en: "Birth year", vi: "Năm sinh" })} *`} inputMode="numeric" value={draft.birthYear} onChange={(e) => set("birthYear", e.target.value)} disabled={disabled} />
              <Unverified value={suggestions.birthYear} current={draft.birthYear} onUse={() => set("birthYear", suggestions.birthYear)} disabled={disabled} />
            </div>
            <Input label={copy({ en: "Age", vi: "Tuổi" })} value={ageFrom(draft.dateOfBirth, draft.birthYear)} disabled readOnly />
          </div>
        </div>
        <div className="sm:max-w-xs">
          <Input type="date" label={copy({ en: "Date of birth", vi: "Ngày sinh" })} value={draft.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} disabled={disabled} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Seg label={copy({ en: "Gender", vi: "Giới tính" })} required options={[{ value: "female", label: "Nữ" }, { value: "male", label: "Nam" }]} value={(draft.gender || null) as "male" | "female" | null} onChange={(v) => set("gender", v)} disabled={disabled} />
            <Unverified value={suggestions.gender === "male" ? "Nam" : suggestions.gender === "female" ? "Nữ" : ""} current={draft.gender === "male" ? "Nam" : draft.gender === "female" ? "Nữ" : ""} onUse={() => set("gender", suggestions.gender)} disabled={disabled} />
          </div>
          <div>
            <Input label={`${copy({ en: "Height (cm)", vi: "Chiều cao (cm)" })} *`} inputMode="numeric" value={draft.height} onChange={(e) => set("height", e.target.value)} disabled={disabled} />
            <Unverified value={suggestions.height} current={draft.height} onUse={() => set("height", suggestions.height)} disabled={disabled} />
          </div>
          <div>
            <Input label={`${copy({ en: "Weight (kg)", vi: "Cân nặng (kg)" })} *`} inputMode="numeric" value={draft.weight} onChange={(e) => set("weight", e.target.value)} disabled={disabled} />
            <Unverified value={suggestions.weight} current={draft.weight} onUse={() => set("weight", suggestions.weight)} disabled={disabled} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Seg label={copy({ en: "Drinks alcohol", vi: "Uống rượu" })} options={["Không", "Có"] as const} value={soft.alcohol === true ? "Có" : soft.alcohol === false ? "Không" : null} onChange={(v) => setSoft({ alcohol: v === "Có" })} disabled={disabled} />
          <Seg label={copy({ en: "Smokes", vi: "Hút thuốc" })} options={["Không", "Có"] as const} value={soft.smoking === true ? "Có" : soft.smoking === false ? "Không" : null} onChange={(v) => setSoft({ smoking: v === "Có" })} disabled={disabled} />
          <Seg label={copy({ en: "Handedness", vi: "Thuận tay" })} options={HAND_OPTIONS} value={readHand(soft.handedness)} onChange={(v) => setSoft({ handedness: v })} disabled={disabled} />
        </div>
        <Input label={copy({ en: "Address", vi: "Địa chỉ" })} value={draft.address} onChange={(e) => set("address", e.target.value)} disabled={disabled} />
        <div className="sm:max-w-sm">
          {canViewPii ? (
            <>
              <Input label={`${copy({ en: "Phone", vi: "Số điện thoại" })} *`} inputMode="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} disabled={disabled} />
              <Unverified value={suggestions.phone} current={draft.phone} onUse={() => set("phone", suggestions.phone)} disabled={disabled} />
            </>
          ) : (
            <Input label={copy({ en: "Phone", vi: "Số điện thoại" })} value={lead.phone ?? ""} disabled readOnly />
          )}
        </div>

        <div className="h-px bg-slate-100" />

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Seg label={copy({ en: "Marital status", vi: "Tình trạng hôn nhân" })} options={MARITAL_OPTIONS} value={marital} onChange={(v) => setSoft({ maritalStatus: v })} disabled={disabled} />
            {marital === "Kết hôn" ? (
              <Input type="date" label={copy({ en: "Marriage registered on", vi: "Ngày đăng ký kết hôn" })} value={text(soft.marriageRegisteredAt)} onChange={(e) => setSoft({ marriageRegisteredAt: e.target.value })} disabled={disabled} className="sm:max-w-[220px]" />
            ) : null}
          </div>
          {yesNoDetail(
            copy({ en: "Tattoo", vi: "Hình xăm" }),
            tattoo.answer,
            (yes) => {
              setTattooAnswer(yes ? "yes" : "no");
              setSoft({ tattooNote: yes ? tattoo.detail || "Có" : "Không" });
            },
            tattoo.detail,
            (v) => setSoft({ tattooNote: v.trim() ? v : "Có" }),
            copy({ en: "Where, how big", vi: "Vị trí, kích thước" })
          )}
          <div className="flex flex-col gap-2">
            <Seg label={copy({ en: "Vision", vi: "Thị lực" })} options={VISION_OPTIONS} value={vision} onChange={(v) => setSoft({ vision: v, ...(v === "Bình thường" ? { visionNote: null } : {}) })} disabled={disabled} />
            {vision && vision !== "Bình thường" ? (
              <Input label={copy({ en: "Detail", vi: "Chi tiết" })} value={text(soft.visionNote) || visionLegacyDetail(soft.vision)} placeholder={copy({ en: "Strength, which eye", vi: "Độ, mắt nào" })} onChange={(e) => setSoft({ visionNote: e.target.value })} disabled={disabled} />
            ) : null}
          </div>
          {yesNoDetail(
            copy({ en: "Surgery", vi: "Phẫu thuật" }),
            surgery.answer,
            (yes) => setSoft({ surgery: yes ? "Có" : "Không", ...(yes ? { surgeryNote: text(soft.surgeryNote) || surgery.detail } : { surgeryNote: null }) }),
            text(soft.surgeryNote) || surgery.detail,
            (v) => setSoft({ surgeryNote: v }),
            copy({ en: "Type, year", vi: "Loại, năm" })
          )}
          {yesNoDetail(
            copy({ en: "Law violation", vi: "Vi phạm pháp luật" }),
            soft.legalViolation === true ? "yes" : soft.legalViolation === false ? "no" : null,
            (yes) => setSoft({ legalViolation: yes, ...(yes ? {} : { legalViolationNote: null }) }),
            text(soft.legalViolationNote),
            (v) => setSoft({ legalViolationNote: v }),
            copy({ en: "What, when", vi: "Nội dung, năm" })
          )}
          {yesNoDetail(
            copy({ en: "Birth defect", vi: "Dị tật" }),
            defect.answer,
            (yes) => setSoft({ birthDefect: yes ? "Có" : "Không", ...(yes ? { birthDefectNote: text(soft.birthDefectNote) || defect.detail } : { birthDefectNote: null }) }),
            text(soft.birthDefectNote) || defect.detail,
            (v) => setSoft({ birthDefectNote: v }),
            copy({ en: "Describe", vi: "Mô tả" })
          )}
        </div>
      </Section>

      <Section id="fc-s2" num={2} title={copy({ en: "Family", vi: "Thông tin gia đình" })} hint={copy({ en: "One row per person, as on paper.", vi: "Mỗi người một dòng, đúng như bản giấy." })}>
        {(() => {
          const softText = (key: string, label: string, extra: { numeric?: boolean; year?: boolean; placeholder?: string } = {}) => (
            <Input
              label={label}
              inputMode={extra.numeric || extra.year ? "numeric" : undefined}
              placeholder={extra.placeholder}
              value={text(soft[key])}
              disabled={disabled}
              onChange={(e) => {
                const raw = e.target.value;
                // Years stay text while typed; save() turns them into numbers.
                if (!extra.numeric) return setSoft({ [key]: raw });
                const n = parseWholeNumber(raw);
                if (n !== undefined) setSoft({ [key]: n });
              }}
            />
          );
          const legacyAge = (key: string) =>
            text(soft[key]) ? (
              <span className="text-xs text-slate-500">
                {copy({ en: `Age on record: ${text(soft[key])} — prints if no year is given`, vi: `Đã lưu tuổi: ${text(soft[key])} — in ra nếu chưa có năm sinh` })}
              </span>
            ) : null;
          return (
            <>
              {([
                ["Bố", "father"],
                ["Mẹ", "mother"],
                ["Vợ / chồng", "spouse"]
              ] as const).map(([who, k]) => (
                <div key={k} className="grid items-start gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-[100px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
                  <span className="pt-8 text-sm font-bold text-slate-800">{who}</span>
                  {softText(`${k}Name`, "Họ tên")}
                  <div className="flex flex-col gap-1">
                    {softText(`${k}BirthYear`, "Năm sinh", { year: true, placeholder: "1968" })}
                    {text(soft[`${k}BirthYear`]) ? null : legacyAge(`${k}Age`)}
                  </div>
                  {softText(`${k}Occupation`, "Nghề nghiệp")}
                </div>
              ))}
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <Seg
                  label={copy({ en: "Relative in Taiwan", vi: "Người thân ở Đài Loan" })}
                  options={["Không", "Có"] as const}
                  value={soft.relativeInTaiwan === true ? "Có" : soft.relativeInTaiwan === false ? "Không" : null}
                  onChange={(v) =>
                    setSoft(v === "Có" ? { relativeInTaiwan: true } : { relativeInTaiwan: false, relativeInTaiwanRelation: null, relativeInTaiwanWorkplace: null })
                  }
                  disabled={disabled}
                />
                {soft.relativeInTaiwan === true ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {softText("relativeInTaiwanRelation", "Quan hệ")}
                    {softText("relativeInTaiwanWorkplace", "Nơi làm việc")}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-3">
                {softText("childrenCount", "Số con", { numeric: true })}
                {softText("sonsAges", "Con trai — tuổi", { placeholder: "5, 8" })}
                {softText("daughtersAges", "Con gái — tuổi", { placeholder: "3" })}
                {text(soft.childrenAges) && !text(soft.sonsAges) && !text(soft.daughtersAges) ? (
                  <span className="text-xs text-slate-500 sm:col-span-3">
                    {copy({ en: `Children's ages on record: ${text(soft.childrenAges)}`, vi: `Đã lưu tuổi các con: ${text(soft.childrenAges)}` })}
                  </span>
                ) : null}
              </div>
              <div className="grid gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-5">
                {softText("olderBrothers", "Anh trai", { numeric: true })}
                {softText("olderSisters", "Chị gái", { numeric: true })}
                {softText("youngerBrothers", "Em trai", { numeric: true })}
                {softText("youngerSisters", "Em gái", { numeric: true })}
                {softText("birthOrder", "Đứng thứ")}
              </div>
            </>
          );
        })()}
      </Section>

      <Section id="fc-s3" num={3} title={copy({ en: "Education & papers", vi: "Học vấn & giấy tờ" })}>
        <Seg label={copy({ en: "Highest education", vi: "Trình độ văn hóa cao nhất" })} options={EDUCATION_OPTIONS} value={readEducation(soft.education)} onChange={(v) => setSoft({ education: v })} disabled={disabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={copy({ en: "Field of study", vi: "Chuyên ngành" })} value={text(soft.educationMajor)} onChange={(e) => setSoft({ educationMajor: e.target.value })} disabled={disabled} />
          <Input label={copy({ en: "Study period", vi: "Thời gian" })} placeholder="2015 – 2018" value={text(soft.educationPeriod)} onChange={(e) => setSoft({ educationPeriod: e.target.value })} disabled={disabled} />
        </div>
        <Seg label={copy({ en: "Chinese", vi: "Tiếng Trung" })} options={CHINESE_OPTIONS} value={readChinese(soft.languages)} onChange={(v) => setSoft({ languages: writeChinese(soft.languages, v) })} disabled={disabled} />
        <Seg label={copy({ en: "English", vi: "Tiếng Anh" })} options={ENGLISH_OPTIONS} value={readEnglish(soft.languages)} onChange={(v) => setSoft({ languages: writeEnglish(soft.languages, v) })} disabled={disabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Seg label={copy({ en: "Vaccination", vi: "Tiêm chủng" })} options={VACCINATION_OPTIONS} value={(text(soft.vaccinationStatus) || null) as "have" | "in_progress" | "none" | null} onChange={(v) => setSoft({ vaccinationStatus: v })} disabled={disabled} />
          <Input type="date" label={copy({ en: "Vaccinated on", vi: "Thời gian tiêm" })} value={text(soft.vaccinationDate)} onChange={(e) => setSoft({ vaccinationDate: e.target.value })} disabled={disabled} />
        </div>
        <p className="text-xs text-slate-500">
          {copy({
            en: "Passport, criminal record and health check print from the Form & documents section.",
            vi: "Hộ chiếu, Tư pháp và Sức khỏe được in theo trạng thái ở mục Hồ sơ & Form."
          })}
        </p>
      </Section>

      <Section id="fc-s4" num={4} title={copy({ en: "Work experience", vi: "Kinh nghiệm làm việc / chuyên môn" })} hint={copy({ en: "One row per job — the export prints three more blank rows.", vi: "Mỗi công việc một dòng — bản xuất in thêm 3 dòng trống." })}>
        <div className="sm:max-w-md">
          <Input label={`${copy({ en: "Experience field", vi: "Lĩnh vực kinh nghiệm" })} *`} value={draft.experienceField} onChange={(e) => set("experienceField", e.target.value)} disabled={disabled} />
          <Unverified value={suggestions.experienceField} current={draft.experienceField} onUse={() => set("experienceField", suggestions.experienceField)} disabled={disabled} />
        </div>
        <ol className="space-y-3">
          {shownRows.map((row, i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {copy({ en: `Job ${i + 1}`, vi: `Công việc ${i + 1}` })}
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setWorkRows(shownRows.filter((_, j) => j !== i))}
                    className="min-h-[40px] rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  >
                    {copy({ en: "Remove", vi: "Xóa dòng" })}
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.5fr_0.8fr]">
                {(
                  [
                    ["occupation", "Nghề nghiệp"],
                    ["location", "Địa điểm / Quốc gia"],
                    ["company", "Công ty"],
                    ["description", "Mô tả công việc"],
                    ["period", "Thời gian"]
                  ] as const
                ).map(([col, label]) => (
                  <Input
                    key={col}
                    label={label}
                    value={row[col]}
                    disabled={disabled}
                    onChange={(e) => setWorkRows(shownRows.map((r, j) => (j === i ? { ...r, [col]: e.target.value } : r)))}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
        {canEdit ? (
          <Button variant="secondary" size="sm" onClick={() => setWorkRows([...shownRows, { ...EMPTY_WORK_ROW }])}>
            {copy({ en: "+ Add a job", vi: "+ Thêm dòng kinh nghiệm" })}
          </Button>
        ) : null}
      </Section>

      <Section id="fc-s5" num={5} title={copy({ en: "Wishes & previous contract", vi: "Nguyện vọng & tình trạng hợp đồng" })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input label={copy({ en: "Desired industry", vi: "Ngành mong muốn" })} value={draft.desiredIndustry} onChange={(e) => set("desiredIndustry", e.target.value)} disabled={disabled} />
            <Unverified value={suggestions.desiredIndustry} current={draft.desiredIndustry} onUse={() => set("desiredIndustry", suggestions.desiredIndustry)} disabled={disabled} />
          </div>
          <div>
            <Input label={copy({ en: "Desired salary / overtime", vi: "Mong muốn lương / tăng ca" })} value={draft.desiredSalary} onChange={(e) => set("desiredSalary", e.target.value)} disabled={disabled} />
            <Unverified value={suggestions.desiredSalary} current={draft.desiredSalary} onUse={() => set("desiredSalary", suggestions.desiredSalary)} disabled={disabled} />
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-600">{copy({ en: "Preferred regions", vi: "Khu vực ưu tiên" })}</span>
          <div role="group" aria-label={copy({ en: "Preferred regions", vi: "Khu vực ưu tiên" })} className="flex flex-wrap gap-1.5">
            {REGION_OPTIONS.map((r) => {
              const on = draft.preferredRegion.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => set("preferredRegion", on ? draft.preferredRegion.filter((x) => x !== r.value) : [...draft.preferredRegion, r.value])}
                  className={`min-h-[40px] rounded-lg border px-3 py-2 font-semibold ${on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700"} disabled:opacity-60`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
        <Seg label={copy({ en: "Been to Taiwan before", vi: "Đã từng đi Đài Loan" })} options={["Chưa", "Đã từng"] as const} value={beenToTaiwan} onChange={(v) => setSoft({ hasBeenToTaiwan: v === "Đã từng", ...(v === "Chưa" ? { contractCompletion: null, contractIncompleteReason: null } : {}) })} disabled={disabled} />
        {beenToTaiwan === "Đã từng" ? (
          <div className="space-y-3 border-l-4 border-indigo-100 pl-4">
            <Seg label={copy({ en: "Previous contract", vi: "Tình trạng hợp đồng" })} options={CONTRACT_OPTIONS} value={(text(soft.contractCompletion) || null) as "completed" | "not_completed" | null} onChange={(v) => setSoft({ contractCompletion: v, ...(v === "completed" ? { contractIncompleteReason: null } : {}) })} disabled={disabled} />
            {soft.contractCompletion === "not_completed" ? (
              <Input label={copy({ en: "Why the contract was not completed", vi: "Lý do không hết hợp đồng" })} value={text(soft.contractIncompleteReason)} onChange={(e) => setSoft({ contractIncompleteReason: e.target.value })} disabled={disabled} />
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section id="fc-s6" num={6} title={copy({ en: "Confirmation", vi: "Xác nhận thông tin" })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={copy({ en: "Contact channel", vi: "Phương thức liên hệ đăng ký" })} value={contactChannelLabel((lead as Lead & { leadSource?: string }).leadSource ?? lead.source)} disabled readOnly />
          <Input label={copy({ en: "Referrer", vi: "Người giới thiệu" })} value={text(soft.referrer)} placeholder={copy({ en: "Name / CTV code", vi: "Họ tên / mã CTV" })} onChange={(e) => setSoft({ referrer: e.target.value })} disabled={disabled} />
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {copy({
            en: "The commitment and the signature / fingerprint boxes are not filled on screen. They print blank for the worker to sign by hand; upload the signed copy to the lead afterwards.",
            vi: "Phần lời cam kết và ô ký tên, điểm chỉ không nhập trên màn hình. Bản xuất để người lao động ký tay; sau đó tải bản đã ký lên hồ sơ."
          })}
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-slate-600">
          {awaitingSignature
            ? copy({
                en: "Exported. When the worker has signed, upload the signed form and move the lead on — nothing waits on it.",
                vi: "Đã xuất form. Sau khi người lao động ký, tải bản đã ký lên và tự chuyển trạng thái hồ sơ — hệ thống không chặn bước tiếp theo."
              })
            : missing.length > 0
              ? copy({
                  en: `${missing.length} required field(s) not verified — they print blank.`,
                  vi: `Còn ${missing.length} trường bắt buộc chưa xác minh — bản xuất sẽ để trống những ô này.`
                })
              : dirty
                ? copy({ en: "You have unsaved changes.", vi: "Có thay đổi chưa lưu." })
                : copy({ en: "Ready to export.", vi: "Sẵn sàng xuất form." })}
        </span>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button variant="secondary" onClick={() => void save()} disabled={!dirty || saving}>
              {copy({ en: "Save", vi: "Lưu" })}
            </Button>
          ) : null}
          {canViewPii ? exportButton : null}
        </div>
      </div>
    </div>
  );
}
