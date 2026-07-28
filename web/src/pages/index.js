import TransitionEffect from "@/components/TransitionEffect";
import Head from "next/head";
import dynamic from "next/dynamic";

// `ssr: false` is required, not merely an optimisation: `<model-viewer>` registers a custom
// element and reads `window` on import, which throws during server rendering.
const EarthViewer = dynamic(() => import("@/components/EarthViewer"), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden="true" />,
});

/**
 * The landing page. The model is the content — there is no copy, no call to action, and no
 * footer, because anything added here would be the thing people actually read and the
 * model would become decoration behind it.
 *
 * The only affordance is the navigation trigger from `_app`, which is why that trigger has
 * to be discoverable on its own.
 */
export default function Landing() {
  return (
    <>
      <Head>
        <title>Olduvai Exchange</title>
        <meta
          name="description"
          content="An agricultural produce exchange built on intrinsic addressing."
        />
        {/* The model is 16 MB and is the entire page: start it in parallel with the JS
            bundle rather than after it. */}
        <link
          rel="preload"
          as="fetch"
          href="/earth_and_moonanimated.glb"
          type="model/gltf-binary"
          crossOrigin="anonymous"
        />
      </Head>
      <TransitionEffect />

      <div className="fixed inset-0 overflow-hidden">
        <EarthViewer className="h-full w-full" />
      </div>
    </>
  );
}
