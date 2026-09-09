import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, CalendarClock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { AddressLink } from "@/components/common/AddressLink";
import { StatusBadge } from "@/components/applications/StatusBadge";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { CompanyContactsSection } from "@/components/contacts/CompanyContactsSection";
import { useApplications } from "@/hooks/useApplications";
import { useApplicationDialogs } from "@/hooks/useApplicationDialogs";
import { buildCompanies, conversionRates, isOverdue } from "@/lib/companies";
import { formatDate } from "@/lib/format";
import { FOLLOW_UP_STATUS_LABELS } from "@/types/application";
import { sourceLabel } from "@/types/application";

export const Route = createFileRoute("/entreprises/$company")({
  head: () => ({
    meta: [
      { title: "Fiche entreprise — JobFlow" },
      {
        name: "description",
        content:
          "Toutes les candidatures, relances et statistiques de conversion pour une entreprise suivie dans JobFlow.",
      },
      { property: "og:title", content: "Fiche entreprise — JobFlow" },
      {
        property: "og:description",
        content: "Candidatures, relances et taux de conversion d'une entreprise.",
      },
    ],
  }),
  component: CompanyDetailPage,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function CompanyDetailPage() {
  const { company: rawKey } = Route.useParams();
  const { applications, loading } = useApplications();
  const dialogs = useApplicationDialogs();

  const key = useMemo(() => {
    try {
      return decodeURIComponent(rawKey);
    } catch {
      return rawKey;
    }
  }, [rawKey]);

  const company = useMemo(
    () => buildCompanies(applications).find((c) => c.key === key),
    [applications, key],
  );

  if (loading) {
    return (
      <AppLayout title="Entreprise">
        <LoadingState rows={5} />
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout title="Entreprise introuvable">
        <EmptyState
          title="Cette entreprise n'existe plus"
          description="Elle n'a plus aucune candidature associée, ou le lien est incorrect."
          action={
            <Button asChild variant="outline">
              <Link to="/entreprises">Retour aux entreprises</Link>
            </Button>
          }
        />
      </AppLayout>
    );
  }

  const rates = conversionRates(company);

  return (
    <AppLayout
      title={company.name}
      description={`${company.total} candidature${company.total > 1 ? "s" : ""} · dernière activité ${formatDate(company.lastActivity) || "—"}`}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/entreprises">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Entreprises</span>
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <Card className="rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-muted-foreground" /> Informations générales
            </CardTitle>
            <CardDescription>Indicateurs dérivés de vos candidatures.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Candidatures" value={company.total} />
            <Stat label="Entretiens" value={company.interviews} />
            <Stat label="Offres" value={company.offers} />
            {rates.toInterview !== null ? (
              <Stat label="Candidature → entretien" value={`${rates.toInterview} %`} />
            ) : null}
            {rates.toOffer !== null ? (
              <Stat label="Entretien → offre" value={`${rates.toOffer} %`} />
            ) : null}
          </CardContent>
        </Card>

        <CompanyContactsSection companyKey={company.key} companyName={company.name} />

        <Card className="overflow-hidden rounded-xl p-0 shadow-none">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">Candidatures</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {/* Mobile : cartes */}
            <div className="grid gap-3 md:hidden">
              {company.applications.map((app) => (
                <div
                  key={app.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => dialogs.openDetail(app)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      dialogs.openDetail(app);
                    }
                  }}
                  className="cursor-pointer rounded-lg border p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{app.position}</p>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {app.location ? <AddressLink address={app.location} /> : null}
                    {[app.contract_type, sourceLabel(app.source)].filter(Boolean).length > 0
                      ? `${app.location ? " · " : ""}${[app.contract_type, sourceLabel(app.source)].filter(Boolean).join(" · ")}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(app.application_date) || "—"}
                    {app.next_action ? ` · ${app.next_action}` : ""}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop / tablette */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poste</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Prochaine action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.applications.map((app) => (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer"
                      onClick={() => dialogs.openDetail(app)}
                    >
                      <TableCell className="font-medium">{app.position}</TableCell>
                      <TableCell>
                        <AddressLink address={app.location} />
                      </TableCell>
                      <TableCell>{app.contract_type}</TableCell>
                      <TableCell>{sourceLabel(app.source) || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(app.application_date) || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {app.next_action || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Relances</CardTitle>
            <CardDescription>Toutes les relances de cette entreprise, par date.</CardDescription>
          </CardHeader>
          <CardContent>
            {company.followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune relance pour cette entreprise. Ajoutez-en depuis le détail d'une candidature.
              </p>
            ) : (
              <ul className="space-y-2">
                {company.followUps.map(({ followUp, application }) => {
                  const overdue = isOverdue(followUp);
                  return (
                    <li
                      key={followUp.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <CalendarClock className="size-4 text-muted-foreground" />
                          {followUp.title || "Relance"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(followUp.date) || "—"} · {application.position}
                        </p>
                        {followUp.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {followUp.description}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={
                          overdue
                            ? "rounded-md border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                            : followUp.status === "done"
                              ? "rounded-md border border-success/30 bg-success/12 px-2 py-0.5 text-xs font-medium text-success"
                              : followUp.status === "cancelled"
                                ? "rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                                : "rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        }
                      >
                        {overdue ? "En retard" : FOLLOW_UP_STATUS_LABELS[followUp.status]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

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
        navigationList={company.applications}
        onNavigate={dialogs.openDetail}
      />
    </AppLayout>
  );
}
