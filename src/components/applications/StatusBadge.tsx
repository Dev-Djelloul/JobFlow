import { cn } from "@/lib/utils";
import { STATUS_LABELS, type ApplicationStatus } from "@/types/application";

const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  to_target: "bg-muted text-muted-foreground border-border",
  applied: "bg-info/10 text-info border-info/25",
  interview: "bg-primary/10 text-primary border-primary/25",
  test: "bg-warning/15 text-warning-foreground border-warning/35 dark:text-warning",
  offer: "bg-success/12 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/25",
};

/** Couleur de texte seule (sans fond/bordure) — pour les titres de colonne, dots, etc. */
export const STATUS_TEXT_CLASSES: Record<ApplicationStatus, string> = {
  to_target: "text-muted-foreground",
  applied: "text-info",
  interview: "text-primary",
  test: "text-warning-foreground dark:text-warning",
  offer: "text-success",
  rejected: "text-destructive",
};

export const STATUS_DOT_CLASSES: Record<ApplicationStatus, string> = {
  to_target: "bg-muted-foreground/40",
  applied: "bg-info",
  interview: "bg-primary",
  test: "bg-warning",
  offer: "bg-success",
  rejected: "bg-destructive",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
