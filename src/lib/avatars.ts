/**
 * Avatars de profil : soit une photo importée (data URL stockée dans
 * `settings.avatar`), soit un avatar prédéfini (`settings.avatarPreset`).
 * Tout est local : aucune donnée n'est envoyée sur un serveur.
 */

export interface AvatarPreset {
  id: string;
  label: string;
  /** Classes Tailwind (tokens sémantiques uniquement) du fond. */
  className: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "primary", label: "Primaire", className: "bg-primary text-primary-foreground" },
  { id: "accent", label: "Accent", className: "bg-accent text-accent-foreground" },
  { id: "secondary", label: "Secondaire", className: "bg-secondary text-secondary-foreground" },
  { id: "muted", label: "Neutre", className: "bg-muted text-foreground" },
  {
    id: "gradient-warm",
    label: "Dégradé chaud",
    className: "bg-gradient-to-br from-primary to-accent text-primary-foreground",
  },
  {
    id: "gradient-cool",
    label: "Dégradé froid",
    className: "bg-gradient-to-br from-secondary to-primary text-primary-foreground",
  },
];

export function presetClassName(id?: string): string {
  return (AVATAR_PRESETS.find((p) => p.id === id) ?? AVATAR_PRESETS[0]!).className;
}

/** Initiales (1 à 2 lettres) dérivées du nom, repli sur "JF". */
export function initialsFromName(name?: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "JF";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;

/** HEIC/HEIF (format par défaut des photos iPhone) : ni Chrome ni Firefox ne savent le décoder
 * via <img>, contrairement à Safari — il faut d'abord le convertir en JPEG côté client. Détecté
 * par extension car ces fichiers arrivent souvent avec un `file.type` vide selon l'OS/navigateur. */
function isHeic(file: File): boolean {
  return /\.hei[cf]$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
}

/**
 * Lit un fichier image, le recadre au centre et le redimensionne en carré
 * (`size` px) pour limiter la taille stockée dans localStorage.
 */
export async function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  // Certains navigateurs/OS laissent `file.type` vide pour un JPG/PNG valide (droits, fichier
  // renommé, métadonnées manquantes) : on ne bloque que les types explicitement non-image.
  if (file.type && !file.type.startsWith("image/") && !isHeic(file)) {
    throw new Error("Le fichier doit être une image.");
  }
  if (file.size > MAX_AVATAR_FILE_SIZE) {
    throw new Error("L'image ne doit pas dépasser 5 Mo.");
  }

  let source: File | Blob = file;
  if (isHeic(file)) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      source = Array.isArray(converted) ? converted[0]! : converted;
    } catch {
      throw new Error(
        "Impossible de convertir cette photo HEIC — essayez de l'exporter en JPG depuis votre appareil.",
      );
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Impossible de traiter l'image.");
        const side = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          size,
          size,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Impossible de traiter l'image."));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible."));
    };
    img.src = url;
  });
}
