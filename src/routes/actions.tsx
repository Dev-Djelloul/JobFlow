import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { ActionCard } from "@/components/actions/ActionCard";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { FollowUpForm } from "@/components/applications/FollowUpForm";
import { EmailComposer } from "@/components/email/EmailComposer";
import { useApplications } from "@/hooks/useApplications";
import { useContacts } from "@/hooks/useContacts";
import { useApplicationDialogs } from "@/hooks/useApplicationDialogs";
import { suggestTemplateId } from "@/lib/email";
import {
  ACTION_BUCKETS,
  ACTION_BUCKET_DOTS,
  ACTION_BUCKET_LABELS,
  buildActions,
  groupActions,
  summarizeActions,
  type ActionItem,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/actions")({
  head: () => ({
    meta: [
      { title: "Actions — Centre de pilotage JobFlow" },
      {
        name: "description",
        content:
          "Toutes vos actions de recherche d'emploi : relances en retard, à faire aujourd'hui, cette semaine ou plus tard.",
      },
      { property: "og:title", content: "Actions — JobFlow" },
      {
        property: "og:description",
        content: "Centralisez relances et prochaines actions de vos candidatures.",
      },
    ],
  }),
  component: ActionsPage,
});

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <Card className="rounded-xl shadow-none">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", tone)}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ActionsPage() {
  const { applications, loading, updateFollowUp, deleteFollowUp, updateApplication } =
    useApplications();
  const { contacts } = useContacts();
  const dialogs = useApplicationDialogs();
  const [emailForId, setEmailForId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const actions = useMemo(() => buildActions(applications, contacts), [applications, contacts]);
  const groups = useMemo(() => groupActions(actions), [actions]);
  const summary = summarizeActions(actions);

  /** Toujours relire l'action depuis les données dérivées : aucun état local obsolète. */
  const find = (id: string | null) => (id ? (actions.find((a) => a.id === id) ?? null) : null);
  const emailFor = find(emailForId);
  const editing = find(editingId);
  const deleting = find(deletingId);

  /** Vide l'ancien mécanisme d'action porté par la candidature. */
  const clearNextAction = (applicationId: string) =>
    updateApplication(applicationId, { next_action: "", follow_up_date: "" });

  const handlers = {
    onOpenApplication: (a: ActionItem) => dialogs.openDetail(a.application),
    onEmail: (a: ActionItem) => setEmailForId(a.id),
    onMarkDone: (a: ActionItem) => {
      if (a.sourceType === "follow_up" && a.followUpId) {
        updateFollowUp(a.applicationId, a.followUpId, { status: "done" });
        toast.success("Relance marquée comme effectuée");
      } else {
        clearNextAction(a.applicationId);
        toast.success("Action marquée comme faite");
      }
    },
    onEdit: (a: ActionItem) => setEditingId(a.id),
    onDelete: (a: ActionItem) => setDeletingId(a.id),
  };

  return (
    <AppLayout
      title="Actions"
      description="Ce qui doit être fait pour faire avancer vos candidatures"
      actions={
        <Button asChild variant="outline">
          <Link to="/candidatures">Candidatures</Link>
        </Button>
      }
    >
      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="En retard"
              value={summary.overdue}
              icon={AlertTriangle}
              tone="bg-destructive/10 text-destructive"
            />
            <SummaryCard
              label="Aujourd'hui"
              value={summary.today}
              icon={CalendarClock}
              tone="bg-warning/12 text-warning"
            />
            <SummaryCard
              label="Cette semaine"
              value={summary.week}
              icon={CalendarDays}
              tone="bg-info/10 text-info"
            />
            <SummaryCard
              label="Actions actives"
              value={summary.total}
              icon={ListTodo}
              tone="bg-primary/10 text-primary"
            />
          </div>

          {actions.length === 0 ? (
            <EmptyState
              title="Tout est à jour 🎉"
              description={
                applications.length === 0
                  ? "Ajoutez une candidature pour commencer à planifier vos actions."
                  : "Aucune action en attente : toutes vos relances sont effectuées ou annulées."
              }
              action={
                <Button asChild>
                  <Link to="/candidatures">
                    {applications.length === 0
                      ? "Ajouter une candidature"
                      : "Voir les candidatures"}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              {ACTION_BUCKETS.map((bucket) => {
                const list = groups[bucket];
                if (list.length === 0) return null;
                return (
                  <Card key={bucket} className="rounded-xl shadow-none">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span
                          aria-hidden
                          className={cn("size-2.5 rounded-full", ACTION_BUCKET_DOTS[bucket])}
                        />
                        {ACTION_BUCKET_LABELS[bucket]}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({list.length})
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {list.map((action) => (
                          <ActionCard key={action.id} action={action} {...handlers} />
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {actions.length > 0 && summary.overdue === actions.length ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-success" />
              Toutes vos actions sont en retard : commencez par la plus ancienne.
            </p>
          ) : null}
        </div>
      )}

      <EmailComposer
        open={!!emailFor}
        onOpenChange={(o) => !o && setEmailFor(null)}
        applicationId={emailFor?.application.id ?? null}
        contactId={emailFor?.contact?.id ?? null}
        templateId={suggestTemplateId({
          application: emailFor?.application ?? null,
          followUpTitle: emailFor?.title ?? "",
        })}
      />

      <FollowUpForm
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        followUp={editing?.followUp ?? null}
        onSubmit={(values) => {
          if (editing?.followUp) {
            updateFollowUp(editing.application.id, editing.followUp.id, values);
            toast.success("Relance mise à jour");
          }
          setEditing(null);
        }}
      />

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
      />
    </AppLayout>
  );
}
