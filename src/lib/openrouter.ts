import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

// Modèle par défaut : rapide et peu coûteux, largement suffisant pour une lettre de
// motivation. Modifiable ici sans toucher au reste si un autre modèle est préféré.
const MODEL = "openai/gpt-4o-mini";

export interface GenerationResult {
  ok: boolean;
  text?: string;
  error?: string;
}

const SYSTEM_PROMPT = `Tu es un rédacteur spécialisé en candidatures pour le marché de l'emploi français.
Tu rédiges des lettres de motivation professionnelles, sincères et directement utilisables : pas de tournures
génériques ("Madame, Monsieur, je me permets de vous contacter..."), pas de markdown, pas de placeholders entre
crochets. Une lettre concrète, qui s'appuie sur le profil fourni et les informations réelles de l'offre. Entre
250 et 350 mots. Signe simplement avec le prénom fourni s'il est disponible, sinon sans signature nominative.`;

export const generateCoverLetter = createServerFn({ method: "POST" })
  .validator(
    z.object({
      position: z.string().trim().min(1).max(200),
      company: z.string().trim().min(1).max(200),
      /** Description de l'offre ou notes de la candidature — sert de contexte. */
      jobContext: z.string().trim().max(4000).optional(),
      /** Résumé du profil (expérience, compétences) renseigné dans Paramètres. */
      cvSummary: z.string().trim().max(4000).optional(),
      applicantName: z.string().trim().max(120).optional(),
    }),
  )
  .handler(async ({ data }): Promise<GenerationResult> => {
    try {
      const apiKey = process.env["OPENROUTER_API_KEY"];
      if (!apiKey) {
        return {
          ok: false,
          error:
            "Génération IA non configurée : variable OPENROUTER_API_KEY manquante sur le Worker.",
        };
      }
      if (!data.cvSummary?.trim()) {
        return {
          ok: false,
          error:
            "Renseignez d'abord votre profil professionnel dans Paramètres — la lettre est générée à partir de ce résumé.",
        };
      }

      const userPrompt = `Poste visé : ${data.position}
Entreprise : ${data.company}
${data.jobContext ? `Contexte de l'offre :\n${data.jobContext}\n` : ""}
Profil du candidat :
${data.cvSummary}
${data.applicantName ? `\nPrénom du candidat : ${data.applicantName}` : ""}

Rédige la lettre de motivation.`;

      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // Recommandé par OpenRouter pour l'attribution des requêtes, sans incidence fonctionnelle.
          "HTTP-Referer": "https://jobflow.digitalblueskye.com",
          "X-Title": "JobFlow",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          error: `Génération échouée (${res.status}) : ${body.slice(0, 300) || "réponse vide"}`,
        };
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) {
        return { ok: false, error: "La réponse du modèle était vide." };
      }
      return { ok: true, text };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
    }
  });
