import type { Application, ApplicationStatus } from "@/types/application";
import type { Contact } from "@/types/contact";
import { companyKey } from "./companies";
import { contactCompanyKey } from "./contacts";
import { buildActions, bucketForDate, type ActionItem } from "./actions";
import { daysBetween, todayKey } from "./format";

/* -------------------------------------------------------------------------- */
/* Seuils centralisés — modifier ici suffit à changer tout le comportement.    */
/* -------------------------------------------------------------------------- */

export const INTELLIGENCE_THRESHOLDS = {
  /** Une candidature active sans activité depuis N jours est « inactive ». */
  inactiveDays: 7,
  /** Au-delà de N jours sans activité, la candidature est considérée « en sommeil ». */
  staleDays: 21,
  /** On ne signale pas une candidature créée il y a moins de N jours. */
  minAgeDays: 3,
  /** Un entretien atteint il y a moins de N jours est considéré « récent ». */
  recentInterviewDays: 10,
  /** Un changement de statut positif de moins de N jours est « récent ». */
  recentPositiveDays: 5,
} as const;

/* -------------------------------------------------------------------------- */
/* Modèle DÉRIVÉ (jamais persisté)                                            */
/* -------------------------------------------------------------------------- */

export const INSIGHT_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type InsightPriority = (typeof INSIGHT_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<InsightPriority, string> = {
  critical: "Critique",
  high: "Prioritaire",
  medium: "À surveiller",
  low: "Opportunités",
};

export const PRIORITY_DOTS: Record<InsightPriority, string> = {
  critical: "bg-destructive",
  high: "bg-warning",
  medium: "bg-info",
  low: "bg-muted-foreground/40",
};

export const PRIORITY_BADGE: Record<InsightPriority, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/25",
  high: "bg-warning/12 text-warning border-warning/30",
  medium: "bg-info/10 text-info border-info/25",
  low: "bg-muted text-muted-foreground border-border",
};

export type InsightType =
  | "overdue_action"
  | "offer_follow_up"
  | "interview_follow_up"
  | "inactive_application"
  | "stale_application"
  | "missing_follow_up"
  | "no_next_action"
  | "missing_contact"
  | "recent_positive_change"
  | "incomplete_data";

/** Cible du bouton d'appel à l'action : réutilise les modules existants. */
export type InsightCta =
  | { kind: "action"; label: string }
  | { kind: "application"; label: string }
  | { kind: "email"; label: string }
  | { kind: "contact"; label: string }
  | { kind: "follow_up"; label: string };

export interface ApplicationInsight {
  id: string;
  applicationId: string;
  application: Application;
  priority: InsightPriority;
  type: InsightType;
  title: string;
  reason: string;
  suggestedAction: string;
  cta: InsightCta;
  daysSinceActivity?: number;
  actionDate?: string;
  actionId?: string;
  contactAvailable?: boolean;
  score: number;
}

/* -------------------------------------------------------------------------- */
/* Helpers dérivés                                                            */
/* -------------------------------------------------------------------------- */

const ACTIVE_STATUSES: ApplicationStatus[] = ["to_target", "applied", "interview", "test", "offer"];
const INTERVIEW_STATUSES: ApplicationStatus[] = ["interview", "test"];

export const isActiveApplication = (app: Application) => ACTIVE_STATUSES.includes(app.status);

const reached = (app: Application, statuses: ApplicationStatus[]) =>
  statuses.includes(app.status) ||
  (app.status_history ?? []).some((h) => statuses.includes(h.status));

/** Date (yyyy-mm-dd) du premier passage à l'un des statuts donnés. */
function statusDate(app: Application, statuses: ApplicationStatus[]): string {
  const dates = (app.status_history ?? [])
    .filter((h) => statuses.includes(h.status))
    .map((h) => h.date)
    .filter(Boolean)
    .sort();
  return dates[dates.length - 1] ?? "";
}

/**
 * Dernière activité connue, dérivée uniquement des données existantes :
 * date de candidature, historique de statuts, relances (planifiées ou effectuées).
 */
