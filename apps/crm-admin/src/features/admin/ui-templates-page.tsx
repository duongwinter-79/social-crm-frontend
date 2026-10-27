import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, EmptyState, Field, FieldGroup, InfoStrip, Input, Panel, SectionHeader } from "@social-crm/ui";
import {
  triggerBlobDownload,
  useActivateUiTemplateMutation,
  useAdminUiTemplatesQuery,
  useCreateUiTemplateMutation,
  useDeactivateUiTemplatesMutation,
  useDeleteUiTemplateMutation,
  useUpdateUiTemplateMutation,
  type AdminUiTemplate,
  type UiTemplateColorKey,
  type UiTemplatePayload,
  type UiTemplateTokens
} from "@social-crm/api";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useI18n } from "@/i18n";
import { useTemplate } from "@/templates/template-provider";
import { TEMPLATE_PAGE_IDS } from "@/templates/template-pages";
import { COLOR_FAMILIES, COLOR_KEYS, SHADES, generateScale } from "@/templates/template-tokens";
import { SAFE_MODE_QUERY_PARAM, parseTemplateFile, toTemplateFile } from "@/templates/template-transfer";

type Draft = {
  name: string;
  description: string;
  tokens: UiTemplateTokens;
  customCss: string;
  customJs: string;
};

type Tab = "design" | "css" | "js" | "reference";
type Confirm = { kind: "activate" | "delete" | "deactivate" } | null;

const NEW_ID = "new";
const MAX_LOGO_BYTES = 220 * 1024;
const LIVE_PREVIEW_DELAY_MS = 400;

const EMPTY_DRAFT: Draft = { name: "", description: "", tokens: {}, customCss: "", customJs: "" };

const STARTER_JS = `// Runs for every signed-in user while this template is active.
// See the "Reference" tab for the crm.* API.

crm.onRouteChange(({ page }) => {
  crm.log("page", page);
});
`;

function toDraft(template: AdminUiTemplate): Draft {
  return {
    name: template.name,
    description: template.description ?? "",
    tokens: template.tokens ?? {},
    customCss: template.customCss ?? "",
    customJs: template.customJs ?? ""
  };
}

function toPayload(draft: Draft): UiTemplatePayload {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    tokens: draft.tokens,
    customCss: draft.customCss.trim() ? draft.customCss : null,
    customJs: draft.customJs.trim() ? draft.customJs : null
  };
}

