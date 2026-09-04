import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mail, Phone, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "./ContactForm";
import { ContactActions } from "./ContactActions";
import { useContacts } from "@/hooks/useContacts";
import { contactFullName, contactsForCompany } from "@/lib/contacts";

/** Section « Contacts » affichée sur la fiche entreprise. */
export function CompanyContactsSection({
  companyKey,
  companyName,
}: {
  companyKey: string;
  companyName: string;
}) {
  const { contacts, createContact } = useContacts();
  const [formOpen, setFormOpen] = useState(false);
  const list = contactsForCompany(contacts, companyKey);

  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Contacts</CardTitle>
          <CardDescription>Personnes rencontrées chez {companyName}.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" /> Ajouter un contact
        </Button>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun contact enregistré pour cette entreprise.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((contact) => (
              <li key={contact.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to="/contacts/$contactId"
                      params={{ contactId: contact.id }}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <UserRound className="size-4 text-muted-foreground" />
                      {contactFullName(contact) || "Contact"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{contact.job_title || "—"}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {contact.email ? (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="size-3.5" /> {contact.email}
                    </p>
                  ) : null}
                  {contact.phone ? (
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5" /> {contact.phone}
                    </p>
                  ) : null}
                  {contact.notes ? (
                    <p className="line-clamp-2 text-sm">{contact.notes}</p>
                  ) : null}
                </div>
                <div className="mt-3">
                  <ContactActions contact={contact} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultCompany={companyName}
        lockCompany
        onSubmit={(values) => {
          try {
            createContact(values);
            setFormOpen(false);
            toast.success("Contact ajouté");
          } catch {
            toast.error("Une erreur est survenue, réessayez.");
          }
        }}
      />
    </Card>
  );
}