export function lastActivityDate(app: Application, today = todayKey()): string {
  const candidates = [
    app.application_date,
    ...(app.status_history ?? []).map((h) => h.date),
    ...(app.follow_ups ?? []).flatMap((f) => [
      f.status === "todo" ? "" : f.date,
      f.updated_at ? f.updated_at.slice(0, 10) : "",
    ]),
  ].filter((d): d is string => !!d && d <= today);
  return candidates.sort().pop() ?? app.application_date ?? "";
}

export function daysSinceActivity(app: Application, today = todayKey()): number | null {
  const last = lastActivityDate(app, today);
  if (!last) return null;
  return Math.max(0, daysBetween(last, today));
}

const openFollowUps = (app: Application) =>
  (app.follow_ups ?? []).filter((f) => f.status === "todo");

const hasPlannedAction = (app: Application) =>
  openFollowUps(app).length > 0 || !!app.next_action;

/** Un contact est disponible s'il est lié à la candidature ou rattaché à l'entreprise. */
export function contactAvailable(app: Application, contacts: Contact[]): boolean {
  if ((app.contact_ids ?? []).some((id) => contacts.some((c) => c.id === id))) return true;
  const key = companyKey(app.company);
  return contacts.some((c) => contactCompanyKey(c) === key);
}

/* -------------------------------------------------------------------------- */
/* Score de priorité — simple, additif, documenté, jamais persisté            */
/* -------------------------------------------------------------------------- */

export interface PriorityScore {
  score: number;
  reasons: string[];
}

/**
 * Barème (points cumulatifs) :
 *  +50 action en retard · +30 offre atteinte · +20 entretien atteint
 *  +15 aucune action planifiée · +10 inactivité au-delà du seuil
 *  +5 aucun contact disponible
 * Conversion : >= 50 critical · >= 30 high · >= 10 medium · sinon low.
 */
export function calculatePriorityScore(
  application: Application,
  overdue: boolean,
  contacts: Contact[] = [],
  today = todayKey(),
): PriorityScore {
  const reasons: string[] = [];
  let score = 0;
  if (overdue) {
    score += 50;
    reasons.push("Action en retard (+50)");
  }
  if (reached(application, ["offer"])) {
    score += 30;
    reasons.push("Offre atteinte (+30)");
  }
  if (reached(application, INTERVIEW_STATUSES)) {
    score += 20;
    reasons.push("Entretien atteint (+20)");
  }
  if (!hasPlannedAction(application)) {
    score += 15;
    reasons.push("Aucune action planifiée (+15)");
  }
  const inactivity = daysSinceActivity(application, today);
  if (inactivity !== null && inactivity >= INTELLIGENCE_THRESHOLDS.inactiveDays) {
    score += 10;
    reasons.push(`Inactive depuis ${inactivity} j (+10)`);
  }
  if (!contactAvailable(application, contacts)) {
    score += 5;
    reasons.push("Aucun contact (+5)");
  }
  return { score, reasons };
}

export function scoreToPriority(score: number): InsightPriority {
  if (score >= 50) return "critical";
  if (score >= 30) return "high";
  if (score >= 10) return "medium";
  return "low";
}

/* -------------------------------------------------------------------------- */
/* Règles                                                                     */
/* -------------------------------------------------------------------------- */

/** Ordre de dédoublonnage : un seul insight « suivi » par candidature. */
const FOLLOW_UP_GROUP: InsightType[] = [
  "overdue_action",
  "offer_follow_up",
  "interview_follow_up",
  "inactive_application",
  "stale_application",
  "missing_follow_up",
  "no_next_action",
];

const TYPE_RANK: Record<InsightType, number> = {
  overdue_action: 1,
  offer_follow_up: 2,
  interview_follow_up: 3,
  inactive_application: 4,
  stale_application: 5,
  missing_follow_up: 6,
  no_next_action: 7,
  missing_contact: 8,
  recent_positive_change: 9,
  incomplete_data: 10,
};

const PRIORITY_RANK: Record<InsightPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Construit les recommandations dérivées.
 * Aucune écriture, aucune persistance : tout est recalculé à chaque rendu.
 */
