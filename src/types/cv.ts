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

/** CV "maître" importé depuis la machine de l'utilisateur — un seul fichier, réutilisé partout
 * (Mon CV, et chaque candidature) plutôt qu'un fichier différent par candidature, pour rester
 * léger vis-à-vis du quota de stockage local du navigateur. */
export interface CvFile {
  /** Le PDF encodé en data URL — permet un aperçu inline (iframe) sans backend. */
  dataUrl: string;
  fileName: string;
  updated_at: string;
}
