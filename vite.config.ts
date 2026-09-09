// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        // injectManifest: TanStack Start renders HTML per request (no static index.html to
        // precache with generateSW), so src/sw.ts caches each route's rendered document at
        // runtime on first visit instead. See src/sw.ts for the actual caching strategy.
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        // No auto-reload: we control the update prompt ourselves (src/components/pwa/UpdatePrompt.tsx)
        // so a new version never replaces the running shell without user consent.
        registerType: "prompt",
        injectRegister: null,
        manifest: false, // we ship a hand-written public/manifest.webmanifest instead
        includeAssets: ["favicon.ico", "icons/*.png", "offline.html"],
        // nitro/TanStack Start emit the client build to .output/public, not Vite's default dist/.
        outDir: ".output/public",
        // Lets the service worker run under `vite dev` too, so offline behavior can be
        // exercised without a full Cloudflare Worker preview.
        devOptions: { enabled: true, type: "module" },
        injectManifest: {
          // App-shell build assets only. localStorage data never goes through HTTP, so
          // it's never a caching concern here; rendered HTML is handled at runtime in sw.ts.
          globPatterns: ["**/*.{js,css,ico,png,svg,woff,woff2}"],
        },
      }),
    ],
  },
});
