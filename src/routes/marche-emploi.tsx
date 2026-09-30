import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
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
import { DataEmploiCard } from "@/components/common/DataEmploiCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchAccesEmploiStats,
  listAllFormationActivities,
  searchFormationActivities,
  type AccesEmploiPeriod,
  type ActiviteOption,
} from "@/lib/france-travail-stats";
import { departmentName } from "@/lib/french-departments";
import { REGION_OPTIONS, regionName } from "@/lib/french-regions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/marche-emploi")({
  head: () => ({
    meta: [
      { title: "Marché de l'emploi — JobFlow" },
      {
        name: "description",
        content:
          "Statistiques officielles France Travail : taux d'accès à l'emploi à 6 mois des sortants de formation, par domaine de formation, département ou région, avec comparaison.",
      },
    ],
  }),
  component: MarcheEmploiPage,
});

type TerritoireType = "DEP" | "REG";

function territoireLabelFor(type: TerritoireType, code: string): string {
  return type === "DEP" ? departmentName(code) || code : regionName(code) || code;
}

function territoireValid(type: TerritoireType, code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return false;
  if (type === "DEP") return /^(2[ab]|\d{1,3})$/i.test(trimmed);
  return REGION_OPTIONS.some((r) => r.code === trimmed.padStart(2, "0"));
}

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

/** Sélecteur type de territoire (Département/Région) + code — utilisé pour le territoire
 * principal et celui de comparaison, d'où l'extraction en sous-composant. */
