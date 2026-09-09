import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { JobOffer, JobOfferSearchResult } from "./job-offers";

// Jooble attribue une clé par domaine national — fr.jooble.org donne accès aux offres
// françaises. Une clé obtenue sur jooble.org (domaine générique/US) ne fonctionnerait pas ici.
const SEARCH_URL_BASE = "https://fr.jooble.org/api";

interface RawJoobleOffer {
  id?: number | string;
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  company?: string;
  type?: string;
  link?: string;
  updated?: string;
}

function mapOffer(raw: RawJoobleOffer): JobOffer {
  return {
    id: String(raw.id ?? raw.link ?? ""),
    intitule: raw.title ?? "",
    // Jooble ne renvoie qu'un extrait ("snippet") dans ses résultats de recherche, jamais le
    // texte intégral de l'annonce — même limitation que constatée avec Adzuna.
    description: raw.snippet ?? "",
    dateCreation: raw.updated ?? "",
    entreprise: raw.company ?? "",
    lieu: raw.location ?? "",
    typeContrat: raw.type ?? "",
    typeContratLibelle: raw.type ?? "",
    salaire: raw.salary ?? "",
    url: raw.link ?? "",
    // Jooble ne fournit pas de niveau d'expérience structuré.
    experienceLibelle: "",
    experienceExige: "",
    source: "jooble",
  };
}

// Jooble limite chaque appel à 100 résultats maximum par page.
const MAX_PAGE_SIZE = 100;

export const searchJoobleOffers = createServerFn({ method: "GET" })
  .validator(
    z.object({
      motsCles: z.string().trim().min(1).max(200),
      /** Ville ou zone — le paramètre est obligatoire côté Jooble, on retombe sur "France" si vide. */
      lieu: z.string().trim().max(60).optional(),
      pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
      /** Index de la page à charger (0-based, converti en pagination 1-based côté Jooble). */
      page: z.number().int().min(0).max(50).default(0),
    }),
  )
  .handler(async ({ data }): Promise<JobOfferSearchResult> => {
    try {
      const apiKey = process.env["JOOBLE_API_KEY"];
      if (!apiKey) {
        return {
          ok: false,
          offers: [],
          error: "Jooble non configuré : variable JOOBLE_API_KEY manquante sur le Worker.",
        };
      }

      const res = await fetch(`${SEARCH_URL_BASE}/${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          keywords: data.motsCles,
          location: data.lieu?.trim() || "France",
          page: data.page + 1,
          ResultOnPage: data.pageSize,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          offers: [],
          error: `Recherche Jooble échouée (${res.status}) : ${body.slice(0, 300) || "réponse vide"}`,
        };
      }
      const json = (await res.json()) as { jobs?: RawJoobleOffer[]; totalCount?: number };
      return {
        ok: true,
        offers: (json.jobs ?? []).map(mapOffer),
        ...(typeof json.totalCount === "number" ? { total: json.totalCount } : {}),
      };
    } catch (e) {
      return {
        ok: false,
        offers: [],
        error: e instanceof Error ? e.message : "Erreur inconnue.",
      };
    }
  });
