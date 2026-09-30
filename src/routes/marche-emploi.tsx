import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
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
import {
  fetchAccesEmploiStats,
  listAllFormationActivities,
  searchFormationActivities,
  type AccesEmploiPeriod,
  type ActiviteOption,
} from "@/lib/france-travail-stats";
import { departmentName } from "@/lib/french-departments";

export const Route = createFileRoute("/marche-emploi")({
  head: () => ({
    meta: [
      { title: "Marché de l'emploi — JobFlow" },
      {
        name: "description",
        content:
          "Statistiques officielles France Travail : taux d'accès à l'emploi à 6 mois des sortants de formation, par domaine de formation et département.",
      },
    ],
  }),
  component: MarcheEmploiPage,
});

function useActiviteSearch(query: string) {
  const [options, setOptions] = useState<ActiviteOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setOptions([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      void searchFormationActivities({ data: { filtre: query.trim() } })
        .then((res) => {
          if (cancelled) return;
          if (res.ok) {
            setOptions(res.options.slice(0, 12));
            setSearchError(null);
          } else {
            setOptions([]);
            setSearchError(res.error ?? "Erreur inconnue.");
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setOptions([]);
            setSearchError(e instanceof Error ? e.message : "La recherche a échoué.");
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { options, searching, searchError };
}

function useAllActivites() {
  const [all, setAll] = useState<ActiviteOption[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [allError, setAllError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listAllFormationActivities()
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setAll(res.options);
        else setAllError(res.error ?? "Erreur inconnue.");
      })
      .catch((e: unknown) => {
        if (!cancelled) setAllError(e instanceof Error ? e.message : "Chargement échoué.");
      })
      .finally(() => {
        if (!cancelled) setLoadingAll(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { all, loadingAll, allError };
}

function MarcheEmploiPage() {
  const [activiteQuery, setActiviteQuery] = useState("");
  const [selected, setSelected] = useState<ActiviteOption | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { options, searching, searchError } = useActiviteSearch(activiteQuery);
  const { all, loadingAll, allError } = useAllActivites();
  const boxRef = useRef<HTMLDivElement>(null);

  const [departement, setDepartement] = useState("75");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    territoireLabel?: string | undefined;
    periods: AccesEmploiPeriod[];
  } | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const deptValid = /^(2[ab]|\d{1,3})$/i.test(departement.trim());

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !deptValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAccesEmploiStats({
        data: {
          codeTypeTerritoire: "DEP",
          codeTerritoire: departement.trim(),
          codeActivite: selected.code,
        },
      });
      if (!res.ok) {
        setError(res.error ?? "Erreur inconnue.");
        setResult(null);
      } else if (res.periods.length === 0) {
        setError("Aucune donnée disponible pour ce domaine de formation et ce territoire.");
        setResult(null);
      } else if (res.periods.every((p) => p.tauxPct === null)) {
        setError(
          "France Travail a répondu mais sans valeur de taux exploitable pour ce domaine et ce territoire (donnée probablement masquée car l'effectif est trop faible).",
        );
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

  function selectActivite(opt: ActiviteOption) {
    setSelected(opt);
    setActiviteQuery(opt.label);
    setShowSuggestions(false);
  }

  return (
    <AppLayout
      title="Marché de l'emploi"
      description="Statistiques officielles France Travail sur l'accès à l'emploi après une formation."
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Card className="w-full shrink-0 rounded-xl shadow-none lg:w-72">
          <CardHeader>
            <CardTitle className="text-sm">Domaines de formation (référentiel FORM14)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 p-0">
            <p className="px-4 pb-2 text-xs text-muted-foreground">
              Nomenclature officielle nationale — tous les domaines disponibles pour cette
              statistique, cliquez pour en choisir un.
            </p>
            <div className="max-h-[32rem] overflow-y-auto border-t border-border">
              {loadingAll ? (
                <p className="px-4 py-3 text-xs text-muted-foreground">Chargement…</p>
              ) : allError ? (
                <p className="px-4 py-3 text-xs text-destructive">{allError}</p>
              ) : (
                all.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => selectActivite(opt)}
                    className={`block w-full border-b border-border/50 px-4 py-2 text-left text-xs last:border-b-0 hover:bg-accent ${
                      selected?.code === opt.code ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    {opt.label}
                    <span className="ml-1 text-muted-foreground">({opt.code})</span>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <img
                  src="/img/France-Travail-logo.jpg"
                  alt="France Travail"
                  className="h-7 w-7 shrink-0 rounded-md object-cover"
                />
                <CardTitle className="text-base">Taux d'accès à l'emploi après formation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Ces chiffres viennent directement de France Travail : parmi les demandeurs d'emploi
                sortis d'une formation sur un domaine donné, quelle part a retrouvé un emploi dans
                les 6 mois — trimestre par trimestre, sur le département choisi.
              </p>

              <form
                onSubmit={(e) => void runSearch(e)}
                className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div ref={boxRef} className="relative flex flex-col gap-1">
                  <label
                    htmlFor="activite-search"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Domaine de formation
                  </label>
                  <Input
                    id="activite-search"
                    value={activiteQuery}
                    onChange={(e) => {
                      setActiviteQuery(e.target.value);
                      setSelected(null);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Ex : informatique, digital, gestion de projet…"
                    className="sm:w-80"
                    aria-label="Rechercher un domaine de formation"
                  />
                  {showSuggestions && activiteQuery.trim().length >= 2 ? (
                    <div className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg sm:w-80">
                      {searching ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Recherche…</p>
                      ) : searchError ? (
                        <p className="px-3 py-2 text-xs text-destructive">{searchError}</p>
                      ) : options.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          Aucun domaine trouvé pour « {activiteQuery} ».
                        </p>
                      ) : (
                        options.map((opt) => (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => selectActivite(opt)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            {opt.label}
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({opt.code})
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
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

                <Button type="submit" disabled={loading || !deptValid || !selected}>
                  <Search className="size-4" />
                  {loading ? "Recherche…" : "Rechercher"}
                </Button>
              </form>

              {departement.trim() && !deptValid ? (
                <p className="text-xs text-destructive">
                  Indiquez un code département (ex : 75, 92, 2A), pas un nom de ville.
                </p>
              ) : null}
              {activiteQuery.trim() && !selected ? (
                <p className="text-xs text-muted-foreground">
                  Choisissez un domaine dans la liste proposée.
                </p>
              ) : null}
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
              title="Recherchez un domaine de formation"
              description={`Ex : « informatique » pour ${departmentName(departement) || departement || "votre département"}, afin de voir le taux de retour à l'emploi après une formation.`}
            />
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
