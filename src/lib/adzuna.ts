import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { JobOffer, JobOfferSearchResult } from "./job-offers";

const SEARCH_URL_BASE = "https://api.adzuna.com/v1/api/jobs/fr/search";

interface RawAdzunaOffer {
  id?: string;
  title?: string;
  description?: string;
  created?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  contract_type?: string; // "permanent" | "contract"
  contract_time?: string; // "full_time" | "part_time"
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  redirect_url?: string;
}

function formatSalary(raw: RawAdzunaOffer): string {
  if (!raw.salary_min && !raw.salary_max) return "";
  const min = raw.salary_min ? Math.round(raw.salary_min) : null;
  const max = raw.salary_max ? Math.round(raw.salary_max) : null;
  const range = min && max && min !== max ? `${min} - ${max} €` : `${min ?? max} €`;
  return raw.salary_is_predicted === "1" ? `${range} (estimé)` : range;
}

function mapOffer(raw: RawAdzunaOffer): JobOffer {
  const contractLabel = [
    raw.contract_type === "permanent" ? "CDI" : raw.contract_type === "contract" ? "CDD" : "",
    raw.contract_time === "part_time" ? "temps partiel" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    id: raw.id ?? "",
    intitule: raw.title ?? "",
    // Adzuna renvoie une description tronquée avec des balises non fermées — on la nettoie
    // grossièrement (pas de parseur HTML côté Worker) pour éviter d'injecter du markup cassé.
    description: (raw.description ?? "").replace(/<[^>]*>/g, ""),
    dateCreation: raw.created ?? "",
    entreprise: raw.company?.display_name ?? "",
    lieu: raw.location?.display_name ?? "",
    typeContrat: raw.contract_type ?? "",
    typeContratLibelle: contractLabel,
    salaire: formatSalary(raw),
    url: raw.redirect_url ?? "",
    // Adzuna ne fournit pas de niveau d'expérience structuré dans sa recherche standard.
    experienceLibelle: "",
    experienceExige: "",
    source: "adzuna",
  };
}

// L'API Adzuna limite chaque appel à 50 résultats maximum par page.
const MAX_PAGE_SIZE = 50;

export const searchAdzunaOffers = createServerFn({ method: "GET" })
  .validator(
    z.object({
      motsCles: z.string().trim().min(1).max(200),
      /** Ville, code postal ou zone — l'API Adzuna n'a pas de code département dédié. */
      lieu: z.string().trim().max(60).optional(),
      /** "permanent" (CDI) ou "contract" (CDD) — les autres valeurs ne sont pas supportées par l'API. */
      typeContrat: z.enum(["permanent", "contract"]).optional(),
      pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
      /** Index de la page à charger (0-based, converti en pagination 1-based côté Adzuna). */
      page: z.number().int().min(0).max(50).default(0),
    }),
  )
  .handler(async ({ data }): Promise<JobOfferSearchResult> => {
    try {
      const appId = process.env["ADZUNA_APP_ID"];
      const appKey = process.env["ADZUNA_APP_KEY"];
      if (!appId || !appKey) {
        return {
          ok: false,
          offers: [],
          error:
            "Adzuna non configuré : variables ADZUNA_APP_ID / ADZUNA_APP_KEY manquantes sur le Worker.",
        };
      }

      const url = new URL(`${SEARCH_URL_BASE}/${data.page + 1}`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("what", data.motsCles);
      if (data.lieu) url.searchParams.set("where", data.lieu);
      if (data.typeContrat) url.searchParams.set("contract_type", data.typeContrat);
      url.searchParams.set("results_per_page", String(data.pageSize));
      url.searchParams.set("content-type", "application/json");
      url.searchParams.set("sort_by", "date");

      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          offers: [],
          error: `Recherche Adzuna échouée (${res.status}) : ${body.slice(0, 300) || "réponse vide"}`,
        };
      }
      const json = (await res.json()) as { results?: RawAdzunaOffer[]; count?: number };
      return {
        ok: true,
        offers: (json.results ?? []).map(mapOffer),
        ...(typeof json.count === "number" ? { total: json.count } : {}),
      };
    } catch (e) {
      return {
        ok: false,
        offers: [],
        error: e instanceof Error ? e.message : "Erreur inconnue.",
      };
    }
  });
