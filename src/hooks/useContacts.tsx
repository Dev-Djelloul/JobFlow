import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Contact, ContactInput } from "@/types/contact";
import { loadContacts, saveContacts } from "@/lib/storage";
import { ContactsContext, useContacts } from "./contacts-context";

export { useContacts };

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `contact-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setContacts(loadContacts());
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  const persist = useCallback((next: Contact[]) => {
    setContacts(next);
    saveContacts(next);
  }, []);

  const createContact = useCallback(
    (input: ContactInput) => {
      const now = new Date().toISOString();
      const contact: Contact = { ...input, id: newId(), created_at: now, updated_at: now };
      persist([contact, ...contacts]);
      return contact;
    },
    [contacts, persist],
  );

  const updateContact = useCallback(
    (id: string, input: Partial<ContactInput>) => {
      persist(
        contacts.map((c) =>
          c.id === id ? { ...c, ...input, updated_at: new Date().toISOString() } : c,
        ),
      );
    },
    [contacts, persist],
  );

  const deleteContact = useCallback(
    (id: string) => persist(contacts.filter((c) => c.id !== id)),
    [contacts, persist],
  );

  const getContact = useCallback((id: string) => contacts.find((c) => c.id === id), [contacts]);

  const replaceAllContacts = useCallback((next: Contact[]) => persist(next), [persist]);

  const value = useMemo(
    () => ({
      contacts,
      loading,
      createContact,
      updateContact,
      deleteContact,
      getContact,
      replaceAllContacts,
    }),
    [contacts, loading, createContact, updateContact, deleteContact, getContact, replaceAllContacts],
  );

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}
