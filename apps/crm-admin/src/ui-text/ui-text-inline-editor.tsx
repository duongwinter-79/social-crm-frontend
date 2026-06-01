import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import {
  useResetUiTextOverrideMutation,
  useUpdateUiTextOverrideMutation
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import { useUiText } from "./ui-text-provider";
import { uiTextByKey } from "./ui-text.registry";
import { UiTextDiff } from "./ui-text-diff";

const POPOVER_WIDTH = 360;
const GUTTER = 12;

type Position = { top: number; left: number; placement: "top" | "bottom" };

function computePosition(anchor: HTMLElement, height: number): Position {
  const rect = anchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const placement: Position["placement"] = spaceBelow < height + GUTTER && rect.top > height + GUTTER ? "top" : "bottom";
  const top = placement === "bottom" ? rect.bottom + GUTTER : rect.top - height - GUTTER;
  const left = Math.min(
    Math.max(GUTTER, rect.left),
    window.innerWidth - POPOVER_WIDTH - GUTTER
  );
  return { top: Math.max(GUTTER, top), left, placement };
}

function missingVariables(template: string, required: string[] | undefined): string[] {
  if (!required?.length) return [];
  return required.filter((name) => !template.includes(`{${name}}`));
}

/**
 * Single shared popover for in-context UI text editing. Mounted once in the
 * authenticated shell; positions itself against whichever <UiText> was clicked
 * (provider holds the anchor element). Renders nothing unless an edit is active.
 */
export function UiTextInlineEditor() {
  const { lang, copy } = useI18n();
  const {
    isEditMode,
    activeEditKey,
    activeEditAnchor,
    closeEditor,
    overrides,
    previewOverrides,
    setPreviewOverride,
    clearPreviewOverride,
    reload
  } = useUiText();

  const location = useLocation();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [enOverride, setEnOverride] = useState("");
  const [viOverride, setViOverride] = useState("");

  const updateOverride = useUpdateUiTextOverrideMutation();
  const resetOverride = useResetUiTextOverrideMutation();

  const entry = activeEditKey ? uiTextByKey.get(activeEditKey) ?? null : null;
  const isOpen = Boolean(isEditMode && activeEditKey && entry && activeEditAnchor);

  // Seed inputs when a new key is opened: preview draft → live override → blank.
  useEffect(() => {
    if (!activeEditKey) return;
    const preview = previewOverrides[activeEditKey];
    const saved = overrides[activeEditKey];
    setEnOverride(preview?.enOverride ?? saved?.enOverride ?? "");
    setViOverride(preview?.viOverride ?? saved?.viOverride ?? "");
    // Only re-seed on key change, not on every preview/override mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEditKey]);

  // Position against the anchor; recompute on scroll/resize.
  useLayoutEffect(() => {
    if (!isOpen || !activeEditAnchor) return;
    const update = () => {
      const height = popoverRef.current?.offsetHeight ?? 320;
      setPosition(computePosition(activeEditAnchor, height));
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, activeEditAnchor, enOverride, viOverride]);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (activeEditAnchor?.contains(target)) return;
      closeEditor();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEditor();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, activeEditAnchor, closeEditor]);

  // Close when navigating away (the anchor element unmounts).
  useEffect(() => {
    closeEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const currentInput = lang === "vi" ? viOverride : enOverride;
  const missing = useMemo(
    () => (entry ? missingVariables(currentInput.trim() || entry.defaultText[lang], entry.variables) : []),
    [currentInput, entry, lang]
  );

  if (!isOpen || !entry || !position) {
    // Still render an off-screen measuring node so the layout effect can read height.
    if (isOpen && entry) {
      return createPortal(
        <div ref={popoverRef} style={{ position: "fixed", top: -9999, left: -9999, width: POPOVER_WIDTH }} />,
        document.body
      );
    }
    return null;
  }

  const draftEn = enOverride.trim() || null;
  const draftVi = viOverride.trim() || null;
  const maxLength = entry.maxLength;
  const overLimit = Boolean(
    maxLength && (enOverride.trim().length > maxLength || viOverride.trim().length > maxLength)
  );
  const saveDisabled = updateOverride.isPending || overLimit || missing.length > 0;
  const hasSaved = Boolean(overrides[activeEditKey!]);

  const applyPreview = () => {
    setPreviewOverride({
      key: entry.key,
      enOverride: draftEn,
      viOverride: draftVi,
      isActive: true
    });
  };

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Edit UI text"
      className="fixed z-[1000] w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
      style={{ top: position.top, left: position.left }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {copy({ en: "Edit text", vi: "Sửa chữ hiển thị" })}
          </div>
          <code className="text-[11px] text-slate-400">{entry.key}</code>
        </div>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          onClick={closeEditor}
        >
          {copy({ en: "Close", vi: "Đóng" })}
        </button>
      </div>

      <div className="space-y-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          <span className="flex items-center justify-between">
            <span>{copy({ en: "English", vi: "Tiếng Anh" })}</span>
            {maxLength ? <span className="text-slate-400">{enOverride.trim().length}/{maxLength}</span> : null}
          </span>
          <span className="text-[11px] font-normal text-slate-400">{entry.defaultText.en}</span>
          <input
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            value={enOverride}
            maxLength={maxLength}
            placeholder={entry.defaultText.en}
            onChange={(event) => setEnOverride(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          <span className="flex items-center justify-between">
            <span>{copy({ en: "Vietnamese", vi: "Tiếng Việt" })}</span>
            {maxLength ? <span className="text-slate-400">{viOverride.trim().length}/{maxLength}</span> : null}
          </span>
          <span className="text-[11px] font-normal text-slate-400">{entry.defaultText.vi}</span>
          <input
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            value={viOverride}
            maxLength={maxLength}
            placeholder={entry.defaultText.vi}
            onChange={(event) => setViOverride(event.target.value)}
          />
        </label>

        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {copy({ en: "Diff", vi: "Khác biệt" })}
          </div>
          <UiTextDiff before={entry.defaultText[lang]} after={currentInput.trim() || entry.defaultText[lang]} />
        </div>

        {missing.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
            {copy({ en: "Must keep placeholder(s): ", vi: "Phải giữ biến: " })}
            {missing.map((name) => `{${name}}`).join(", ")}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={applyPreview}
        >
          {copy({ en: "Preview", vi: "Xem thử" })}
        </button>
        {previewOverrides[entry.key] ? (
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            onClick={() => clearPreviewOverride(entry.key)}
          >
            {copy({ en: "Clear preview", vi: "Bỏ xem thử" })}
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={saveDisabled}
          onClick={() =>
            updateOverride.mutate(
              { key: entry.key, patch: { enOverride, viOverride, isActive: true } },
              {
                onSuccess: () => {
                  clearPreviewOverride(entry.key);
                  void reload();
                  closeEditor();
                }
              }
            )
          }
        >
          {updateOverride.isPending ? copy({ en: "Saving…", vi: "Đang lưu…" }) : copy({ en: "Save", vi: "Lưu" })}
        </button>
        <button
          type="button"
          className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          disabled={resetOverride.isPending || !hasSaved}
          onClick={() =>
            resetOverride.mutate(entry.key, {
              onSuccess: () => {
                clearPreviewOverride(entry.key);
                void reload();
                closeEditor();
              }
            })
          }
        >
          {resetOverride.isPending ? copy({ en: "Resetting…", vi: "Đang đặt lại…" }) : copy({ en: "Reset", vi: "Đặt lại" })}
        </button>
      </div>
    </div>,
    document.body
  );
}
