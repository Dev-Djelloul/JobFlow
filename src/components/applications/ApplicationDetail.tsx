import { useState } from "react";
import { ExternalLink, Mail, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { suggestTemplateId } from "@/lib/email";
import { ApplicationContactsSection } from "@/components/contacts/ApplicationContactsSection";
import { formatDate } from "@/lib/format";
import {
  remoteLabel,
  sourceLabel,
  STATUSES,
  STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from "@/types/application";

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
}

export function ApplicationDetail({
  application,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onStatusChange,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  if (!application) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{application.position}</DialogTitle>
            <DialogDescription>
              {application.company}
              {application.location ? ` · ${application.location}` : ""} · {application.contract_type}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={application.status} />
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

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Entreprise" value={application.company} />
            <Field label="Localisation" value={application.location} />
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
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {sourceLabel(application.source)} <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    sourceLabel(application.source)
                  )
                ) : null
              }
            />
            <Field label="Télétravail" value={remoteLabel(application.remote)} />
            <Field label="Niveau d'expérience" value={application.experience_level} />
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
            <ol className="mt-2 space-y-2">
              {application.status_history.map((entry, i) => (
                <li key={`${entry.status}-${i}`} className="flex items-center gap-3 text-sm">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <StatusBadge status={entry.status} />
                  <span className="text-muted-foreground">{formatDate(entry.date)}</span>
                </li>
              ))}
            </ol>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" /> Supprimer
            </Button>
            <Button variant="outline" onClick={() => setEmailOpen(true)}>
              <Mail className="size-4" /> Écrire un email
            </Button>
            <Button onClick={() => onEdit(application)}>
              <Pencil className="size-4" /> Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailComposer
        open={emailOpen}
        onOpenChange={setEmailOpen}
        applicationId={application.id}
        contactId={application.contact_ids?.[0] ?? null}
        templateId={suggestTemplateId({ application })}
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
