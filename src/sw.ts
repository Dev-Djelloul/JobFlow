/// <reference lib="webworker" />

// Custom service worker (injectManifest mode). TanStack Start renders HTML per request
// (no static index.html to precache), so the app shell for each route is captured at
// runtime on first visit and replayed offline — see `pagesStrategy` below. This file
// only ever touches build assets and rendered HTML documents; localStorage data never
// goes through the network or this cache.
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import type { WorkboxPlugin } from "workbox-core/types";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const OFFLINE_URL = "/offline.html";
const OFFLINE_CACHE = "offline-fallback";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)));
});

const pagesStrategy = new NetworkFirst({
  cacheName: "pages",
  networkTimeoutSeconds: 3,
  plugins: [
    new ExpirationPlugin({
      maxEntries: 40,
      maxAgeSeconds: 60 * 60 * 24 * 30,
    }) as WorkboxPlugin,
  ],
});

// Navigations: replay the last-cached render of this exact route when offline, and only
// fall back to the friendly offline page for a route never successfully visited before.
registerRoute(
  ({ request }) => request.mode === "navigate",
  async (params) => {
    try {
      return await pagesStrategy.handle(params);
    } catch {
      const cache = await caches.open(OFFLINE_CACHE);
      const cached = await cache.match(OFFLINE_URL);
      return cached ?? Response.error();
    }
  },
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({ cacheName: "google-fonts-stylesheets" }),
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }) as WorkboxPlugin,
    ],
  }),
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
