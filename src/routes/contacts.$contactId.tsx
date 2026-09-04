import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, CalendarClock, Mail, Pencil, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/applications/StatusBadge";
import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactActions } from "@/components/contacts/ContactActions";
import { EmailComposer } from "@/components/email/EmailComposer";
import { useContacts } from "@/hooks/useContacts";
import { useApplications } from "@/hooks/useApplications";
import { useApplicationDialogs } from "@/hooks/useApplicationDialogs";
import { companyKey, isOverdue } from "@/lib/companies";
import {
  applicationsForContact,
  contactCompanyKey,
  contactFullName,
  followUpsForContact,
} from "@/lib/contacts";
import { formatDate } from "@/lib/format";
import { FOLLOW_UP_STATUS_LABELS } from "@/types/application";

export const Route = createFileRoute("/contacts/$contactId")({
  head: () => ({
    meta: [
      { title: "Fiche contact — JobFlow" },
      {
        name: "description",
        content:
          "Coordonnées d'un contact professionnel, candidatures et relances liées à son entreprise.",
      },
      { property: "og:title", content: "Fiche contact — JobFlow" },
      {
        property: "og:description",
        content: "Coordonnées, candidatures et relances associées à ce contact.",
      },
    ],
  }),
  component: ContactDetailPage,
});

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium break-words">{value || "—"}</p>
    </div>
  );
}

function ContactDetailPage() {
  const { contactId } = Route.useParams();
  const { contacts, loading, updateContact, deleteContact } = useContacts();
  const { applications, setApplicationContacts } = useApplications();
  const dialogs = useApplicationDialogs();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const navigate = Route.useNavigate();

  const contact = contacts.find((c) => c.id === contactId);

  if (loading) {
    return (
      <AppLayout title="Contact">
        <LoadingState rows={4} />
      </AppLayout>
    );
  }

  if (!contact) {
    return (
      <AppLayout title="Contact introuvable">
        <EmptyState
          title="Ce contact n'existe plus"
          description="Il a peut-être été supprimé, ou le lien est incorrect."
          action={
            <Button asChild variant="outline">
              <Link to="/contacts">Retour aux contacts</Link>
            </Button>
          }
        />
      </AppLayout>
    );
  }

  const key = contactCompanyKey(contact);
  const relatedApps = applicationsForContact(applications, contact);
  const linkedIds = new Set(
    applications.filter((a) => (a.contact_ids ?? []).includes(contact.id)).map((a) => a.id),
  );
  const followUps = followUpsForContact(applications, contact);

  const handleDelete = () => {
    // Nettoyage des associations avant suppression.
    for (const app of applications) {
      if ((app.contact_ids ?? []).includes(contact.id)) {
        setApplicationContacts(
          app.id,
          (app.contact_ids ?? []).filter((id) => id !== contact.id),
        );
      }
    }
    deleteContact(contact.id);
    toast.success("Contact supprimé");
    void navigate({ to: "/contacts" });
  };

  return (
    <AppLayout
      title={contactFullName(contact) || "Contact"}
      description={[contact.job_title, contact.company].filter(Boolean).join(" · ")}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/contacts">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Contacts</span>
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <Card className="rounded-xl shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="size-4 text-muted-foreground" /> Informations
              </CardTitle>
              <CardDescription>Coordonnées et notes personnelles.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setEmailOpen(true)}>
                <Mail className="size-4" />
                <span className="hidden sm:inline">Écrire un email</span>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Modifier</span>
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="size-4" />
                <span className="hidden sm:inline">Supprimer</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Nom complet" value={contactFullName(contact)} />
              <Field label="Fonction" value={contact.job_title} />
              <Field
                label="Entreprise"
                value={
                  key ? (
                    <Link
                      to="/entreprises/$company"
                      params={{ company: key }}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Building2 className="size-3.5" /> {contact.company}
                    </Link>
                  ) : (
                    contact.company
                  )
                }
              />
              <Field label="Email" value={contact.email} />
              <Field label="Téléphone" value={contact.phone} />
              <Field label="LinkedIn" value={contact.linkedin_url} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {contact.notes || "Aucune note pour le moment."}
              </p>
            </div>
            <ContactActions contact={contact} />
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Candidatures associées</CardTitle>
            <CardDescription>
              Candidatures chez {contact.company || "cette entreprise"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {relatedApps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune candidature enregistrée pour cette entreprise.
              </p>
            ) : (
              <ul className="grid gap-2">
                {relatedApps.map((app) => (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => dialogs.openDetail(app)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{app.position}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(app.application_date) || "—"}
                          {linkedIds.has(app.id) ? " · contact associé" : ""}
                        </p>
                      </div>
                      <StatusBadge status={app.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Relances associées</CardTitle>
            <CardDescription>Relances des candidatures de cette entreprise.</CardDescription>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune relance pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {followUps.map(({ followUp, application }) => (
                  <li key={followUp.id} className="rounded-lg border p-3">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <CalendarClock className="size-4 text-muted-foreground" />
                      {followUp.title || "Relance"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(followUp.date) || "—"} · {application.position} ·{" "}
                      {isOverdue(followUp)
                        ? "En retard"
                        : FOLLOW_UP_STATUS_LABELS[followUp.status]}
                    </p>
                    {followUp.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{followUp.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ContactForm
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
        onSubmit={(values) => {
          const previousKey = key;
          updateContact(contact.id, values);
          if (companyKey(values.company) !== previousKey) {
            // L'entreprise change : les associations existantes ne sont plus valides.
            for (const app of applications) {
              if ((app.contact_ids ?? []).includes(contact.id)) {
                setApplicationContacts(
                  app.id,
                  (app.contact_ids ?? []).filter((id) => id !== contact.id),
                );
              }
            }
          }
          setEditOpen(false);
          toast.success("Contact mis à jour");
        }}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contact ?</AlertDialogTitle>
            <AlertDialogDescription>
              {contactFullName(contact) || "Ce contact"} sera définitivement supprimé et retiré des
              candidatures associées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                handleDelete();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApplicationForm
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        application={dialogs.editing}
        onSubmit={dialogs.submit}
      />
      <ApplicationDetail
        application={dialogs.selected}
        open={dialogs.detailOpen}
        onOpenChange={dialogs.setDetailOpen}
        onEdit={dialogs.openEdit}
        onDelete={dialogs.remove}
        onStatusChange={dialogs.setStatus}
      />
    </AppLayout>
  );
}
