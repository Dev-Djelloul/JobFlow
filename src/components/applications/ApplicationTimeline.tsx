import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  Building2,
  CalendarClock,
  Check,
  FileText,
  ListTodo,
  Send,
  Trophy,
  Users,
} from "lucide-react";
import { buildApplicationTimeline, type TimelineEventType } from "@/lib/timeline";
import { companyKey } from "@/lib/companies";
import { relativeDateLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Application } from "@/types/application";

const ICONS: Record<TimelineEventType, React.ElementType> = {
  application: Send,
  status_change: FileText,
  follow_up: CalendarClock,
  follow_up_completed: Check,
  follow_up_cancelled: Ban,
  interview: Users,
  offer: Trophy,
  action: ListTodo,
};

const TONES: Record<TimelineEventType, string> = {
  application: "bg-primary/10 text-primary",
  status_change: "bg-muted text-muted-foreground",
  follow_up: "bg-info/10 text-info",
  follow_up_completed: "bg-success/12 text-success",
  follow_up_cancelled: "bg-muted text-muted-foreground",
  interview: "bg-warning/12 text-warning",
  offer: "bg-success/12 text-success",
  action: "bg-primary/10 text-primary",
};

export function ApplicationTimeline({ application }: { application: Application }) {
  const events = useMemo(() => buildApplicationTimeline(application), [application]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline</p>
        <Link
          to="/entreprises/$company"
          params={{ company: companyKey(application.company) }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          <Building2 className="size-3.5" /> {application.company}
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucun événement pour le moment.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {events.map((event) => {
            const Icon = ICONS[event.type];
            return (
              <li key={event.id} className="flex min-w-0 gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                    TONES[event.type],
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {relativeDateLabel(event.date)}
                    {event.source === "next_action" ? " · Prochaine action" : ""}
                    {event.source === "follow_up" ? " · Relance" : ""}
                  </p>
                  {event.description ? (
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
