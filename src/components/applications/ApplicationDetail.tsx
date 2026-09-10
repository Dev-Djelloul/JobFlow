import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Mail,
  Pencil,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "./StatusBadge";
import { FollowUpSection } from "./FollowUpSection";
import { ApplicationTimeline } from "./ApplicationTimeline";
import { EmailComposer } from "@/components/email/EmailComposer";
import { CoverLetterGenerator } from "./CoverLetterGenerator";
import { suggestTemplateId } from "@/lib/email";
import { ApplicationContactsSection } from "@/components/contacts/ApplicationContactsSection";
import { formatDate } from "@/lib/format";
import { AddressLink } from "@/components/common/AddressLink";
import { SourceLogo } from "@/components/common/SourceLogo";
import { downloadApplicationDetailPdf } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import {
  experienceLabel,
  remoteLabel,
  sourceLabel,
  STATUSES,
  STATUS_LABELS,
  type Application,
  type ApplicationStatus,
  type ExperienceLevel,
} from "@/types/application";

// Vert pour les niveaux accessibles sans expérience (utile en un coup d'œil pour un premier
// emploi), ambre pour ceux qui en demandent davantage.
const EXPERIENCE_BADGE_CLASSES: Record<ExperienceLevel, string> = {
  debutant: "bg-success/12 text-success border-success/30",
  junior: "bg-success/12 text-success border-success/30",
  confirme: "bg-info/10 text-info border-info/25",
  senior: "bg-warning/15 text-warning-foreground border-warning/35 dark:text-warning",
  expert: "bg-warning/15 text-warning-foreground border-warning/35 dark:text-warning",
};

