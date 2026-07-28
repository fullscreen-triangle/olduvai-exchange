import { Html, Head, Main, NextScript } from "next/document";

/**
 * There is no theme-switching script here, and that is deliberate.
 *
 * The template this started from read `localStorage.theme` before hydration and toggled a
 * `dark` class on `<html>`. That machinery exists to serve a choice we no longer offer, and
 * leaving it would be worse than useless: a stale `localStorage.theme = "light"` from an
 * earlier visit would still strip the class, half-rendering the site against light-theme
 * styles that no longer exist.
 *
 * Dark is now the only theme, expressed in `globals.css` as plain colours rather than as a
 * `dark:` variant. `color-scheme` is the part CSS cannot do on its own — it tells the
 * browser to render scrollbars, form controls and the pre-paint canvas dark, which is what
 * removes the white flash on first load.
 */
export default function Document() {
  return (
    <Html lang="en" style={{ colorScheme: "dark" }}>
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#0a0a0b" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
