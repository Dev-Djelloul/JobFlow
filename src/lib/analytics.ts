import type { Application, ApplicationStatus } from "@/types/application";
import { STATUSES, STATUS_LABELS } from "@/types/application";
import { companyKey } from "./companies";
import { daysBetween, todayKey } from "./format";

/**
 * Module Analytics : toutes les métriques sont DÉRIVÉES des candidatures
 * existantes (aucune source de vérité supplémentaire, aucune persistance).
 */

/** Statuts considérés comme « entretien » (entretien ou test technique). */
export const INTERVIEW_STATUSES: ApplicationStatus[] = ["interview", "test"];

/** Statuts considérés comme « actifs » : ni offre acceptée/reçue, ni refus. */
export const ACTIVE_STATUSES: ApplicationStatus[] = ["to_target", "applied", "interview", "test"];

/** Statuts qui prouvent que la candidature a progressé après l'envoi. */
export const PROGRESSED_STATUSES: ApplicationStatus[] = [
  "interview",
  "test",
  "offer",
  "rejected",
];

/** Couleurs (tokens du design system) associées à chaque statut. */
export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  to_target: "var(--color-muted-foreground)",
  applied: "var(--color-info)",
  interview: "var(--color-primary)",
  test: "var(--color-warning)",
  offer: "var(--color-success)",
  rejected: "var(--color-destructive)",
};

/** Tous les statuts atteints par une candidature (historique + statut courant). */
export function reachedStatuses(app: Application): Set<ApplicationStatus> {
  const set = new Set<ApplicationStatus>((app.status_history ?? []).map((h) => h.status));
  set.add(app.status);
  return set;
}

const hasReached = (app: Application, statuses: ApplicationStatus[]) => {
  const reached = reachedStatuses(app);
  return statuses.some((s) => reached.has(s));
};

export const isSent = (app: Application) => app.status !== "to_target";
export const isActive = (app: Application) => ACTIVE_STATUSES.includes(app.status);
export const hasProgressed = (app: Application) => hasReached(app, PROGRESSED_STATUSES);
export const hasInterview = (app: Application) => hasReached(app, INTERVIEW_STATUSES);
export const hasOffer = (app: Application) => hasReached(app, ["offer"]);

/* ------------------------------------------------------------------ KPIs */

export interface AnalyticsKpis {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  rejected: number;
}

export function computeKpis(apps: Application[]): AnalyticsKpis {
  return {
    total: apps.length,
    active: apps.filter(isActive).length,
    interviews: apps.filter(hasInterview).length,
    offers: apps.filter(hasOffer).length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };
}

/* ---------------------------------------------------------------- Funnel */

/** Taux en %, ou `null` si le dénominateur est nul (affiché « N/A »). */
export function rate(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 100);
}

export function formatRate(value: number | null): string {
  return value === null ? "N/A" : `${value} %`;
}

export interface FunnelStage {
  key: "sent" | "responses" | "interviews" | "offers";
  label: string;
  /** Définition exacte, affichée en infobulle / méthodologie. */
  definition: string;
  count: number;
  /** Taux par rapport à l'étape précédente (null si dénominateur nul). */
  stepRate: number | null;
  /** Taux par rapport aux candidatures envoyées (null si dénominateur nul). */
  globalRate: number | null;
}

export function buildFunnel(apps: Application[]): FunnelStage[] {
  const sent = apps.filter(isSent).length;
  const responses = apps.filter((a) => isSent(a) && hasProgressed(a)).length;
  const interviews = apps.filter((a) => isSent(a) && hasInterview(a)).length;
  const offers = apps.filter((a) => isSent(a) && hasOffer(a)).length;

  const stages: Array<Omit<FunnelStage, "stepRate" | "globalRate">> = [
    {
      key: "sent",
      label: "Candidatures envoyées",
      definition: "Candidatures dont le statut n'est plus « À cibler ».",
      count: sent,
    },
    {
      key: "responses",
      label: "Réponses / progressions",
      definition:
        "Candidatures envoyées ayant atteint au moins une fois Entretien, Test, Offre ou Refusée.",
      count: responses,
    },
    {
      key: "interviews",
      label: "Entretiens",
      definition: "Candidatures ayant atteint au moins une fois Entretien ou Test.",
      count: interviews,
    },
    {
      key: "offers",
      label: "Offres",
      definition: "Candidatures ayant atteint au moins une fois le statut Offre.",
      count: offers,
    },
  ];

  return stages.map((stage, i) => ({
    ...stage,
    stepRate: i === 0 ? null : rate(stage.count, stages[i - 1]!.count),
    globalRate: i === 0 ? null : rate(stage.count, sent),
  }));
}

