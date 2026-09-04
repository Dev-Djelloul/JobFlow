import type { Application, FollowUp } from "@/types/application";
import type { Contact } from "@/types/contact";
import { companyKey } from "./companies";

export const contactFullName = (c: Pick<Contact, "first_name" | "last_name">) =>
  [c.first_name, c.last_name].filter(Boolean).join(" ").trim();

export const contactInitials = (c: Pick<Contact, "first_name" | "last_name">) =>
  `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase() || "?";

/** Clé d'entreprise d'un contact : même normalisation que le regroupement existant. */
export const contactCompanyKey = (c: Pick<Contact, "company">) => companyKey(c.company);

const LINKEDIN_RE = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+/i;

export const isValidLinkedInUrl = (value: string) => LINKEDIN_RE.test(value.trim());

/** Contacts d'une entreprise (par clé normalisée), triés par nom. */
export function contactsForCompany(contacts: Contact[], key: string): Contact[] {
  return contacts
    .filter((c) => contactCompanyKey(c) === key)
    .sort((a, b) => contactFullName(a).localeCompare(contactFullName(b), "fr"));
}

/** Recherche globale : prénom, nom, entreprise, fonction, email. */
export function searchContacts(contacts: Contact[], query: string): Contact[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts;
  return contacts.filter((c) =>
    [c.first_name, c.last_name, contactFullName(c), c.company, c.job_title, c.email]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(q)),
  );
}

export type ContactSort = "name" | "company" | "recent";

export function sortContacts(contacts: Contact[], sort: ContactSort): Contact[] {
  const list = [...contacts];
  if (sort === "company")
    return list.sort(
      (a, b) =>
        a.company.localeCompare(b.company, "fr") ||
        contactFullName(a).localeCompare(contactFullName(b), "fr"),
    );
  if (sort === "recent")
    return list.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  return list.sort((a, b) => contactFullName(a).localeCompare(contactFullName(b), "fr"));
}

/** Candidatures de l'entreprise du contact (source unique : les candidatures). */
export function applicationsForContact(applications: Application[], contact: Contact) {
  const key = contactCompanyKey(contact);
  return applications
    .filter((a) => companyKey(a.company) === key)
    .sort((a, b) => (b.application_date || "").localeCompare(a.application_date || ""));
}

/** Candidatures explicitement associées à ce contact. */
export function linkedApplications(applications: Application[], contactId: string) {
  return applications.filter((a) => (a.contact_ids ?? []).includes(contactId));
}

export interface ContactFollowUp {
  followUp: FollowUp;
  application: Application;
}

export function followUpsForContact(
  applications: Application[],
  contact: Contact,
): ContactFollowUp[] {
  return applicationsForContact(applications, contact)
    .flatMap((application) =>
      (application.follow_ups ?? []).map((followUp) => ({ followUp, application })),
    )
    .sort((a, b) => (b.followUp.date || "").localeCompare(a.followUp.date || ""));
}

export interface ContactActivity {
  id: string;
  date: string;
  label: string;
  context: string;
  kind: "application" | "follow_up" | "status";
}

/** Historique dérivé (aucune entité d'activité stockée). */
export function contactActivity(applications: Application[], contact: Contact): ContactActivity[] {
  const apps = applicationsForContact(applications, contact);
  const items: ContactActivity[] = [];
  for (const app of apps) {
    if (app.application_date)
      items.push({
        id: `app-${app.id}`,
        date: app.application_date,
        label: "Candidature",
        context: app.position,
        kind: "application",
      });
    for (const h of app.status_history ?? [])
      items.push({
        id: `st-${app.id}-${h.status}-${h.date}`,
        date: h.date,
        label: "Changement de statut",
        context: `${app.position} · ${h.status}`,
        kind: "status",
      });
    for (const f of app.follow_ups ?? [])
      items.push({
        id: `fu-${f.id}`,
        date: f.date,
        label: f.title || "Relance",
        context: app.position,
        kind: "follow_up",
      });
  }
  return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** Dernière activité connue liée à l'entreprise du contact. */
export function contactLastActivity(applications: Application[], contact: Contact): string {
  return contactActivity(applications, contact)[0]?.date ?? "";
}
