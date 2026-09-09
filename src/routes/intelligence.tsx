import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { FollowUpForm } from "@/components/applications/FollowUpForm";
import { ContactForm } from "@/components/contacts/ContactForm";
import { EmailComposer } from "@/components/email/EmailComposer";
import { useApplications } from "@/hooks/useApplications";
import { useContacts } from "@/hooks/useContacts";
import { useApplicationDialogs } from "@/hooks/useApplicationDialogs";
import { suggestTemplateId } from "@/lib/email";
import { companyKey } from "@/lib/companies";
import {
  INSIGHT_PRIORITIES,
  PRIORITY_DOTS,
  PRIORITY_LABELS,
  buildApplicationInsights,
  groupInsights,
  summarizeInsights,
  type ApplicationInsight,
  type InsightPriority,
} from "@/lib/intelligence";
import { cn } from "@/lib/utils";

const PRIORITY_TEXT_CLASSES: Record<InsightPriority, string> = {
  critical: "text-destructive",
  high: "text-warning-foreground dark:text-warning",
  medium: "text-info",
  low: "text-muted-foreground",
};

const PRIORITY_CHIP_CLASSES: Record<InsightPriority, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-warning/15 text-warning-foreground dark:text-warning",
  medium: "bg-info/10 text-info",
  low: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/intelligence")({
  head: () => ({
    meta: [
      { title: "À votre attention — Intelligence JobFlow" },
      {
        name: "description",
        content:
          "Les candidatures qui méritent votre attention maintenant : actions en retard, entretiens à suivre, offres sans suite et candidatures inactives.",
      },
      { property: "og:title", content: "À votre attention — JobFlow" },
      {
        property: "og:description",
        content: "Des recommandations dérivées de vos données pour prioriser votre recherche.",
      },
    ],
  }),
  component: IntelligencePage,
});

/** Carte d'un insight : titre, raison, suggestion et CTA vers le module existant. */
export function InsightCard({
  insight,
  onCta,
  onOpenApplication,
}: {
  insight: ApplicationInsight;
  onCta: (insight: ApplicationInsight) => void;
  onOpenApplication: (insight: ApplicationInsight) => void;
}) {
  const app = insight.application;
  return (
    <li className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", PRIORITY_DOTS[insight.priority])}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">{insight.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => onOpenApplication(insight)}
              >
                {app.position}
              </button>{" "}
              ·{" "}
              <Link
                to="/entreprises/$company"
                params={{ company: companyKey(app.company) }}
                className="underline-offset-2 hover:underline"
              >
                {app.company}
              </Link>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{insight.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Suggestion : {insight.suggestedAction}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onCta(insight)}>
          {insight.cta.label}
        </Button>
      </div>
    </li>
  );
}

function IntelligencePage() {
  const { applications, loading, addFollowUp } = useApplications();
  const { contacts, createContact } = useContacts();
  const dialogs = useApplicationDialogs();
  const navigate = useNavigate();

  const [emailForId, setEmailForId] = useState<string | null>(null);
  const [followUpForId, setFollowUpForId] = useState<string | null>(null);
  const [contactForId, setContactForId] = useState<string | null>(null);

  const insights = useMemo(
    () => buildApplicationInsights(applications, contacts),
    [applications, contacts],
  );
  const groups = useMemo(() => groupInsights(insights), [insights]);
  const summary = summarizeInsights(insights);

  const appById = (id: string | null) =>
    id ? (applications.find((a) => a.id === id) ?? null) : null;
  const emailApp = appById(emailForId);
  const followUpApp = appById(followUpForId);
  const contactApp = appById(contactForId);

  const contactFor = (id: string | null) => {
    const app = appById(id);
    if (!app) return null;
    const linked = (app.contact_ids ?? [])
      .map((cid) => contacts.find((c) => c.id === cid))
      .find(Boolean);
    if (linked) return linked;
    const key = companyKey(app.company);
    return contacts.find((c) => companyKey(c.company) === key) ?? null;
  };

  const handleCta = (insight: ApplicationInsight) => {
    switch (insight.cta.kind) {
      case "action":
        void navigate({ to: "/actions" });
        return;
      case "email":
        setEmailForId(insight.applicationId);
        return;
      case "follow_up":
        setFollowUpForId(insight.applicationId);
        return;
      case "contact":
        setContactForId(insight.applicationId);
        return;
      default:
        dialogs.openDetail(insight.application);
    }
  };

  return (
    <AppLayout
      title="À votre attention"
      description="Les candidatures qui méritent votre attention maintenant."
      actions={
        <Button asChild variant="outline">
          <Link to="/actions">Centre Actions</Link>
        </Button>
      }
    >
      {loading ? (
        <LoadingState />
      ) : insights.length === 0 ? (
        <EmptyState
          title="Tout est sous contrôle."
          description="Aucune candidature ne demande d'attention particulière pour le moment."
          action={
            <Button asChild>
              <Link to="/candidatures">Voir les candidatures</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {INSIGHT_PRIORITIES.map((p) => (
              <Card key={p} className="rounded-xl shadow-none">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{PRIORITY_LABELS[p]}</p>
                    <p
                      className={cn(
                        "mt-1 font-display text-2xl font-bold",
                        summary[p] > 0 && PRIORITY_TEXT_CLASSES[p],
                      )}
                    >
                      {summary[p]}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      PRIORITY_CHIP_CLASSES[p],
                    )}
                  >
                    <span className={cn("size-3 rounded-full", PRIORITY_DOTS[p])} />
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          {INSIGHT_PRIORITIES.map((p) => {
            const list = groups[p];
            if (list.length === 0) return null;
            return (
              <Card key={p} className="rounded-xl shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span aria-hidden className={cn("size-2.5 rounded-full", PRIORITY_DOTS[p])} />
                    {PRIORITY_LABELS[p]}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({list.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {list.map((insight) => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        onCta={handleCta}
                        onOpenApplication={(i) => dialogs.openDetail(i.application)}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            Recommandations calculées localement à partir de vos données : rien n'est modifié
            automatiquement.
          </p>
        </div>
      )}

      <EmailComposer
        open={!!emailApp}
        onOpenChange={(o) => !o && setEmailForId(null)}
        applicationId={emailApp?.id ?? null}
        contactId={contactFor(emailForId)?.id ?? null}
        templateId={suggestTemplateId({ application: emailApp ?? null, followUpTitle: "" })}
      />

      <FollowUpForm
        open={!!followUpApp}
        onOpenChange={(o) => !o && setFollowUpForId(null)}
        onSubmit={(values) => {
          if (!followUpApp) return;
          addFollowUp(followUpApp.id, values);
          setFollowUpForId(null);
          toast.success("Relance planifiée");
        }}
      />

      <ContactForm
        open={!!contactApp}
        onOpenChange={(o) => !o && setContactForId(null)}
        defaultCompany={contactApp?.company ?? ""}
        lockCompany
        onSubmit={(values) => {
          createContact(values);
          setContactForId(null);
          toast.success("Contact ajouté");
        }}
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

      <ApplicationForm
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        application={dialogs.editing}
        onSubmit={dialogs.submit}
      />
    </AppLayout>
  );
}
