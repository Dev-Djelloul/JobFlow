import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire";
const STATS_URL =
  "https://api.francetravail.io/partenaire/stats-entrees-sorties-formations/v1/indicateur/stat-acces-emploi-sorties-formation";

/** Erreur porteuse d'un message détaillé destiné à remonter tel quel jusqu'au client. */
class FranceTravailStatsError extends Error {}

// Jeton dédié à cette API : le scope diffère de celui de la recherche d'offres
// (api_offresdemploiv2), donc un jeton obtenu pour l'une ne fonctionne pas pour l'autre.
async function getStatsAccessToken(): Promise<string> {
  const clientId = process.env["FT_CLIENT_ID"];
  const clientSecret = process.env["FT_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new FranceTravailStatsError(
      "France Travail non configuré : variables FT_CLIENT_ID / FT_CLIENT_SECRET manquantes sur le Worker.",
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "accesemploiDEformes api_stats-entrees-sorties-formationsv1",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new FranceTravailStatsError(
      `Authentification France Travail (statistiques) échouée (${res.status}) : ${body.slice(0, 300) || "réponse vide"}`,
    );
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token)
    throw new FranceTravailStatsError(
      "Authentification France Travail (statistiques) : jeton manquant dans la réponse.",
    );
  return json.access_token;
}

interface RawPeriodValue {
  codePeriode?: string;
  libPeriode?: string;
  codeTypeTerritoire?: string;
  codeTerritoire?: string;
  libTerritoire?: string;
  valeurPrincipaleTaux?: number;
  valeurPrincipaleDecimale?: number;
  valeurPrincipaleNombre?: number;
  valeurPrincipalePourcentage?: number;
  valeurSecondaireTaux?: number;
  valeurSecondairePourcentage?: number;
  valeurSecondairePourcentage2?: number;
}

interface RawStatResponse {
  libIndicateur?: string;
  libTerritoire?: string;
  listeValeursParPeriode?: RawPeriodValue[];
}

export interface AccesEmploiPeriod {
  code: string;
  label: string;
  tauxPct: number | null;
  territoireCode?: string | undefined;
  territoireLabel?: string | undefined;
}

export interface AccesEmploiStatsResult {
  ok: boolean;
  territoireLabel?: string | undefined;
  indicateurLabel?: string | undefined;
  periods: AccesEmploiPeriod[];
  error?: string;
}

/**
 * Statistiques France Travail — taux d'accès à l'emploi à 6 mois des sortants de formation,
 * par domaine de formation (code FORM14) et territoire, sur les derniers trimestres
 * disponibles. Exécuté côté serveur uniquement (identifiants Worker, pas d'appel CORS direct
 * côté client).
 */
export const fetchAccesEmploiStats = createServerFn({ method: "POST" })
  .validator(
    z.object({
      codeTypeTerritoire: z.enum(["DEP", "REG"]),
      codeTerritoire: z.string().trim().min(1).max(10),
      codeActivite: z.string().trim().min(1).max(20),
    }),
  )
  .handler(async ({ data }): Promise<AccesEmploiStatsResult> => {
    try {
      const token = await getStatsAccessToken();
      const res = await fetch(STATS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          codeTypeTerritoire: data.codeTypeTerritoire,
          codeTerritoire: data.codeTerritoire,
          codeTypeActivite: "FORM14",
          codeActivite: data.codeActivite.toUpperCase(),
          codeTypePeriode: "TRIMESTRE",
          codeTypeNomenclature: "ACCESEMP",
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          periods: [],
          error:
            res.status === 404
              ? `Aucune donnée pour ce domaine de formation / territoire (vérifiez le code « ${data.codeActivite} »).`
              : `Statistiques France Travail échouées (${res.status}) : ${body.slice(0, 300) || "réponse vide"}`,
        };
      }
      const json = (await res.json()) as RawStatResponse;
      // Selon l'indicateur, la valeur en pourcentage peut atterrir dans plusieurs champs
      // différents (valeur "principale" ou "secondaire", taux ou pourcentage) — on prend le
      // premier champ numérique disponible plutôt que de parier sur un seul nom de champ.
      const periods = (json.listeValeursParPeriode ?? [])
        .map((p) => ({
          code: p.codePeriode ?? "",
          label: p.libPeriode ?? p.codePeriode ?? "",
          tauxPct:
            p.valeurPrincipaleTaux ??
            p.valeurPrincipalePourcentage ??
            p.valeurSecondaireTaux ??
            p.valeurSecondairePourcentage ??
            p.valeurSecondairePourcentage2 ??
            p.valeurPrincipaleDecimale ??
            null,
          territoireCode: p.codeTerritoire,
          territoireLabel: p.libTerritoire,
        }))
        .filter((p) => p.code)
        .sort((a, b) => a.code.localeCompare(b.code));
      return {
        ok: true,
        territoireLabel: json.libTerritoire ?? periods.at(-1)?.territoireLabel,
        indicateurLabel: json.libIndicateur,
        periods,
      };
    } catch (e) {
      return {
        ok: false,
        periods: [],
        error: e instanceof Error ? e.message : "Erreur inconnue.",
      };
    }
  });

