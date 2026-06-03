import { useState } from "react";
import { createPortal } from "react-dom";
import { useUpdateUiTextOverrideMutation } from "@social-crm/api";
import { useI18n } from "@/i18n";
import { useUiText } from "./ui-text-provider";
import { uiTextByKey } from "./ui-text.registry";
import { UiTextDiff } from "./ui-text-diff";

/**
 * Batch review for all staged preview overrides. Lets an admin see every
 * unsaved draft (with a per-language diff vs the code default) in one place,
 * then publish or discard them together instead of opening each inline editor.
 */
export function UiTextReviewDrafts(props: { open: boolean; onClose: () => void }) {
  const { lang, copy } = useI18n();
  const { previewOverrides, clearPreviewOverride, clearPreview, reload } = useUiText();
  const updateOverride = useUpdateUiTextOverrideMutation();
  const [savingAll, setSavingAll] = useState(false);

  if (!props.open) return null;

  const drafts = Object.values(previewOverrides);

  const draftValue = (en: string | null, vi: string | null) => (lang === "vi" ? vi : en) ?? "";

  const saveAll = async () => {
    setSavingAll(true);
    try {
      for (const draft of drafts) {
        await updateOverride.mutateAsync({
          key: draft.key,
          patch: { enOverride: draft.enOverride ?? "", viOverride: draft.viOverride ?? "", isActive: draft.isActive }
        });
      }
      clearPreview();
      await reload();
      props.onClose();
    } finally {
      setSavingAll(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={copy({ en: "Review UI text drafts", vi: "Xem lại bản nháp chữ hiển thị" })}
      onClick={props.onClose}
    >
      <div
        className="mt-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {copy({ en: "Review text drafts", vi: "Xem lại bản nháp" })}
            </div>
            <div className="text-xs text-slate-500">
              {drafts.length} {copy({ en: "unsaved draft(s) in this browser session", vi: "bản nháp chưa lưu trong phiên này" })}
            </div>
          </div>
          <button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" onClick={props.onClose}>
            {copy({ en: "Close", vi: "Đóng" })}
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-4">
          {drafts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              {copy({ en: "No drafts staged. Turn on Edit text and change a label to stage a draft.", vi: "Chưa có bản nháp. Bật Sửa chữ và thay đổi một nhãn để tạo bản nháp." })}
            </div>
          ) : (
            drafts.map((draft) => {
              const entry = uiTextByKey.get(draft.key);
              const before = entry?.defaultText[lang] ?? draft.key;
              const after = draftValue(draft.enOverride, draft.viOverride).trim() || before;
              return (
                <div key={draft.key} className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <code className="text-[11px] text-slate-500">{draft.key}</code>
                      {entry ? (
                        <div className="text-[11px] text-slate-400">
                          {entry.screen} · {entry.slot}
                        </div>
                      ) : (
                        <div className="text-[11px] text-rose-500">{copy({ en: "Unknown key", vi: "Mã không xác định" })}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-white"
                      onClick={() => clearPreviewOverride(draft.key)}
                    >
                      {copy({ en: "Discard", vi: "Bỏ" })}
                    </button>
                  </div>
                  <div className="mt-2">
                    <UiTextDiff before={before} after={after} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            disabled={drafts.length === 0 || savingAll}
            onClick={() => {
              clearPreview();
              props.onClose();
            }}
          >
            {copy({ en: "Discard all", vi: "Bỏ tất cả" })}
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={drafts.length === 0 || savingAll}
            onClick={() => void saveAll()}
          >
            {savingAll
              ? copy({ en: "Saving…", vi: "Đang lưu…" })
              : copy({ en: "Save all", vi: "Lưu tất cả" })}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
