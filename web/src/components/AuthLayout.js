import Link from "next/link";

/**
 * The frame both auth pages share, so they cannot drift apart visually.
 *
 * The form fields are the only thing that differs between sign-in and sign-up, and keeping
 * everything else here means a change to one is a change to both.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm animate-fade-in">
        <Link
          href="/"
          className="mb-10 block text-center text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-light"
        >
          Olduvai Exchange
        </Link>

        <h1 className="text-center text-2xl font-normal tracking-tight text-light">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-muted">{subtitle}</p>
        )}

        <div className="mt-8">{children}</div>

        {footer && (
          <p className="mt-8 text-center text-sm text-muted">{footer}</p>
        )}
      </div>
    </div>
  );
}

/**
 * A labelled field.
 *
 * The label is a real `<label>` rather than a placeholder. Placeholder-as-label disappears
 * the moment someone starts typing, which is exactly when they most need to check what the
 * field wanted — and screen readers get nothing stable to announce.
 */
export function Field({
  id,
  label,
  type = "text",
  autoComplete,
  required = true,
  hint,
  ...rest
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-muted"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-light outline-none transition-colors placeholder:text-muted/60 focus:border-muted/60"
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[11px] text-muted/80">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-dark transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
