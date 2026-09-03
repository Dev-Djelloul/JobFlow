import type { Application, FollowUp } from "@/types/application";

export interface DashboardStats {
  total: number;
  sent: number;
  interviews: number;
  offers: number;
  rejected: number;
  responseRate: number;
}

/** A candidature is "sent" as soon as it left the "to_target" stage. */
export function computeStats(apps: Application[]): DashboardStats {
  const total = apps.length;
  const sent = apps.filter((a) => a.status !== "to_target").length;
  const interviews = apps.filter((a) => a.status === "interview" || a.status === "test").length;
  const offers = apps.filter((a) => a.status === "offer").length;
  const rejected = apps.filter((a) => a.status === "rejected").length;
  const answered = interviews + offers + rejected;
  const responseRate = sent === 0 ? 0 : Math.round((answered / sent) * 100);
  return { total, sent, interviews, offers, rejected, responseRate };
}

export interface TimelinePoint {
  label: string;
  count: number;
}

/** Number of applications per month over the last 6 months. */
export function buildTimeline(apps: Application[]): TimelinePoint[] {
  const now = new Date();
  const points: TimelinePoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = apps.filter((a) => (a.application_date || "").startsWith(key)).length;
    points.push({
      label: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
      count,
    });
  }
  return points;
}

export function upcomingActions(apps: Application[]) {
  return apps
    .filter((a) => a.next_action && a.status !== "rejected")
    .sort((a, b) => (a.follow_up_date || "9999").localeCompare(b.follow_up_date || "9999"))
    .slice(0, 5);
}

export interface UpcomingFollowUp {
  followUp: FollowUp;
  application: Application;
}

/** Pending follow-ups (status "todo") across all applications, soonest first. */
export function upcomingFollowUps(apps: Application[], limit = 5): UpcomingFollowUp[] {
  return apps
    .flatMap((application) =>
      (application.follow_ups ?? [])
        .filter((followUp) => followUp.status === "todo")
        .map((followUp) => ({ followUp, application })),
    )
    .sort((a, b) => (a.followUp.date || "9999").localeCompare(b.followUp.date || "9999"))
    .slice(0, limit);
}

export function latestApplications(apps: Application[]) {
  return [...apps]
    .sort((a, b) => (b.application_date || "").localeCompare(a.application_date || ""))
    .slice(0, 5);
}
