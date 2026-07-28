import { useEffect, useRef, useState } from "react";

const MAX_ROWS_PX = 320;

/**
 * The centred text box.
 *
 * # Enter submits, Shift+Enter breaks the line
 *
 * This is the convention every comparable composer uses, so it is what people's hands
 * expect. The exception is while an IME composition is active — during Japanese, Chinese or
 * Korean input, `Enter` commits the candidate, and submitting there would eat the word
 * someone was in the middle of typing. `isComposing` is the guard for that.
 *
 * # Why it grows rather than scrolls
 *
 * A fixed-height box makes a long description feel unwelcome, and long descriptions are
 * exactly what the system wants — a described participant is what the filtering works on.
 * It grows to `MAX_ROWS_PX` and only then scrolls.
 */
export default function Composer({
  placeholder = "Describe what you have, or what you need",
  onSubmit,
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const ref = useRef(null);

  // Reset to `auto` first: without it `scrollHeight` never reports a value smaller than the
  // current height, so the box grows and never shrinks back.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [value]);

  const canSubmit = value.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    setPending(true);
    try {
      await onSubmit?.(value.trim());
      setValue("");
    } finally {
      setPending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing) return; // mid-IME-composition; not a submit
    e.preventDefault();
    submit();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="w-full"
    >
      <div className="rounded-2xl border border-border bg-surface transition-colors focus-within:border-muted/60">
        <label htmlFor="composer" className="sr-only">
          {placeholder}
        </label>
        <textarea
          id="composer"
          ref={ref}
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          className="block w-full resize-none bg-transparent px-4 pt-4 text-[15px] leading-relaxed text-light outline-none placeholder:text-muted"
        />

        <div className="flex items-center justify-between px-3 pb-3 pt-2">
          <span className="pl-1 text-[11px] text-muted/70">
            <kbd className="rounded border border-border px-1 py-0.5 font-sans">
              ⇧↵
            </kbd>{" "}
            for a new line
          </span>

          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Send"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-dark transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}