export function buildApplicationInsights(
  applications: Application[],
  contacts: Contact[] = [],
  today = todayKey(),
): ApplicationInsight[] {
  // Réutilisation stricte du Centre Actions (aucune logique dupliquée).
  const actions = buildActions(applications, contacts, today);
  const actionsByApp = new Map<string, ActionItem[]>();
  for (const a of actions) {
    const list = actionsByApp.get(a.applicationId) ?? [];
    list.push(a);
    actionsByApp.set(a.applicationId, list);
  }

  const out: ApplicationInsight[] = [];

  for (const app of applications) {
    if (app.status === "rejected") continue;

    const appActions = actionsByApp.get(app.id) ?? [];
    const overdueAction =
      appActions.find((a) => a.bucket === "overdue") ??
      (null as ActionItem | null);
    const planned = hasPlannedAction(app);
    const inactivity = daysSinceActivity(app, today);
    const hasContact = contactAvailable(app, contacts);
    const { score } = calculatePriorityScore(app, !!overdueAction, contacts, today);
    const age = app.application_date ? daysBetween(app.application_date, today) : 0;
    const candidates: ApplicationInsight[] = [];

    const push = (i: Omit<ApplicationInsight, "application" | "applicationId" | "score">) =>
      candidates.push({ ...i, application: app, applicationId: app.id, score });

    // 1. Action en retard (source : Centre Actions).
    if (overdueAction) {
      const late = overdueAction.date ? daysBetween(overdueAction.date, today) : 0;
      push({
        id: `${app.id}-overdue`,
        type: "overdue_action",
        priority: "critical",
        title: "Action en retard",
        reason:
          late > 0
            ? `« ${overdueAction.title} » est en retard de ${late} jour${late > 1 ? "s" : ""}.`
            : `« ${overdueAction.title} » aurait dû être réalisée.`,
        suggestedAction: "Traiter l'action",
        cta: { kind: "action", label: "Voir l'action" },
        actionDate: overdueAction.date,
        actionId: overdueAction.id,
        contactAvailable: hasContact,
      });
    }

    // 2. Offre reçue sans prochaine action.
    if (reached(app, ["offer"]) && !planned) {
      push({
        id: `${app.id}-offer`,
        type: "offer_follow_up",
        priority: "critical",
        title: "Offre reçue sans prochaine action",
        reason: "Une offre a été reçue mais aucune relance ni prochaine action n'est planifiée.",
        suggestedAction: "Planifier la prochaine étape",
        cta: { kind: "follow_up", label: "Planifier une relance" },
        contactAvailable: hasContact,
      });
    }

    // 3. Entretien récent sans suivi.
    const interviewDate = statusDate(app, INTERVIEW_STATUSES);
    if (
      reached(app, INTERVIEW_STATUSES) &&
      !planned &&
      interviewDate &&
      daysBetween(interviewDate, today) <= INTELLIGENCE_THRESHOLDS.recentInterviewDays
    ) {
      push({
        id: `${app.id}-interview`,
        type: "interview_follow_up",
        priority: "critical",
        title: "Entretien à suivre",
        reason: "Un entretien a eu lieu récemment et aucun suivi n'est prévu.",
        suggestedAction: "Préparer un message de suivi",
        cta: { kind: "email", label: "Préparer un email" },
        actionDate: interviewDate,
        contactAvailable: hasContact,
      });
    }

    // 4. Candidature inactive / en sommeil.
    if (
      inactivity !== null &&
      age >= INTELLIGENCE_THRESHOLDS.minAgeDays &&
      inactivity >= INTELLIGENCE_THRESHOLDS.inactiveDays
    ) {
      const stale = inactivity >= INTELLIGENCE_THRESHOLDS.staleDays;
      push({
        id: `${app.id}-${stale ? "stale" : "inactive"}`,
        type: stale ? "stale_application" : "inactive_application",
        priority: stale ? "high" : planned ? "medium" : "high",
        title: stale ? "Candidature en sommeil" : "Candidature inactive",
        reason: `Cette candidature n'a pas eu d'activité depuis ${inactivity} jours.`,
        suggestedAction: "Planifier une relance",
        cta: { kind: "follow_up", label: "Planifier une relance" },
        daysSinceActivity: inactivity,
        contactAvailable: hasContact,
      });
    }

    // 5. Candidature envoyée sans relance planifiée / sans prochaine action.
    if (!planned && app.status !== "to_target" && !reached(app, ["offer"])) {
      const interview = reached(app, INTERVIEW_STATUSES);
      push({
        id: `${app.id}-no-action`,
        type: interview ? "missing_follow_up" : "no_next_action",
        priority: interview ? "high" : app.status === "applied" ? "high" : "medium",
        title: interview ? "Aucune relance après entretien" : "Aucune prochaine action",
        reason: "Aucune relance ouverte ni prochaine action n'est définie pour cette candidature.",
        suggestedAction: "Planifier une relance",
        cta: { kind: "follow_up", label: "Planifier une relance" },
        ...(inactivity !== null ? { daysSinceActivity: inactivity } : {}),
        contactAvailable: hasContact,
      });
    }

    // 6. Aucun contact (candidature active uniquement).
    if (isActiveApplication(app) && !hasContact) {
      push({
        id: `${app.id}-contact`,
        type: "missing_contact",
        priority: "medium",
        title: "Aucun contact",
        reason: "Vous n'avez aucun contact pour cette candidature ni pour cette entreprise.",
        suggestedAction: "Ajouter un contact",
        cta: { kind: "contact", label: "Ajouter un contact" },
        contactAvailable: false,
      });
    }

    // 8. Données incomplètes : la candidature existe mais reste peu exploitable.
    const gaps: string[] = [];
    if (!app.source) gaps.push("source");
    if (!app.application_date) gaps.push("date de candidature");
    if (!app.location?.trim()) gaps.push("localisation");
    if (!app.job_url?.trim() && !app.source_url?.trim()) gaps.push("lien vers l'offre");
    if (isActiveApplication(app) && gaps.length >= 2) {
      push({
        id: `${app.id}-incomplete`,
        type: "incomplete_data",
        priority: "low",
        title: "Fiche incomplète",
        reason: `Champs manquants : ${gaps.join(", ")}. Vos statistiques et relances en dépendent.`,
        suggestedAction: "Compléter la fiche",
        cta: { kind: "application", label: "Compléter la fiche" },
        contactAvailable: hasContact,
      });
    }

    // 7. Changement positif récent — opportunité de capitaliser.
    const positiveDate = statusDate(app, ["interview", "test", "offer"]);
    if (
      positiveDate &&
      daysBetween(positiveDate, today) <= INTELLIGENCE_THRESHOLDS.recentPositiveDays &&
      daysBetween(positiveDate, today) >= 0
    ) {
      push({
        id: `${app.id}-positive`,
        type: "recent_positive_change",
        priority: "low",
        title: "Progression récente",
        reason: "Cette candidature a progressé récemment : complétez la fiche pendant que c'est frais.",
        suggestedAction: "Compléter la fiche",
        cta: { kind: "application", label: "Voir la candidature" },
        actionDate: positiveDate,
        contactAvailable: hasContact,
      });
    }

    out.push(...dedupeForApplication(candidates));
  }

  return sortInsights(out);
}

