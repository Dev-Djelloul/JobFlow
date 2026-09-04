export const EMAIL_VARIABLES = [
  "first_name",
  "last_name",
  "company",
  "position",
  "application_date",
  "status",
  "job_title",
] as const;

export type EmailVariable = (typeof EMAIL_VARIABLES)[number];

export const EMAIL_VARIABLE_LABELS: Record<EmailVariable, string> = {
  first_name: "Prénom du contact",
  last_name: "Nom du contact",
  company: "Entreprise",
  position: "Poste visé",
  application_date: "Date de candidature",
  status: "Statut de la candidature",
  job_title: "Fonction du contact",
};

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  /** Variables utilisées par le modèle (dérivées du contenu). */
  variables: EmailVariable[];
  /** Un modèle système ne peut pas être supprimé (seulement modifié/réinitialisé). */
  system: boolean;
  created_at: string;
  updated_at: string;
}

export type EmailTemplateInput = Pick<
  EmailTemplate,
  "name" | "description" | "subject" | "body"
>;

export const emptyEmailTemplateInput = (): EmailTemplateInput => ({
  name: "",
  description: "",
  subject: "",
  body: "",
});

/** Valeurs disponibles pour le rendu d'un modèle (valeurs vides = variable manquante). */
export type EmailVariableValues = Partial<Record<EmailVariable, string>>;
