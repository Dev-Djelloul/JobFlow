import type { ContractType } from "@/types/application";

/**
 * Forme commune d'une offre d'emploi, quelle que soit l'API d'origine (France Travail,
 * Adzuna…) — permet à la page /offres de traiter les résultats des deux sources de façon
 * identique (regroupement, favoris, ajout en candidature).
 */
export interface JobOffer {
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
  /** Libellé lisible du niveau d'expérience demandé, quand la source le fournit. */
  experienceLibelle: string;
  /** Code d'exigence France Travail (D/S/E) ; vide pour les sources qui ne le fournissent pas. */
  experienceExige: string;
  source: "france_travail" | "adzuna";
}

export type OfferSource = JobOffer["source"];

export interface JobOfferSearchResult {
  ok: boolean;
  offers: JobOffer[];
  /** Nombre total de résultats côté source, pour savoir s'il reste des pages à charger. */
  total?: number;
  /** Détail de l'erreur, affiché tel quel côté client pour faciliter le diagnostic. */
  error?: string;
}

// Les différentes API ont des codes de contrat différents (France Travail : CDI/CDD/MIS/
// LIB/SAI ; Adzuna : permanent/contract) ; les stages/alternances n'y sont pas toujours
// distingués de façon fiable non plus. On normalise donc tout vers nos propres ContractType,
// en complétant par le libellé texte et le titre de l'offre quand le code seul ne suffit pas.
// Partagée entre la page de recherche et les alertes pour ne pas dupliquer cette logique.
export function mapContractType(offer: JobOffer): ContractType {
  const haystack = `${offer.typeContratLibelle} ${offer.intitule}`.toLowerCase();
  if (haystack.includes("stage")) return "Stage";
  if (
    haystack.includes("alternance") ||
    haystack.includes("apprentissage") ||
    haystack.includes("professionnalisation")
  )
    return "Alternance";
  const byCode: Record<string, ContractType> = {
    CDI: "CDI",
    CDD: "CDD",
    MIS: "Intérim",
    TTI: "Intérim",
    LIB: "Freelance",
    SAI: "CDD",
    permanent: "CDI",
    contract: "CDD",
  };
  return byCode[offer.typeContrat] ?? "CDI";
}

// Ni France Travail ni Adzuna n'ont de paramètre dédié au télétravail dans leur recherche
// standard : on filtre côté client sur la présence du mot dans l'intitulé/la description.
// Partagée entre la page de recherche et les alertes.
export function looksRemote(offer: JobOffer): boolean {
  const haystack = `${offer.intitule} ${offer.description}`.toLowerCase();
  return (
    haystack.includes("télétravail") ||
    haystack.includes("teletravail") ||
    haystack.includes("remote")
  );
}