/** Un seul insight de la famille « suivi » par candidature : le mieux classé. */
function dedupeForApplication(candidates: ApplicationInsight[]): ApplicationInsight[] {
  const group = candidates
    .filter((c) => FOLLOW_UP_GROUP.includes(c.type))
    .sort((a, b) => TYPE_RANK[a.type] - TYPE_RANK[b.type]);
  const others = candidates.filter((c) => !FOLLOW_UP_GROUP.includes(c.type));
  return group[0] ? [group[0], ...others] : others;
}

export function sortInsights(insights: ApplicationInsight[]): ApplicationInsight[] {
  return [...insights].sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      TYPE_RANK[a.type] - TYPE_RANK[b.type] ||
      b.score - a.score ||
      a.application.company.localeCompare(b.application.company, "fr"),
  );
}

export function groupInsights(
  insights: ApplicationInsight[],
): Record<InsightPriority, ApplicationInsight[]> {
  return {
    critical: insights.filter((i) => i.priority === "critical"),
    high: insights.filter((i) => i.priority === "high"),
    medium: insights.filter((i) => i.priority === "medium"),
    low: insights.filter((i) => i.priority === "low"),
  };
}

export interface InsightSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export function summarizeInsights(insights: ApplicationInsight[]): InsightSummary {
  const g = groupInsights(insights);
  return {
    critical: g.critical.length,
    high: g.high.length,
    medium: g.medium.length,
    low: g.low.length,
    total: insights.length,
  };
}

/** Réexport utilitaire : la catégorisation des dates reste celle du Centre Actions. */
export { bucketForDate };
