import { motion } from "framer-motion";

/**
 * The page-transition wipe.
 *
 * Rewritten from the template's version, which used `dark:` variants — now disabled — and
 * whose third layer wiped `bg-light` across the viewport. On a permanently dark site that
 * read as a white flash on every navigation, which is precisely what a dark theme exists to
 * avoid. The layers now stay within the dark palette, with a single accent pass.
 *
 * `pointer-events-none` matters: the panels sit above the page during the wipe, and without
 * it a fast click after navigating lands on a decorative div instead of the link under it.
 */
const LAYERS = [
  { className: "z-30 bg-primary", delay: 0 },
  { className: "z-20 bg-surface", delay: 0.2 },
  { className: "z-10 bg-dark", delay: 0.4 },
];

export default function TransitionEffect() {
  return (
    <>
      {LAYERS.map(({ className, delay }) => (
        <motion.div
          key={className}
          className={`pointer-events-none fixed bottom-0 right-full top-0 h-screen w-screen ${className}`}
          initial={{ x: "100%", width: "100%" }}
          animate={{ x: "0%", width: "0%" }}
          transition={{ delay, duration: 0.8, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}
