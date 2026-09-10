export interface CvExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export type CvExperienceInput = Omit<CvExperience, "id" | "created_at" | "updated_at">;

export const emptyCvExperienceInput = (): CvExperienceInput => ({
  title: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  current: false,
  description: "",
});
