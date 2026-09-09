import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, Building2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApplications } from "@/hooks/useApplications";
import { useContacts } from "@/hooks/useContacts";
import { buildCompanies } from "@/lib/companies";
import { contactFullName, searchContacts } from "@/lib/contacts";
import { STATUS_LABELS } from "@/types/application";

const MAX_RESULTS_PER_GROUP = 6;

/** Recherche transverse (candidatures, contacts, entreprises), ouverte via Ctrl/Cmd+K. */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { applications } = useApplications();
  const { contacts } = useContacts();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const q = query.trim().toLowerCase();

  const matchedApplications = useMemo(() => {
    if (!q) return [];
    return applications
      .filter((a) =>
        [a.company, a.position, a.location]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(q)),
      )
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [applications, q]);

  const matchedContacts = useMemo(() => {
    if (!q) return [];
    return searchContacts(contacts, q).slice(0, MAX_RESULTS_PER_GROUP);
  }, [contacts, q]);

  const matchedCompanies = useMemo(() => {
    if (!q) return [];
    return buildCompanies(applications)
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [applications, q]);

  const hasResults =
    matchedApplications.length > 0 || matchedContacts.length > 0 || matchedCompanies.length > 0;

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-9 w-56 justify-start gap-2 text-sm text-muted-foreground sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Rechercher…
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium lg:inline-block">
          Ctrl K
        </kbd>
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Rechercher"
        className="sm:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0">
          <DialogTitle className="sr-only">Recherche</DialogTitle>
          {/* shouldFilter=false : le filtrage est déjà fait à la main ci-dessus (matchedApplications
              etc.), le filtre par défaut de cmdk se baserait sur `value` (un id), pas le texte affiché. */}
          <Command
            shouldFilter={false}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          >
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Rechercher une candidature, un contact, une entreprise…"
            />
            <CommandList>
              {q && !hasResults ? <CommandEmpty>Aucun résultat.</CommandEmpty> : null}
              {!q ? (
                <CommandEmpty>
                  Tapez pour rechercher dans vos candidatures, contacts et entreprises.
                </CommandEmpty>
              ) : null}

              {matchedApplications.length > 0 ? (
                <CommandGroup heading="Candidatures">
                  {matchedApplications.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`app-${a.id}`}
                      onSelect={() => go("/candidatures")}
                    >
                      <Briefcase />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">
                          {a.position} — {a.company}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {STATUS_LABELS[a.status]}
                          {a.location ? ` · ${a.location}` : ""}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {matchedContacts.length > 0 ? (
                <CommandGroup heading="Contacts">
                  {matchedContacts.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`contact-${c.id}`}
                      onSelect={() => go(`/contacts/${c.id}`)}
                    >
                      <Users />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{contactFullName(c) || "Contact"}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {[c.job_title, c.company].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {matchedCompanies.length > 0 ? (
                <CommandGroup heading="Entreprises">
                  {matchedCompanies.map((c) => (
                    <CommandItem
                      key={c.key}
                      value={`company-${c.key}`}
                      onSelect={() => go(`/entreprises/${c.key}`)}
                    >
                      <Building2 />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
