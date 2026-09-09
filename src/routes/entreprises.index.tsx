import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useApplications } from "@/hooks/useApplications";
import { buildCompanies, isOverdue } from "@/lib/companies";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STATUSES, STATUS_LABELS } from "@/types/application";

export const Route = createFileRoute("/entreprises/")({
  head: () => ({
    meta: [
      { title: "Entreprises — JobFlow" },
      {
        name: "description",
        content:
          "Vos candidatures regroupées par entreprise : nombre de candidatures, entretiens, offres, refus, dernière activité et prochaine relance.",
      },
      { property: "og:title", content: "Entreprises — JobFlow" },
      {
        property: "og:description",
        content: "Mini-CRM : toutes les entreprises suivies dans JobFlow, avec leurs indicateurs.",
      },
    ],
  }),
  component: CompaniesPage,
});

type SortKey = "name" | "total" | "activity";

function CompaniesPage() {
  const { applications, loading } = useApplications();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("activity");

  const companies = useMemo(() => {
    const source =
      status === "all" ? applications : applications.filter((a) => a.status === status);
    const q = search.trim().toLowerCase();
    return buildCompanies(source)
      .filter((c) => (q === "" ? true : c.name.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sort === "total") return b.total - a.total;
        if (sort === "activity") return (b.lastActivity || "").localeCompare(a.lastActivity || "");
        return a.name.localeCompare(b.name, "fr");
      });
  }, [applications, search, status, sort]);

  return (
    <AppLayout
      title="Entreprises"
      description={`${companies.length} entreprise${companies.length > 1 ? "s" : ""} suivie${companies.length > 1 ? "s" : ""}`}
    >
      {loading ? (
        <LoadingState rows={6} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une entreprise…"
                className="pl-9"
                aria-label="Rechercher une entreprise"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filtrer par statut des candidatures">
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
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger aria-label="Trier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activity">Tri : dernière activité</SelectItem>
                <SelectItem value="total">Tri : nombre de candidatures</SelectItem>
                <SelectItem value="name">Tri : nom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {companies.length === 0 ? (
            <EmptyState
              title={applications.length === 0 ? "Aucune entreprise" : "Aucun résultat"}
              description={
                applications.length === 0
                  ? "Les entreprises apparaissent automatiquement dès que vous ajoutez une candidature."
                  : "Essayez d'ajuster votre recherche ou votre filtre."
              }
              action={
                applications.length === 0 ? (
                  <Button asChild>
                    <Link to="/candidatures">Ajouter une candidature</Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/* Mobile : cartes */}
              <div className="grid gap-3 md:hidden">
                {companies.map((c) => (
                  <Link
                    key={c.key}
                    to="/entreprises/$company"
                    params={{ company: encodeURIComponent(c.key) }}
                  >
                    <Card className="rounded-xl shadow-none">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-2 font-medium">
                            <Building2 className="size-4 text-muted-foreground" />
                            {c.name}
                          </p>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {c.total} candidature(s) · {c.interviews} entretien(s) ·{" "}
                          <span className="font-medium text-success">{c.offers} offre(s)</span> ·{" "}
                          {c.rejected > 0 ? (
                            <span className="font-medium text-destructive">{c.rejected} refus</span>
                          ) : (
                            "0 refus"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dernière activité : {formatDate(c.lastActivity) || "—"}
                          {c.nextFollowUp ? (
                            <>
                              {" · Relance le "}
                              <span
                                className={
                                  isOverdue(c.nextFollowUp.followUp)
                                    ? "font-medium text-destructive"
                                    : undefined
                                }
                              >
                                {isOverdue(c.nextFollowUp.followUp)
                                  ? "en retard"
                                  : formatDate(c.nextFollowUp.followUp.date)}
                              </span>
                            </>
                          ) : (
                            ""
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Desktop / tablette : tableau */}
              <Card className="hidden overflow-hidden rounded-xl p-0 shadow-none md:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entreprise</TableHead>
                        <TableHead className="text-right">Candidatures</TableHead>
                        <TableHead className="text-right">Entretiens</TableHead>
                        <TableHead className="text-right">Offres</TableHead>
                        <TableHead className="text-right">Refus</TableHead>
                        <TableHead className="whitespace-nowrap">Dernière activité</TableHead>
                        <TableHead className="whitespace-nowrap">Prochaine relance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((c) => (
                        <TableRow key={c.key} className="cursor-pointer">
                          <TableCell className="font-medium">
                            <Link
                              to="/entreprises/$company"
                              params={{ company: encodeURIComponent(c.key) }}
                              className="flex items-center gap-2 hover:underline"
                            >
                              <Building2 className="size-4 text-muted-foreground" />
                              {c.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right">{c.total}</TableCell>
                          <TableCell className="text-right">{c.interviews}</TableCell>
                          <TableCell className="text-right font-medium text-success">
                            {c.offers}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right",
                              c.rejected > 0 && "font-medium text-destructive",
                            )}
                          >
                            {c.rejected}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(c.lastActivity) || "—"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "whitespace-nowrap",
                              c.nextFollowUp &&
                                isOverdue(c.nextFollowUp.followUp) &&
                                "font-medium text-destructive",
                            )}
                          >
                            {c.nextFollowUp
                              ? isOverdue(c.nextFollowUp.followUp)
                                ? "En retard"
                                : formatDate(c.nextFollowUp.followUp.date)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}
