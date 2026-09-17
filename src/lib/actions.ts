import type { Application, ApplicationStatus, FollowUp } from "@/types/application";
import type { Contact } from "@/types/contact";
import { companyKey } from "./companies";
import { addDaysKey, todayKey } from "./format";

export type ActionSource = "follow_up" | "next_action";

export const ACTION_BUCKETS = ["overdue", "today", "week", "later"] as const;
export type ActionBucket = (typeof ACTION_BUCKETS)[number];

export const ACTION_BUCKET_LABELS: Record<ActionBucket, string> = {
  overdue: "En retard",
  today: "Aujourd'hui",
  week: "Cette semaine",
  later: "Plus tard",
};

export const ACTION_BUCKET_DOTS: Record<ActionBucket, string> = {
  overdue: "bg-destructive",
  today: "bg-warning",
  week: "bg-info",
  later: "bg-muted-foreground/40",
};

export const ACTION_BUCKET_BADGE: Record<ActionBucket, string> = {
  overdue: "bg-destructive/10 text-destructive border-destructive/25",
  today: "bg-warning/12 text-warning border-warning/30",
  week: "bg-info/10 text-info border-info/25",
  later: "bg-muted text-muted-foreground border-border",
};

/**
 * Modèle DERIVE (jamais persisté) décrivant une action et surtout sa donnée source.
 *
 * Sources possibles :
 * - `follow_up`  → `Application.follow_ups[]` (donnée structurée, prioritaire) ;
 * - `next_action`→ `Application.next_action` + `Application.follow_up_date`
 *                  (ancien mécanisme, conservé pour compatibilité).
 *
 * `sourceType`, `applicationId` et `followUpId` permettent aux boutons
 * Modifier / Marquer effectuée / Supprimer de cibler la vraie donnée.
 */
export interface ActionItem {
  id: string;
  source: ActionSource;
  sourceType: "application" | "follow_up";
  applicationId: string;
  followUpId?: string;
  title: string;
  description: string;
  /** Date ISO courte (yyyy-mm-dd) ou "" si non planifiée. */
  date: string;
  bucket: ActionBucket;
  application: Application;
  followUp: FollowUp | null;
  contact: Contact | null;
}

/**
 * Prochaine action et échéance par défaut suggérées à chaque changement de statut — c'est
 * ce qui alimente désormais la page Actions même quand l'utilisateur ne remplit pas
 * "Prochaine action" à la main. "rejected" n'a pas de suite logique (candidature close).
 */
const DEFAULT_ACTION_BY_STATUS: Record<
  Exclude<ApplicationStatus, "rejected">,
  { title: string; daysFromNow: number }
> = {
  to_target: { title: "Envoyer la candidature", daysFromNow: 2 },
  applied: { title: "Relancer si pas de réponse", daysFromNow: 7 },
  interview: { title: "Préparer l'entretien", daysFromNow: 1 },
  test: { title: "Réaliser le test / cas pratique", daysFromNow: 3 },
  offer: { title: "Répondre à l'offre", daysFromNow: 3 },
};

/** Suggestion par défaut pour un statut donné, ou `null` (statut "rejected"). */
export function defaultActionForStatus(
  status: ApplicationStatus,
  today = todayKey(),
): { title: string; date: string } | null {
  if (status === "rejected") return null;
  const { title, daysFromNow } = DEFAULT_ACTION_BY_STATUS[status];
  return { title, date: addDaysKey(today, daysFromNow) };
}

/** Classe une date (yyyy-mm-dd) dans l'une des quatre catégories. */
export function bucketForDate(date: string, today = todayKey()): ActionBucket {
  if (!date) return "later";
  if (date < today) return "overdue";
  if (date === today) return "today";
  if (date <= addDaysKey(today, 7)) return "week";
  return "later";
}

const normalize = (v: string) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

function firstContact(contacts: Contact[], application: Application): Contact | null {
  const linked = (application.contact_ids ?? [])
    .map((id) => contacts.find((c) => c.id === id))
    .find(Boolean);
  if (linked) return linked;
  const key = companyKey(application.company);
  return contacts.find((c) => companyKey(c.company) === key) ?? null;
}

/**
 * Construit la liste des actions actives à partir des données existantes.
 * Aucune persistance : tout est dérivé des candidatures / relances / contacts.
 */
export function buildActions(
  applications: Application[],
  contacts: Contact[] = [],
  today = todayKey(),
): ActionItem[] {
  const items: ActionItem[] = [];

  for (const application of applications) {
    const contact = firstContact(contacts, application);
    const openFollowUps = (application.follow_ups ?? []).filter((f) => f.status === "todo");

    for (const followUp of openFollowUps) {
      items.push({
        id: `fu-${followUp.id}`,
        source: "follow_up",
        sourceType: "follow_up",
        applicationId: application.id,
        followUpId: followUp.id,
        title: followUp.title || "Relance",
        description: followUp.description ?? "",
        date: followUp.date ?? "",
        bucket: bucketForDate(followUp.date ?? "", today),
        application,
        followUp,
        contact,
      });
    }

    // Action portée par la candidature elle-même (next_action + follow_up_date).
    if (application.next_action && application.status !== "rejected") {
      // Anti-doublon : la relance (donnée structurée) prime toujours sur next_action,
      // quel que soit son statut (à faire, effectuée ou annulée) dès que le titre
      // correspond, ou que la paire titre + date correspond.
      const duplicate = (application.follow_ups ?? []).some(
        (f) => normalize(f.title) === normalize(application.next_action),
      );
      if (!duplicate) {
        const date = application.follow_up_date ?? "";
        items.push({
          id: `na-${application.id}`,
          source: "next_action",
          sourceType: "application",
          applicationId: application.id,
          title: application.next_action,
          description: "",
          date,
          bucket: bucketForDate(date, today),
          application,
          followUp: null,
          contact,
        });
      }
    }
  }

  return items.sort(
    (a, b) =>
      (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31") ||
      a.application.company.localeCompare(b.application.company, "fr"),
  );
}

export function groupActions(actions: ActionItem[]): Record<ActionBucket, ActionItem[]> {
  return {
    overdue: actions.filter((a) => a.bucket === "overdue"),
    today: actions.filter((a) => a.bucket === "today"),
    week: actions.filter((a) => a.bucket === "week"),
    later: actions.filter((a) => a.bucket === "later"),
  };
}

export interface ActionSummary {
  overdue: number;
  today: number;
  week: number;
  total: number;
}

export function summarizeActions(actions: ActionItem[]): ActionSummary {
  const groups = groupActions(actions);
  return {
    overdue: groups.overdue.length,
    today: groups.today.length,
    week: groups.week.length,
    total: actions.length,
  };
}
