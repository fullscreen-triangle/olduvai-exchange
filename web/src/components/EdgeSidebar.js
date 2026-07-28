import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

/** How wide the invisible hover strip at the screen edge is. */
const HOTZONE_PX = 24;

/**
 * Delay before a hover-out actually closes the panel.
 *
 * Without it, the cursor crossing a 1px gap or clipping a rounded corner on the way to a
 * link closes the thing being reached for. 220ms is long enough to survive that and short
 * enough not to feel stuck open.
 */
const CLOSE_DELAY_MS = 220;

/**
 * A sidebar invoked by moving the cursor to the edge of the screen.
 *
 * # ⚠️ Hover cannot be the only way in
 *
 * A pointer-only trigger is unreachable by keyboard, unreachable by touch, and unreachable
 * by anyone using a switch or head pointer. Building it that way would put the entire
 * dashboard behind a gesture a real subset of people cannot make. So hover is the *fast*
 * path, not the only one:
 *
 *   - **hover** the edge — the requested gesture;
 *   - **a visible tab** at the edge, which is a real focusable button;
 *   - **`[` and `]`** to toggle the left and right rails;
 *   - **`Esc`**, a click outside, or following a link, to close.
 *
 * The tab is deliberately visible rather than an invisible hotzone with no affordance. An
 * edge that does something on hover and shows nothing otherwise is a feature only people
 * who already know about it can use.
 *
 * # Why this is not modal, unlike `Navbar`
 *
 * `Navbar` traps focus because it covers the page. These rails sit beside content that
 * stays readable and usable, so trapping focus would be wrong — it would mean the panel
 * opening on a stray cursor movement could hold the keyboard hostage. `Esc` and clicking
 * out both work, and `Tab` is free to leave.
 */
export default function EdgeSidebar({
  side = "left",
  title,
  items,
  hotkey,
  footer,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const closeTimer = useRef(null);
  const router = useRouter();
  const isLeft = side === "left";

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = useCallback(() => {
    cancelClose();
    setIsOpen(true);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  const closeNow = useCallback(() => {
    cancelClose();
    setIsOpen(false);
  }, [cancelClose]);

  // Clear any pending timer on unmount, or it fires into a component that is gone.
  useEffect(() => cancelClose, [cancelClose]);

  // Any navigation closes the rail, including back/forward.
  useEffect(() => {
    router.events.on("routeChangeComplete", closeNow);
    return () => router.events.off("routeChangeComplete", closeNow);
  }, [router.events, closeNow]);

  /**
   * Edge detection on the window rather than a hover on a positioned strip.
   *
   * A strip element sits *above* the page, so it would intercept clicks along the whole
   * edge — including on anything the page put there. Reading `clientX` costs one listener
   * and steals no input.
   */
  useEffect(() => {
    const onMove = (e) => {
      // A touch-generated move has no meaningful hover semantics; the tab handles touch.
      if (e.pointerType === "touch") return;

      const atEdge = isLeft
        ? e.clientX <= HOTZONE_PX
        : e.clientX >= window.innerWidth - HOTZONE_PX;

      if (atEdge) open();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [isLeft, open]);

  useEffect(() => {
    const onKeyDown = (e) => {
      // Never steal a keystroke someone is typing into the composer.
      const tag = document.activeElement?.tagName;
      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        document.activeElement?.isContentEditable;

      if (!typing && e.key === hotkey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen((v) => !v);
        return;
      }
      if (isOpen && e.key === "Escape") {
        e.preventDefault();
        closeNow();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, hotkey, closeNow]);

  // A click anywhere outside closes it. Registered only while open, so the common case
  // costs nothing.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e) => {
      if (!panelRef.current?.contains(e.target)) closeNow();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [isOpen, closeNow]);

  const edge = isLeft ? "left-0" : "right-0";
  const offscreen = isLeft ? "-100%" : "100%";

  return (
    <>
      {/* The keyboard- and touch-reachable way in. Hidden while the panel is open so it
          does not sit on top of the panel it opened. */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          onFocus={open}
          aria-expanded={false}
          aria-label={`Open ${title.toLowerCase()}`}
          className={`group fixed top-1/2 z-40 -translate-y-1/2 border border-border bg-surface/80 px-1.5 py-6 transition-colors hover:bg-surfaceHover ${
            isLeft
              ? "left-0 rounded-r-lg border-l-0"
              : "right-0 rounded-l-lg border-r-0"
          }`}
        >
          <span className="sr-only">{title}</span>
          <span
            aria-hidden="true"
            className="block h-8 w-px bg-muted transition-colors group-hover:bg-light"
          />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            ref={panelRef}
            aria-label={title}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className={`fixed ${edge} top-0 z-40 flex h-full w-72 max-w-[85vw] flex-col border-border bg-surface/95 px-4 pb-6 pt-20 backdrop-blur-sm ${
              isLeft ? "border-r" : "border-l"
            }`}
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.24 }}
          >
            <p className="mb-3 px-3 text-[11px] uppercase tracking-[0.2em] text-muted/70">
              {title}
            </p>

            <ul className="flex flex-col gap-0.5 overflow-y-auto">
              {items.map(({ href, label, blurb }) => {
                const active = router.pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={closeNow}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2.5 transition-colors ${
                        active
                          ? "bg-surfaceHover"
                          : "hover:bg-surfaceHover/70"
                      }`}
                    >
                      <span
                        className={`block text-sm ${
                          active ? "text-light" : "text-muted"
                        }`}
                      >
                        {label}
                      </span>
                      {blurb && (
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted/60">
                          {blurb}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto pt-6">
              {footer}
              <p className="mt-3 px-3 text-[11px] text-muted/60">
                <kbd className="rounded border border-border px-1 py-0.5 font-sans">
                  {hotkey}
                </kbd>{" "}
                to toggle,{" "}
                <kbd className="rounded border border-border px-1 py-0.5 font-sans">
                  Esc
                </kbd>{" "}
                to close.
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
