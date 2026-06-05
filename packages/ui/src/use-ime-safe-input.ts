import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type CompositionEvent
} from "react";

/**
 * Makes a controlled text input safe for IME composition (Vietnamese Telex/VNI,
 * Chinese, Japanese, Korean, ...).
 *
 * The bug it prevents: a controlled `<input>` whose `value` is re-rendered from
 * lagging state (e.g. URL search params updated under `startTransition`, debounced
 * state, or any async store) gets its DOM value reset *mid-composition*. The IME
 * then re-emits the base character, so typing Telex "Nhim" + tone produces
 * "Nhiím" instead of "Nhím".
 *
 * Strategy:
 *  - Drive the DOM from a synchronous local mirror (`innerValue`) so the value is
 *    never reset while the user is mid-keystroke.
 *  - While a composition is in progress, hold back `onChange` so parent/store
 *    state (and any re-render it triggers) cannot disturb the composition. The
 *    final value is forwarded once on `compositionend`.
 *  - When not composing, mirror the controlled `value` prop so external resets,
 *    clears, and transforms keep working.
 *
 * Returns props to spread onto a controlled `<input>` or `<textarea>`. Only use
 * for controlled fields (a defined `value`); leave uncontrolled fields untouched.
 */
export function useImeSafeInput<
  E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement
>(value: string | undefined, onChange?: ChangeEventHandler<E>) {
  const composingRef = useRef(false);
  const [innerValue, setInnerValue] = useState(value ?? "");

  // Mirror the controlled value when not mid-composition. This keeps external
  // resets/clears/transforms working while never overwriting the DOM during IME
  // composition.
  useEffect(() => {
    if (!composingRef.current) setInnerValue(value ?? "");
  }, [value]);

  return {
    value: innerValue,
    onChange(event: ChangeEvent<E>) {
      setInnerValue(event.target.value);
      // Defer propagation until composition ends so the controlled value isn't
      // reset under the IME. Latin/ASCII typing never fires composition events,
      // so this branch is skipped and behaviour is unchanged.
      if (composingRef.current) return;
      onChange?.(event);
    },
    onCompositionStart() {
      composingRef.current = true;
    },
    onCompositionEnd(event: CompositionEvent<E>) {
      composingRef.current = false;
      setInnerValue(event.currentTarget.value);
      // Forward the committed text once. compositionend fires after the last
      // input event, so the parent receives the final, correctly-composed value.
      onChange?.(event as unknown as ChangeEvent<E>);
    }
  };
}
