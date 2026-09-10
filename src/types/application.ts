export const STATUSES = ["to_target", "applied", "interview", "test", "offer", "rejected"] as const;

export type ApplicationStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  to_target: "À cibler",
  applied: "Candidature envoyée",
  interview: "Entretien",
  test: "Test / Cas pratique",
  offer: "Offre",
  rejected: "Refusée",
};

export const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "Stage",
  "Alternance",
  "Freelance",
  "Intérim",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

/** Provenance d'une candidature (optionnelle : les anciennes données n'en ont pas). */
export const APPLICATION_SOURCES = [
  "linkedin",
  "indeed",
  "welcome_to_the_jungle",
  "france_travail",
  "adzuna",
  "company_website",
  "referral",
  "recruiter",
  "spontaneous",
  "other",
] as const;

export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  welcome_to_the_jungle: "Welcome to the Jungle",
  france_travail: "France Travail",
  adzuna: "Adzuna",
  company_website: "Site de l'entreprise",
  referral: "Cooptation",
  recruiter: "Cabinet / recruteur",
  spontaneous: "Candidature spontanée",
  other: "Autre",
};

export const sourceLabel = (source?: string): string =>
  source && source in SOURCE_LABELS ? SOURCE_LABELS[source as ApplicationSource] : "";

export const REMOTE_MODES = ["onsite", "hybrid", "remote"] as const;

export type RemoteMode = (typeof REMOTE_MODES)[number];

export const REMOTE_LABELS: Record<RemoteMode, string> = {
  onsite: "Sur site",
  hybrid: "Hybride",
  remote: "Télétravail",
};

export const remoteLabel = (mode?: string): string =>
  mode && mode in REMOTE_LABELS ? REMOTE_LABELS[mode as RemoteMode] : "";

export const EXPERIENCE_LEVELS = ["debutant", "junior", "confirme", "senior", "expert"] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  debutant: "Débutant — sans expérience",
  junior: "Junior (0 à 2 ans)",
  confirme: "Confirmé (3 à 5 ans)",
  senior: "Senior (5 à 10 ans)",
  expert: "Expert (10 ans et +)",
};

// Le champ reste une chaîne libre pour rester compatible avec les anciennes candidatures
// (texte saisi à la main avant l'introduction de cette liste) : on affiche le libellé
// explicite quand la valeur correspond à un niveau connu, sinon le texte brut tel quel.
export const experienceLabel = (level?: string): string =>
  level && level in EXPERIENCE_LEVEL_LABELS
    ? EXPERIENCE_LEVEL_LABELS[level as ExperienceLevel]
    : (level ?? "");

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  date: string;
}

export interface Application {
  id: string;
  company: string;
  position: string;
  location: string;
  contract_type: ContractType;
  salary: string;
  job_url: string;
  application_date: string;
  /** Provenance de la candidature — absent des données antérieures. */
  source?: ApplicationSource;
  /** Lien vers l'annonce sur la plateforme d'origine. */
  source_url?: string;
  /** Modalité de travail. */
  remote?: RemoteMode;
  /** Niveau d'expérience attendu (texte libre : « Junior », « 3-5 ans »…). */
  experience_level?: string;
  status: ApplicationStatus;
  notes: string;
  next_action: string;
  follow_up_date: string;
  status_history: StatusHistoryEntry[];
  follow_ups: FollowUp[];
  /** Identifiants des contacts associés (même entreprise uniquement). */
  contact_ids: string[];
  /** Mise en avant manuelle — absente des données antérieures (traitée comme false). */
  favorite?: boolean;
  created_at: string;
  updated_at: string;
}

export type ApplicationInput = Omit<
  Application,
  "id" | "created_at" | "updated_at" | "status_history" | "follow_ups" | "contact_ids"
>;

export interface UserSettings {
  name: string;
  email: string;
  theme: "light" | "dark";
  density: "comfortable" | "compact";
  defaultView: "table" | "kanban";
  /** Photo de profil importée (data URL) — vide si aucun import. */
  avatar: string;
  /** Identifiant de l'avatar prédéfini utilisé quand aucune photo n'est importée. */
  avatarPreset: string;
  /** Panneau latéral replié (icônes seules) sur grand écran. */
  sidebarCollapsed: boolean;
  /** Résumé libre du profil (expérience, compétences, formation) — sert de contexte à la
   * génération de lettres de motivation par IA. */
  cvSummary: string;
  /** Texte extrait (et éventuellement corrigé) d'un CV PDF importé — contexte supplémentaire
   * pour la génération de CV optimisé ATS par IA. */
  cvImportedText: string;
}

export const FOLLOW_UP_STATUSES = ["todo", "done", "cancelled"] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  todo: "À faire",
  done: "Effectuée",
  cancelled: "Annulée",
};

export interface FollowUp {
  id: string;
  date: string;
  title: string;
  description: string;
  status: FollowUpStatus;
  created_at: string;
  updated_at: string;
}

export type FollowUpInput = Pick<FollowUp, "date" | "title" | "description" | "status">;
