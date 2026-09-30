/**
 * Quelques codes ROME (référentiel officiel des métiers France Travail) pré-remplis à titre
 * d'exemples pour la recherche de statistiques — le mapping métier → code ROME n'est pas
 * toujours strictement 1:1 (un même intitulé peut relever de plusieurs codes selon le profil),
 * d'où le champ libre proposé en complément et le lien vers le référentiel officiel pour vérifier
 * ou trouver un autre code.
 */
export interface RomeSuggestion {
  code: string;
  label: string;
}

export const ROME_SUGGESTIONS: RomeSuggestion[] = [
  { code: "M1805", label: "Études et développement informatique (dev, chef de projet digital…)" },
  { code: "M1802", label: "Expertise et support en systèmes d'information" },
  { code: "M1801", label: "Administration de systèmes d'information" },
  { code: "E1104", label: "Conception de contenus multimédias (UX/UI, web…)" },
  { code: "E1103", label: "Communication" },
  { code: "M1403", label: "Études et prospectives socio-économiques (data analyst…)" },
];