function ExperienceBadge({ level }: { level?: string | undefined }) {
  if (!level) return null;
  const label = experienceLabel(level);
  const classes =
    level in EXPERIENCE_BADGE_CLASSES
      ? EXPERIENCE_BADGE_CLASSES[level as ExperienceLevel]
      : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        classes,
      )}
    >
      {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

interface Props {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (application: Application) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onToggleFavorite: (id: string) => void;
  onRemoveStatusHistoryEntry: (id: string, index: number) => void;
  /** Liste ordonnée dans laquelle naviguer (ex. la liste filtrée affichée sur la page) —
   * les flèches précédent/suivant n'apparaissent que si elle est fournie et contient
   * la candidature ouverte. */
  navigationList?: Application[] | undefined;
  onNavigate?: ((application: Application) => void) | undefined;
}

export function ApplicationDetail({
  application,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleFavorite,
  onRemoveStatusHistoryEntry,
  navigationList,
  onNavigate,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const navIndex = application
    ? (navigationList?.findIndex((a) => a.id === application.id) ?? -1)
    : -1;
  const hasPrev = navIndex > 0;
  const hasNext = navIndex >= 0 && !!navigationList && navIndex < navigationList.length - 1;
  const goPrev = () => {
    if (hasPrev && navigationList) onNavigate?.(navigationList[navIndex - 1]!);
  };
  const goNext = () => {
    if (hasNext && navigationList) onNavigate?.(navigationList[navIndex + 1]!);
  };

  // Flèches gauche/droite du clavier : seulement quand le focus n'est pas dans un champ de
  // saisie (input, select, textarea…), pour ne jamais interférer avec la frappe ou un menu.
  useEffect(() => {
    if (!open || !navigationList) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isFormField =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement | null)?.closest('[role="combobox"], [contenteditable="true"]');
      if (isFormField) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, navigationList, navIndex]);

  if (!application) return null;

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadApplicationDetailPdf(application);
    } catch {
      toast.error("Échec de l'export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl gap-5">
          {navigationList && navigationList.length > 1 ? (
            <div className="absolute left-4 top-4 flex items-center gap-0.5 rounded-full border border-border bg-background/80 p-0.5 backdrop-blur">
              <button
                type="button"
                onClick={goPrev}
                disabled={!hasPrev}
                aria-label="Candidature précédente"
                title="Candidature précédente (←)"
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="px-1 text-[11px] tabular-nums text-muted-foreground">
                {navIndex + 1}/{navigationList.length}
              </span>
              <button
                type="button"
                onClick={goNext}
                disabled={!hasNext}
                aria-label="Candidature suivante"
                title="Candidature suivante (→)"
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          ) : null}
          <DialogHeader
            className={navigationList && navigationList.length > 1 ? "mt-9" : undefined}
          >
            <DialogTitle className="flex items-center gap-2 pr-10">
              {application.position}
              <button
                type="button"
                onClick={() => onToggleFavorite(application.id)}
                aria-label={application.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                title={application.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                className="text-muted-foreground hover:text-amber-500"
              >
                <Star
                  className={cn("size-4", application.favorite && "fill-amber-400 text-amber-400")}
                />
              </button>
            </DialogTitle>
            <DialogDescription>
              {application.company}
              {application.location ? ` · ${application.location}` : ""} ·{" "}
              {application.contract_type}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={application.status} />
            <ExperienceBadge level={application.experience_level} />
            <Select
              value={application.status}
              onValueChange={(v) => onStatusChange(application.id, v as ApplicationStatus)}
            >
              <SelectTrigger className="h-8 w-[210px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
              <FileText className="size-4" /> {exportingPdf ? "Génération…" : "Exporter en PDF"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}>
              <Mail className="size-4" /> Écrire un email
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCoverLetterOpen(true)}>
              <Sparkles className="size-4" /> Lettre de motivation
            </Button>
            <Button size="sm" onClick={() => onEdit(application)}>
              <Pencil className="size-4" /> Modifier
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              aria-label="Supprimer cette candidature"
              title="Supprimer cette candidature"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Entreprise" value={application.company} />
            <Field
              label="Localisation"
              value={
                application.location ? (
                  <AddressLink address={application.location} showIcon />
                ) : null
              }
            />
            <Field label="Contrat" value={application.contract_type} />
            <Field label="Salaire" value={application.salary} />
            <Field label="Candidature" value={formatDate(application.application_date)} />
            <Field label="Relance" value={formatDate(application.follow_up_date)} />
            <Field
              label="Offre"
              value={
                application.job_url ? (
                  <a
                    href={application.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Voir l'offre <ExternalLink className="size-3" />
                  </a>
                ) : null
              }
            />
            <Field
              label="Source"
              value={
                application.source ? (
                  application.source_url ? (
                    <a
                      href={application.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <SourceLogo source={application.source} size={16} />
                      {sourceLabel(application.source)} <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <SourceLogo source={application.source} size={16} />
                      {sourceLabel(application.source)}
                    </span>
                  )
                ) : null
              }
            />
            <Field label="Télétravail" value={remoteLabel(application.remote)} />
            <Field
              label="Niveau d'expérience"
              value={<ExperienceBadge level={application.experience_level} />}
            />
            <Field label="Prochaine action" value={application.next_action} />
          </div>

          <Separator />

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {application.notes || "Aucune note pour le moment."}
            </p>
          </div>

          <Separator />

          <ApplicationContactsSection application={application} />

          <Separator />

          <FollowUpSection application={application} />

          <Separator />

          <ApplicationTimeline application={application} />

          <Separator />

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Historique des statuts
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Plusieurs changements le même jour remplacent désormais l'entrée du jour au lieu de
              s'empiler. Vous pouvez supprimer une ligne existante si l'historique en garde trop.
            </p>
            <ol className="mt-2 space-y-2">
              {application.status_history.map((entry, i) => (
                <li key={`${entry.status}-${i}`} className="flex items-center gap-3 text-sm">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <StatusBadge status={entry.status} />
                  <span className="text-muted-foreground">{formatDate(entry.date)}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveStatusHistoryEntry(application.id, i)}
                    aria-label="Supprimer cette entrée de l'historique"
                    title="Supprimer cette entrée de l'historique"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </DialogContent>
      </Dialog>

      <EmailComposer
        open={emailOpen}
        onOpenChange={setEmailOpen}
        applicationId={application.id}
        contactId={application.contact_ids?.[0] ?? null}
        templateId={suggestTemplateId({ application })}
      />

      <CoverLetterGenerator
        application={application}
        open={coverLetterOpen}
        onOpenChange={setCoverLetterOpen}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette candidature ?</AlertDialogTitle>
            <AlertDialogDescription>
              {application.position} chez {application.company} sera définitivement supprimée. Cette
              action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onDelete(application.id);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
