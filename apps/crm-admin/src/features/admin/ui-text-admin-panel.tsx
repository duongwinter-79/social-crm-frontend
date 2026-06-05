import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  FieldGroup,
  InfoStrip,
  Input,
  Panel,
  Select,
  Toolbar,
  useImeSafeInput
} from "@social-crm/ui";
import {
  useAdminUiTextOverridesQuery,
  useResetUiTextOverrideMutation,
  useUpdateUiTextOverrideMutation,
  type AdminUiTextOverride
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import { useUiText } from "@/ui-text/ui-text-provider";
import { uiTextRegistry, uiTextScreens, uiTextSlots, type UiTextEntry } from "@/ui-text/ui-text.registry";

type CopyValue = { en: string; vi: string };

type UiTextEditorRow = {
  entry: UiTextEntry | null;
  override: AdminUiTextOverride | null;
  key: string;
};

const SCREEN_DETAILS: Record<string, { label: CopyValue; route: string; hint: CopyValue; previewRoute: string | null }> = {
  "app-shell": {
    label: { en: "CRM navigation shell", vi: "Khung điều hướng CRM" },
    route: "/dashboard, /leads, /journey...",
    hint: {
      en: "Sidebar labels and hints visible across the signed-in CRM.",
      vi: "Nhãn và mô tả ngắn trong thanh điều hướng sau khi đăng nhập."
    },
    previewRoute: "/journey"
  },
  "journey-board": {
    label: { en: "Journey board", vi: "Bảng hành trình ứng viên" },
    route: "/journey",
    hint: {
      en: "The candidate journey list and its row actions.",
      vi: "Danh sách hành trình ứng viên và các nút thao tác trên từng dòng."
    },
    previewRoute: "/journey"
  },
  "lead-workbench": {
    label: { en: "Lead workbench", vi: "Bàn xử lý ứng viên tiềm năng" },
    route: "/leads/:leadId",
    hint: {
      en: "The detail workspace for one lead.",
      vi: "Màn hình xử lý chi tiết của một ứng viên tiềm năng."
    },
    previewRoute: null
  },
  "candidate-dossier": {
    label: { en: "Candidate dossier", vi: "Hồ sơ ứng viên" },
    route: "/leads/:leadId/dossier",
    hint: {
      en: "The candidate profile and form-derived dossier page.",
      vi: "Trang hồ sơ ứng viên và dữ liệu lấy từ form đã xác minh."
    },
    previewRoute: null
  }
};

const SLOT_LABELS: Record<string, CopyValue> = {
  nav: { en: "Navigation", vi: "Điều hướng" },
  header: { en: "Page or panel title", vi: "Tiêu đề trang hoặc khối" },
  subtitle: { en: "Supporting text", vi: "Dòng mô tả phụ" },
  label: { en: "Field label", vi: "Nhãn trường" },
  button: { en: "Button", vi: "Nút thao tác" },
  helper: { en: "Hint or helper text", vi: "Gợi ý / hướng dẫn ngắn" },
  empty_state: { en: "Empty state", vi: "Thông báo khi chưa có dữ liệu" },
  warning: { en: "Warning", vi: "Cảnh báo" },
  toast: { en: "Toast message", vi: "Thông báo nổi" }
};

function TextArea(props: {
  label: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  // IME-safe so Vietnamese (and other composing IMEs) compose correctly instead
  // of duplicating base characters mid-composition.
  const ime = useImeSafeInput<HTMLTextAreaElement>(props.value, (event) =>
    props.onChange(event.target.value)
  );
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-600">
      <span className="font-medium text-slate-600">{props.label}</span>
      <textarea
        className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        value={ime.value}
        maxLength={props.maxLength}
        onChange={ime.onChange}
        onCompositionStart={ime.onCompositionStart}
        onCompositionEnd={ime.onCompositionEnd}
      />
    </label>
  );
}

function effectiveText(defaultValue: string, override: string) {
  return override.trim() || defaultValue;
}

function previewRouteForScreen(screen: string) {
  return SCREEN_DETAILS[screen]?.previewRoute ?? null;
}

function screenLabel(screen: string, copy: (value: CopyValue) => string) {
  const detail = SCREEN_DETAILS[screen];
  return detail ? `${copy(detail.label)} (${detail.route})` : screen;
}

function screenHint(screen: string, copy: (value: CopyValue) => string) {
  const detail = SCREEN_DETAILS[screen];
  return detail ? copy(detail.hint) : copy({ en: "Saved text key that is not in the current screen guide.", vi: "Mã nội dung đã lưu nhưng chưa có trong hướng dẫn màn hình hiện tại." });
}

function slotLabel(slot: string, copy: (value: CopyValue) => string) {
  return SLOT_LABELS[slot] ? copy(SLOT_LABELS[slot]) : slot;
}

export function UiTextAdminPanel() {
  const { copy } = useI18n();
  const runtimeText = useUiText();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: "", screen: "", slot: "", status: "" });
  const [selectedKey, setSelectedKey] = useState(uiTextRegistry[0]?.key ?? "");
  const [form, setForm] = useState({ enOverride: "", viOverride: "", isActive: true });

  const overridesQuery = useAdminUiTextOverridesQuery({});
  const updateOverride = useUpdateUiTextOverrideMutation();
  const resetOverride = useResetUiTextOverrideMutation();

  const savedMap = useMemo(() => {
    return new Map((overridesQuery.data?.data ?? []).map((row) => [row.key, row]));
  }, [overridesQuery.data?.data]);

  const rows = useMemo<UiTextEditorRow[]>(() => {
    const knownRows = uiTextRegistry.map((entry) => ({
      entry,
      override: savedMap.get(entry.key) ?? null,
      key: entry.key
    }));
    const unknownRows = (overridesQuery.data?.data ?? [])
      .filter((row) => !uiTextRegistry.some((entry) => entry.key === row.key))
      .map((override) => ({ entry: null, override, key: override.key }));
    const search = filters.search.trim().toLowerCase();
    return [...knownRows, ...unknownRows].filter((row) => {
      const entry = row.entry;
      const override = row.override;
      if (filters.screen && entry?.screen !== filters.screen) return false;
      if (filters.slot && entry?.slot !== filters.slot) return false;
      if (filters.status === "overridden" && !override?.hasOverride) return false;
      if (filters.status === "active" && !override?.isActive) return false;
      if (filters.status === "inactive" && override?.isActive !== false) return false;
      if (!search) return true;
      return [
        row.key,
        entry?.screen,
        entry?.slot,
        entry?.description,
        entry?.defaultText.en,
        entry?.defaultText.vi,
        override?.enOverride,
        override?.viOverride
      ].some((value) => String(value ?? "").toLowerCase().includes(search));
    });
  }, [filters, overridesQuery.data?.data, savedMap]);

  const selectedRow = rows.find((row) => row.key === selectedKey) ?? rows[0] ?? null;
  const selectedEntry = selectedRow?.entry ?? null;
  const selectedOverride = selectedRow?.override ?? null;
  const selectedPreview = selectedEntry ? runtimeText.previewOverrides[selectedEntry.key] : null;
  const selectedPreviewRoute = selectedEntry ? previewRouteForScreen(selectedEntry.screen) : null;

  useEffect(() => {
    if (!selectedRow) return;
    setSelectedKey(selectedRow.key);
    setForm({
      enOverride: selectedOverride?.enOverride ?? "",
      viOverride: selectedOverride?.viOverride ?? "",
      isActive: selectedOverride?.isActive ?? true
    });
  }, [selectedOverride?.enOverride, selectedOverride?.isActive, selectedOverride?.viOverride, selectedRow]);

  const saveDisabled =
    !selectedEntry ||
    updateOverride.isPending ||
    (form.enOverride.trim() === (selectedOverride?.enOverride ?? "") &&
      form.viOverride.trim() === (selectedOverride?.viOverride ?? "") &&
      form.isActive === (selectedOverride?.isActive ?? true));

  return (
    <Panel
      title={copy({ en: "UI text overrides", vi: "Tùy chỉnh chữ hiển thị" })}
      subtitle={copy({
        en: "Change approved interface text, preview it on the CRM screen, then save when the wording is ready.",
        vi: "Chỉnh các câu chữ đã được cho phép, xem thử ngay trên màn hình CRM, rồi lưu khi nội dung đã ổn."
      })}
    >
      <div className="space-y-4">
        <InfoStrip>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-800">
              {copy({ en: "This does not edit CRM data.", vi: "Tính năng này không chỉnh dữ liệu CRM." })}
            </span>
            <span>
            {copy({
              en: "Code owns the editable key list and default copy. Saved overrides only replace the visible text.",
              vi: "Hệ thống chỉ cho sửa các câu chữ có trong danh sách an toàn. Nội dung đã lưu chỉ thay chữ hiển thị, không đổi quy trình hay quyền truy cập."
            })}
            </span>
          </div>
        </InfoStrip>

        <Toolbar compact>
          <FieldGroup columns={4}>
            <Input
              label={copy({ en: "Search text", vi: "Tìm nội dung" })}
              value={filters.search}
              onChange={(event) => setFilters((state) => ({ ...state, search: event.target.value }))}
            />
            <Select
              label={copy({ en: "Where it appears", vi: "Nơi hiển thị" })}
              value={filters.screen}
              onChange={(event) => setFilters((state) => ({ ...state, screen: event.target.value }))}
            >
              <option value="">{copy({ en: "All screens", vi: "Tất cả màn hình" })}</option>
              {uiTextScreens.map((screen) => (
                <option key={screen} value={screen}>{screenLabel(screen, copy)}</option>
              ))}
            </Select>
            <Select
              label={copy({ en: "Text role", vi: "Loại nội dung" })}
              value={filters.slot}
              onChange={(event) => setFilters((state) => ({ ...state, slot: event.target.value }))}
            >
              <option value="">{copy({ en: "All text roles", vi: "Tất cả loại nội dung" })}</option>
              {uiTextSlots.map((slot) => (
                <option key={slot} value={slot}>{slotLabel(slot, copy)}</option>
              ))}
            </Select>
            <Select
              label={copy({ en: "Override status", vi: "Trạng thái chỉnh sửa" })}
              value={filters.status}
              onChange={(event) => setFilters((state) => ({ ...state, status: event.target.value }))}
            >
              <option value="">{copy({ en: "All text", vi: "Tất cả nội dung" })}</option>
              <option value="overridden">{copy({ en: "Has saved override", vi: "Đã có nội dung thay thế" })}</option>
              <option value="active">{copy({ en: "Active", vi: "Đang áp dụng" })}</option>
              <option value="inactive">{copy({ en: "Inactive", vi: "Tạm tắt" })}</option>
            </Select>
          </FieldGroup>
        </Toolbar>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
          <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {rows.length ? rows.map((row) => {
              const active = row.key === selectedRow?.key;
              return (
                <button
                  key={row.key}
                  type="button"
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${active ? "border-indigo-500 bg-indigo-50/70" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
                  onClick={() => setSelectedKey(row.key)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{row.entry?.defaultText.en ?? row.key}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">{row.entry ? screenLabel(row.entry.screen, copy) : row.key}</div>
                      {row.entry ? (
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {screenHint(row.entry.screen, copy)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {row.entry ? <Badge tone="neutral">{slotLabel(row.entry.slot, copy)}</Badge> : <Badge tone="warning">{copy({ en: "Unknown", vi: "Không rõ" })}</Badge>}
                      {runtimeText.previewOverrides[row.key] ? <Badge tone="warning">{copy({ en: "Preview", vi: "Xem thử" })}</Badge> : null}
                      {row.override?.hasOverride ? <Badge tone={row.override.isActive ? "accent" : "neutral"}>{row.override.isActive ? copy({ en: "Saved", vi: "Đã lưu" }) : copy({ en: "Inactive", vi: "Tạm tắt" })}</Badge> : null}
                    </div>
                  </div>
                </button>
              );
            }) : (
              <EmptyState
                title={copy({ en: "No matching text", vi: "Không tìm thấy nội dung phù hợp" })}
                description={copy({ en: "Adjust the filters to find editable UI copy.", vi: "Thử đổi bộ lọc hoặc từ khóa để tìm câu chữ cần chỉnh." })}
              />
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {selectedRow ? (
              selectedEntry ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{screenLabel(selectedEntry.screen, copy)}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{screenHint(selectedEntry.screen, copy)}</div>
                  </div>
                  <DescriptionList
                    items={[
                      { label: copy({ en: "Text ID", vi: "Mã nội dung" }), value: selectedEntry.key },
                      { label: copy({ en: "Route", vi: "Đường dẫn" }), value: SCREEN_DETAILS[selectedEntry.screen]?.route ?? selectedEntry.screen },
                      { label: copy({ en: "Text role", vi: "Loại nội dung" }), value: slotLabel(selectedEntry.slot, copy) },
                      { label: copy({ en: "Use case", vi: "Dùng cho" }), value: selectedEntry.description ?? "-" }
                    ]}
                  />
                  <DescriptionList
                    items={[
                      { label: copy({ en: "Default English", vi: "Tiếng Anh mặc định" }), value: selectedEntry.defaultText.en },
                      { label: copy({ en: "Default Vietnamese", vi: "Tiếng Việt mặc định" }), value: selectedEntry.defaultText.vi }
                    ]}
                  />
                  <TextArea
                    label={copy({ en: "Replacement English text", vi: "Nội dung tiếng Anh thay thế" })}
                    value={form.enOverride}
                    maxLength={selectedEntry.maxLength}
                    onChange={(value) => setForm((state) => ({ ...state, enOverride: value }))}
                  />
                  <TextArea
                    label={copy({ en: "Replacement Vietnamese text", vi: "Nội dung tiếng Việt thay thế" })}
                    value={form.viOverride}
                    maxLength={selectedEntry.maxLength}
                    onChange={(value) => setForm((state) => ({ ...state, viOverride: value }))}
                  />
                  <Select
                    label={copy({ en: "Apply saved override", vi: "Áp dụng nội dung đã lưu" })}
                    value={form.isActive ? "true" : "false"}
                    onChange={(event) => setForm((state) => ({ ...state, isActive: event.target.value === "true" }))}
                  >
                    <option value="true">{copy({ en: "Apply after saving", vi: "Áp dụng sau khi lưu" })}</option>
                    <option value="false">{copy({ en: "Save but keep inactive", vi: "Lưu nhưng tạm chưa áp dụng" })}</option>
                  </Select>
                  <DescriptionList
                    items={[
                      { label: copy({ en: "Preview English", vi: "Xem thử tiếng Anh" }), value: effectiveText(selectedEntry.defaultText.en, form.enOverride) },
                      { label: copy({ en: "Preview Vietnamese", vi: "Xem thử tiếng Việt" }), value: effectiveText(selectedEntry.defaultText.vi, form.viOverride) }
                    ]}
                  />
                  <InfoStrip className={selectedPreview ? "border-amber-200 bg-amber-50 text-amber-900" : undefined}>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={selectedPreview ? "warning" : "neutral"}>
                          {selectedPreview ? copy({ en: "Preview active", vi: "Đang xem thử" }) : copy({ en: "No preview", vi: "Chưa bật xem thử" })}
                        </Badge>
                        <span>
                          {copy({
                            en: "Preview applies this draft across the CRM shell before it is saved.",
                            vi: "Chế độ xem thử áp dụng bản nháp này lên giao diện CRM trước khi lưu."
                          })}
                        </span>
                      </div>
                      {selectedPreviewRoute ? (
                        <div className="text-xs text-slate-600">
                          {copy({ en: "Affected screen", vi: "Màn hình áp dụng" })}: <span className="font-semibold">{screenLabel(selectedEntry.screen, copy)}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600">
                          {copy({
                            en: "Open a matching lead or dossier page manually to inspect this text in context.",
                            vi: "Hãy mở thủ công một trang lead hoặc hồ sơ phù hợp để xem câu chữ trong đúng ngữ cảnh."
                          })}
                        </div>
                      )}
                    </div>
                  </InfoStrip>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        runtimeText.setPreviewOverride({
                          key: selectedEntry.key,
                          enOverride: form.enOverride.trim() || null,
                          viOverride: form.viOverride.trim() || null,
                          isActive: form.isActive
                        })
                      }
                    >
                      {copy({ en: "Preview draft", vi: "Xem thử bản nháp" })}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (selectedPreviewRoute) navigate(selectedPreviewRoute);
                      }}
                      disabled={!selectedPreviewRoute}
                    >
                      {copy({ en: "Open affected screen", vi: "Mở màn hình áp dụng" })}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => runtimeText.clearPreviewOverride(selectedEntry.key)}
                      disabled={!selectedPreview}
                    >
                      {copy({ en: "Clear preview", vi: "Tắt xem thử" })}
                    </Button>
                    <Button
                      onClick={() =>
                        updateOverride.mutate(
                          {
                            key: selectedEntry.key,
                            patch: {
                              enOverride: form.enOverride,
                              viOverride: form.viOverride,
                              isActive: form.isActive
                            }
                          },
                          {
                            onSuccess: () => {
                              runtimeText.clearPreviewOverride(selectedEntry.key);
                              void runtimeText.reload();
                            }
                          }
                        )
                      }
                      disabled={saveDisabled}
                    >
                      {updateOverride.isPending ? copy({ en: "Saving...", vi: "Đang lưu..." }) : copy({ en: "Save override", vi: "Lưu nội dung thay thế" })}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        resetOverride.mutate(selectedEntry.key, {
                          onSuccess: () => {
                            runtimeText.clearPreviewOverride(selectedEntry.key);
                            void runtimeText.reload();
                          }
                        })
                      }
                      disabled={resetOverride.isPending || !selectedOverride}
                    >
                      {resetOverride.isPending ? copy({ en: "Resetting...", vi: "Đang đặt lại..." }) : copy({ en: "Reset to default", vi: "Đặt lại mặc định" })}
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title={copy({ en: "Unknown saved override", vi: "Nội dung đã lưu không còn trong danh sách" })}
                  description={copy({
                    en: "This saved key is no longer in the code registry. Reset it after confirming it is obsolete.",
                    vi: "Mã nội dung này không còn trong danh sách an toàn của phiên bản hiện tại. Chỉ đặt lại sau khi xác nhận là nội dung cũ."
                  })}
                />
              )
            ) : (
              <EmptyState
                title={copy({ en: "No text selected", vi: "Chưa chọn nội dung" })}
                description={copy({ en: "Select an editable text item to review defaults and overrides.", vi: "Chọn một dòng nội dung để xem câu mặc định và bản thay thế." })}
              />
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
