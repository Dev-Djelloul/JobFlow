import type { Application, ApplicationStatus, FollowUp } from "@/types/application";
import { STATUS_LABELS } from "@/types/application";

export type TimelineEventType =
  | "application"
  | "status_change"
  | "follow_up"
  | "follow_up_completed"
  | "follow_up_cancelled"
  | "interview"
  | "offer"
  | "action";

export type TimelineSource = "application" | "status_history" | "follow_up" | "next_action";

export interface TimelineEvent {
  id: string;
  /** yyyy-mm-dd ; "" lorsque la date est inconnue. */
  date: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  status?: ApplicationStatus;
  source: TimelineSource;
  /** Identifiant de la relance source, lorsque l'événement en provient. */
  followUpId?: string;
}

const dayKey = (value: string | undefined | null): string => (value ? value.slice(0, 10) : "");

function statusEventType(status: ApplicationStatus): TimelineEventType {
  if (status === "interview" || status === "test") return "interview";
  if (status === "offer") return "offer";
  return "status_change";
}

function followUpEvent(followUp: FollowUp): TimelineEvent {
  const base = {
    id: `fu-${followUp.id}`,
    date: dayKey(followUp.date) || dayKey(followUp.created_at),
    title: followUp.title || "Relance",
    description: followUp.description || undefined,
    source: "follow_up" as const,
    followUpId: followUp.id,
  };
  if (followUp.status === "done") {
    return { ...base, id: `fu-done-${followUp.id}`, type: "follow_up_completed" };
  }
  if (followUp.status === "cancelled") {
    return { ...base, id: `fu-cancel-${followUp.id}`, type: "follow_up_cancelled" };
  }
  return { ...base, type: "follow_up" };
}

/**
 * Timeline entièrement DERIVEE d'une candidature : aucune entité persistée.
 * Sources : application_date/created_at, status_history[], follow_ups[], next_action.
 */
export function buildApplicationTimeline(application: Application): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  const createdDate = dayKey(application.application_date) || dayKey(application.created_at);
  events.push({
    id: `app-${application.id}`,
    date: createdDate,
    type: "application",
    title: application.application_date ? "Candidature envoyée" : "Candidature créée",
    description: `${application.position} — ${application.company}`,
    status: application.status,
    source: "application",
  });

  (application.status_history ?? []).forEach((entry, index) => {
    events.push({
      id: `st-${index}-${entry.status}`,
      date: dayKey(entry.date),
      type: statusEventType(entry.status),
      title: STATUS_LABELS[entry.status] ?? entry.status,
      status: entry.status,
      source: "status_history",
    });
  });

  (application.follow_ups ?? []).forEach((f) => events.push(followUpEvent(f)));

  if (application.next_action) {
    const duplicate = (application.follow_ups ?? []).some(
      (f) => f.title.trim().toLowerCase() === application.next_action.trim().toLowerCase(),
    );
    if (!duplicate) {
      events.push({
        id: `na-${application.id}`,
        date: dayKey(application.follow_up_date),
        type: "action",
        title: application.next_action,
        description: application.follow_up_date ? undefined : "Non planifiée",
        source: "next_action",
      });
    }
  }

  return events.sort(
    (a, b) => (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31") || a.id.localeCompare(b.id),
  );
}
