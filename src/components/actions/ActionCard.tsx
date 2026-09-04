import { Link } from "@tanstack/react-router";
import { Building2, Check, ExternalLink, Mail, Pencil, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { companyKey } from "@/lib/companies";
import { contactFullName } from "@/lib/contacts";
import { relativeDateLabel } from "@/lib/format";
import {
  ACTION_BUCKET_BADGE,
  ACTION_BUCKET_DOTS,
  ACTION_BUCKET_LABELS,
  type ActionItem,
} from "@/lib/actions";

interface Props {
  action: ActionItem;
  onOpenApplication: (action: ActionItem) => void;
  onEmail: (action: ActionItem) => void;
  onMarkDone: (action: ActionItem) => void;
  onEdit: (action: ActionItem) => void;
  onDelete: (action: ActionItem) => void;
}

export function ActionCard({
  action,
  onOpenApplication,
  onEmail,
  onMarkDone,
  onEdit,
  onDelete,
}: Props) {
  const { application, followUp, contact } = action;

  return (
    <li className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", ACTION_BUCKET_DOTS[action.bucket])}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">{action.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {relativeDateLabel(action.date)} ·{" "}
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => onOpenApplication(action)}
              >
                {application.position}
              </button>{" "}
              ·{" "}
              <Link
                to="/entreprises/$company"
                params={{ company: companyKey(application.company) }}
                className="underline-offset-2 hover:underline"
              >
                {application.company}
              </Link>
              {contact ? (
                <>
                  {" · "}
                  <Link
                    to="/contacts/$contactId"
                    params={{ contactId: contact.id }}
                    className="underline-offset-2 hover:underline"
                  >
                    {contactFullName(contact)}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
              ACTION_BUCKET_BADGE[action.bucket],
            )}
          >
            {ACTION_BUCKET_LABELS[action.bucket]}
          </span>
          <span className="inline-flex items-center whitespace-nowrap rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {action.source === "follow_up" ? "Relance" : "Candidature"}
          </span>
        </div>
      </div>

      {action.description ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {action.description}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => onOpenApplication(action)}>
          <ExternalLink className="size-4" /> Candidature
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/entreprises/$company" params={{ company: companyKey(application.company) }}>
            <Building2 className="size-4" /> Entreprise
          </Link>
        </Button>
        {contact ? (
          <Button size="sm" variant="ghost" asChild>
            <Link to="/contacts/$contactId" params={{ contactId: contact.id }}>
              <User className="size-4" /> Contact
            </Link>
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => onEmail(action)}>
          <Mail className="size-4" /> Préparer un email
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onMarkDone(action)}>
          <Check className="size-4" />
          {followUp ? "Marquer effectuée" : "Marquer faite"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit(action)}>
          <Pencil className="size-4" /> Modifier
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(action)}
        >
          <Trash2 className="size-4" /> Supprimer
        </Button>
      </div>
    </li>
  );
}
