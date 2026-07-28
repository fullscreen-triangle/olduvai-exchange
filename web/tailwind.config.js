/** @type {import('tailwindcss').Config} */
const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],

  // ⭐ Not "class", and not "media" — the `dark:` variant is switched off entirely.
  //
  // The site has one theme. If the variant still existed, `dark:` classes would be
  // authorable and would silently never match, which is the worst of the options: styles
  // that look intentional in the source and do nothing in the browser. Disabling it makes
  // any leftover `dark:` an unknown-variant build error instead.
  darkMode: [],

  theme: {
    extend: {
      fontFamily: {
        mont: ["var(--font-mont)", ...fontFamily.sans],
      },
      colors: {
        // A near-black rather than pure #000: on OLED, pure black against dim text makes
        // the smearing on scroll much more visible, and it leaves no room for a surface
        // that reads as *behind* the page.
        dark: "#0a0a0b",
        surface: "#141416",
        surfaceHover: "#1c1c20",
        border: "#26262b",
        light: "#ececee",
        muted: "#8a8a94",
        primary: "#c2703f",
        primaryDark: "#e0accd",
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out both",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "none" },
        },
      },
    },

    // The template inverted every breakpoint to `max-width`, which silently reverses what
    // `md:` means and traps anyone writing a new component against Tailwind's own docs.
    // Restored to the standard mobile-first direction.
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },

  plugins: [
    function ({ addVariant }) {
      addVariant("child", "& > *");
      addVariant("child-hover", "& > *:hover");
    },
  ],
};
