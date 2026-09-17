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
250 et 350 mots. Signe simplement avec le prénom fourni s'il est disponible, sinon sans signature nominative.
N'écris JAMAIS de bloc d'en-tête en début de lettre (pas de nom, pas d'adresse, pas de téléphone, pas
d'email, pas de date, et surtout aucun placeholder entre crochets comme "[Votre adresse]") : l'application
ajoute déjà ces informations séparément. Commence directement par la formule d'appel ("Madame, Monsieur,")
ou le corps de la lettre.`;

// Limites appliquées manuellement dans le handler plutôt que dans le validateur Zod : un champ
// trop long y déclenche une erreur "too_big" brute, non interceptée par le try/catch du handler
// (leçon tirée du même bug sur le département France Travail) — on préfère tronquer proprement.
const MAX_JOB_CONTEXT_CHARS = 4000;
const MAX_CV_SUMMARY_CHARS = 4000;

export const generateCoverLetter = createServerFn({ method: "POST" })
  .validator(
    z.object({
      position: z.string().trim().min(1).max(200),
      company: z.string().trim().min(1).max(200),
      /** Description de l'offre ou notes de la candidature — sert de contexte. */
      jobContext: z.string().trim().max(20000).optional(),
      /** Résumé du profil (expérience, compétences) renseigné dans Paramètres. */
      cvSummary: z.string().trim().max(20000).optional(),
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

      const jobContext = data.jobContext?.slice(0, MAX_JOB_CONTEXT_CHARS);
      const cvSummary = data.cvSummary.slice(0, MAX_CV_SUMMARY_CHARS);

      const userPrompt = `Poste visé : ${data.position}
Entreprise : ${data.company}
${jobContext ? `Contexte de l'offre :\n${jobContext}\n` : ""}
Profil du candidat :
${cvSummary}
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

const ATS_SYSTEM_PROMPT = `Tu es un expert en rédaction de CV optimisés pour les ATS (Applicant Tracking
Systems, les logiciels de tri automatique des candidatures) sur le marché de l'emploi français.
Tu reçois le CV existant du candidat (texte brut, éventuellement issu d'un import PDF imparfait), son résumé de
profil, ses expériences professionnelles structurées, et l'offre visée. Tu produis un CV complet et réécrit,
optimisé pour être bien parsé par un ATS et pour matcher le vocabulaire de l'offre :
- Structure en sections claires avec des titres en MAJUSCULES sur leur propre ligne (PROFIL, COMPÉTENCES,
  EXPÉRIENCE PROFESSIONNELLE, FORMATION le cas échéant) — pas de tableaux, pas de colonnes, pas de markdown
  (pas de #, pas de **, pas de puces avec des caractères spéciaux : utilise des tirets "-").
- Reprend les informations réelles fournies (dates, entreprises, intitulés) sans en inventer.
- Reformule les expériences en bullet points commençant par des verbes d'action, en intégrant naturellement
  les mots-clés et compétences mentionnés dans l'offre visée quand ils correspondent au vécu réel du candidat.
- N'invente jamais d'expérience, de compétence ou de diplôme absent des informations fournies : si une
  information manque, ne la mentionne pas plutôt que de l'inventer.
- Reste factuel et sobre, sans superlatifs creux.
- N'écris JAMAIS de bloc "coordonnées" en tête du document (pas de nom, adresse, email, téléphone,
  URL LinkedIn ou site web, pas de lien entre crochets) : l'application ajoute déjà cet en-tête
  séparément, avec de vrais liens cliquables. Commence directement par la première section
  (PROFIL) sans rien avant.`;

// Limites appliquées côté handler plutôt que dans le validateur Zod (voir la même remarque sur
// generateCoverLetter ci-dessus) : au-delà de max(), Zod rejette la requête avant même que le
// handler ne s'exécute, produisant une erreur brute non gérée plutôt qu'un message propre.
const MAX_ATS_CV_SUMMARY_CHARS = 4000;
const MAX_EXPERIENCES_TEXT_CHARS = 8000;
const MAX_CV_IMPORTED_TEXT_CHARS = 12000;
const MAX_JOB_DESCRIPTION_CHARS = 6000;

export const generateAtsCv = createServerFn({ method: "POST" })
  .validator(
    z.object({
      applicantName: z.string().trim().max(120).optional(),
      cvSummary: z.string().trim().max(20000).optional(),
      /** Texte des expériences professionnelles structurées, déjà mis en forme côté client. */
      experiencesText: z.string().trim().max(40000).optional(),
      /** Texte extrait (et éventuellement corrigé) d'un CV PDF existant. */
      cvImportedText: z.string().trim().max(60000).optional(),
      targetPosition: z.string().trim().min(1).max(200),
      targetCompany: z.string().trim().max(200).optional(),
      jobDescription: z.string().trim().max(30000).optional(),
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
      if (
        !data.cvSummary?.trim() &&
        !data.experiencesText?.trim() &&
        !data.cvImportedText?.trim()
      ) {
        return {
          ok: false,
          error:
            "Aucune information disponible : renseignez votre résumé de profil, vos expériences ou importez votre CV existant avant de générer un CV optimisé.",
        };
      }

      const jobDescription = data.jobDescription?.slice(0, MAX_JOB_DESCRIPTION_CHARS);
      const cvSummary = data.cvSummary?.slice(0, MAX_ATS_CV_SUMMARY_CHARS);
      const experiencesText = data.experiencesText?.slice(0, MAX_EXPERIENCES_TEXT_CHARS);
      const cvImportedText = data.cvImportedText?.slice(0, MAX_CV_IMPORTED_TEXT_CHARS);

      const userPrompt = `Poste visé : ${data.targetPosition}
${data.targetCompany ? `Entreprise : ${data.targetCompany}\n` : ""}${
        jobDescription ? `Description de l'offre :\n${jobDescription}\n` : ""
      }
${data.applicantName ? `Nom du candidat : ${data.applicantName}\n` : ""}
${cvSummary ? `Résumé de profil fourni par le candidat :\n${cvSummary}\n` : ""}
${experiencesText ? `Expériences professionnelles structurées :\n${experiencesText}\n` : ""}
${cvImportedText ? `CV existant du candidat (texte brut) :\n${cvImportedText}\n` : ""}

Rédige le CV optimisé ATS complet.`;

      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://jobflow.digitalblueskye.com",
          "X-Title": "JobFlow",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: ATS_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
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
