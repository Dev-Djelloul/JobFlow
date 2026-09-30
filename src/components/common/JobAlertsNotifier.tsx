import { useEffect, useRef } from "react";
import { loadAlerts, refreshAllAlerts, saveAlerts } from "@/lib/job-alerts";
import { useSettings } from "@/hooks/useSettings";

const NOTIFIED_KEY = "jobflow.offres.notified.v1";
// Intervalle de scrutation du composant — chaque alerte se limite elle-même à une vérification
// réelle toutes les 10 minutes (refreshAlertIfDue), ce polling ne fait donc que "réveiller"
// périodiquement la vérification, sans multiplier les appels aux API.
const POLL_INTERVAL_MS = 2 * 60 * 1000;
const MAX_NOTIFIED_IDS = 500;

function loadNotified(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NOTIFIED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function saveNotified(data: Record<string, string[]>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(data));
}

/**
 * Vérifie périodiquement les alertes emploi en arrière-plan (pas seulement quand la page
 * Offres est ouverte) et déclenche une notification système pour chaque nouvelle offre
 * détectée — actif uniquement tant que JobFlow tourne dans un onglet, pas de serveur/push.
 */
export function JobAlertsNotifier() {
  const { settings, hydrated } = useSettings();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !settings.desktopNotifications) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    async function tick() {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        if (Notification.permission !== "granted") return;
        const alerts = loadAlerts();
        if (alerts.length === 0) return;
        const refreshed = await refreshAllAlerts(alerts);
        saveAlerts(refreshed);

        const notified = loadNotified();
        let changed = false;
        for (const alert of refreshed) {
          const already = new Set(notified[alert.id] ?? []);
          const fresh = alert.pendingOfferIds.filter((id) => !already.has(id));
          if (fresh.length === 0) continue;
          changed = true;
          notified[alert.id] = [...already, ...fresh].slice(-MAX_NOTIFIED_IDS);

          const n = new Notification(
            fresh.length === 1
              ? `Nouvelle offre — ${alert.name}`
              : `${fresh.length} nouvelles offres — ${alert.name}`,
            {
              body:
                fresh.length === 1
                  ? "Une nouvelle offre correspond à votre alerte."
                  : `${fresh.length} nouvelles offres correspondent à votre alerte.`,
              icon: "/icons/icon-192.png",
              tag: `jobflow-alert-${alert.id}`,
            },
          );
          n.onclick = () => {
            window.focus();
            const params = new URLSearchParams({
              alertId: alert.id,
              offerIds: fresh.join(","),
            });
            window.location.href = `/offres?${params.toString()}`;
          };
        }
        if (changed) saveNotified(notified);
      } finally {
        runningRef.current = false;
      }
    }

    void tick();
    const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hydrated, settings.desktopNotifications]);

  return null;
}
