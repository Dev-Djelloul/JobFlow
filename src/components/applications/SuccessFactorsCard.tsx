import { Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateSuccessFactors, type SuccessScoreProfile } from "@/lib/success-score";
import type { Application } from "@/types/application";

interface Props {
  applications: Application[];
  profile: SuccessScoreProfile;
}

/** Explique, facteur par facteur, ce qui tire la chance de succès moyenne vers le haut ou vers
 * le bas sur un ensemble de candidatures — le "pourquoi" derrière le pourcentage affiché à côté. */
export function SuccessFactorsCard({ applications, profile }: Props) {
  const factors = aggregateSuccessFactors(applications, profile);
  if (factors.length === 0) return null;

  const sorted = [...factors].sort(
    (a, b) => a.avgPoints / (a.maxPoints || 1) - b.avgPoints / (b.maxPoints || 1),
  );
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="size-4 text-muted-foreground" />
          Pourquoi ce score de succès ?
        </CardTitle>
        {weakest && strongest && weakest.label !== strongest.label ? (
          <p className="text-sm text-muted-foreground">
            Point fort : <span className="font-medium text-foreground">{strongest.label}</span> ·
            Point faible : <span className="font-medium text-foreground">{weakest.label}</span>
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {factors.map((f) => (
          <div key={f.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{f.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {f.avgPoints}/{f.maxPoints}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${f.maxPoints > 0 ? (f.avgPoints / f.maxPoints) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
