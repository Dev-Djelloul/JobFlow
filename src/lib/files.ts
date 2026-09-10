/** Lit un fichier local et renvoie son contenu encodé en data URL. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

/** Déclenche le téléchargement d'un fichier déjà encodé en data URL (ex. un CV PDF importé). */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Convertit une data URL (ex. un CV PDF importé) en Blob, pour l'assembler avec d'autres
 * pièces jointes avant un téléchargement groupé. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Regroupe plusieurs fichiers dans une archive ZIP et déclenche un unique téléchargement.
 *
 * Pourquoi un ZIP plutôt que plusieurs téléchargements successifs : les navigateurs bloquent
 * silencieusement les téléchargements déclenchés après le premier dans un même clic dès qu'un
 * `await` (ex. génération d'un PDF) s'intercale — le "geste utilisateur" qui autorise le
 * téléchargement expire. Un seul fichier ZIP contourne complètement le problème.
 */
export async function downloadFilesAsZip(
  files: { name: string; blob: Blob }[],
  zipFileName: string,
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file.blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = zipFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
