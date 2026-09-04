import { Button } from "@/components/ui/button";
import { EMAIL_VARIABLES, EMAIL_VARIABLE_LABELS, type EmailVariable } from "@/types/email";

/** Aide « variables disponibles » : un clic insère la variable dans le champ actif. */
export function VariablePicker({
  onInsert,
  values,
}: {
  onInsert: (variable: EmailVariable) => void;
  values?: Partial<Record<EmailVariable, string>>;
}) {
  return (
    <div className="rounded-lg border border-dashed p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Variables disponibles
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EMAIL_VARIABLES.map((v) => {
          const value = values?.[v]?.trim();
          return (
            <Button
              key={v}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 font-mono text-xs"
              title={`${EMAIL_VARIABLE_LABELS[v]}${value ? ` — ${value}` : " — aucune valeur disponible"}`}
              onClick={() => onInsert(v)}
            >
              {`{{${v}}}`}
            </Button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Une variable sans valeur est simplement retirée du texte final.
      </p>
    </div>
  );
}
