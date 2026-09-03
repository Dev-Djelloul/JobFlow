import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, CalendarClock, Percent, Send, Trophy, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/applications/StatusBadge";
import { useApplications } from "@/hooks/useApplications";
import {
  buildTimeline,
  computeStats,
  latestApplications,
  upcomingActions,
  upcomingFollowUps,
} from "@/lib/stats";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — JobFlow, suivi de candidatures" },
      {
        name: "description",
        content:
          "Vue d'ensemble de vos candidatures : total, entretiens, offres reçues, taux de réponse et prochaines actions.",
      },
      { property: "og:title", content: "Dashboard — JobFlow" },
      {
        property: "og:description",
        content: "Suivez vos candidatures, entretiens et offres depuis un tableau de bord clair.",
      },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card className="rounded-xl shadow-none">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { applications, loading } = useApplications();
  const stats = computeStats(applications);
  const timeline = buildTimeline(applications);
  const latest = latestApplications(applications);
  const actions = upcomingActions(applications);
  const followUps = upcomingFollowUps(applications);

  return (
    <AppLayout
      title="Dashboard"
      description="Vue d'ensemble de votre recherche d'emploi"
      actions={
        <Button asChild>
          <Link to="/candidatures">Voir les candidatures</Link>
        </Button>
      }
    >
      {loading ? (
        <LoadingState />
      ) : applications.length === 0 ? (
        <EmptyState
          title="Aucune candidature"
          description="Ajoutez votre première candidature pour voir vos statistiques apparaître ici."
          action={
            <Button asChild>
              <Link to="/candidatures">Ajouter une candidature</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total candidatures" value={stats.total} icon={Briefcase} />
            <StatCard label="Envoyées" value={stats.sent} icon={Send} />
            <StatCard label="Entretiens en cours" value={stats.interviews} icon={Users} />
            <StatCard label="Offres reçues" value={stats.offers} icon={Trophy} />
            <StatCard label="Taux de réponse" value={`${stats.responseRate} %`} icon={Percent} />
          </div>

          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Évolution des candidatures (6 mois)</CardTitle>
            </CardHeader>
            <CardContent className="h-64 pl-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="jobflowArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
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
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.5rem",
                      color: "var(--color-popover-foreground)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--color-muted-foreground)" }}
                    formatter={(value: number) => [`${value}`, "Candidatures"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#jobflowArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-xl shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Dernières candidatures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latest.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{app.position}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {app.company} · {formatDate(app.application_date)}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Prochaines actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {followUps.map(({ followUp, application }) => (
                  <div
                    key={followUp.id}
                    className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <CalendarClock className="mt-0.5 size-4 shrink-0 text-info" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{followUp.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {application.company} · relance {formatDate(followUp.date)}
                      </p>
                    </div>
                  </div>
                ))}
                {actions.length === 0 && followUps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune action planifiée.</p>
                ) : (
                  actions.map((app) => (
                    <div key={app.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                      <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{app.next_action}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {app.company} · relance {formatDate(app.follow_up_date) || "non planifiée"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