function setToken<K extends keyof UiTemplateTokens>(tokens: UiTemplateTokens, key: K, value: UiTemplateTokens[K] | "") {
  const next = { ...tokens };
  if (value === "" || value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

function setColor(tokens: UiTemplateTokens, key: UiTemplateColorKey, hex: string | null) {
  const colors = { ...(tokens.colors ?? {}) };
  if (hex) colors[key] = hex.toLowerCase();
  else delete colors[key];
  const next: UiTemplateTokens = { ...tokens, colors };
  if (Object.keys(colors).length === 0) delete next.colors;
  return next;
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function CodeArea(props: { value: string; onChange: (value: string) => void; placeholder?: string; label: string }) {
  // Tab inserts two spaces instead of leaving the field, like a code editor.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab" || event.shiftKey) return;
    event.preventDefault();
    const target = event.currentTarget;
    const { selectionStart, selectionEnd, value } = target;
    const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
    props.onChange(next);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = selectionStart + 2;
    });
  };
  return (
    <textarea
      aria-label={props.label}
      className="min-h-[420px] w-full resize-y rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      value={props.value}
      placeholder={props.placeholder}
      onChange={(event) => props.onChange(event.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}

function ColorRow(props: { colorKey: UiTemplateColorKey; value: string | undefined; onChange: (hex: string | null) => void }) {
  const { copy } = useI18n();
  const family = COLOR_FAMILIES[props.colorKey];
  const current = props.value ?? family.defaultHex;
  const [text, setText] = useState(current);
  useEffect(() => setText(current), [current]);
  const scale = useMemo(() => generateScale(current, family.anchor), [current, family.anchor]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">{copy(family.label)}</div>
          <div className="text-xs text-slate-500">
            {copy(family.hint)} · {copy({ en: `used as shade ${family.anchor}`, vi: `dùng làm sắc độ ${family.anchor}` })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={copy(family.label)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
            value={current}
            onChange={(event) => props.onChange(event.target.value)}
          />
          <input
            className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-800"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (/^#[0-9a-f]{6}$/i.test(event.target.value)) props.onChange(event.target.value);
            }}
          />
          {props.value ? (
            <Button size="sm" variant="ghost" onClick={() => props.onChange(null)}>
              {copy({ en: "Default", vi: "Mặc định" })}
            </Button>
          ) : (
            <Badge>{copy({ en: "Default", vi: "Mặc định" })}</Badge>
          )}
        </div>
      </div>
      {scale ? (
        <div className="mt-3 flex overflow-hidden rounded-lg border border-slate-200" aria-hidden="true">
          {SHADES.map((shade) => (
            <div key={shade} title={shade} className="h-5 flex-1" style={{ background: `rgb(${scale[shade]})` }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ApiReference() {
  const { copy } = useI18n();
  const api: Array<[string, { en: string; vi: string }]> = [
    ["crm.onRouteChange(({ path, page }) => …)", { en: "Runs now and after every navigation. Returns an unsubscribe function.", vi: "Chạy ngay và sau mỗi lần chuyển trang. Trả về hàm hủy đăng ký." }],
    ["crm.observe(selector, (el) => cleanup?)", { en: "Calls back once for every matching element, including ones React renders later. Return a function to undo per-element changes.", vi: "Gọi một lần cho mỗi phần tử khớp, kể cả phần tử React hiển thị sau. Trả về hàm để hoàn tác thay đổi." }],
    ["crm.addStyle(css)", { en: "Adds a stylesheet; removed when the template stops.", vi: "Thêm CSS; tự gỡ khi mẫu ngừng chạy." }],
    ["crm.setToken('--crm-indigo-600', '2 132 199')", { en: "Sets a CSS variable on :root (colour tokens are \"r g b\").", vi: "Đặt biến CSS trên :root (màu dạng \"r g b\")." }],
    ["crm.onCleanup(fn)", { en: "Runs fn when the template is switched, previewed or disabled.", vi: "Chạy fn khi đổi, xem thử hoặc tắt mẫu." }],
    ["crm.page() · crm.route() · crm.lang()", { en: "Current page id, URL path and language (en / vi).", vi: "Mã trang, đường dẫn và ngôn ngữ hiện tại (en / vi)." }],
    ["crm.user · crm.template", { en: "Signed-in user { username, roles } and this template { id, name, preview }.", vi: "Người dùng { username, roles } và mẫu { id, name, preview }." }],
    ["crm.log(...)", { en: "console.info with a [crm template] prefix.", vi: "console.info có tiền tố [crm template]." }]
  ];
  const hooks: Array<[string, { en: string; vi: string }]> = [
    ['body[data-crm-page="…"]', { en: TEMPLATE_PAGE_IDS.join(", "), vi: TEMPLATE_PAGE_IDS.join(", ") }],
    ['body[data-crm-template="…"]', { en: "Slug of the active template, or \"default\".", vi: "Mã của mẫu đang chạy, hoặc \"default\"." }],
    ['[data-crm-shell="…"]', { en: "frame, sidebar, brand, nav, header, content", vi: "frame, sidebar, brand, nav, header, content" }],
    ['[data-crm-component="…"]', { en: "button, input, select, field, panel, section-header, stat-card, metric-card, info-card, badge, empty-state, info-strip, toolbar, data-table, pagination, description-list", vi: "button, input, select, field, panel, section-header, stat-card, metric-card, info-card, badge, empty-state, info-strip, toolbar, data-table, pagination, description-list" }],
    ["[data-crm-variant] · [data-crm-tone]", { en: "Button variant (primary, secondary, ghost, danger); badge / metric tone (neutral, accent, success, warning, danger).", vi: "Kiểu nút (primary, secondary, ghost, danger); tông của badge / metric (neutral, accent, success, warning, danger)." }],
    ["--crm-<palette>-<shade>", { en: "Colour variables for slate, indigo, blue, emerald, green, amber, yellow, rose, red × 50…950, plus --crm-font-sans.", vi: "Biến màu cho slate, indigo, blue, emerald, green, amber, yellow, rose, red × 50…950, và --crm-font-sans." }]
  ];
  return (
    <div className="space-y-5 text-sm">
      <InfoStrip>
        {copy({
          en: "Templates change how the CRM looks, not what it does. Target the stable hooks below rather than Tailwind class names, which can change between releases. Prefer adding classes, elements and styles over rewriting text React manages — React may re-render it.",
          vi: "Mẫu giao diện chỉ thay đổi cách CRM hiển thị, không thay đổi chức năng. Hãy dùng các móc cố định bên dưới thay vì tên class Tailwind (có thể đổi giữa các phiên bản). Nên thêm class, phần tử và CSS thay vì sửa chữ do React quản lý — React có thể vẽ lại."
        })}
      </InfoStrip>
      <div>
        <div className="mb-2 font-semibold text-slate-800">{copy({ en: "JavaScript API (crm)", vi: "API JavaScript (crm)" })}</div>
        <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {api.map(([signature, description]) => (
            <div key={signature} className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,340px)_1fr]">
              <dt className="font-mono text-xs text-indigo-700">{signature}</dt>
              <dd className="text-slate-600">{copy(description)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <div className="mb-2 font-semibold text-slate-800">{copy({ en: "Selectors and variables", vi: "Bộ chọn và biến" })}</div>
        <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {hooks.map(([selector, description]) => (
            <div key={selector} className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,340px)_1fr]">
              <dt className="font-mono text-xs text-indigo-700">{selector}</dt>
              <dd className="text-slate-600">{copy(description)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <InfoStrip>
        {copy({
          en: `Broke the page? Open any CRM URL with ?${SAFE_MODE_QUERY_PARAM}=1 to skip custom CSS and JS in your browser, fix the template here, then use ?${SAFE_MODE_QUERY_PARAM}=0.`,
          vi: `Trang bị lỗi? Mở bất kỳ đường dẫn CRM nào với ?${SAFE_MODE_QUERY_PARAM}=1 để bỏ qua CSS và JS tùy chỉnh trên trình duyệt của bạn, sửa mẫu tại đây, rồi dùng ?${SAFE_MODE_QUERY_PARAM}=0.`
        })}
      </InfoStrip>
    </div>
  );
}

export function UiTemplatesPage() {
  const { copy } = useI18n();
  const templateContext = useTemplate();
  const templatesQuery = useAdminUiTemplatesQuery();
  const createMutation = useCreateUiTemplateMutation();
  const updateMutation = useUpdateUiTemplateMutation();
  const activateMutation = useActivateUiTemplateMutation();
  const deactivateMutation = useDeactivateUiTemplatesMutation();
  const deleteMutation = useDeleteUiTemplateMutation();

  const templates = templatesQuery.data?.data ?? [];
  const activeTemplate = templates.find((template) => template.isActive) ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState<Draft>(EMPTY_DRAFT);
  const [tab, setTab] = useState<Tab>("design");
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const selected = selectedId && selectedId !== NEW_ID ? templates.find((template) => template.id === selectedId) ?? null : null;
  const isNew = selectedId === NEW_ID;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const previewKey = isNew ? NEW_ID : selected?.id ?? null;
  const isPreviewingThis = Boolean(previewKey && templateContext.preview?.id === previewKey);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Open the active template (or the first one) when the list first arrives.
  useEffect(() => {
    if (selectedId !== null || templates.length === 0) return;
    const initial = activeTemplate ?? templates[0];
    setSelectedId(initial.id);
    setDraft(toDraft(initial));
    setBaseline(toDraft(initial));
  }, [activeTemplate, selectedId, templates]);

  // Live preview: while this draft is being previewed, follow edits.
  useEffect(() => {
    if (!isPreviewingThis || !previewKey) return;
    const timer = window.setTimeout(() => {
      templateContext.setPreview({
        id: previewKey,
        name: draft.name || copy({ en: "Unsaved template", vi: "Mẫu chưa lưu" }),
        tokens: draft.tokens,
        customCss: draft.customCss || null,
        customJs: draft.customJs || null,
        updatedAt: new Date().toISOString()
      });
    }, LIVE_PREVIEW_DELAY_MS);
    return () => window.clearTimeout(timer);
    // Only follow draft edits: the provider's setPreview changes identity on every preview update.
  }, [draft, isPreviewingThis, previewKey]);

  const confirmDiscard = () =>
    !isDirty || window.confirm(copy({ en: "Discard unsaved changes to this template?", vi: "Bỏ các thay đổi chưa lưu của mẫu này?" }));

  const openTemplate = (template: AdminUiTemplate) => {
    if (template.id === selectedId || !confirmDiscard()) return;
    setSelectedId(template.id);
    setDraft(toDraft(template));
    setBaseline(toDraft(template));
    setNotice(null);
  };

  const openNew = (initial: Draft) => {
    if (!confirmDiscard()) return;
    setSelectedId(NEW_ID);
    setDraft(initial);
    setBaseline(EMPTY_DRAFT);
    setTab("design");
    setNotice(null);
  };

  const save = async () => {
    const payload = toPayload(draft);
    if (!payload.name) {
      setNotice(copy({ en: "Give the template a name before saving.", vi: "Hãy đặt tên cho mẫu trước khi lưu." }));
      setTab("design");
      return;
    }
    let saved: AdminUiTemplate | null = null;
    try {
      saved = isNew
        ? await createMutation.mutateAsync(payload)
        : selected
          ? await updateMutation.mutateAsync({ id: selected.id, patch: payload })
          : null;
    } catch {
      return; // The request-error toast already explains what failed.
    }
    if (!saved) return;
    setSelectedId(saved.id);
    setDraft(toDraft(saved));
    setBaseline(toDraft(saved));
    setNotice(null);
    if (isPreviewingThis) templateContext.clearPreview();
    if (saved.isActive) await templateContext.reload();
  };

  const startPreview = () => {
    if (!previewKey) return;
    templateContext.setPreview({
      id: previewKey,
      name: draft.name || copy({ en: "Unsaved template", vi: "Mẫu chưa lưu" }),
      tokens: draft.tokens,
      customCss: draft.customCss || null,
      customJs: draft.customJs || null,
      updatedAt: new Date().toISOString()
    });
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === "activate" && selected) {
        await activateMutation.mutateAsync(selected.id);
        if (templateContext.isPreviewing) templateContext.clearPreview();
      } else if (confirm.kind === "deactivate") {
        await deactivateMutation.mutateAsync();
      } else if (confirm.kind === "delete" && selected) {
        await deleteMutation.mutateAsync(selected.id);
        if (isPreviewingThis) templateContext.clearPreview();
        setSelectedId(null);
        setDraft(EMPTY_DRAFT);
        setBaseline(EMPTY_DRAFT);
      }
    } catch {
      return; // The request-error toast already explains what failed.
    } finally {
      setConfirm(null);
    }
    await templateContext.reload();
  };

  const exportTemplate = () => {
    const payload = toPayload(draft);
    const file = toTemplateFile({ ...payload, description: payload.description ?? null, tokens: draft.tokens, customCss: payload.customCss ?? null, customJs: payload.customJs ?? null });
    const slug = (draft.name || "template").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "template";
    triggerBlobDownload(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }), `${slug}.crm-template.json`);
  };

  const importTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const payload = parseTemplateFile(await file.text());
      openNew({
        name: payload.name,
        description: payload.description ?? "",
        tokens: payload.tokens ?? {},
        customCss: payload.customCss ?? "",
        customJs: payload.customJs ?? ""
      });
      setNotice(copy({ en: "Imported as a new, unsaved template. Review it, then save.", vi: "Đã nhập thành mẫu mới chưa lưu. Kiểm tra rồi bấm lưu." }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setNotice(copy({ en: "Logo must be a PNG, JPEG, WebP or GIF image.", vi: "Logo phải là ảnh PNG, JPEG, WebP hoặc GIF." }));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setNotice(copy({ en: "Logo must be 220 KB or smaller. Use a hosted https:// URL for larger images.", vi: "Logo tối đa 220 KB. Dùng đường dẫn https:// cho ảnh lớn hơn." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, tokens: setToken(current.tokens, "logoUrl", String(reader.result)) }));
    reader.readAsDataURL(file);
  };

  const errorsForThis =
    templateContext.effective && previewKey && (templateContext.effective.id === previewKey) ? templateContext.scriptErrors : [];

  const tabs: Array<[Tab, { en: string; vi: string }]> = [
    ["design", { en: "Branding & colours", vi: "Thương hiệu & màu sắc" }],
    ["css", { en: "Custom CSS", vi: "CSS tùy chỉnh" }],
    ["js", { en: "Custom JS", vi: "JS tùy chỉnh" }],
    ["reference", { en: "Reference", vi: "Tài liệu" }]
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Admin tool", vi: "Công cụ quản trị" })}
        title={copy({ en: "UI templates", vi: "Mẫu giao diện" })}
        description={copy({
          en: "Switch and edit the CRM's look at runtime: brand colours, font and logo, plus custom CSS and JavaScript. Templates only change presentation — workflows, permissions and data stay the same.",
          vi: "Đổi và chỉnh giao diện CRM ngay khi đang chạy: màu thương hiệu, phông chữ, logo, cùng CSS và JavaScript tùy chỉnh. Mẫu chỉ thay đổi cách hiển thị — quy trình, phân quyền và dữ liệu giữ nguyên."
        })}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
              {copy({ en: "Import JSON", vi: "Nhập JSON" })}
            </Button>
            <Button onClick={() => openNew({ ...EMPTY_DRAFT, customJs: STARTER_JS })}>{copy({ en: "New template", vi: "Mẫu mới" })}</Button>
            <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importTemplate} />
          </div>
        }
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {copy({
              en: "Custom JS runs in every signed-in user's browser with full page access, and never on the login page. Only admins can edit templates; every change is recorded in the audit log.",
              vi: "JS tùy chỉnh chạy trên trình duyệt của mọi người dùng đã đăng nhập với toàn quyền trên trang, và không bao giờ chạy ở trang đăng nhập. Chỉ quản trị viên được sửa mẫu; mọi thay đổi đều được ghi nhật ký."
            })}
          </span>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {copy({ en: "Back to admin", vi: "Quay lại quản trị" })}
          </Link>
        </div>
      </InfoStrip>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title={copy({ en: "Templates", vi: "Danh sách mẫu" })}>
          <div className="space-y-2">
            <div className={`rounded-2xl border px-4 py-3 ${activeTemplate ? "border-slate-200 bg-slate-50" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-800">{copy({ en: "Built-in default", vi: "Giao diện mặc định" })}</div>
                {activeTemplate ? (
                  <Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: "deactivate" })}>
                    {copy({ en: "Use default", vi: "Dùng mặc định" })}
                  </Button>
                ) : (
                  <Badge tone="success">{copy({ en: "Live", vi: "Đang dùng" })}</Badge>
                )}
              </div>
            </div>
            {templatesQuery.isLoading ? (
              <div className="px-1 py-3 text-sm text-slate-500">{copy({ en: "Loading…", vi: "Đang tải…" })}</div>
            ) : null}
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => openTemplate(template)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  template.id === selectedId ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{template.name}</span>
                  <span className="flex shrink-0 gap-1">
                    {template.isActive ? <Badge tone="success">{copy({ en: "Live", vi: "Đang dùng" })}</Badge> : null}
                    {templateContext.preview?.id === template.id ? <Badge tone="warning">{copy({ en: "Preview", vi: "Xem thử" })}</Badge> : null}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {template.updatedByUsername ? `${template.updatedByUsername} · ` : ""}
                  {formatDate(template.updatedAt)}
                </div>
              </button>
            ))}
            {isNew ? (
              <div className="rounded-2xl border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-semibold text-slate-800">
                {draft.name || copy({ en: "New template", vi: "Mẫu mới" })} <Badge tone="warning">{copy({ en: "Unsaved", vi: "Chưa lưu" })}</Badge>
              </div>
            ) : null}
          </div>
        </Panel>

        {selectedId === null ? (
          <EmptyState
            title={copy({ en: "No templates yet", vi: "Chưa có mẫu nào" })}
            description={copy({
              en: "Create a template or import a .crm-template.json file. The CRM keeps its built-in look until you activate one.",
              vi: "Tạo mẫu mới hoặc nhập tệp .crm-template.json. CRM giữ giao diện mặc định cho tới khi bạn kích hoạt một mẫu."
            })}
          />
        ) : (
          <Panel
            title={
              <span className="flex flex-wrap items-center gap-2">
                {draft.name || copy({ en: "New template", vi: "Mẫu mới" })}
                {selected?.isActive ? <Badge tone="success">{copy({ en: "Live for all users", vi: "Đang áp dụng cho mọi người" })}</Badge> : null}
                {isDirty ? <Badge tone="warning">{copy({ en: "Unsaved changes", vi: "Có thay đổi chưa lưu" })}</Badge> : null}
              </span>
            }
            subtitle={
              selected?.isActive
                ? copy({ en: "Saving changes here updates the live look for every user on their next page load.", vi: "Lưu thay đổi tại đây sẽ cập nhật giao diện cho mọi người ở lần tải trang kế tiếp." })
                : copy({ en: "Preview shows the draft only in your browser. Activate to apply it for everyone.", vi: "Xem thử chỉ hiển thị bản nháp trên trình duyệt của bạn. Kích hoạt để áp dụng cho mọi người." })
            }
          >
            <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3" role="tablist">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    tab === id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {copy(label)}
                </button>
              ))}
            </div>

            {notice ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div> : null}

            {tab === "design" ? (
              <div className="space-y-5">
                <FieldGroup columns={2}>
                  <Input
                    label={copy({ en: "Template name", vi: "Tên mẫu" })}
                    value={draft.name}
                    maxLength={120}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                  <Input
                    label={copy({ en: "Description", vi: "Mô tả" })}
                    value={draft.description}
                    maxLength={500}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  />
                  <Input
                    label={copy({ en: "Brand name (sidebar & login)", vi: "Tên thương hiệu (thanh bên & đăng nhập)" })}
                    value={draft.tokens.brandName ?? ""}
                    maxLength={80}
                    placeholder="Sao Mai HR CRM"
                    onChange={(event) => setDraft((current) => ({ ...current, tokens: setToken(current.tokens, "brandName", event.target.value) }))}
                  />
                  <Input
                    label={copy({ en: "Brand tagline", vi: "Khẩu hiệu" })}
                    value={draft.tokens.brandTagline ?? ""}
                    maxLength={120}
                    placeholder={copy({ en: "Recruitment workspace", vi: "Hệ thống tuyển dụng" })}
                    onChange={(event) => setDraft((current) => ({ ...current, tokens: setToken(current.tokens, "brandTagline", event.target.value) }))}
                  />
                  <Input
                    label={copy({ en: "Font family", vi: "Phông chữ" })}
                    value={draft.tokens.fontFamily ?? ""}
                    maxLength={200}
                    placeholder='"Plus Jakarta Sans", Inter, sans-serif'
                    hint={copy({ en: "Load web fonts with @import in Custom CSS.", vi: "Tải phông chữ web bằng @import trong CSS tùy chỉnh." })}
                    onChange={(event) => setDraft((current) => ({ ...current, tokens: setToken(current.tokens, "fontFamily", event.target.value) }))}
                  />
                  <Field
                    label={copy({ en: "Logo", vi: "Logo" })}
                    hint={copy({ en: "https:// URL, a /path on this site, or upload an image up to 220 KB.", vi: "Đường dẫn https://, /đường-dẫn trên trang này, hoặc tải ảnh tối đa 220 KB." })}
                  >
                    <div className="flex items-center gap-2">
                      {draft.tokens.logoUrl ? (
                        <img src={draft.tokens.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white object-contain" />
                      ) : null}
                      <input
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                        value={draft.tokens.logoUrl?.startsWith("data:") ? copy({ en: "(uploaded image)", vi: "(ảnh đã tải lên)" }) : draft.tokens.logoUrl ?? ""}
                        readOnly={Boolean(draft.tokens.logoUrl?.startsWith("data:"))}
                        placeholder="https://…/logo.png"
                        onChange={(event) => setDraft((current) => ({ ...current, tokens: setToken(current.tokens, "logoUrl", event.target.value.trim()) }))}
                      />
                      <Button size="sm" variant="secondary" onClick={() => logoInputRef.current?.click()}>
                        {copy({ en: "Upload", vi: "Tải lên" })}
                      </Button>
                      {draft.tokens.logoUrl ? (
                        <Button size="sm" variant="ghost" onClick={() => setDraft((current) => ({ ...current, tokens: setToken(current.tokens, "logoUrl", "") }))}>
                          {copy({ en: "Clear", vi: "Xóa" })}
                        </Button>
                      ) : null}
                      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={uploadLogo} />
                    </div>
                  </Field>
                </FieldGroup>
                <div className="grid gap-3 lg:grid-cols-2">
                  {COLOR_KEYS.map((key) => (
                    <ColorRow
                      key={key}
                      colorKey={key}
                      value={draft.tokens.colors?.[key]}
                      onChange={(hex) => setDraft((current) => ({ ...current, tokens: setColor(current.tokens, key, hex) }))}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "css" ? (
              <div className="space-y-3">
                <div className="text-sm text-slate-500">
                  {copy({
                    en: "Loaded after the app's own styles. Target [data-crm-…] hooks (see Reference). Skipped in safe mode.",
                    vi: "Được nạp sau CSS của ứng dụng. Dùng các móc [data-crm-…] (xem Tài liệu). Bị bỏ qua ở chế độ an toàn."
                  })}
                </div>
                <CodeArea
                  label={copy({ en: "Custom CSS", vi: "CSS tùy chỉnh" })}
                  value={draft.customCss}
                  placeholder={'[data-crm-shell="sidebar"] {\n  background: #0b3b2e;\n}\n\n[data-crm-component="panel"] {\n  border-radius: 12px;\n}'}
                  onChange={(value) => setDraft((current) => ({ ...current, customCss: value }))}
                />
              </div>
            ) : null}

            {tab === "js" ? (
              <div className="space-y-3">
                <div className="text-sm text-slate-500">
                  {copy({
                    en: "Runs for signed-in users once per page load (and again when previewed). Use the crm API so changes survive navigation and are undone cleanly. Skipped in safe mode and on the login page.",
                    vi: "Chạy cho người dùng đã đăng nhập mỗi lần tải trang (và khi xem thử). Dùng API crm để thay đổi giữ được khi chuyển trang và được gỡ sạch. Bị bỏ qua ở chế độ an toàn và trang đăng nhập."
                  })}
                </div>
                <CodeArea
                  label={copy({ en: "Custom JS", vi: "JS tùy chỉnh" })}
                  value={draft.customJs}
                  placeholder={STARTER_JS}
                  onChange={(value) => setDraft((current) => ({ ...current, customJs: value }))}
                />
                {errorsForThis.length > 0 ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <div className="font-semibold">{copy({ en: "Script errors", vi: "Lỗi script" })}</div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 font-mono text-xs">
                      {errorsForThis.map((message, index) => (
                        <li key={`${index}-${message}`}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "reference" ? <ApiReference /> : null}

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
              <Button onClick={() => void save()} disabled={isSaving || (!isDirty && !isNew)}>
                {isSaving ? copy({ en: "Saving…", vi: "Đang lưu…" }) : copy({ en: "Save", vi: "Lưu" })}
              </Button>
              {isPreviewingThis ? (
                <Button variant="secondary" onClick={templateContext.clearPreview}>
                  {copy({ en: "Stop preview", vi: "Dừng xem thử" })}
                </Button>
              ) : (
                <Button variant="secondary" onClick={startPreview}>
                  {copy({ en: "Live preview in my browser", vi: "Xem thử trực tiếp trên trình duyệt của tôi" })}
                </Button>
              )}
              {selected && !selected.isActive ? (
                <Button
                  variant="secondary"
                  disabled={isDirty || activateMutation.isPending}
                  onClick={() => setConfirm({ kind: "activate" })}
                >
                  {copy({ en: "Activate for everyone", vi: "Áp dụng cho mọi người" })}
                </Button>
              ) : null}
              {selected ? (
                <Button
                  variant="ghost"
                  onClick={() => openNew({ ...draft, name: `${draft.name || selected.name} (copy)` })}
                >
                  {copy({ en: "Duplicate", vi: "Nhân bản" })}
                </Button>
              ) : null}
              <Button variant="ghost" onClick={exportTemplate}>
                {copy({ en: "Export JSON", vi: "Xuất JSON" })}
              </Button>
              {selected && !selected.isActive ? (
                <Button variant="ghost" onClick={() => setConfirm({ kind: "delete" })}>
                  {copy({ en: "Delete", vi: "Xóa" })}
                </Button>
              ) : null}
              {isDirty && selected && !selected.isActive ? (
                <span className="text-xs text-slate-500">{copy({ en: "Save before activating.", vi: "Lưu trước khi kích hoạt." })}</span>
              ) : null}
            </div>
          </Panel>
        )}
      </div>

      <ConfirmationDialog
        open={confirm !== null}
        title={
          confirm?.kind === "activate"
            ? copy({ en: "Activate this template for everyone?", vi: "Áp dụng mẫu này cho mọi người?" })
            : confirm?.kind === "deactivate"
              ? copy({ en: "Switch everyone back to the default look?", vi: "Chuyển mọi người về giao diện mặc định?" })
              : copy({ en: "Delete this template?", vi: "Xóa mẫu này?" })
        }
        description={
          confirm?.kind === "activate"
            ? copy({ en: "Every CRM user gets this template's colours, CSS and JS on their next page load.", vi: "Mọi người dùng CRM sẽ nhận màu, CSS và JS của mẫu này ở lần tải trang kế tiếp." })
            : confirm?.kind === "deactivate"
              ? copy({ en: "The active template stays saved and can be activated again later.", vi: "Mẫu đang dùng vẫn được lưu và có thể kích hoạt lại sau." })
              : copy({ en: "This cannot be undone. Export it first if you may need it again.", vi: "Không thể hoàn tác. Hãy xuất JSON trước nếu có thể cần lại." })
        }
        details={selected ? [{ label: copy({ en: "Template", vi: "Mẫu" }), value: selected.name }] : undefined}
        warning={
          confirm?.kind === "activate" && selected?.customJs
            ? copy({ en: "This template includes custom JavaScript. Preview it first.", vi: "Mẫu này có JavaScript tùy chỉnh. Hãy xem thử trước." })
            : undefined
        }
        confirmLabel={
          confirm?.kind === "activate"
            ? copy({ en: "Activate", vi: "Kích hoạt" })
            : confirm?.kind === "deactivate"
              ? copy({ en: "Use default", vi: "Dùng mặc định" })
              : copy({ en: "Delete", vi: "Xóa" })
        }
        cancelLabel={copy({ en: "Cancel", vi: "Hủy" })}
        pendingLabel={copy({ en: "Working…", vi: "Đang xử lý…" })}
        isPending={activateMutation.isPending || deactivateMutation.isPending || deleteMutation.isPending}
        onConfirm={() => void runConfirmed()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
