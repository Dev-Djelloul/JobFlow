import type { Application } from "@/types/application";

const iso = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const make = (
  id: string,
  company: string,
  position: string,
  location: string,
  contract_type: Application["contract_type"],
  salary: string,
  status: Application["status"],
  daysAgo: number,
  next_action: string,
  followInDays: number,
  notes: string,
): Application => ({
  id,
  company,
  position,
  location,
  contract_type,
  salary,
  job_url: `https://jobs.example.com/${id}`,
  application_date: iso(daysAgo),
  status,
  notes,
  next_action,
  follow_up_date: iso(daysAgo - followInDays),
  follow_ups: [],
  status_history:
    status === "applied"
      ? [{ status: "applied" as const, date: iso(daysAgo) }]
      : [
          { status: "applied" as const, date: iso(daysAgo) },
          { status, date: iso(Math.max(0, daysAgo - 3)) },
        ],
  created_at: new Date(iso(daysAgo)).toISOString(),
  updated_at: new Date(iso(Math.max(0, daysAgo - 3))).toISOString(),
});

export const seedApplications: Application[] = [
  make("app-1", "Doctolib", "Développeuse Frontend React", "Paris", "CDI", "55 000 €", "interview", 26, "Entretien technique visio", -2, "Très bon feeling avec la hiring manager. Stack React + TypeScript."),
  make("app-2", "Alan", "Product Designer", "Remote", "CDI", "50 000 €", "applied", 21, "Relancer le recruteur", -4, "Candidature envoyée via le site carrière."),
  make("app-3", "Qonto", "Ingénieur Full-Stack", "Paris", "CDI", "60 000 €", "test", 18, "Rendre le take-home test", -1, "Test technique de 4h à rendre."),
  make("app-4", "Swile", "Chef de projet digital", "Montpellier", "CDD", "42 000 €", "rejected", 34, "", -30, "Poste pourvu en interne."),
  make("app-5", "Payfit", "Développeur Backend Node", "Paris", "CDI", "58 000 €", "offer", 40, "Négocier la proposition", -3, "Offre reçue : 58k + BSPCE."),
  make("app-6", "Ledger", "Data Analyst", "Paris", "CDI", "48 000 €", "applied", 9, "Relance J+10", -6, "Offre trouvée sur LinkedIn."),
  make("app-7", "BlaBlaCar", "UX Researcher", "Paris", "Stage", "1 200 €", "to_target", 4, "Préparer la lettre de motivation", -5, "Repérée sur Welcome to the Jungle."),
  make("app-8", "Back Market", "Growth Manager", "Bordeaux", "CDI", "52 000 €", "interview", 13, "Entretien final avec le VP", -3, "Deux entretiens passés."),
  make("app-9", "Contentsquare", "Développeuse React Native", "Lyon", "Freelance", "550 €/j", "applied", 6, "Envoyer le portfolio", -2, "Mission de 6 mois renouvelable."),
  make("app-10", "Mirakl", "Consultant technique", "Remote", "CDI", "51 000 €", "to_target", 2, "Trouver un contact interne", -7, "Candidature spontanée à préparer."),
  make("app-11", "Dataiku", "Ingénieur ML", "Paris", "CDI", "65 000 €", "rejected", 47, "", -40, "Profil jugé trop junior."),
  make("app-12", "Sorare", "Développeur Frontend", "Paris", "Alternance", "1 500 €", "test", 11, "Terminer le test technique", -1, "Test algo sur plateforme."),
];
