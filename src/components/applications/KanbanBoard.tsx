import { useState } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SuccessScoreBadge } from "@/components/applications/SuccessScoreBadge";
import {
  STATUS_COLUMN_BG_CLASSES,
  STATUS_DOT_CLASSES,
  STATUS_TEXT_CLASSES,
} from "@/components/applications/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { useApplicationDialogs } from "@/hooks/useApplicationDialogs";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  STATUSES,
  STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from "@/types/application";

interface Props {
  applications: Application[];
  dialogs: ReturnType<typeof useApplicationDialogs>;
}

/** Tableau Kanban glisser-déposer par statut — extrait de l'ancienne page dédiée pour être
 * intégré directement au Dashboard, plus visible qu'un onglet à part. */
export function KanbanBoard({ applications, dialogs }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ApplicationStatus | null>(null);

  const drop = (status: ApplicationStatus) => {
    setOverColumn(null);
    if (!dragId) return;
    const app = applications.find((a) => a.id === dragId);
    setDragId(null);
    if (!app || app.status === status) return;
    dialogs.setStatus(app.id, status);
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
      <div className="flex min-w-max gap-4">
        {STATUSES.map((status) => {
          const items = applications.filter((a) => a.status === status);
          return (
            <section
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(status);
              }}
              onDragLeave={() => setOverColumn((c) => (c === status ? null : c))}
              onDrop={() => drop(status)}
              className={cn(
                "w-72 shrink-0 rounded-xl border p-3 transition-colors",
                STATUS_COLUMN_BG_CLASSES[status],
                overColumn === status && "border-primary bg-primary/20",
              )}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    aria-hidden
                    className={cn("size-2 rounded-full", STATUS_DOT_CLASSES[status])}
                  />
                  <span className={STATUS_TEXT_CLASSES[status]}>{STATUS_LABELS[status]}</span>
                </h3>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {items.length}
                </span>
              </header>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Déposez une carte ici
                  </p>
                ) : (
                  items.map((app) => (
                    <Card
                      key={app.id}
                      draggable
                      onDragStart={() => setDragId(app.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => dialogs.openDetail(app)}
                      className={cn(
                        "cursor-grab gap-1 rounded-lg p-3 shadow-none transition-opacity active:cursor-grabbing",
                        dragId === app.id && "opacity-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium leading-snug">{app.position}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dialogs.toggleFavorite(app.id);
                          }}
                          aria-label={app.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                          className="shrink-0 text-muted-foreground hover:text-amber-500"
                        >
                          <Star
                            className={cn(
                              "size-3.5",
                              app.favorite && "fill-amber-400 text-amber-400",
                            )}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">{app.company}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {app.contract_type} · {formatDate(app.application_date)}
                      </p>
                      <div className="mt-1.5">
                        <SuccessScoreBadge application={app} size="sm" />
                      </div>
                      {/* Alternative au glisser-déposer (HTML5 DnD non tactile : ne
                          fonctionne pas sur mobile/tablette). */}
                      <Select
                        value={app.status}
                        onValueChange={(v) => dialogs.setStatus(app.id, v as ApplicationStatus)}
                      >
                        <SelectTrigger
                          className="mt-2 h-7 w-full text-xs"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Changer le statut"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent onClick={(e) => e.stopPropagation()}>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Card>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
