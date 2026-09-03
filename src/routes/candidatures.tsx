import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpDown, Plus, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusBadge } from "@/components/applications/StatusBadge";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { useApplications } from "@/hooks/useApplications";
import { useApplicationDialogs } from "@/hooks/useApplicationDialogs";
import { formatDate } from "@/lib/format";
import { CONTRACT_TYPES, STATUSES, STATUS_LABELS } from "@/types/application";

export const Route = createFileRoute("/candidatures")({
  head: () => ({
    meta: [
      { title: "Candidatures — JobFlow" },
      {
        name: "description",
        content:
          "Listez, recherchez, filtrez et triez toutes vos candidatures : entreprise, poste, statut et prochaine action.",
      },
      { property: "og:title", content: "Candidatures — JobFlow" },
      {
        property: "og:description",
        content: "Tableau complet de vos candidatures avec recherche, filtres et tri.",
      },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { applications, loading } = useApplications();
  const dialogs = useApplicationDialogs();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [contract, setContract] = useState("all");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications
      .filter((a) => (status === "all" ? true : a.status === status))
      .filter((a) => (contract === "all" ? true : a.contract_type === contract))
      .filter((a) =>
        q === ""
          ? true
          : [a.company, a.position, a.location, a.notes].join(" ").toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const cmp = (a.application_date || "").localeCompare(b.application_date || "");
        return sortDesc ? -cmp : cmp;
      });
  }, [applications, search, status, contract, sortDesc]);

  return (
    <AppLayout
      title="Candidatures"
      description={`${applications.length} candidature${applications.length > 1 ? "s" : ""} suivie${applications.length > 1 ? "s" : ""}`}
      actions={
        <Button onClick={dialogs.openCreate}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Ajouter une candidature</span>
        </Button>
      }
    >
      {loading ? (
        <LoadingState rows={8} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une entreprise, un poste…"
                className="pl-9"
                aria-label="Rechercher"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filtrer par statut">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={contract} onValueChange={setContract}>
              <SelectTrigger aria-label="Filtrer par type de contrat">
                <SelectValue placeholder="Contrat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les contrats</SelectItem>
                {CONTRACT_TYPES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSortDesc((v) => !v)}>
              <ArrowUpDown className="size-4" />
              Date : {sortDesc ? "plus récentes" : "plus anciennes"}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={applications.length === 0 ? "Aucune candidature" : "Aucun résultat"}
              description={
                applications.length === 0
                  ? "Commencez par ajouter votre première candidature."
                  : "Essayez d'ajuster votre recherche ou vos filtres."
              }
              action={
                applications.length === 0 ? (
                  <Button onClick={dialogs.openCreate}>
                    <Plus className="size-4" /> Ajouter une candidature
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                      setContract("all");
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )
              }
            />
          ) : (
            <Card className="overflow-hidden rounded-xl p-0 shadow-none">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Poste</TableHead>
                      <TableHead className="hidden md:table-cell">Localisation</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden lg:table-cell">Prochaine action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((app) => (
                      <TableRow
                        key={app.id}
                        className="cursor-pointer"
                        onClick={() => dialogs.openDetail(app)}
                      >
                        <TableCell className="font-medium">{app.company}</TableCell>
                        <TableCell>
                          <span className="block max-w-[220px] truncate">{app.position}</span>
                          <span className="text-xs text-muted-foreground md:hidden">
                            {app.location}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{app.location || "—"}</TableCell>
                        <TableCell className="hidden whitespace-nowrap sm:table-cell">
                          {formatDate(app.application_date)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} />
                        </TableCell>
                        <TableCell className="hidden max-w-[240px] truncate lg:table-cell">
                          {app.next_action || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
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
      />
    </AppLayout>
  );
}
