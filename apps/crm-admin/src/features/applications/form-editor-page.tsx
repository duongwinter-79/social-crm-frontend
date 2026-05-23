import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  DescriptionList,
  FieldGroup,
  Panel,
  SectionHeader,
} from "@social-crm/ui";
import {
  useLeadDetailQuery,
  useLeadQualificationQuery,
  useLeadAiSuggestionsQuery,
  useUpdateLeadMutation,
  useUpdateLeadQualificationMutation,
} from "@social-crm/api";
import type { AiSuggestion } from "@social-crm/api";
import { useI18n } from "@/i18n";

// ─── Types ─────────────────────────────────────────────────────────────────

interface FormState {
  // Lead entity (Section I — identity)
  fullName: string;
  phone: string;
  // Qualification fields (Section I — body)
  gender: string;
  birthYear: string;
  height: string;   // heightCm → qualification `height`
  weight: string;   // weightKg → qualification `weight`
  // Section II — experience & preference
  experienceField: string;
  experienceDetails: string;
  desiredIndustry: string;
  preferredRegion: string; // comma-joined for display; split on save
  desiredSalary: string;
  // Section III — notes
  note: string;
}

const EMPTY: FormState = {
  fullName: "", phone: "", gender: "", birthYear: "",
  height: "", weight: "", experienceField: "", experienceDetails: "",
  desiredIndustry: "", preferredRegion: "", desiredSalary: "", note: "",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function indexSuggestions(suggestions: AiSuggestion[]): Record<string, AiSuggestion> {
  const idx: Record<string, AiSuggestion> = {};
  for (const s of suggestions) idx[s.fieldName] = s;
  return idx;
}

function provBadge(
  fieldKey: string,
  verifiedKeys: string[],
  suggestions: Record<string, AiSuggestion>,
  copy: (t: { en: string; vi: string }) => string,
) {
  if (verifiedKeys.includes(fieldKey)) {
    return <Badge tone="success">{copy({ en: "Verified", vi: "Đã xác nhận" })}</Badge>;
  }
  if (suggestions[fieldKey]) {
    return <Badge tone="accent">{copy({ en: "AI suggested", vi: "AI đề xuất" })}</Badge>;
  }
  return null;
}

// ─── Field components ──────────────────────────────────────────────────────

function FormField({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {badge}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400";

// ─── Page ──────────────────────────────────────────────────────────────────

export function FormEditorPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { copy } = useI18n();

  const leadQuery = useLeadDetailQuery(leadId);
  const qualQuery = useLeadQualificationQuery(leadId);
  const suggestionsQuery = useLeadAiSuggestionsQuery(leadId);

  const updateLead = useUpdateLeadMutation();
  const updateQual = useUpdateLeadQualificationMutation(leadId ?? "");

  const [form, setForm] = useState<FormState>(EMPTY);
  const [initialized, setInitialized] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Pre-fill from merged data once loaded
  useEffect(() => {
    if (initialized) return;
    const lead = leadQuery.data;
    const merged = qualQuery.data?.mergedData ?? {};
    if (!lead && !qualQuery.data) return;

    const get = (key: string) => {
      const v = merged[key];
      return v !== null && v !== undefined ? String(v) : "";
    };

    setForm({
      fullName: lead?.fullName ?? lead?.displayName ?? "",
      phone: lead?.phone ?? "",
      gender: get("gender"),
      birthYear: get("birthYear") || get("age"),
      height: get("height") || get("heightCm"),
      weight: get("weight") || get("weightKg"),
      experienceField: get("experienceField"),
      experienceDetails: get("experienceDetails"),
      desiredIndustry: get("desiredIndustry"),
      preferredRegion: Array.isArray(merged["preferredRegion"])
        ? (merged["preferredRegion"] as string[]).join(", ")
        : get("preferredRegion"),
      desiredSalary: get("desiredSalary"),
      note: (qualQuery.data?.mergedData?.["_qualificationMeta"] as any)?.note ?? "",
    });
    setInitialized(true);
  }, [leadQuery.data, qualQuery.data, initialized]);

  const verifiedKeys: string[] = (leadQuery.data as any)?.verifiedKeys ?? [];
  const suggestions = indexSuggestions(suggestionsQuery.data ?? []);

  const isLoading = leadQuery.isLoading || qualQuery.isLoading;
  const isSaving = updateLead.isPending || updateQual.isPending;

  function set(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setSaveError("");
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };
  }

  async function handleSave() {
    if (!leadId) return;
    setSaveError("");

    const lead = leadQuery.data;
    const nameChanged = form.fullName !== (lead?.fullName ?? lead?.displayName ?? "");
    const phoneChanged = form.phone !== (lead?.phone ?? "");

    try {
      // 1. Update lead entity fields if changed
      if (nameChanged || phoneChanged) {
        const patch: Record<string, unknown> = {};
        if (nameChanged) patch.fullName = form.fullName || null;
        if (phoneChanged) patch.phone = form.phone || null;
        await updateLead.mutateAsync({ id: leadId, patch });
      }

      // 2. Update qualification / verified profile fields
      const qualPatch: Record<string, unknown> = {};
      if (form.gender) qualPatch.gender = form.gender;
      if (form.birthYear) qualPatch.meta = { ...(qualPatch.meta as object ?? {}), birthYear: Number(form.birthYear) || form.birthYear };
      if (form.height) qualPatch.height = Number(form.height) || undefined;
      if (form.weight) qualPatch.weight = Number(form.weight) || undefined;
      if (form.experienceField) qualPatch.experienceField = form.experienceField;
      if (form.experienceDetails) qualPatch.experienceDetails = form.experienceDetails;
      if (form.desiredIndustry) qualPatch.desiredIndustry = form.desiredIndustry;
      if (form.preferredRegion) {
        qualPatch.preferredRegion = form.preferredRegion
          .split(/[,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (form.desiredSalary) qualPatch.desiredSalary = form.desiredSalary;
      if (form.note) qualPatch.note = form.note;

      if (Object.keys(qualPatch).length > 0) {
        await updateQual.mutateAsync(qualPatch);
      }

      navigate("/applications");
    } catch (err) {
      setSaveError((err as Error)?.message ?? copy({ en: "Save failed.", vi: "Lưu thất bại." }));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        {copy({ en: "Loading form…", vi: "Đang tải hồ sơ…" })}
      </div>
    );
  }

  if (!leadQuery.data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-8 text-sm text-rose-700">
        {copy({ en: `Lead ${leadId} not found.`, vi: `Không tìm thấy ứng viên ${leadId}.` })}
      </div>
    );
  }

  const lead = leadQuery.data;
  const displayName = lead.fullName || lead.displayName || lead.phone || leadId;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Application file editor", vi: "Chỉnh sửa hồ sơ ứng tuyển" })}
        title={displayName ?? ""}
        description={copy({
          en: "Edit and confirm the fields from this candidate's application form. Saved values are marked as operator-verified and used by the matching engine.",
          vi: "Chỉnh sửa và xác nhận các trường từ hồ sơ ứng tuyển. Giá trị đã lưu được đánh dấu là đã xác nhận bởi nhân sự và dùng cho ghép đơn."
        })}
        action={
          <Button variant="ghost" onClick={() => navigate("/applications")}>
            ← {copy({ en: "Back to applications", vi: "Quay lại danh sách hồ sơ" })}
          </Button>
        }
      />

      {/* Read-only context strip */}
      <Panel>
        <DescriptionList
          columns={3}
          items={[
            { label: copy({ en: "Lead ID", vi: "Mã ứng viên" }), value: <span className="font-mono text-xs">{leadId}</span> },
            { label: copy({ en: "Pipeline status", vi: "Trạng thái hồ sơ" }), value: lead.status ?? "—" },
            { label: copy({ en: "Phone (current)", vi: "SĐT (hiện tại)" }), value: lead.phone ?? "—" },
          ]}
        />
      </Panel>

      <form
        onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
        className="space-y-6"
      >
        {/* Section I — Personal info */}
        <Panel
          title={copy({ en: "I. Personal information", vi: "I. Thông tin cá nhân" })}
          subtitle={copy({ en: "Identity fields from the top of the form.", vi: "Thông tin cá nhân từ đầu hồ sơ." })}
        >
          <FieldGroup columns={2}>
            <FormField
              label={copy({ en: "Full name", vi: "Họ và tên" })}
              badge={provBadge("fullName", verifiedKeys, suggestions, copy)}
            >
              <input
                className={inputCls}
                value={form.fullName}
                onChange={set("fullName")}
                placeholder={copy({ en: "Nguyễn Văn A", vi: "Nguyễn Văn A" })}
              />
            </FormField>

            <FormField
              label={copy({ en: "Phone number", vi: "Số điện thoại" })}
              badge={provBadge("phone", verifiedKeys, suggestions, copy)}
            >
              <input
                className={inputCls}
                value={form.phone}
                onChange={set("phone")}
                placeholder="09xxxxxxxx"
              />
            </FormField>

            <FormField
              label={copy({ en: "Gender", vi: "Giới tính" })}
              badge={provBadge("gender", verifiedKeys, suggestions, copy)}
            >
              <select className={inputCls} value={form.gender} onChange={set("gender")}>
                <option value="">{copy({ en: "— Select —", vi: "— Chọn —" })}</option>
                <option value="male">{copy({ en: "Male", vi: "Nam" })}</option>
                <option value="female">{copy({ en: "Female", vi: "Nữ" })}</option>
                <option value="other">{copy({ en: "Other", vi: "Khác" })}</option>
              </select>
            </FormField>

            <FormField
              label={copy({ en: "Birth year", vi: "Năm sinh" })}
              badge={provBadge("birthYear", verifiedKeys, suggestions, copy)}
            >
              <input
                className={inputCls}
                type="number"
                min={1950}
                max={new Date().getFullYear() - 16}
                value={form.birthYear}
                onChange={set("birthYear")}
                placeholder="1995"
              />
            </FormField>

            <FormField
              label={copy({ en: "Height (cm)", vi: "Chiều cao (cm)" })}
              badge={provBadge("heightCm", verifiedKeys, suggestions, copy)}
            >
              <input
                className={inputCls}
                type="number"
                min={100}
                max={220}
                value={form.height}
                onChange={set("height")}
                placeholder="165"
              />
            </FormField>

            <FormField
              label={copy({ en: "Weight (kg)", vi: "Cân nặng (kg)" })}
              badge={provBadge("weightKg", verifiedKeys, suggestions, copy)}
            >
              <input
                className={inputCls}
                type="number"
                min={30}
                max={200}
                value={form.weight}
                onChange={set("weight")}
                placeholder="60"
              />
            </FormField>
          </FieldGroup>
        </Panel>

        {/* Section II — Experience & preference */}
        <Panel
          title={copy({ en: "II. Experience & preference", vi: "II. Kinh nghiệm và nguyện vọng" })}
          subtitle={copy({ en: "Work history and desired placement fields.", vi: "Kinh nghiệm làm việc và nguyện vọng đi làm." })}
        >
          <FieldGroup columns={2}>
            <FormField
              label={copy({ en: "Experience field", vi: "Lĩnh vực kinh nghiệm" })}
              badge={provBadge("experienceField", verifiedKeys, suggestions, copy)}
            >
              <input
                className={inputCls}
                value={form.experienceField}
                onChange={set("experienceField")}
                placeholder={copy({ en: "e.g. Manufacturing, Care work", vi: "VD: Sản xuất, Chăm sóc người cao tuổi" })}
              />
            </FormField>

            <FormField
              label={copy({ en: "Desired industry", vi: "Ngành nghề mong muốn" })}
              badge={provBadge("desiredIndustry", verifiedKeys, suggestions, copy)}
            >
              <input
                className={inputCls}
                value={form.desiredIndustry}
                onChange={set("desiredIndustry")}
                placeholder={copy({ en: "e.g. Electronics, Food processing", vi: "VD: Điện tử, Chế biến thực phẩm" })}
              />
            </FormField>

            <FormField
              label={copy({ en: "Preferred regions (comma-separated)", vi: "Khu vực mong muốn (phân cách bằng dấu phẩy)" })}
              badge={provBadge("preferredRegions", verifiedKeys, suggestions, copy)}
            >
              <input
                className={inputCls}
                value={form.preferredRegion}
                onChange={set("preferredRegion")}
                placeholder={copy({ en: "e.g. Taiwan, Japan", vi: "VD: Đài Loan, Nhật Bản" })}
              />
            </FormField>

            <FormField
              label={copy({ en: "Desired salary", vi: "Mức lương mong muốn" })}
              badge={provBadge("desiredSalary", verifiedKeys, suggestions, copy)}
            >
              <input
                className={inputCls}
                value={form.desiredSalary}
                onChange={set("desiredSalary")}
                placeholder={copy({ en: "e.g. 25,000 TWD/month", vi: "VD: 25.000 NTD/tháng" })}
              />
            </FormField>
          </FieldGroup>

          <div className="mt-4">
            <FormField
              label={copy({ en: "Experience details", vi: "Mô tả kinh nghiệm" })}
              badge={provBadge("experienceDetails", verifiedKeys, suggestions, copy)}
            >
              <textarea
                className={`${inputCls} resize-y`}
                rows={3}
                value={form.experienceDetails}
                onChange={set("experienceDetails")}
                placeholder={copy({ en: "Brief description of relevant work experience…", vi: "Mô tả ngắn gọn kinh nghiệm làm việc liên quan…" })}
              />
            </FormField>
          </div>
        </Panel>

        {/* Section III — Notes */}
        <Panel
          title={copy({ en: "III. Notes", vi: "III. Ghi chú" })}
        >
          <FormField label={copy({ en: "Staff notes", vi: "Ghi chú nhân sự" })}>
            <textarea
              className={`${inputCls} resize-y`}
              rows={3}
              value={form.note}
              onChange={set("note")}
              placeholder={copy({ en: "Any additional observations for this candidate…", vi: "Các ghi chú bổ sung về ứng viên…" })}
            />
          </FormField>
        </Panel>

        {/* Save bar */}
        {saveError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {saveError}
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs text-slate-500">
            {copy({
              en: "Saved values are marked as operator-verified and override AI suggestions in the matching engine.",
              vi: "Giá trị đã lưu được đánh dấu là nhân sự xác nhận và ghi đè đề xuất AI trong ghép đơn."
            })}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate("/applications")}>
              {copy({ en: "Cancel", vi: "Huỷ" })}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? copy({ en: "Saving…", vi: "Đang lưu…" })
                : copy({ en: "Save & verify", vi: "Lưu và xác nhận" })}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
