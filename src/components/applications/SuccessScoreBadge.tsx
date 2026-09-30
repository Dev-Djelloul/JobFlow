import { useMemo, useState } from "react";
import { Gauge, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MarkdownLite } from "@/components/common/MarkdownLite";
import { computeSuccessScore } from "@/lib/success-score";
import { estimateSuccessChance } from "@/lib/openrouter";
import { cn } from "@/lib/utils";
import { useCv } from "@/hooks/useCv";
import { useSettings } from "@/hooks/useSettings";
import type { Application } from "@/types/application";

function colorClasses(percent: number): string {
  if (percent >= 70) return "bg-success/12 text-success border-success/30";
  if (percent >= 40)
    return "bg-warning/15 text-warning-foreground border-warning/35 dark:text-warning";
  return "bg-destructive/10 text-destructive border-destructive/25";
}

/** Badge "chance de succès" (0-100 %) calculé par heuristique locale (voir lib/success-score) —
 * cliquable pour voir le détail des facteurs qui composent le chiffre. */
export function SuccessScoreBadge({
  application,
  size = "default",
}: {
  application: Application;
  size?: "sm" | "default";
}) {
  const { settings } = useSettings();
  const { experiences, cvFile } = useCv();
  const [aiEstimate, setAiEstimate] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const runAiEstimate = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await estimateSuccessChance({
        data: {
          position: application.position,
          company: application.company || undefined,
          jobDescription: application.notes || undefined,
          cvSummary: settings.cvSummary || undefined,
        },
      });
      if (!result.ok || !result.text) {
        setAiError(result.error ?? "L'estimation a échoué.");
        return;
      }
      setAiEstimate(result.text);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setAiLoading(false);
    }
  };

  const score = useMemo(
    () =>
      computeSuccessScore(application, {
        cvSummary: settings.cvSummary,
        experiences,
        hasCvFile: !!cvFile,
      }),
    [application, settings.cvSummary, experiences, cvFile],
  );

  if (score.percent === null) {
    return (
      <span
        className={cn(
          "inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground",
          size === "sm" && "px-1.5 py-0",
        )}
        title="Candidature refusée : indicateur non pertinent"
      >
        <Gauge className="size-3" /> —
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
            colorClasses(score.percent),
            size === "sm" && "px-1.5 py-0",
          )}
          title="Chance de succès estimée — cliquer pour le détail"
        >
          <Gauge className="size-3" /> {score.percent}%
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold">Chance de succès — {score.percent}%</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Score heuristique local, calculé à partir des données de cette candidature (pas d'IA).
        </p>
        <ul className="mt-3 space-y-2.5">
          {score.factors.map((f) => (
            <li key={f.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{f.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {f.points}/{f.maxPoints}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${f.maxPoints > 0 ? (f.points / f.maxPoints) * 100 : 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t pt-3">
          {aiEstimate ? (
            <div className="text-xs">
              <MarkdownLite text={aiEstimate} />
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                void runAiEstimate();
              }}
              disabled={aiLoading}
            >
              <Sparkles className="size-3.5" />
              {aiLoading ? "Estimation en cours…" : "Obtenir aussi un avis IA (en complément)"}
            </Button>
          )}
          {aiError ? <p className="mt-2 text-xs text-destructive">{aiError}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