/* ---------------------------------------------------- Répartition statuts */

export interface StatusSlice {
  status: ApplicationStatus;
  label: string;
  color: string;
  count: number;
  share: number | null;
}

export function statusBreakdown(apps: Application[]): StatusSlice[] {
  return STATUSES.map((status) => {
    const count = apps.filter((a) => a.status === status).length;
    return {
      status,
      label: STATUS_LABELS[status],
      color: STATUS_COLORS[status],
      count,
      share: rate(count, apps.length),
    };
  }).filter((s) => s.count > 0);
}

/* ------------------------------------------------------ Évolution temporelle */

export type TimeGrouping = "week" | "month";

export interface TimeBucket {
  key: string;
  label: string;
  count: number;
}

function startOfWeekKey(key: string): string {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = (date.getDay() + 6) % 7; // lundi = 0
  date.setDate(date.getDate() - day);
  return todayKey(date);
}

function labelFor(key: string, grouping: TimeGrouping): string {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return grouping === "week"
    ? date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", "")
    : date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }).replace(".", "");
}

/**
 * Nombre de candidatures par semaine (lundi) ou par mois, sur les `periods`
 * dernières périodes, y compris celles à zéro (pas de trou dans la courbe).
 */
export function buildTimeSeries(
  apps: Application[],
  grouping: TimeGrouping,
  periods = grouping === "week" ? 12 : 6,
): TimeBucket[] {
  const today = new Date();
  const keys: string[] = [];
  for (let i = periods - 1; i >= 0; i--) {
    if (grouping === "week") {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i * 7);
      keys.push(startOfWeekKey(todayKey(d)));
    } else {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      keys.push(todayKey(d));
    }
  }

  const bucketOf = (date: string) =>
    grouping === "week" ? startOfWeekKey(date) : `${date.slice(0, 7)}-01`;

  return keys.map((key) => ({
    key,
    label: labelFor(key, grouping),
    count: apps.filter((a) => a.application_date && bucketOf(a.application_date) === key).length,
  }));
}

/* ------------------------------------------------- Performance entreprises */

export interface CompanyPerformance {
  key: string;
  name: string;
  total: number;
  interviews: number;
  offers: number;
  interviewRate: number | null;
}

