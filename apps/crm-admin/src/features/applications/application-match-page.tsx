import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Panel, SectionHeader } from "@social-crm/ui";
import { useFormPreviewQuery, useApplyFormToLeadMutation } from "@social-crm/api";
import { useI18n } from "@/i18n";

/** Human-readable label for each extractable field */
const FIELD_LABELS: Record<string, { en: string; vi: string }> = {
  name:            { en: "Full name",         vi: "Họ và tên" },
  phone:           { en: "Phone",             vi: "Số điện thoại" },
  gender:          { en: "Gender",            vi: "Giới tính" },
  birthYear:       { en: "Birth year",        vi: "Năm sinh" },
  heightCm:        { en: "Height (cm)",       vi: "Chiều cao (cm)" },
  weightKg:        { en: "Weight (kg)",       vi: "Cân nặng (kg)" },
  experienceField: { en: "Experience field",  vi: "Ngành nghề kinh nghiệm" },
  preferredRegions:{ en: "Preferred regions", vi: "Khu vực mong muốn" },
  desiredIndustry: { en: "Desired industry",  vi: "Ngành nghề mong muốn" },
  desiredSalary:   { en: "Desired salary",    vi: "Mức lương mong muốn" },
};

const FIELD_ORDER = Object.keys(FIELD_LABELS);

function displayValue(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  return String(value);
}

