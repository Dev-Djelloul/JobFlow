import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Star } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { useApplications } from "@/hooks/useApplications";
import { useApplicationDialogs } from "@/hooks/useApplicationDialogs";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STATUSES, STATUS_LABELS, type ApplicationStatus } from "@/types/application";

export const Route = createFileRoute("/kanban")({
  head: () => ({
    meta: [
      { title: "Vue Kanban — JobFlow" },
      {
        name: "description",
        content:
          "Pilotez vos candidatures par étape : à cibler, envoyée, entretien, test, offre, refusée. Glissez-déposez pour changer de statut.",
      },
      { property: "og:title", content: "Vue Kanban — JobFlow" },
      {
        property: "og:description",
        content: "Un tableau Kanban pour visualiser chaque étape de votre recherche d'emploi.",
      },
    ],
  }),
  component: KanbanPage,
});

function KanbanPage() {
  const { applications, loading } = useApplications();
  const dialogs = useApplicationDialogs();
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
    <AppLayout
      title="Vue Kanban"
      description="Glissez une carte d'une colonne à l'autre pour changer son statut"
      actions={
        <Button onClick={dialogs.openCreate}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      }
    >
      {loading ? (
        <LoadingState rows={4} />
      ) : applications.length === 0 ? (
        <EmptyState
          title="Aucune candidature"
          description="Ajoutez une candidature pour la voir apparaître dans le tableau."
          action={
            <Button onClick={dialogs.openCreate}>
              <Plus className="size-4" /> Ajouter une candidature
            </Button>
          }
        />
      ) : (
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
                    "w-72 shrink-0 rounded-xl border border-border bg-surface p-3 transition-colors",
                    overColumn === status && "border-primary bg-primary/5",
                  )}
                >
                  <header className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
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
                              aria-label={
                                app.favorite ? "Retirer des favoris" : "Ajouter aux favoris"
                              }
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
      )}

      <ApplicationForm
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        application={dialogs.editing}
        onSubmit={dialogs.submit}
      />
      <ApplicationDetail
        application={dialogs.selected}
        open={dialogs.detailOpen}
        onOpenChange={dialogs.setDetailOpen}
        onEdit={dialogs.openEdit}
        onDelete={dialogs.remove}
        onStatusChange={dialogs.setStatus}
        onToggleFavorite={dialogs.toggleFavorite}
        onRemoveStatusHistoryEntry={dialogs.removeStatusHistoryEntry}
      />
    </AppLayout>
  );
}
