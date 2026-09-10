import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CvExperience, CvExperienceInput } from "@/types/cv";
import { loadCvExperiences, saveCvExperiences } from "@/lib/storage";
import { CvContext, useCv } from "./cv-context";

export { useCv };

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cv-exp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function CvProvider({ children }: { children: ReactNode }) {
  const [experiences, setExperiences] = useState<CvExperience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExperiences(loadCvExperiences());
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  const persist = useCallback((next: CvExperience[]) => {
    setExperiences(next);
    saveCvExperiences(next);
  }, []);

  const createExperience = useCallback(
    (input: CvExperienceInput) => {
      const now = new Date().toISOString();
      const experience: CvExperience = { ...input, id: newId(), created_at: now, updated_at: now };
      persist([experience, ...experiences]);
      return experience;
    },
    [experiences, persist],
  );

  const updateExperience = useCallback(
    (id: string, input: Partial<CvExperienceInput>) => {
      persist(
        experiences.map((e) =>
          e.id === id ? { ...e, ...input, updated_at: new Date().toISOString() } : e,
        ),
      );
    },
    [experiences, persist],
  );

  const deleteExperience = useCallback(
    (id: string) => persist(experiences.filter((e) => e.id !== id)),
    [experiences, persist],
  );

  const value = useMemo(
    () => ({ experiences, loading, createExperience, updateExperience, deleteExperience }),
    [experiences, loading, createExperience, updateExperience, deleteExperience],
  );

  return <CvContext.Provider value={value}>{children}</CvContext.Provider>;
}
