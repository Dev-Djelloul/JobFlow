import { createContext, useContext } from "react";
import type { Contact, ContactInput } from "@/types/contact";

export interface ContactsContextValue {
  contacts: Contact[];
  loading: boolean;
  createContact: (input: ContactInput) => Contact;
  updateContact: (id: string, input: Partial<ContactInput>) => void;
  deleteContact: (id: string) => void;
  getContact: (id: string) => Contact | undefined;
  replaceAllContacts: (contacts: Contact[]) => void;
}

export const ContactsContext = createContext<ContactsContextValue | null>(null);

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
  return ctx;
}
