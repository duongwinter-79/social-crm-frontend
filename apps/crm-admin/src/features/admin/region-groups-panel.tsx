import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  FieldGroup,
  InfoStrip,
  Input,
  Panel,
  Toolbar
} from "@social-crm/ui";
import {
  useCreateRegionGroupMutation,
  useDeleteRegionGroupMutation,
  useRegionGroupProvincesQuery,
  useRegionGroupsQuery,
  useUpdateRegionGroupMutation,
  type RegionGroup,
  type VietnamProvinceOption
} from "@social-crm/api";
import { useI18n } from "@/i18n";

const MACRO_REGION_LABEL: Record<VietnamProvinceOption["macroRegion"], { en: string; vi: string }> = {
  bac: { en: "North", vi: "Miền Bắc" },
  trung: { en: "Central", vi: "Miền Trung" },
  nam: { en: "South", vi: "Miền Nam" }
};

type FormState = {
  id: string | null;
  name: string;
  provinceKeys: string[];
};

const EMPTY_FORM: FormState = { id: null, name: "", provinceKeys: [] };

export function RegionGroupsPanel() {
  const { copy } = useI18n();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [provinceSearch, setProvinceSearch] = useState("");

  const groupsQuery = useRegionGroupsQuery();
  const provincesQuery = useRegionGroupProvincesQuery();
  const createGroup = useCreateRegionGroupMutation();
  const updateGroup = useUpdateRegionGroupMutation();
  const deleteGroup = useDeleteRegionGroupMutation();

  const provinces = provincesQuery.data ?? [];
  const provinceNameByKey = useMemo(() => new Map(provinces.map((p) => [p.key, p.name])), [provinces]);

  const filteredProvinces = useMemo(() => {
    const search = provinceSearch.trim().toLowerCase();
    if (!search) return provinces;
    return provinces.filter((p) => p.name.toLowerCase().includes(search) || p.key.includes(search));
  }, [provinceSearch, provinces]);

  const isEditing = form.id !== null;
  const saveDisabled =
    !form.name.trim() ||
    form.provinceKeys.length === 0 ||
    createGroup.isPending ||
    updateGroup.isPending;

  function startEdit(group: RegionGroup) {
    setForm({ id: group.id, name: group.name, provinceKeys: [...group.provinceKeys] });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function toggleProvince(key: string) {
    setForm((state) => ({
      ...state,
      provinceKeys: state.provinceKeys.includes(key)
        ? state.provinceKeys.filter((k) => k !== key)
        : [...state.provinceKeys, key]
    }));
  }

  function handleSave() {
    const payload = {
      name: form.name.trim(),
      provinceNames: form.provinceKeys.map((key) => provinceNameByKey.get(key) ?? key)
    };
    if (form.id) {
      updateGroup.mutate({ id: form.id, payload }, { onSuccess: resetForm });
    } else {
      createGroup.mutate(payload, { onSuccess: resetForm });
    }
  }

  function handleDelete(group: RegionGroup) {
    if (!window.confirm(copy({ en: `Delete region group "${group.name}"?`, vi: `Xoá nhóm khu vực "${group.name}"?` }))) return;
    deleteGroup.mutate(group.id, {
      onSuccess: () => {
        if (form.id === group.id) resetForm();
      }
    });
  }

  const groups = groupsQuery.data ?? [];

  return (
    <Panel
      title={copy({ en: "Region groups", vi: "Nhóm khu vực" })}
      subtitle={copy({
        en: "Named sets of provinces (e.g. \"Miền Trung\") that operators can pick when excluding candidates from an order. Province names come from the verified taxonomy, so groups can't drift into typos.",
        vi: "Tập hợp tỉnh/thành có tên gọi (vd. \"Miền Trung\") để chọn khi loại ứng viên khỏi một đơn hàng. Tên tỉnh lấy từ danh sách đã xác minh nên không thể gõ sai."
      })}
    >
      <div className="space-y-4">
        <InfoStrip>
          <span>
            {copy({
              en: "Provinces follow the post-2025 administrative reform (34 units). Old province names typed into an order's exclusion list still resolve correctly — this taxonomy maps both.",
              vi: "Danh sách tỉnh theo đợt sáp nhập hành chính 2025 (34 đơn vị). Tên tỉnh cũ nhập vào danh sách loại trừ của đơn hàng vẫn được nhận đúng — bảng dữ liệu này ánh xạ cả hai."
            })}
          </span>
        </InfoStrip>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
          <div className="space-y-2">
            {groupsQuery.isLoading ? (
              <div className="text-sm text-slate-500">{copy({ en: "Loading...", vi: "Đang tải..." })}</div>
            ) : groups.length ? (
              groups.map((group) => (
                <div
                  key={group.id}
                  className={`rounded-2xl border px-4 py-3 ${form.id === group.id ? "border-indigo-500 bg-indigo-50/70" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{group.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {group.provinceKeys.map((key) => (
                          <Badge key={key} tone="neutral">{provinceNameByKey.get(key) ?? key}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(group)}>
                        {copy({ en: "Edit", vi: "Sửa" })}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(group)} disabled={deleteGroup.isPending}>
                        {copy({ en: "Delete", vi: "Xoá" })}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title={copy({ en: "No region groups yet", vi: "Chưa có nhóm khu vực" })}
                description={copy({
                  en: "Create one (e.g. \"Miền Trung\") to let operators exclude a whole region in one click.",
                  vi: "Tạo một nhóm (vd. \"Miền Trung\") để loại trừ cả một khu vực chỉ bằng một lần chọn."
                })}
              />
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-4">
              <div className="text-sm font-semibold text-slate-900">
                {isEditing
                  ? copy({ en: "Edit region group", vi: "Sửa nhóm khu vực" })
                  : copy({ en: "New region group", vi: "Nhóm khu vực mới" })}
              </div>

              <Input
                label={copy({ en: "Group name", vi: "Tên nhóm" })}
                value={form.name}
                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                placeholder={copy({ en: "e.g. Miền Trung", vi: "vd. Miền Trung" })}
              />

              <Toolbar compact>
                <FieldGroup columns={1}>
                  <Input
                    label={copy({ en: "Search provinces", vi: "Tìm tỉnh/thành" })}
                    value={provinceSearch}
                    onChange={(event) => setProvinceSearch(event.target.value)}
                  />
                </FieldGroup>
              </Toolbar>

              <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {provincesQuery.isLoading ? (
                  <div className="px-2 py-1 text-sm text-slate-500">{copy({ en: "Loading...", vi: "Đang tải..." })}</div>
                ) : filteredProvinces.length ? (
                  filteredProvinces.map((province) => {
                    const checked = form.provinceKeys.includes(province.key);
                    return (
                      <label
                        key={province.key}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProvince(province.key)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          {province.name}
                        </span>
                        <span className="text-xs text-slate-400">{copy(MACRO_REGION_LABEL[province.macroRegion])}</span>
                      </label>
                    );
                  })
                ) : (
                  <div className="px-2 py-1 text-sm text-slate-500">{copy({ en: "No match", vi: "Không tìm thấy" })}</div>
                )}
              </div>

              <div className="text-xs text-slate-500">
                {copy({ en: "Selected", vi: "Đã chọn" })}: {form.provinceKeys.length}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSave} disabled={saveDisabled}>
                  {createGroup.isPending || updateGroup.isPending
                    ? copy({ en: "Saving...", vi: "Đang lưu..." })
                    : isEditing
                      ? copy({ en: "Save changes", vi: "Lưu thay đổi" })
                      : copy({ en: "Create group", vi: "Tạo nhóm" })}
                </Button>
                {isEditing ? (
                  <Button variant="secondary" onClick={resetForm}>
                    {copy({ en: "Cancel", vi: "Huỷ" })}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
