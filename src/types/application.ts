export const STATUSES = [
  "to_target",
  "applied",
  "interview",
  "test",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  to_target: "À cibler",
  applied: "Candidature envoyée",
  interview: "Entretien",
  test: "Test",
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
  status: ApplicationStatus;
  notes: string;
  next_action: string;
  follow_up_date: string;
  status_history: StatusHistoryEntry[];
  follow_ups: FollowUp[];
  created_at: string;
  updated_at: string;
}

export type ApplicationInput = Omit<
  Application,
  "id" | "created_at" | "updated_at" | "status_history" | "follow_ups"
>;

export interface UserSettings {
  name: string;
  email: string;
  theme: "light" | "dark";
  density: "comfortable" | "compact";
  defaultView: "table" | "kanban";
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
