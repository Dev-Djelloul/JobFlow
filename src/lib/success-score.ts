import type { Application } from "@/types/application";
import type { CvExperience } from "@/types/cv";
import { bucketForDate } from "./actions";

export interface SuccessScoreFactor {
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface SuccessScore {
  /** Pourcentage 0-100, ou `null` quand le score n'a pas de sens (candidature refusée). */
  percent: number | null;
  factors: SuccessScoreFactor[];
}

export interface SuccessScoreProfile {
  cvSummary: string;
  experiences: CvExperience[];
  hasCvFile: boolean;
}

// Score en 5 facteurs pondérés (somme des maximums = 100) : chacun reflète une donnée déjà
// présente dans JobFlow plutôt qu'une estimation opaque — l'idée est qu'on puisse toujours
// expliquer le chiffre affiché, facteur par facteur.
const PIPELINE_POINTS: Record<Application["status"], number> = {
  to_target: 10,
  applied: 20,
  interview: 30,
  test: 30,
  offer: 35,
  rejected: 0,
};

const STOPWORDS = new Set([
  "dans",
  "pour",
  "avec",
  "vous",
  "votre",
  "nous",
  "notre",
  "cette",
  "cela",
  "sont",
  "être",
  "avoir",
  "chez",
  "sans",
  "plus",
  "mais",
  "tout",
  "tous",
  "toute",
  "toutes",
  "comme",
  "leur",
  "leurs",
  "aussi",
  "ainsi",
  "the",
  "and",
  "with",
  "your",
  "from",
]);

const normalize = (v: string) => (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function extractKeywords(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );
}

function hasOverdueTracking(application: Application, today?: string): boolean {
  if (application.next_action && bucketForDate(application.follow_up_date, today) === "overdue") {
    return true;
  }
  return (application.follow_ups ?? []).some(
    (f) => f.status === "todo" && bucketForDate(f.date, today) === "overdue",
  );
}

function hasAnyTracking(application: Application): boolean {
  return (
    !!application.next_action || (application.follow_ups ?? []).some((f) => f.status === "todo")
  );
}

/**
 * Calcule un score heuristique (0-100) de "chance de succès" d'une candidature, entièrement
 * dérivé de données déjà présentes dans l'app (pas d'IA) : étape actuelle du pipeline, dossier
 * de candidature préparé, correspondance mots-clés offre/profil, suivi à jour, contact identifié.
 * Transparent et explicable par construction — chaque facteur est détaillé dans le retour.
 */
export function computeSuccessScore(
  application: Application,
  profile: SuccessScoreProfile,
  today?: string,
): SuccessScore {
  if (application.status === "rejected") {
    return {
      percent: null,
      factors: [
        {
          label: "Candidature refusée",
          points: 0,
          maxPoints: 0,
          detail: "L'issue est déjà connue — l'indicateur ne s'applique plus.",
        },
      ],
    };
  }

  const factors: SuccessScoreFactor[] = [];

  factors.push({
    label: "Étape du pipeline",
    points: PIPELINE_POINTS[application.status],
    maxPoints: 35,
    detail: "Plus la candidature a avancé (entretien, test, offre), plus ce facteur pèse.",
  });

  const dossierPoints =
    (profile.hasCvFile ? 8 : 0) +
    (application.coverLetterText ? 8 : 0) +
    (application.atsCvText ? 4 : 0);
  factors.push({
    label: "Dossier de candidature",
    points: dossierPoints,
    maxPoints: 20,
    detail: "CV importé, lettre de motivation et CV optimisé ATS associés à cette candidature.",
  });

  const jobWords = extractKeywords(application.notes ?? "");
  const profileText = [profile.cvSummary, ...profile.experiences.map((e) => e.description)].join(
    " ",
  );
  const profileWords = extractKeywords(profileText);
  let matchPoints = 0;
  let matchDetail = "Renseignez une description d'offre (Notes) et votre profil pour l'évaluer.";
  if (jobWords.size > 0 && profileWords.size > 0) {
    let intersection = 0;
    for (const w of jobWords) if (profileWords.has(w)) intersection++;
    const ratio = Math.min(1, intersection / Math.min(jobWords.size, 40));
    matchPoints = Math.round(ratio * 20);
    matchDetail = `${intersection} mot(s)-clé(s) de l'offre retrouvé(s) dans votre profil.`;
  }
  factors.push({
    label: "Correspondance offre / profil",
    points: matchPoints,
    maxPoints: 20,
    detail: matchDetail,
  });

  let trackingPoints = 7;
  let trackingDetail = "Aucun suivi programmé pour l'instant sur cette candidature.";
  if (hasOverdueTracking(application, today)) {
    trackingPoints = 0;
    trackingDetail = "Une action de suivi est en retard — rattrapez-la pour ne pas perdre le fil.";
  } else if (hasAnyTracking(application)) {
    trackingPoints = 15;
    trackingDetail = "Le suivi (relance, prochaine action) est à jour.";
  }
  factors.push({
    label: "Suivi actif",
    points: trackingPoints,
    maxPoints: 15,
    detail: trackingDetail,
  });

  const hasContact = (application.contact_ids ?? []).length > 0;
  factors.push({
    label: "Contact identifié",
    points: hasContact ? 10 : 0,
    maxPoints: 10,
    detail: hasContact
      ? "Un contact chez l'entreprise est associé à cette candidature."
      : "Aucun contact associé — un point de contact humain aide souvent à se démarquer.",
  });

  const percent = Math.max(
    0,
    Math.min(
      100,
      factors.reduce((sum, f) => sum + f.points, 0),
    ),
  );

  return { percent, factors };
}

export interface AggregateSuccessFactor {
  label: string;
  /** Moyenne des points obtenus sur ce facteur, arrondie. */
  avgPoints: number;
  maxPoints: number;
}

/**
 * Moyenne, facteur par facteur, du score de succès sur un ensemble de candidatures actives —
 * sert à expliquer *pourquoi* le score moyen est ce qu'il est (quel facteur pèse le plus dans
 * le résultat global), plutôt que d'afficher un seul chiffre sans justification.
 */
export function aggregateSuccessFactors(
  applications: Application[],
  profile: SuccessScoreProfile,
  today?: string,
): AggregateSuccessFactor[] {
  const perApp = applications
    .filter((a) => a.status !== "rejected")
    .map((a) => computeSuccessScore(a, profile, today))
    .filter((s) => s.percent !== null);

  if (perApp.length === 0) return [];

  const byLabel = new Map<string, { sum: number; maxPoints: number }>();
  for (const score of perApp) {
    for (const factor of score.factors) {
      const entry = byLabel.get(factor.label) ?? { sum: 0, maxPoints: factor.maxPoints };
      entry.sum += factor.points;
      byLabel.set(factor.label, entry);
    }
  }

  return [...byLabel.entries()].map(([label, { sum, maxPoints }]) => ({
    label,
    avgPoints: Math.round(sum / perApp.length),
    maxPoints,
  }));
}