function TerritoireFields({
  idPrefix,
  type,
  setType,
  code,
  setCode,
}: {
  idPrefix: string;
  type: TerritoireType;
  setType: (t: TerritoireType) => void;
  code: string;
  setCode: (c: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">Territoire</span>
      <div className="flex gap-1.5">
        <div className="flex rounded-md border border-input p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setType("DEP")}
            className={cn(
              "rounded px-2 py-1 transition-colors",
              type === "DEP" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Dépt
          </button>
          <button
            type="button"
            onClick={() => setType("REG")}
            className={cn(
              "rounded px-2 py-1 transition-colors",
              type === "REG" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Région
          </button>
        </div>
        {type === "DEP" ? (
          <Input
            id={`${idPrefix}-dep`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="75"
            className="w-24"
            aria-label="Code département"
          />
        ) : (
          <select
            id={`${idPrefix}-reg`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Région"
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs"
          >
            <option value="">Choisir…</option>
            {REGION_OPTIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

interface Series {
  key: "a" | "b";
  territoireType: TerritoireType;
  requestedCode: string;
  territoireLabel: string | undefined;
  periods: AccesEmploiPeriod[];
}

const SERIES_COLORS: Record<"a" | "b", string> = {
  a: "var(--color-primary)",
  b: "var(--color-chart-2, #f97316)",
};

function MarcheEmploiPage() {
  const [activiteQuery, setActiviteQuery] = useState("");
  const [selected, setSelected] = useState<ActiviteOption | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { options, searching, searchError } = useActiviteSearch(activiteQuery);
  const { all, loadingAll, allError } = useAllActivites();
  const boxRef = useRef<HTMLDivElement>(null);

  const [territoireType, setTerritoireType] = useState<TerritoireType>("DEP");
  const [territoireCode, setTerritoireCode] = useState("75");

  const [compareOn, setCompareOn] = useState(false);
  const [compareType, setCompareType] = useState<TerritoireType>("DEP");
  const [compareCode, setCompareCode] = useState("69");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<Series[]>([]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const primaryValid = territoireValid(territoireType, territoireCode);
  const compareValid = !compareOn || territoireValid(compareType, compareCode);
  const canSearch = !!selected && primaryValid && compareValid;

  async function fetchOne(type: TerritoireType, code: string) {
    return fetchAccesEmploiStats({
      data: {
        codeTypeTerritoire: type,
        codeTerritoire: code.trim(),
        codeActivite: selected!.code,
      },
    });
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    try {
      const calls = [fetchOne(territoireType, territoireCode)];
      if (compareOn) calls.push(fetchOne(compareType, compareCode));
      const results = await Promise.all(calls);

      const failed = results.find((r) => !r.ok);
      if (failed) {
        setError(failed.error ?? "Erreur inconnue.");
        setSeries([]);
        return;
      }
      const empty = results.find(
        (r) => r.periods.length === 0 || r.periods.every((p) => p.tauxPct === null),
      );
      if (empty) {
        setError(
          "France Travail n'a renvoyé aucune valeur exploitable pour au moins un des territoires demandés (donnée probablement masquée, effectif trop faible).",
        );
        setSeries([]);
        return;
      }

      const next: Series[] = [
        {
          key: "a",
          territoireType,
          requestedCode: territoireCode.trim(),
          territoireLabel: results[0]!.territoireLabel,
          periods: results[0]!.periods,
        },
      ];
      if (compareOn) {
        next.push({
          key: "b",
          territoireType: compareType,
          requestedCode: compareCode.trim(),
          territoireLabel: results[1]!.territoireLabel,
          periods: results[1]!.periods,
        });
      }
      setSeries(next);
    } catch {
      setError("La requête a échoué, réessayez.");
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  // Fusionne les séries par code de période pour tracer plusieurs courbes sur un même graphique.
  const chartData = (() => {
    if (series.length === 0) return [];
    const byCode = new Map<string, { label: string; a?: number; b?: number }>();
    for (const s of series) {
      for (const p of s.periods) {
        if (p.tauxPct === null) continue;
        const entry = byCode.get(p.code) ?? { label: p.label };
        entry[s.key] = Math.round(p.tauxPct * 10) / 10;
        byCode.set(p.code, entry);
      }
    }
    return [...byCode.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  })();

  function seriesName(s: Series): string {
    return s.territoireLabel ?? territoireLabelFor(s.territoireType, s.requestedCode);
  }

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
                les 6 mois — trimestre par trimestre, sur le territoire choisi.
              </p>

              <form onSubmit={(e) => void runSearch(e)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
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

                  <TerritoireFields
                    idPrefix="territoire"
                    type={territoireType}
                    setType={setTerritoireType}
                    code={territoireCode}
                    setCode={setTerritoireCode}
                  />

                  <Button type="submit" disabled={loading || !canSearch}>
                    <Search className="size-4" />
                    {loading ? "Recherche…" : "Rechercher"}
                  </Button>
                </div>

                {compareOn ? (
                  <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
                    <TerritoireFields
                      idPrefix="compare"
                      type={compareType}
                      setType={setCompareType}
                      code={compareCode}
                      setCode={setCompareCode}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCompareOn(false)}
                      className="text-muted-foreground"
                    >
                      <X className="size-3.5" />
                      Retirer la comparaison
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCompareOn(true)}
                    className="w-fit"
                  >
                    + Comparer avec un autre territoire
                  </Button>
                )}
              </form>

              {territoireCode.trim() && !primaryValid ? (
                <p className="text-xs text-destructive">
                  {territoireType === "DEP"
                    ? "Indiquez un code département (ex : 75, 92, 2A), pas un nom de ville."
                    : "Choisissez une région dans la liste."}
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

          {series.length > 0 && chartData.length > 0 ? (
            <Card className="rounded-xl shadow-none">
              <CardHeader>
                <CardTitle className="text-base">
                  {series.map(seriesName).join(" vs ")} — Évolution par trimestre
                </CardTitle>
                <div className="flex flex-col gap-0.5">
                  {series.map((s) => (
                    <p key={s.key} className="text-xs text-muted-foreground">
                      {s.territoireType === "DEP" ? "Département" : "Région"} demandé(e) :{" "}
                      {territoireLabelFor(s.territoireType, s.requestedCode)} ({s.requestedCode}) —
                      territoire renvoyé par France Travail : {s.territoireLabel ?? "non précisé"}
                    </p>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="h-64 pl-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="marcheEmploiAreaA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES_COLORS.a} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={SERIES_COLORS.a} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="marcheEmploiAreaB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES_COLORS.b} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={SERIES_COLORS.b} stopOpacity={0.02} />
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
                      formatter={(value: number, name: string) => [
                        `${value} %`,
                        name === "a" ? seriesName(series[0]!) : seriesName(series[1]!),
                      ]}
                    />
                    {series.length > 1 ? <Legend /> : null}
                    <Area
                      type="monotone"
                      dataKey="a"
                      name={seriesName(series[0]!)}
                      stroke={SERIES_COLORS.a}
                      strokeWidth={2}
                      fill="url(#marcheEmploiAreaA)"
                      connectNulls
                    />
                    {series[1] ? (
                      <Area
                        type="monotone"
                        dataKey="b"
                        name={seriesName(series[1])}
                        stroke={SERIES_COLORS.b}
                        strokeWidth={2}
                        fill="url(#marcheEmploiAreaB)"
                        connectNulls
                      />
                    ) : null}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trimestre</TableHead>
                      <TableHead className="text-right">{seriesName(series[0]!)}</TableHead>
                      {series[1] ? (
                        <TableHead className="text-right">{seriesName(series[1])}</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right font-medium">
                          {row.a !== undefined ? `${row.a} %` : "—"}
                        </TableCell>
                        {series[1] ? (
                          <TableCell className="text-right font-medium">
                            {row.b !== undefined ? `${row.b} %` : "—"}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {series.length === 0 && !error && !loading ? (
            <EmptyState
              title="Recherchez un domaine de formation"
              description={`Ex : « informatique » pour ${territoireLabelFor(territoireType, territoireCode) || "votre territoire"}, afin de voir le taux de retour à l'emploi après une formation. Vous pouvez aussi comparer deux territoires.`}
            />
          ) : null}

          <DataEmploiCard />
        </div>
      </div>
    </AppLayout>
  );
}
