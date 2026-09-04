import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useContacts } from "@/hooks/useContacts";
import { useApplications } from "@/hooks/useApplications";
import { companyKey } from "@/lib/companies";
import { contactFullName, contactsForCompany } from "@/lib/contacts";
import type { Application } from "@/types/application";

/**
 * Association contacts ↔ candidature : uniquement les contacts de la même
 * entreprise (clé normalisée).
 */
export function ApplicationContactsSection({ application }: { application: Application }) {
  const { contacts } = useContacts();
  const { setApplicationContacts } = useApplications();

  const key = companyKey(application.company);
  const available = contactsForCompany(contacts, key);
  const selected = new Set(application.contact_ids ?? []);

  const toggle = (id: string, checked: boolean) => {
    const next = checked
      ? [...selected, id]
      : [...selected].filter((existing) => existing !== id);
    setApplicationContacts(application.id, next);
    toast.success(checked ? "Contact associé" : "Association retirée");
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Contacts</p>
      {available.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Aucun contact enregistré chez {application.company}. Ajoutez-en depuis la{" "}
          <Link to="/contacts" className="text-primary hover:underline">
            page Contacts
          </Link>{" "}
          ou la fiche entreprise.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {available.map((contact) => (
            <li key={contact.id} className="flex items-center gap-3 rounded-lg border p-2.5">
              <Checkbox
                id={`contact-${application.id}-${contact.id}`}
                checked={selected.has(contact.id)}
                onCheckedChange={(v) => toggle(contact.id, v === true)}
                aria-label={`Associer ${contactFullName(contact)}`}
              />
              <label
                htmlFor={`contact-${application.id}-${contact.id}`}
                className="flex-1 cursor-pointer text-sm"
              >
                <span className="flex items-center gap-2 font-medium">
                  <UserRound className="size-3.5 text-muted-foreground" />
                  {contactFullName(contact) || "Contact"}
                </span>
                <span className="text-xs text-muted-foreground">{contact.job_title || "—"}</span>
              </label>
              <Link
                to="/contacts/$contactId"
                params={{ contactId: contact.id }}
                className="text-xs text-primary hover:underline"
              >
                Ouvrir
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
