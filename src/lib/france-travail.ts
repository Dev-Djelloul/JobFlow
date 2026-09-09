import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

/** Sous-ensemble des champs utiles d'une offre France Travail — le reste est ignoré. */
export interface FranceTravailOffer {
  id: string;
  intitule: string;
  description: string;
  dateCreation: string;
  entreprise: string;
  lieu: string;
  typeContrat: string;
  typeContratLibelle: string;
  salaire: string;
  url: string;
  /** Libellé lisible du niveau d'expérience demandé (ex. "Débutant accepté", "Expérience exigée de 2 ans"). */
  experienceLibelle: string;
  /** Code d'exigence France Travail : D = débutant accepté, S = souhaitée, E = exigée. */
  experienceExige: string;
}

interface RawFtOffer {
  id: string;
  intitule?: string;
  description?: string;
  dateCreation?: string;
  entreprise?: { nom?: string };
  lieuTravail?: { libelle?: string };
  typeContrat?: string;
  typeContratLibelle?: string;
  salaire?: { libelle?: string };
  origineOffre?: { urlOrigine?: string };
  experienceLibelle?: string;
  experienceExige?: string;
}

/** Erreur porteuse d'un message détaillé destiné à remonter tel quel jusqu'au client. */
class FranceTravailError extends Error {}

async function getAccessToken(): Promise<string> {
  const clientId = process.env["FT_CLIENT_ID"];
  const clientSecret = process.env["FT_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new FranceTravailError(
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
      scope: "api_offresdemploiv2 o2dsoffre",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new FranceTravailError(
      `Authentification France Travail échouée (${res.status}) : ${body.slice(0, 300) || "réponse vide"}`,
    );
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token)
    throw new FranceTravailError(
      "Authentification France Travail : jeton manquant dans la réponse.",
    );
  return json.access_token;
}

function mapOffer(raw: RawFtOffer): FranceTravailOffer {
  return {
    id: raw.id,
    intitule: raw.intitule ?? "",
    description: raw.description ?? "",
    dateCreation: raw.dateCreation ?? "",
    entreprise: raw.entreprise?.nom ?? "",
    lieu: raw.lieuTravail?.libelle ?? "",
    typeContrat: raw.typeContrat ?? "",
    typeContratLibelle: raw.typeContratLibelle ?? "",
    salaire: raw.salaire?.libelle ?? "",
    url: raw.origineOffre?.urlOrigine ?? "",
    experienceLibelle: raw.experienceLibelle ?? "",
    experienceExige: raw.experienceExige ?? "",
  };
}

/**
 * Recherche d'offres France Travail — exécutée côté serveur uniquement : les identifiants
 * d'API ne doivent jamais atteindre le navigateur, et l'API ne permet pas les appels CORS
 * directs depuis un site tiers.
 */
export interface FranceTravailSearchResult {
  ok: boolean;
  offers: FranceTravailOffer[];
  /** Nombre total de résultats côté France Travail, pour savoir s'il reste des pages à charger. */
  total?: number;
  /** Détail de l'erreur, affiché tel quel côté client pour faciliter le diagnostic. */
  error?: string;
}

// L'API France Travail limite chaque appel à 150 offres maximum (span de "range").
const MAX_PAGE_SIZE = 150;

export const searchFranceTravailOffers = createServerFn({ method: "GET" })
  .validator(
    z.object({
      motsCles: z.string().trim().min(1).max(200),
      departement: z.string().trim().max(3).optional(),
      typeContrat: z.string().trim().max(10).optional(),
      /** Nombre d'offres par page, choisi côté client (20 à 150). */
      pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
      /** Index de la page à charger (0-based) — permet le "Voir plus d'offres" côté client. */
      page: z.number().int().min(0).max(50).default(0),
    }),
  )
  .handler(async ({ data }): Promise<FranceTravailSearchResult> => {
    try {
      const token = await getAccessToken();
      const url = new URL(SEARCH_URL);
      url.searchParams.set("motsCles", data.motsCles);
      if (data.departement) url.searchParams.set("departement", data.departement);
      if (data.typeContrat) url.searchParams.set("typeContrat", data.typeContrat);
      const start = data.page * data.pageSize;
      url.searchParams.set("range", `${start}-${start + data.pageSize - 1}`);
      url.searchParams.set("sort", "1"); // tri par date de création décroissante

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      // L'API répond 206 (Partial Content) en cas de succès paginé, 200 sinon.
      if (!res.ok && res.status !== 206) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          offers: [],
          error: `Recherche France Travail échouée (${res.status}) : ${body.slice(0, 300) || "réponse vide"}`,
        };
      }
      // Content-Range: "offres 0-19/532" — le total après le "/" indique s'il reste des pages.
      const contentRange = res.headers.get("Content-Range");
      const total = contentRange ? Number(contentRange.split("/")[1]) : undefined;
      const json = (await res.json()) as { resultats?: RawFtOffer[] };
      return {
        ok: true,
        offers: (json.resultats ?? []).map(mapOffer),
        ...(total !== undefined && !Number.isNaN(total) ? { total } : {}),
      };
    } catch (e) {
      return {
        ok: false,
        offers: [],
        error: e instanceof Error ? e.message : "Erreur inconnue.",
      };
    }
  });
