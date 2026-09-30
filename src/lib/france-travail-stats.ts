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
  valeurPrincipaleTaux?: number;
  valeurPrincipaleDecimale?: number;
  valeurPrincipaleNombre?: number;
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
 * par métier (code ROME) et territoire, sur les derniers trimestres disponibles. Exécuté
 * côté serveur uniquement (identifiants Worker, pas d'appel CORS direct côté client).
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
              ? `Aucune donnée pour ce code ROME / territoire (vérifiez le code métier « ${data.codeActivite} »).`
              : `Statistiques France Travail échouées (${res.status}) : ${body.slice(0, 300) || "réponse vide"}`,
        };
      }
      const json = (await res.json()) as RawStatResponse;
      const periods = (json.listeValeursParPeriode ?? [])
        .map((p) => ({
          code: p.codePeriode ?? "",
          label: p.libPeriode ?? p.codePeriode ?? "",
          tauxPct: p.valeurPrincipaleTaux ?? p.valeurPrincipaleDecimale ?? null,
        }))
        .filter((p) => p.code)
        .sort((a, b) => a.code.localeCompare(b.code));
      return {
        ok: true,
        territoireLabel: json.libTerritoire,
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
