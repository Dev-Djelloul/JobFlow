import { createContext, useContext } from "react";
import type { EmailTemplate, EmailTemplateInput } from "@/types/email";

export interface EmailTemplatesContextValue {
  /** Modèles système (éventuellement personnalisés) + modèles personnalisés. */
  templates: EmailTemplate[];
  /** Uniquement ce qui est stocké : modèles personnalisés et surcharges système. */
  storedTemplates: EmailTemplate[];
  loading: boolean;
  getTemplate: (id: string) => EmailTemplate | undefined;
  createTemplate: (input: EmailTemplateInput) => EmailTemplate;
  updateTemplate: (id: string, input: EmailTemplateInput) => void;
  deleteTemplate: (id: string) => void;
  /** Restaure le contenu d'origine d'un modèle système modifié. */
  resetTemplate: (id: string) => void;
  replaceAllTemplates: (templates: EmailTemplate[]) => void;
}

export const EmailTemplatesContext = createContext<EmailTemplatesContextValue | null>(null);

export function useEmailTemplates() {
  const ctx = useContext(EmailTemplatesContext);
  if (!ctx) throw new Error("useEmailTemplates must be used within EmailTemplatesProvider");
  return ctx;
}