export function ApplicationMatchPage() {
  const { copy } = useI18n();
  const navigate = useNavigate();
  const { documentId } = useParams<{ documentId: string }>();

  const preview = useFormPreviewQuery(documentId ?? null);
  const applyMutation = useApplyFormToLeadMutation();

  // Set of field keys the operator wants to apply
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  function toggleField(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    if (!preview.data) return;
    const allWithValue = FIELD_ORDER.filter(
      (k) => preview.data!.extracted[k] !== null && preview.data!.extracted[k] !== undefined,
    );
    setSelected(new Set(allWithValue));
  }

  function selectNone() {
    setSelected(new Set());
  }

  function handleApply() {
    if (!documentId || selected.size === 0 || !preview.data) return;
    const fields: Record<string, any> = {};
    for (const key of selected) {
      fields[key] = preview.data.extracted[key];
    }
    applyMutation.mutate({ documentId, fields }, {
      onSuccess: () => setDone(true),
    });
  }

  const extracted = preview.data?.extracted ?? {};
  const current = preview.data?.current ?? {};

  // Fields where extracted value differs from current
  const hasChange = (key: string) => {
    const e = extracted[key];
    const c = current[key];
    if (e === null || e === undefined) return false;
    return JSON.stringify(e) !== JSON.stringify(c);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Applications", vi: "Hồ sơ ứng tuyển" })}
        title={copy({ en: "Match form data to lead", vi: "Đối chiếu dữ liệu hồ sơ với ứng viên" })}
        description={copy({
          en: "Review the data extracted from the uploaded form and select which fields to apply to the lead record.",
          vi: "Xem dữ liệu trích xuất từ hồ sơ đã tải lên và chọn các trường muốn cập nhật vào hồ sơ ứng viên.",
        })}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          ← {copy({ en: "Back", vi: "Quay lại" })}
        </button>
      </div>

      {preview.isLoading ? (
        <Panel title={copy({ en: "Extracting form data…", vi: "Đang trích xuất dữ liệu hồ sơ…" })}>
          <div className="py-8 text-center text-sm text-slate-500">
            {copy({ en: "Reading the uploaded file and extracting structured fields. This may take a few seconds.", vi: "Đang đọc file và trích xuất các trường dữ liệu. Quá trình này có thể mất vài giây." })}
          </div>
        </Panel>
      ) : preview.isError ? (
        <Panel title={copy({ en: "Extraction failed", vi: "Trích xuất thất bại" })}>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {copy({ en: "Could not extract data from the form file. Make sure the file is a valid PDF, DOC, or DOCX.", vi: "Không thể trích xuất dữ liệu từ file hồ sơ. Hãy đảm bảo file là PDF, DOC hoặc DOCX hợp lệ." })}
          </div>
        </Panel>
      ) : done ? (
        <Panel title={copy({ en: "Applied successfully", vi: "Cập nhật thành công" })}>
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {copy({ en: "The selected fields have been applied to the lead record.", vi: "Các trường đã chọn đã được cập nhật vào hồ sơ ứng viên." })}
            </div>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              {copy({ en: "← Back to application", vi: "← Quay lại hồ sơ" })}
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel
          title={copy({ en: "Field comparison", vi: "So sánh các trường dữ liệu" })}
          subtitle={copy({
            en: "Check the fields you want to copy from the form into the lead record. Fields already matching are greyed out.",
            vi: "Chọn các trường muốn sao chép từ hồ sơ vào ứng viên. Các trường đã khớp sẽ bị mờ.",
          })}
        >
          {/* Select all / none */}
          <div className="mb-4 flex items-center gap-3">
            <button type="button" onClick={selectAll} className="text-sm text-indigo-600 hover:underline">
              {copy({ en: "Select all with values", vi: "Chọn tất cả có giá trị" })}
            </button>
            <span className="text-slate-300">|</span>
            <button type="button" onClick={selectNone} className="text-sm text-slate-500 hover:underline">
              {copy({ en: "Deselect all", vi: "Bỏ chọn tất cả" })}
            </button>
          </div>

          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-3" />
                  <th className="px-3 py-3 text-left">{copy({ en: "Field", vi: "Trường" })}</th>
                  <th className="px-3 py-3 text-left">{copy({ en: "From form", vi: "Từ hồ sơ" })}</th>
                  <th className="px-3 py-3 text-left">{copy({ en: "Current in database", vi: "Hiện tại trong CSDL" })}</th>
                </tr>
              </thead>
              <tbody>
                {FIELD_ORDER.map((key) => {
                  const formVal = extracted[key];
                  const currVal = current[key];
                  const hasFormValue = formVal !== null && formVal !== undefined;
                  const changed = hasChange(key);
                  const isSelected = selected.has(key);

                  return (
                    <tr
                      key={key}
                      className={`border-t border-slate-100 transition-colors ${
                        !hasFormValue ? "opacity-40" : changed ? "hover:bg-indigo-50/40" : "opacity-60"
                      } ${isSelected ? "bg-indigo-50/60" : ""}`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!hasFormValue}
                          onChange={() => toggleField(key)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-700">
                        {copy(FIELD_LABELS[key])}
                      </td>
                      <td className="px-3 py-3">
                        {hasFormValue ? (
                          <span className={changed ? "font-medium text-indigo-700" : "text-slate-600"}>
                            {displayValue(formVal)}
                          </span>
                        ) : (
                          <span className="text-slate-400">{copy({ en: "Not found in form", vi: "Không tìm thấy trong hồ sơ" })}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {displayValue(currVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button
              onClick={handleApply}
              disabled={selected.size === 0 || applyMutation.isPending}
            >
              {applyMutation.isPending
                ? copy({ en: "Applying…", vi: "Đang cập nhật…" })
                : copy({ en: `Apply ${selected.size} field${selected.size !== 1 ? "s" : ""} to lead`, vi: `Cập nhật ${selected.size} trường vào hồ sơ ứng viên` })}
            </Button>
            <span className="text-xs text-slate-400">
              {copy({ en: "Only checked fields will be written. Existing values will be overwritten.", vi: "Chỉ các trường được chọn sẽ được ghi. Giá trị hiện tại sẽ bị ghi đè." })}
            </span>
          </div>

          {applyMutation.isError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {copy({ en: "Failed to apply fields. Please try again.", vi: "Cập nhật thất bại. Vui lòng thử lại." })}
            </div>
          ) : null}
        </Panel>
      )}
    </div>
  );
}
