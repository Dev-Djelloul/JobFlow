import { useState } from "react";
import { Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FollowUpForm } from "./FollowUpForm";
import { EmailComposer } from "@/components/email/EmailComposer";
import { suggestTemplateId } from "@/lib/email";
import { useApplications } from "@/hooks/useApplications";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_STATUS_LABELS,
  type Application,
  type FollowUp,
  type FollowUpStatus,
} from "@/types/application";

const STATUS_CLASSES: Record<FollowUpStatus, string> = {
  todo: "bg-info/10 text-info border-info/25",
  done: "bg-success/12 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export function FollowUpSection({ application }: { application: Application }) {
  const { addFollowUp, updateFollowUp, deleteFollowUp } = useApplications();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FollowUp | null>(null);
  const [emailFor, setEmailFor] = useState<FollowUp | null>(null);

  const followUps = [...(application.follow_ups ?? [])].sort((a, b) =>
    (a.date || "9999").localeCompare(b.date || "9999"),
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Relances</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> Ajouter une relance
        </Button>
      </div>

      {followUps.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune relance planifiée.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {followUps.map((f) => (
            <li key={f.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(f.date)}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
                    STATUS_CLASSES[f.status],
                  )}
                >
                  {FOLLOW_UP_STATUS_LABELS[f.status]}
                </span>
              </div>

              {f.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {f.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  value={f.status}
                  onValueChange={(v) => {
                    updateFollowUp(application.id, f.id, { status: v as FollowUpStatus });
                    toast.success("Statut de la relance mis à jour");
                  }}
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOW_UP_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {FOLLOW_UP_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => setEmailFor(f)}>
                  <Mail className="size-4" /> Préparer un email
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(f);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="size-4" /> Modifier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(f)}
                >
                  <Trash2 className="size-4" /> Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <EmailComposer
        open={!!emailFor}
        onOpenChange={(o) => !o && setEmailFor(null)}
        applicationId={application.id}
        contactId={application.contact_ids?.[0] ?? null}
        templateId={suggestTemplateId({ application, followUpTitle: emailFor?.title ?? "" })}
      />

      <FollowUpForm
        open={formOpen}
        onOpenChange={setFormOpen}
        followUp={editing}
        onSubmit={(values) => {
          if (editing) {
            updateFollowUp(application.id, editing.id, values);
            toast.success("Relance mise à jour");
          } else {
            addFollowUp(application.id, values);
            toast.success("Relance ajoutée");
          }
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette relance ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {pendingDelete?.title} » sera définitivement supprimée. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteFollowUp(application.id, pendingDelete.id);
                setPendingDelete(null);
                toast.success("Relance supprimée");
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
