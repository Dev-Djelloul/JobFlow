import { createContext, useContext } from "react";
import type { CvExperience, CvExperienceInput } from "@/types/cv";

export interface CvContextValue {
  experiences: CvExperience[];
  loading: boolean;
  createExperience: (input: CvExperienceInput) => CvExperience;
  updateExperience: (id: string, input: Partial<CvExperienceInput>) => void;
  deleteExperience: (id: string) => void;
}

export const CvContext = createContext<CvContextValue | null>(null);

export function useCv() {
  const ctx = useContext(CvContext);
  if (!ctx) throw new Error("useCv must be used within CvProvider");
  return ctx;
}
