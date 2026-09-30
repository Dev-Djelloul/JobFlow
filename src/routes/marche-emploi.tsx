import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Search } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { fetchAccesEmploiStats, type AccesEmploiPeriod } from "@/lib/france-travail-stats";
import { ROME_SUGGESTIONS } from "@/lib/rome-codes";
import { departmentName } from "@/lib/french-departments";

export const Route = createFileRoute("/marche-emploi")({
  head: () => ({
    meta: [
      { title: "Marché de l'emploi — JobFlow" },
      {
        name: "description",
        content:
          "Statistiques officielles France Travail : taux d'accès à l'emploi à 6 mois des sortants de formation, par métier et département.",
      },
    ],
  }),
  component: MarcheEmploiPage,
});

function MarcheEmploiPage() {
  const [romeCode, setRomeCode] = useState(ROME_SUGGESTIONS[0]!.code);
  const [departement, setDepartement] = useState("75");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    territoireLabel?: string | undefined;
    periods: AccesEmploiPeriod[];
  } | null>(null);

  const deptValid = /^(2[ab]|\d{1,3})$/i.test(departement.trim());

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!romeCode.trim() || !deptValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAccesEmploiStats({
        data: {
          codeTypeTerritoire: "DEP",
          codeTerritoire: departement.trim(),
          codeActivite: romeCode.trim(),
        },
      });
      if (!res.ok) {
        setError(res.error ?? "Erreur inconnue.");
        setResult(null);
      } else if (res.periods.length === 0) {
        setError("Aucune donnée disponible pour ce métier et ce territoire.");
        setResult(null);
      } else {
        setResult({ territoireLabel: res.territoireLabel, periods: res.periods });
      }
    } catch {
      setError("La requête a échoué, réessayez.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const chartData = (result?.periods ?? [])
    .filter((p) => p.tauxPct !== null)
    .map((p) => ({ label: p.label, taux: Math.round((p.tauxPct ?? 0) * 10) / 10 }));

  const latest = result?.periods.at(-1);

  return (
    <AppLayout
      title="Marché de l'emploi"
      description="Statistiques officielles France Travail sur l'accès à l'emploi après une formation."
    >
      <div className="flex flex-col gap-6">
        <Card className="rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Taux d'accès à l'emploi après formation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Ces chiffres viennent directement de France Travail : parmi les demandeurs d'emploi
              sortis d'une formation sur un métier donné, quelle part a retrouvé un emploi dans les
              6 mois — trimestre par trimestre, sur le département choisi.
            </p>

            <form
              onSubmit={(e) => void runSearch(e)}
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="rome-select" className="text-xs font-medium text-muted-foreground">
                  Métier
                </label>
                <select
                  id="rome-select"
                  value={romeCode}
                  onChange={(e) => setRomeCode(e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs sm:w-72"
                >
                  {ROME_SUGGESTIONS.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="rome-code" className="text-xs font-medium text-muted-foreground">
                  Code ROME
                </label>
                <Input
                  id="rome-code"
                  value={romeCode}
                  onChange={(e) => setRomeCode(e.target.value.toUpperCase())}
                  className="sm:w-28"
                  maxLength={8}
                  aria-label="Code ROME"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="dept-input" className="text-xs font-medium text-muted-foreground">
                  Département
                </label>
                <Input
                  id="dept-input"
                  value={departement}
                  onChange={(e) => setDepartement(e.target.value)}
                  placeholder="75"
                  className="sm:w-28"
                  aria-label="Code département"
                />
              </div>

              <Button type="submit" disabled={loading || !deptValid || !romeCode.trim()}>
                <Search className="size-4" />
                {loading ? "Recherche…" : "Rechercher"}
              </Button>
            </form>

            {departement.trim() && !deptValid ? (
              <p className="text-xs text-destructive">
                Indiquez un code département (ex : 75, 92, 2A), pas un nom de ville.
              </p>
            ) : null}

            <a
              href="https://candidat.francetravail.fr/metierscope"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-xs text-primary hover:underline"
            >
              Trouver le code ROME d'un métier sur MétierScope (France Travail)
              <ExternalLink className="size-3" />
            </a>
          </CardContent>
        </Card>

        {error ? (
          <Card className="rounded-xl border-destructive/40 shadow-none">
            <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {result && chartData.length > 0 ? (
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base">
                {result.territoireLabel ? `${result.territoireLabel} — ` : ""}
                Évolution par trimestre
                {latest?.tauxPct !== null && latest?.tauxPct !== undefined ? (
                  <span className="ml-2 text-primary">
                    dernier chiffre : {Math.round(latest.tauxPct * 10) / 10} %
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64 pl-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="marcheEmploiArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
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
                    fontSize={11}
                  />
                  <YAxis
                    unit=" %"
                    tickLine={false}
                    axisLine={false}
                    width={44}
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
                    formatter={(value: number) => [`${value} %`, "Accès à l'emploi (6 mois)"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="taux"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#marcheEmploiArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}

        {!result && !error && !loading ? (
          <EmptyState
            title="Choisissez un métier et un département"
            description={`Exemple : ${departmentName(departement) || departement || "votre département"} pour voir le taux de retour à l'emploi après une formation.`}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
