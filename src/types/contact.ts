export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  linkedin_url: string;
  notes: string;
  /** Libellé de l'entreprise tel que saisi (le regroupement utilise `companyKey`). */
  company: string;
  created_at: string;
  updated_at: string;
}

export type ContactInput = Omit<Contact, "id" | "created_at" | "updated_at">;

export const emptyContactInput = (company = ""): ContactInput => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  linkedin_url: "",
  notes: "",
  company,
});