interface RawActivite {
  codeActivite?: string;
  libelleActivite?: string;
}

export interface ActiviteOption {
  code: string;
  label: string;
}

// Cache mémoire du référentiel complet (le Worker reste "chaud" entre requêtes) : la liste des
// domaines de formation FORM14 ne change quasiment jamais, et le paramètre "filtreActivite" de
// l'API filtre par préfixe de code (ex: "A12"), pas par mot du libellé — impossible d'y passer
// un mot-clé saisi par l'utilisateur. On récupère donc la liste une fois et on filtre nous-mêmes
// sur le libellé.
let activitesCache: ActiviteOption[] | null = null;
let activitesCacheAt = 0;
const ACTIVITES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

async function loadAllFormationActivites(): Promise<ActiviteOption[]> {
  if (activitesCache && Date.now() - activitesCacheAt < ACTIVITES_CACHE_TTL_MS) {
    return activitesCache;
  }
  const token = await getStatsAccessToken();
  const res = await fetch(
    "https://api.francetravail.io/partenaire/stats-entrees-sorties-formations/v1/referentiel/activites/FORM14",
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new FranceTravailStatsError(
      `Référentiel des domaines de formation échoué (${res.status}) : ${body.slice(0, 300) || "réponse vide"}`,
    );
  }
  const json = (await res.json()) as { activites?: RawActivite[] };
  const options = (json.activites ?? [])
    .filter((a): a is Required<RawActivite> => !!a.codeActivite && !!a.libelleActivite)
    .map((a) => ({ code: a.codeActivite, label: a.libelleActivite }));
  activitesCache = options;
  activitesCacheAt = Date.now();
  return options;
}

/**
 * Recherche dans le référentiel des domaines de formation FORM14 par mot-clé du libellé —
 * laisse choisir un domaine sans avoir à connaître son code à l'avance. Un domaine correspond
 * dès qu'un seul des mots tapés apparaît dans son libellé (les domaines correspondant à
 * plusieurs mots à la fois remontent en premier).
 */
export const searchFormationActivities = createServerFn({ method: "GET" })
  .validator(z.object({ filtre: z.string().trim().max(100).optional() }))
  .handler(
    async ({ data }): Promise<{ ok: boolean; options: ActiviteOption[]; error?: string }> => {
      try {
        const all = await loadAllFormationActivites();
        if (!data.filtre) return { ok: true, options: all.slice(0, 20) };
        const words = stripAccents(data.filtre)
          .split(/\s+/)
          .filter((w) => w.length > 1);
        const scored = all
          .map((a) => {
            const label = stripAccents(a.label);
            const score = words.filter((w) => label.includes(w)).length;
            return { option: a, score };
          })
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score || a.option.label.localeCompare(b.option.label));
        return { ok: true, options: scored.map((s) => s.option) };
      } catch (e) {
        return {
          ok: false,
          options: [],
          error: e instanceof Error ? e.message : "Erreur inconnue.",
        };
      }
    },
  );

/** Liste complète du référentiel des domaines de formation FORM14, triée par libellé — pour un
 * panneau récapitulatif affichant tous les domaines disponibles. */
export const listAllFormationActivities = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; options: ActiviteOption[]; error?: string }> => {
    try {
      const all = await loadAllFormationActivites();
      return { ok: true, options: [...all].sort((a, b) => a.label.localeCompare(b.label)) };
    } catch (e) {
      return {
        ok: false,
        options: [],
        error: e instanceof Error ? e.message : "Erreur inconnue.",
      };
    }
  },
);
