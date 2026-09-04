import { createContext, useContext } from "react";
import type {
  Application,
  ApplicationInput,
  ApplicationStatus,
  FollowUpInput,
} from "@/types/application";

export interface ApplicationsContextValue {
  applications: Application[];
  loading: boolean;
  createApplication: (input: ApplicationInput) => Application;
  updateApplication: (id: string, input: Partial<ApplicationInput>) => void;
  deleteApplication: (id: string) => void;
  changeStatus: (id: string, status: ApplicationStatus) => void;
  addFollowUp: (applicationId: string, input: FollowUpInput) => void;
  updateFollowUp: (applicationId: string, followUpId: string, input: Partial<FollowUpInput>) => void;
  deleteFollowUp: (applicationId: string, followUpId: string) => void;
  getApplication: (id: string) => Application | undefined;
  resetDemoData: () => void;
  replaceAllApplications: (apps: Application[]) => void;
}

export const ApplicationsContext = createContext<ApplicationsContextValue | null>(null);

export function useApplications() {
  const ctx = useContext(ApplicationsContext);
  if (!ctx) throw new Error("useApplications must be used within ApplicationsProvider");
  return ctx;
}
