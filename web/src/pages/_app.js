import Navbar from "@/components/Navbar";
import "@/styles/globals.css";
import { AnimatePresence } from "framer-motion";
import { Montserrat } from "next/font/google";
import Head from "next/head";
import { useRouter } from "next/router";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-mont" });

/**
 * There is no `<Footer />` and no theme provider.
 *
 * The footer was the template's; a landing page described as minimal does not carry one.
 * The theme provider is gone because the site has exactly one theme — see `_document.js`
 * for why removing the switcher outright is safer than leaving it pinned to dark.
 */
export default function App({ Component, pageProps }) {
  const router = useRouter();

  // The dashboard carries its own navigation — the two edge rails. Mounting the overlay
  // navbar there too would put a third trigger on the same screen, and its top-left button
  // would sit directly over the left rail's tab.
  const isDashboard = router.pathname.startsWith("/dashboard");

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/final_favicon_48.png" />
        <title>Olduvai Exchange</title>
      </Head>
      <main
        className={`${montserrat.variable} min-h-screen w-full bg-dark font-mont text-light`}
      >
        {!isDashboard && <Navbar />}
        <AnimatePresence initial={false} mode="wait">
          <Component key={router.asPath} {...pageProps} />
        </AnimatePresence>
      </main>
    </>
  );
}
