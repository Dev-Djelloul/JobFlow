import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Briefcase, CheckCircle2, Clock, Trophy, Users, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { useApplications } from "@/hooks/useApplications";
import { companyKey } from "@/lib/companies";
import {
  DEFAULT_FILTERS,
  PERIOD_OPTIONS,
  buildFunnel,
  buildTimeSeries,
  companyPerformance,
  computeDelays,
  computeKpis,
  formatRate,
  sourcePerformance,
  statusBreakdown,
  type AnalyticsFilters,
  type TimeGrouping,
} from "@/lib/analytics";
import { STATUSES, STATUS_LABELS, type ApplicationStatus } from "@/types/application";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Statistiques de recherche d'emploi | JobFlow" },
      {
        name: "description",
        content:
          "Analysez votre recherche d'emploi : funnel de conversion, répartition des statuts, évolution temporelle, performance par entreprise et délais moyens.",
      },
      { property: "og:title", content: "Analytics — JobFlow" },
      {
        property: "og:description",
        content:
          "Funnel de conversion, taux d'entretien, délais moyens et performance par entreprise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: string;
}) {
  return (
    <Card className="rounded-xl shadow-none">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
            tone,
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsPage() {
  const { applications, loading } = useApplications();
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [grouping, setGrouping] = useState<TimeGrouping>("month");

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    for (const app of applications) {
      const key = companyKey(app.company);
      if (key && !map.has(key)) map.set(key, app.company.trim());
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [applications]);

  const filtered = useMemo(
    () =>
      applications.filter((app) => {
        if (filters.status !== "all" && app.status !== filters.status) return false;
        if (filters.company !== "all" && companyKey(app.company) !== filters.company) return false;
        if (filters.period !== "all") {
          if (!app.application_date) return false;
          const days = Math.round(
            (Date.now() - new Date(`${app.application_date}T00:00:00`).getTime()) / 86400000,
          );
          if (days > Number(filters.period) || days < 0) return false;
        }
        return true;
      }),
    [applications, filters],
  );

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const funnel = useMemo(() => buildFunnel(filtered), [filtered]);
  const breakdown = useMemo(() => statusBreakdown(filtered), [filtered]);
  const series = useMemo(() => buildTimeSeries(filtered, grouping), [filtered, grouping]);
  const companiesPerf = useMemo(() => companyPerformance(filtered), [filtered]);
  const sources = useMemo(() => sourcePerformance(filtered), [filtered]);
  const delays = useMemo(() => computeDelays(filtered), [filtered]);

  const maxFunnel = funnel[0]?.count ?? 0;
  const seriesTotal = series.reduce((acc, p) => acc + p.count, 0);

  const delayRows = [
    {
      label: "Jusqu'au 1er changement de statut",
      metric: delays.firstChange,
      hint: "Entre la date de candidature et le premier statut différent du statut initial.",
    },
    {
      label: "Jusqu'au 1er entretien",
      metric: delays.firstInterview,
      hint: "Entre la date de candidature et le premier passage en Entretien ou Test.",
    },
    {
      label: "Jusqu'à l'offre",
      metric: delays.offer,
      hint: "Entre la date de candidature et le premier passage en Offre.",
    },
  ];

  return (
    <AppLayout
      title="Analytics"
      description="Statistiques dérivées de vos candidatures"
      actions={
        <Button asChild variant="outline">
          <Link to="/candidatures">Candidatures</Link>
        </Button>
      }
    >
      {loading ? (
        <LoadingState />
      ) : applications.length === 0 ? (
        <EmptyState
          title="Pas encore de données"
          description="Ajoutez des candidatures pour voir apparaître vos statistiques."
          action={
            <Button asChild>
              <Link to="/candidatures">Ajouter une candidature</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Filtres */}
          <Card className="rounded-xl shadow-none">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
              <Select
                value={filters.period}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, period: v as AnalyticsFilters["period"] }))
                }
              >
                <SelectTrigger aria-label="Période">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, status: v as ApplicationStatus | "all" }))
                }
              >
                <SelectTrigger aria-label="Statut">
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

              <Select
                value={filters.company}
                onValueChange={(v) => setFilters((f) => ({ ...f, company: v }))}
              >
                <SelectTrigger aria-label="Entreprise">
                  <SelectValue placeholder="Entreprise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les entreprises</SelectItem>
                  {companies.map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState
              title="Aucune candidature pour ces filtres"
              description="Élargissez la période ou réinitialisez les filtres pour retrouver des statistiques."
              action={
                <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Réinitialiser les filtres
                </Button>
              }
            />
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard label="Total candidatures" value={kpis.total} icon={Briefcase} />
                <KpiCard label="Actives" value={kpis.active} icon={Clock} />
                <KpiCard label="Entretiens" value={kpis.interviews} icon={Users} />
                <KpiCard
                  label="Offres"
                  value={kpis.offers}
                  icon={Trophy}
                  tone="bg-success/12 text-success"
                />
                <KpiCard
                  label="Refus"
                  value={kpis.rejected}
                  icon={XCircle}
                  tone="bg-destructive/10 text-destructive"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Funnel */}
                <Card className="rounded-xl shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Funnel de conversion</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {funnel.map((stage, i) => (
                      <div key={stage.key}>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-medium">{stage.label}</p>
                          <p className="shrink-0 text-sm tabular-nums">
                            {stage.count}
                            {i > 0 ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {formatRate(stage.stepRate)} vs étape préc. ·{" "}
                                {formatRate(stage.globalRate)} du total
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{
                              width: maxFunnel ? `${(stage.count / maxFunnel) * 100}%` : "0%",
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{stage.definition}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Répartition des statuts */}
                <Card className="rounded-xl shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Répartition par statut</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="h-52 min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={breakdown}
                            dataKey="count"
                            nameKey="label"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={2}
                            stroke="var(--color-background)"
                          >
                            {breakdown.map((slice) => (
                              <Cell key={slice.status} fill={slice.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "var(--color-popover)",
                              border: "1px solid var(--color-border)",
                              borderRadius: "0.5rem",
                              color: "var(--color-popover-foreground)",
                              fontSize: 12,
                            }}
                            formatter={(value: number, name: string) => [`${value}`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-2 self-center">
                      {breakdown.map((slice) => (
                        <li key={slice.status} className="flex items-center gap-2 text-sm">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: slice.color }}
                          />
                          <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {slice.count} · {formatRate(slice.share)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Évolution temporelle */}
              <Card className="rounded-xl shadow-none">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <CardTitle className="text-base">Évolution des candidatures</CardTitle>
                  <div className="flex gap-1 rounded-lg border border-border p-0.5">
                    {(["week", "month"] as const).map((g) => (
                      <Button
                        key={g}
                        size="sm"
                        variant={grouping === g ? "secondary" : "ghost"}
                        className="h-7 px-3 text-xs"
                        onClick={() => setGrouping(g)}
                      >
                        {g === "week" ? "Semaine" : "Mois"}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="h-64 pl-0">
                  {seriesTotal === 0 ? (
                    <p className="px-6 text-sm text-muted-foreground">
                      Aucune candidature datée sur cette période — aucune tendance affichée.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={32}
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                        />
                        <Tooltip
                          cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                          contentStyle={{
                            background: "var(--color-popover)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "0.5rem",
                            color: "var(--color-popover-foreground)",
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [`${value}`, "Candidatures"]}
                        />
                        <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Entreprises */}
                <Card className="rounded-xl shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Performance par entreprise</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="px-4 py-2 font-medium">Entreprise</th>
                            <th className="px-2 py-2 text-right font-medium">Cand.</th>
                            <th className="px-2 py-2 text-right font-medium">Entr.</th>
                            <th className="px-2 py-2 text-right font-medium">Offres</th>
                            <th className="px-4 py-2 text-right font-medium">Taux entr.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companiesPerf.map((c) => (
                            <tr key={c.key} className="border-b border-border last:border-0">
                              <td className="max-w-[10rem] truncate px-4 py-2">
                                <Link
                                  to="/entreprises/$company"
                                  params={{ company: c.key }}
                                  className="hover:text-primary hover:underline"
                                >
                                  {c.name}
                                </Link>
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums">{c.total}</td>
                              <td className="px-2 py-2 text-right tabular-nums">{c.interviews}</td>
                              <td className="px-2 py-2 text-right tabular-nums">{c.offers}</td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {formatRate(c.interviewRate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Délais */}
                <Card className="rounded-xl shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Délais moyens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {delayRows.map((row) => (
                      <div key={row.label}>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-medium">{row.label}</p>
                          <p className="shrink-0 font-display text-lg font-bold tabular-nums">
                            {row.metric.averageDays === null
                              ? "N/A"
                              : `${row.metric.averageDays} j`}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.hint}{" "}
                          {row.metric.sample > 0
                            ? `Échantillon : ${row.metric.sample} candidature${row.metric.sample > 1 ? "s" : ""}.`
                            : "Historique insuffisant."}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Sources */}
              <Card className="rounded-xl shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Performance par source</CardTitle>
                </CardHeader>
                <CardContent>
                  {sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Le modèle de candidature ne comporte pas encore de champ « source ». Aucune
                      donnée n'est inventée ici : dès qu'un champ source sera saisi, ce bloc
                      affichera automatiquement les candidatures, entretiens et taux de conversion
                      par source.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {sources.map((s) => (
                        <li key={s.source} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate">{s.source}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {s.total} cand. · {s.interviews} entr. · {formatRate(s.interviewRate)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Méthodologie */}
              <Card className="rounded-xl shadow-none">
                <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">Méthodologie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Candidature active</span> :
                    candidature dont le statut courant est À cibler, Candidature envoyée, Entretien
                    ou Test (ni Offre, ni Refusée).
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Entretien</span> : candidature
                    ayant atteint au moins une fois le statut Entretien ou Test, d'après
                    l'historique des statuts (une candidature refusée après un entretien reste
                    comptée).
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Réponse / progression</span> :
                    candidature envoyée ayant atteint au moins une fois Entretien, Test, Offre ou
                    Refusée.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Taux d'entretien</span> =
                    entretiens ÷ candidatures envoyées (statut différent de « À cibler »).
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Taux d'offre</span> = offres ÷
                    candidatures envoyées ; dans le funnel, chaque étape affiche aussi son taux par
                    rapport à l'étape précédente.
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    Lorsqu'un dénominateur est nul ou que l'historique est insuffisant, la valeur
                    affichée est « N/A » : aucune moyenne ni tendance n'est extrapolée.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}
