import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/home", label: "Composer" },
  { href: "/signin", label: "Sign in" },
  { href: "/signup", label: "Sign up" },
];

/**
 * A navigation bar that is absent until invoked.
 *
 * # What "invoked" means here
 *
 * Three ways in, because a menu with a single trigger is a menu some people cannot open:
 *
 *   - the trigger button, fixed top-left;
 *   - `Ctrl/⌘ + K`, the shortcut people already have in their fingers;
 *   - `Esc`, the backdrop, or following a link, to close.
 *
 * # Why focus is managed by hand
 *
 * An overlay that traps nothing lets `Tab` walk into the page behind it, where the focus
 * ring sits under a backdrop and is invisible — the keyboard user is then somewhere they
 * cannot see with no obvious way back. So focus moves into the panel on open, cycles
 * within it, and returns to the trigger on close.
 */
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const router = useRouter();

  const close = useCallback(() => setIsOpen(false), []);

  // Any navigation closes the menu, including a back/forward that React never initiated.
  useEffect(() => {
    router.events.on("routeChangeComplete", close);
    return () => router.events.off("routeChangeComplete", close);
  }, [router.events, close]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
        return;
      }
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === "Tab") {
        const focusables = panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables?.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        // Wrap at both ends, so focus cannot leave the panel while it is open.
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  // Move focus in on open and back to the trigger on close. Without the second half, focus
  // is left on a node that no longer exists and the next Tab restarts from the document.
  useEffect(() => {
    if (!isOpen) {
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }
    panelRef.current?.querySelector("a[href], button")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Open navigation"
        className="group fixed left-5 top-5 z-50 flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-lg border border-transparent transition-colors hover:border-border hover:bg-surface/70"
      >
        <span className="block h-px w-5 bg-muted transition-colors group-hover:bg-light" />
        <span className="block h-px w-5 bg-muted transition-colors group-hover:bg-light" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div
              className="absolute inset-0 bg-dark/70 backdrop-blur-sm"
              onClick={close}
              aria-hidden="true"
            />

            <motion.nav
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-surface/95 px-5 pb-8 pt-20"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "tween",
                ease: [0.22, 1, 0.36, 1],
                duration: 0.28,
              }}
            >
              <ul className="flex flex-col gap-1">
                {LINKS.map(({ href, label }) => {
                  const active = router.pathname === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? "bg-surfaceHover text-light"
                            : "text-muted hover:bg-surfaceHover hover:text-light"
                        }`}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto space-y-3 pt-8">
                <Link
                  href="/"
                  onClick={close}
                  className="block text-xs text-muted transition-colors hover:text-light"
                >
                  Olduvai Exchange
                </Link>
                <p className="text-[11px] leading-relaxed text-muted/70">
                  <kbd className="rounded border border-border px-1 py-0.5 font-sans">
                    Esc
                  </kbd>{" "}
                  to close,{" "}
                  <kbd className="rounded border border-border px-1 py-0.5 font-sans">
                    ⌘K
                  </kbd>{" "}
                  to toggle.
                </p>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
