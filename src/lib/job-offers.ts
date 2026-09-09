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

export interface JobOfferSearchResult {
  ok: boolean;
  offers: JobOffer[];
  /** Nombre total de résultats côté source, pour savoir s'il reste des pages à charger. */
  total?: number;
  /** Détail de l'erreur, affiché tel quel côté client pour faciliter le diagnostic. */
  error?: string;
}
