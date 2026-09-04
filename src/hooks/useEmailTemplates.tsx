import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EmailTemplate, EmailTemplateInput } from "@/types/email";
import { extractVariables } from "@/lib/email";
import { buildSystemTemplates, systemTemplateIds } from "@/lib/email-templates";
import { loadCustomEmailTemplates, saveCustomEmailTemplates } from "@/lib/storage";
import { EmailTemplatesContext, useEmailTemplates } from "./email-templates-context";

export { useEmailTemplates };

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `template-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Les modèles système sont toujours régénérés puis surchargés si l'utilisateur les a modifiés. */
function merge(stored: EmailTemplate[]): EmailTemplate[] {
  const system = buildSystemTemplates(extractVariables);
  const overrides = new Map(stored.filter((t) => systemTemplateIds.has(t.id)).map((t) => [t.id, t]));
  const custom = stored.filter((t) => !systemTemplateIds.has(t.id));
  return [
    ...system.map((t) => {
      const override = overrides.get(t.id);
      return override ? { ...override, system: true, description: override.description || t.description } : t;
    }),
    ...custom.map((t) => ({ ...t, system: false })),
  ];
}

export function EmailTemplatesProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStored(loadCustomEmailTemplates());
    setLoading(false);
  }, []);

  const persist = useCallback((next: EmailTemplate[]) => {
    setStored(next);
    saveCustomEmailTemplates(next);
  }, []);

  const templates = useMemo(() => merge(stored), [stored]);

  const getTemplate = useCallback(
    (id: string) => templates.find((t) => t.id === id),
    [templates],
  );

  const createTemplate = useCallback(
    (input: EmailTemplateInput) => {
      const now = new Date().toISOString();
      const template: EmailTemplate = {
        ...input,
        id: newId(),
        variables: extractVariables(`${input.subject}\n${input.body}`),
        system: false,
        created_at: now,
        updated_at: now,
      };
      persist([...stored, template]);
      return template;
    },
    [stored, persist],
  );

  const updateTemplate = useCallback(
    (id: string, input: EmailTemplateInput) => {
      const now = new Date().toISOString();
      const base = templates.find((t) => t.id === id);
      const next: EmailTemplate = {
        id,
        ...input,
        variables: extractVariables(`${input.subject}\n${input.body}`),
        system: systemTemplateIds.has(id),
        created_at: base?.created_at || now,
        updated_at: now,
      };
      const exists = stored.some((t) => t.id === id);
      persist(exists ? stored.map((t) => (t.id === id ? next : t)) : [...stored, next]);
    },
    [stored, templates, persist],
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      if (systemTemplateIds.has(id)) return;
      persist(stored.filter((t) => t.id !== id));
    },
    [stored, persist],
  );

  const resetTemplate = useCallback(
    (id: string) => {
      if (!systemTemplateIds.has(id)) return;
      persist(stored.filter((t) => t.id !== id));
    },
    [stored, persist],
  );

  const replaceAllTemplates = useCallback(
    (next: EmailTemplate[]) => persist(next.filter((t) => t && typeof t.id === "string")),
    [persist],
  );

  const value = useMemo(
    () => ({
      templates,
      storedTemplates: stored,
      loading,
      getTemplate,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      resetTemplate,
      replaceAllTemplates,
    }),
    [
      templates,
      stored,
      loading,
      getTemplate,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      resetTemplate,
      replaceAllTemplates,
    ],
  );

  return (
    <EmailTemplatesContext.Provider value={value}>{children}</EmailTemplatesContext.Provider>
  );
}
