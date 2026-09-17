import type { Contact } from "@/types/contact";

const iso = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const make = (
  id: string,
  first_name: string,
  last_name: string,
  company: string,
  job_title: string,
  email: string,
  phone: string,
  linkedin_url: string,
  notes: string,
  daysAgo: number,
  website_url = "",
): Contact => ({
  id,
  first_name,
  last_name,
  company,
  job_title,
  email,
  phone,
  linkedin_url,
  website_url,
  notes,
  created_at: iso(daysAgo),
  updated_at: iso(Math.max(0, daysAgo - 2)),
});

export const seedContacts: Contact[] = [
  make(
    "contact-1",
    "Marie",
    "Dupont",
    "Doctolib",
    "Talent Acquisition",
    "marie.dupont@example.com",
    "+33 6 12 34 56 78",
    "https://www.linkedin.com/in/marie-dupont",
    "Très réactive par email, préfère les échanges le matin.",
    24,
  ),
  make(
    "contact-2",
    "Thomas",
    "Martin",
    "Doctolib",
    "Hiring Manager",
    "thomas.martin@example.com",
    "",
    "https://www.linkedin.com/in/thomas-martin",
    "Responsable de l'équipe Frontend, a mené l'entretien technique.",
    20,
  ),
  make(
    "contact-3",
    "Léa",
    "Bernard",
    "Qonto",
    "Recruteuse tech",
    "lea.bernard@example.com",
    "+33 7 98 76 54 32",
    "",
    "Rencontrée lors d'un meetup React.",
    16,
  ),
];
