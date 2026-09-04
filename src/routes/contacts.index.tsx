import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Linkedin, Mail, Phone, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { ContactForm } from "@/components/contacts/ContactForm";
import { useContacts } from "@/hooks/useContacts";
import { useApplications } from "@/hooks/useApplications";
import { buildCompanies } from "@/lib/companies";
import {
  contactCompanyKey,
  contactFullName,
  contactLastActivity,
  isValidLinkedInUrl,
  searchContacts,
  sortContacts,
  type ContactSort,
} from "@/lib/contacts";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/contacts/")({
  head: () => ({
    meta: [
      { title: "Contacts professionnels — JobFlow" },
      {
        name: "description",
        content:
          "Carnet de contacts de votre recherche d'emploi : recruteurs, hiring managers et interlocuteurs par entreprise.",
      },
      { property: "og:title", content: "Contacts professionnels — JobFlow" },
      {
        property: "og:description",
        content: "Recherchez et gérez vos contacts par entreprise, fonction ou email.",
      },
    ],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const { contacts, loading, createContact } = useContacts();
  const { applications } = useApplications();
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("all");
  const [sort, setSort] = useState<ContactSort>("name");
  const [formOpen, setFormOpen] = useState(false);

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of buildCompanies(applications)) map.set(c.key, c.name);
    for (const c of contacts) {
      const key = contactCompanyKey(c);
      if (key && !map.has(key)) map.set(key, c.company.trim());
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [applications, contacts]);

  const filtered = useMemo(() => {
    const byCompany =
      company === "all" ? contacts : contacts.filter((c) => contactCompanyKey(c) === company);
    return sortContacts(searchContacts(byCompany, query), sort);
  }, [contacts, company, query, sort]);

  return (
    <AppLayout
      title="Contacts"
      description="Vos interlocuteurs, regroupés par entreprise."
      actions={
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nouveau contact</span>
        </Button>
      }
    >
      {loading ? (
        <LoadingState rows={5} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un prénom, nom, entreprise, fonction ou email"
                className="pl-9"
                aria-label="Rechercher un contact"
              />
            </div>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger className="sm:w-56" aria-label="Filtrer par entreprise">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les entreprises</SelectItem>
                {companyOptions.map(([key, name]) => (
                  <SelectItem key={key} value={key}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as ContactSort)}>
              <SelectTrigger className="sm:w-44" aria-label="Trier les contacts">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nom (A→Z)</SelectItem>
                <SelectItem value="company">Entreprise</SelectItem>
                <SelectItem value="recent">Modifié récemment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={contacts.length === 0 ? "Aucun contact" : "Aucun résultat"}
              description={
                contacts.length === 0
                  ? "Ajoutez vos recruteurs et interlocuteurs pour les retrouver depuis chaque entreprise."
                  : "Modifiez votre recherche ou le filtre entreprise."
              }
              action={
                contacts.length === 0 ? (
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus className="size-4" /> Nouveau contact
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              {/* Mobile : cartes */}
              <div className="grid gap-3 md:hidden">
                {filtered.map((contact) => (
                  <Link
                    key={contact.id}
                    to="/contacts/$contactId"
                    params={{ contactId: contact.id }}
                    className="rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <UserRound className="size-4 text-muted-foreground" />
                      {contactFullName(contact) || "Contact"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[contact.job_title, contact.company].filter(Boolean).join(" · ")}
                    </p>
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
                      {isValidLinkedInUrl(contact.linkedin_url) ? (
                        <p className="flex items-center gap-2">
                          <Linkedin className="size-3.5" /> Profil LinkedIn
                        </p>
                      ) : null}
                      <p className="text-xs">
                        Dernière activité :{" "}
                        {formatDate(contactLastActivity(applications, contact)) || "—"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Tablette / desktop */}
              <Card className="hidden overflow-hidden rounded-xl p-0 shadow-none md:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Fonction</TableHead>
                          <TableHead>Entreprise</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Téléphone</TableHead>
                          <TableHead>LinkedIn</TableHead>
                          <TableHead>Dernière activité</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell className="font-medium">
                              <Link
                                to="/contacts/$contactId"
                                params={{ contactId: contact.id }}
                                className="hover:underline"
                              >
                                {contactFullName(contact) || "Contact"}
                              </Link>
                            </TableCell>
                            <TableCell>{contact.job_title || "—"}</TableCell>
                            <TableCell>{contact.company || "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {contact.email || "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {contact.phone || "—"}
                            </TableCell>
                            <TableCell>
                              {isValidLinkedInUrl(contact.linkedin_url) ? (
                                <a
                                  href={contact.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Linkedin className="size-3.5" /> Profil
                                </a>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(contactLastActivity(applications, contact)) || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
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
    </AppLayout>
  );
}
