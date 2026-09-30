import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Compass, Search, Sparkles, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { MarkdownLite } from "@/components/common/MarkdownLite";
import { generateJobSheet } from "@/lib/openrouter";
import {
  loadMetierScopeHistory,
  saveMetierScopeHistory,
  type MetierScopeEntry,
} from "@/lib/storage";

export const Route = createFileRoute("/metier-scope")({
  head: () => ({
    meta: [
      { title: "MétierScope — JobFlow" },
      {
        name: "description",
        content:
          "Explorez n'importe quel métier : définition, compétences requises, conditions d'accès, salaire indicatif et mobilité — dans l'esprit de MétierScope (France Travail).",
      },
      { property: "og:title", content: "MétierScope — JobFlow" },
      {
        property: "og:description",
        content: "Toutes les informations sur un métier, générées à la demande.",
      },
    ],
  }),
  component: MetierScopePage,
});

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `metier-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const SUGGESTIONS = ["Chef de projet digital", "Développeur web", "UX designer", "Data analyst"];

function MetierScopePage() {
  const [history, setHistory] = useState<MetierScopeEntry[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<MetierScopeEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadMetierScopeHistory());
  }, []);

  const runSearch = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateJobSheet({ data: { position: q } });
      if (!result.ok || !result.text) {
        setError(result.error ?? "La génération a échoué.");
        return;
      }
      const entry: MetierScopeEntry = {
        id: newId(),
        query: q,
        text: result.text,
        searched_at: new Date().toISOString(),
      };
      const next = [entry, ...history.filter((e) => e.query.toLowerCase() !== q.toLowerCase())];
      setHistory(next);
      saveMetierScopeHistory(next);
      setActive(entry);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  };

  const removeEntry = (id: string) => {
    const next = history.filter((e) => e.id !== id);
    setHistory(next);
    saveMetierScopeHistory(next);
    if (active?.id === id) setActive(null);
  };

  return (
    <AppLayout
      title="MétierScope"
      description="Explorez un métier : définition, compétences, conditions d'accès, salaire indicatif, mobilité — généré par IA à la demande."
    >
      <div className="space-y-4">
        <Card className="rounded-xl shadow-none">
          <CardContent className="p-4">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch(query);
              }}
            >
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Quel métier voulez-vous explorer ? (ex. Chef de projet digital)"
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={loading || !query.trim()}>
                <Sparkles className="size-4" /> {loading ? "Génération…" : "Explorer"}
              </Button>
            </form>
            {history.length === 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void runSearch(s)}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {error ? (
          <p className="whitespace-pre-wrap rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card className="rounded-xl shadow-none lg:order-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Métiers consultés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              {history.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">
                  Vos recherches récentes apparaîtront ici.
                </p>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className="group flex items-center gap-1 rounded-md hover:bg-accent"
                  >
                    <button
                      type="button"
                      onClick={() => setActive(entry)}
                      className={`flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm ${
                        active?.id === entry.id ? "font-medium text-primary" : ""
                      }`}
                    >
                      {entry.query}
                    </button>
                    <button
                      type="button"
                      aria-label={`Retirer ${entry.query} de l'historique`}
                      onClick={() => removeEntry(entry.id)}
                      className="mr-1 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="lg:order-2">
            {active ? (
              <Card className="rounded-xl shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Compass className="size-4 text-primary" />
                    {active.query}
                  </CardTitle>
                  <CardDescription>
                    Généré par IA dans l'esprit de MétierScope (France Travail) — à vérifier avant
                    utilisation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MarkdownLite text={active.text} />
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                title="Explorez un métier"
                description="Tapez un intitulé de poste ci-dessus pour obtenir sa fiche : définition, compétences, conditions d'accès, salaire indicatif et mobilité."
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
