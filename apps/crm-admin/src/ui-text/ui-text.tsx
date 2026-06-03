import { createElement, useRef, type JSX, type MouseEvent } from "react";
import { useUiText } from "./ui-text-provider";

type UiTextValues = Record<string, string | number>;

type UiTextProps = {
  /** Registry key, e.g. "journey.board.title". */
  id: string;
  /** Interpolation values for templates with {placeholders}. */
  values?: UiTextValues;
  /** Wrapper element used only in edit mode (default: span). */
  as?: keyof JSX.IntrinsicElements;
  className?: string;
};

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.7.7V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-1.7-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0-.7-1.7H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .7-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.7-.7V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 1.7.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1Z" />
    </svg>
  );
}

/**
 * In-context editable text. In normal mode this renders the resolved string
 * with zero wrapper (no DOM/layout change). In admin edit mode it wraps the
 * string with a highlight + gear that opens the inline editor for this key.
 *
 * Use for visible text NODES. For strings that must be passed as attributes
 * (title=, placeholder=, aria-label=) keep using `text(key)` from the provider.
 */
export function UiText({ id, values, as = "span", className }: UiTextProps) {
  const { text, isEditMode, openEditor, statusFor } = useUiText();
  const ref = useRef<HTMLElement>(null);
  const resolved = text(id, values);

  if (!isEditMode) {
    return <>{resolved}</>;
  }

  const status = statusFor(id);
  const open = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    openEditor(id, ref.current);
  };

  return createElement(
    as,
    {
      ref,
      className: `uitext is-${status} ${className ?? ""}`.trim(),
      "data-uitext-key": id,
      onClick: open
    },
    resolved,
    <button
      key="__uitext_gear"
      type="button"
      className="uitext-gear"
      aria-label={`Edit UI text: ${resolved}`}
      onClick={open}
    >
      <GearIcon />
    </button>
  );
}
