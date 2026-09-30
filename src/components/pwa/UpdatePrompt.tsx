import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Service worker registration + update banner. `useRegisterSW` no-ops safely
 * during SSR (no `navigator.serviceWorker` there), so this is safe to mount
 * unconditionally from the root route.
 */
export function UpdatePrompt() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Poll for a new version periodically so long-lived tabs still notice updates.
      if (!registration) return;
      setInterval(
        () => {
          registration.update().catch(() => {});
        },
        60 * 60 * 1000,
      );
    },
  });

  const [refreshNeeded] = needRefresh;

  if (!refreshNeeded) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-xs flex-col gap-2 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-lg"
    >
      <p>Une nouvelle version de Jobee Flow est disponible.</p>
      <p className="text-xs text-muted-foreground">Vos données locales sont conservées.</p>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Mettre à jour
      </button>
    </div>
  );
}