/** Classement des entreprises par nombre de candidatures (logique companyKey). */
export function companyPerformance(apps: Application[], limit = 8): CompanyPerformance[] {
  const map = new Map<string, Application[]>();
  for (const app of apps) {
    const key = companyKey(app.company);
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(app);
    else map.set(key, [app]);
  }

  return [...map.entries()]
    .map(([key, list]) => ({
      key,
      name: (list[0]?.company ?? "").trim() || key,
      total: list.length,
      interviews: list.filter(hasInterview).length,
      offers: list.filter(hasOffer).length,
      interviewRate: rate(list.filter(hasInterview).length, list.length),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "fr"))
    .slice(0, limit);
}

/* --------------------------------------------------- Performance sources */

/**
 * Le modèle `Application` ne contient aucun champ `source` exploitable dans
 * cette version : aucune donnée n'est inventée. Le jour où un champ `source`
 * sera ajouté au modèle, cette fonction devient la seule à modifier.
 */
export interface SourcePerformance {
  source: string;
  total: number;
  interviews: number;
  interviewRate: number | null;
}

export function sourcePerformance(apps: Application[]): SourcePerformance[] {
  const map = new Map<string, Application[]>();
  for (const app of apps) {
    const source = ((app as Application & { source?: string }).source ?? "").trim();
    if (!source) continue;
    const list = map.get(source);
    if (list) list.push(app);
    else map.set(source, [app]);
  }
  return [...map.entries()]
    .map(([source, list]) => ({
      source,
      total: list.length,
      interviews: list.filter(hasInterview).length,
      interviewRate: rate(list.filter(hasInterview).length, list.length),
    }))
    .sort((a, b) => b.total - a.total);
}

/* ------------------------------------------------------------------ Délais */

export interface DelayMetric {
  /** Moyenne en jours, ou null si aucun échantillon exploitable. */
  averageDays: number | null;
  /** Nombre de candidatures ayant permis le calcul. */
  sample: number;
}

export interface DelayMetrics {
  firstChange: DelayMetric;
  firstInterview: DelayMetric;
  offer: DelayMetric;
}

const average = (values: number[]): DelayMetric =>
  values.length === 0
    ? { averageDays: null, sample: 0 }
    : {
        averageDays: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
        sample: values.length,
      };

/** Première entrée d'historique correspondant à l'un des statuts demandés. */
function firstHistoryDate(app: Application, statuses: ApplicationStatus[]): string | null {
  const entry = [...(app.status_history ?? [])]
    .filter((h) => statuses.includes(h.status) && h.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return entry?.date ?? null;
}

/**
 * Délais moyens, calculés uniquement à partir de `status_history` :
 * aucune estimation, aucune hypothèse implicite. Les candidatures sans
 * historique exploitable sont simplement exclues de l'échantillon.
 */
export function computeDelays(apps: Application[]): DelayMetrics {
  const changes: number[] = [];
  const interviews: number[] = [];
  const offers: number[] = [];

  for (const app of apps) {
    const start = app.application_date;
    if (!start) continue;
    const history = [...(app.status_history ?? [])]
      .filter((h) => h.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (history.length === 0) continue;

    const initial = history[0]!.status;
    const firstChange = history.find((h) => h.status !== initial);
    if (firstChange) {
      const d = daysBetween(start, firstChange.date);
      if (d >= 0) changes.push(d);
    }

    const interviewDate = firstHistoryDate(app, INTERVIEW_STATUSES);
    if (interviewDate) {
      const d = daysBetween(start, interviewDate);
      if (d >= 0) interviews.push(d);
    }

    const offerDate = firstHistoryDate(app, ["offer"]);
    if (offerDate) {
      const d = daysBetween(start, offerDate);
      if (d >= 0) offers.push(d);
    }
  }

  return {
    firstChange: average(changes),
    firstInterview: average(interviews),
    offer: average(offers),
  };
}

/* ----------------------------------------------------------------- Filtres */

export const PERIOD_OPTIONS = [
  { value: "all", label: "Toute la période" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
  { value: "365", label: "12 derniers mois" },
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

export interface AnalyticsFilters {
  period: PeriodValue;
  status: ApplicationStatus | "all";
  company: string | "all";
}

export const DEFAULT_FILTERS: AnalyticsFilters = {
  period: "all",
  status: "all",
  company: "all",
};

export function filterApplications(
  apps: Application[],
  filters: AnalyticsFilters,
): Application[] {
  const today = todayKey();
  return apps.filter((app) => {
    if (filters.status !== "all" && app.status !== filters.status) return false;
    if (filters.company !== "all" && companyKey(app.company) !== filters.company) return false;
    if (filters.period !== "all") {
      if (!app.application_date) return false;
      if (daysBetween(app.application_date, today) > Number(filters.period)) return false;
    }
    return true;
  });
}

/** Résumé compact utilisé sur le Dashboard. */
export function analyticsSummary(apps: Application[]) {
  const kpis = computeKpis(apps);
  const sent = apps.filter(isSent).length;
  return {
    total: kpis.total,
    interviews: kpis.interviews,
    offers: kpis.offers,
    interviewRate: rate(kpis.interviews, sent),
  };
}
