import { searchAdzunaOffers } from "./adzuna";
import { searchFranceTravailOffers } from "./france-travail";
import { mapContractType, type OfferSource } from "./job-offers";
import type { ContractType } from "@/types/application";

/**
 * Alertes emploi — 100 % locales (aucun backend) : une vraie alerte "push" demanderait un
 * serveur qui tourne en permanence pour surveiller les API et un système de notifications
 * push (VAPID, abonnement navigateur), ce qui casserait l'architecture 100 % locale de
 * JobFlow. Ici, chaque alerte est une recherche enregistrée que l'on relance périodiquement
 * (au maximum une fois toutes les 10 minutes, pour ne pas consommer inutilement le quota des
 * API) en comparant les résultats aux offres déjà vues.
 */
export interface JobAlert {
  id: string;
  name: string;
  motsCles: string;
  location: string;
  source: OfferSource;
  /** "" = tous les contrats. */
  typeContrat: ContractType | "";
  createdAt: string;
  lastCheckedAt: string | null;
  /** Offres déjà consultées via cette alerte — ne comptent plus comme "nouvelles". */
  seenOfferIds: string[];
  /** Offres détectées à la dernière vérification et pas encore consultées. */
  pendingOfferIds: string[];
}

export type JobAlertInput = Pick<
  JobAlert,
  "name" | "motsCles" | "location" | "source" | "typeContrat"
>;

const ALERTS_KEY = "jobflow.offres.alerts.v1";
// Fréquence minimale entre deux vérifications d'une même alerte, pour rester raisonnable
// vis-à-vis des quotas des API (France Travail, Adzuna).
const CHECK_INTERVAL_MS = 10 * 60 * 1000;
// Borne la liste des offres vues par alerte pour éviter une croissance illimitée du localStorage.
const MAX_SEEN_IDS = 400;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `alert-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function loadAlerts(): JobAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Migration douce : les alertes créées avant l'ajout de pendingOfferIds n'en ont pas.
    return (parsed as JobAlert[]).map((a) => ({
      ...a,
      seenOfferIds: Array.isArray(a.seenOfferIds) ? a.seenOfferIds : [],
      pendingOfferIds: Array.isArray(a.pendingOfferIds) ? a.pendingOfferIds : [],
    }));
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: JobAlert[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function createAlert(input: JobAlertInput): JobAlert {
  return {
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
    lastCheckedAt: null,
    seenOfferIds: [],
    pendingOfferIds: [],
  };
}

/**
 * Relance la recherche d'une alerte si sa dernière vérification date de plus de
 * CHECK_INTERVAL_MS, et met à jour sa liste d'offres en attente. Ne modifie rien si la
 * vérification n'est pas due, ou en cas d'erreur réseau (on garde le dernier état connu
 * plutôt que d'effacer les offres en attente sur un simple aléa réseau).
 */
export async function refreshAlertIfDue(
  alert: JobAlert,
  options?: { force?: boolean },
): Promise<JobAlert> {
  const due =
    options?.force ||
    !alert.lastCheckedAt ||
    Date.now() - new Date(alert.lastCheckedAt).getTime() > CHECK_INTERVAL_MS;
  if (!due) return alert;

  const motsCles = alert.motsCles.trim();
  if (!motsCles) return alert;

  try {
    const result =
      alert.source === "france_travail"
        ? await searchFranceTravailOffers({
            data: {
              motsCles,
              page: 0,
              pageSize: 20,
              ...(alert.location.trim() ? { departement: alert.location.trim() } : {}),
            },
          })
        : await searchAdzunaOffers({
            data: {
              motsCles,
              page: 0,
              pageSize: 20,
              ...(alert.location.trim() ? { lieu: alert.location.trim() } : {}),
            },
          });
    if (!result.ok) return alert;

    const seen = new Set(alert.seenOfferIds);
    const matching = alert.typeContrat
      ? result.offers.filter((o) => mapContractType(o) === alert.typeContrat)
      : result.offers;
    const pendingOfferIds = matching.filter((o) => !seen.has(o.id)).map((o) => o.id);
    return { ...alert, lastCheckedAt: new Date().toISOString(), pendingOfferIds };
  } catch {
    return alert;
  }
}

/** Relance toutes les alertes dues (en parallèle) et retourne la liste mise à jour. */
export async function refreshAllAlerts(alerts: JobAlert[]): Promise<JobAlert[]> {
  return Promise.all(alerts.map((a) => refreshAlertIfDue(a)));
}

/** Marque les offres en attente d'une alerte comme vues, après consultation par l'utilisateur. */
export function markAlertSeen(alert: JobAlert): JobAlert {
  const merged = [...alert.pendingOfferIds, ...alert.seenOfferIds].slice(0, MAX_SEEN_IDS);
  return { ...alert, seenOfferIds: merged, pendingOfferIds: [] };
}
