import type { EmailTemplate } from "@/types/email";

type SystemSeed = Pick<EmailTemplate, "id" | "name" | "description" | "subject" | "body">;

/** Modèles système : toujours recréés s'ils manquent (jamais supprimables). */
const SEEDS: SystemSeed[] = [
  {
    id: "sys-relance-candidature",
    name: "Relance après candidature",
    description: "Relancer poliment quelques jours après l'envoi d'une candidature.",
    subject: "Candidature {{position}} — suivi",
    body: `Bonjour {{first_name}},

J'ai adressé ma candidature au poste de {{position}} chez {{company}} le {{application_date}} et je me permets de revenir vers vous pour connaître l'avancement du processus.

Je reste bien entendu disponible pour échanger et vous apporter tout complément d'information utile.

Bien cordialement,`,
  },
  {
    id: "sys-relance-entretien",
    name: "Relance après entretien",
    description: "Demander un retour après un entretien resté sans réponse.",
    subject: "Suite à notre entretien — {{position}}",
    body: `Bonjour {{first_name}},

Suite à notre entretien concernant le poste de {{position}} chez {{company}}, je souhaitais savoir où en était votre réflexion.

Cet échange a confirmé mon intérêt pour le poste et pour vos équipes. Je reste à votre disposition si vous avez besoin d'éléments complémentaires.

Bien cordialement,`,
  },
  {
    id: "sys-remerciement-entretien",
    name: "Remerciement après entretien",
    description: "Remercier votre interlocuteur dans les 24 h suivant l'entretien.",
    subject: "Merci pour notre échange — {{position}}",
    body: `Bonjour {{first_name}},

Je vous remercie pour le temps que vous m'avez accordé aujourd'hui au sujet du poste de {{position}} chez {{company}}.

Nos échanges ont renforcé ma motivation : le périmètre du poste et les enjeux de vos équipes correspondent pleinement à ce que je recherche.

Je reste disponible pour la suite du processus.

Bien cordialement,`,
  },
  {
    id: "sys-prise-de-contact",
    name: "Prise de contact",
    description: "Premier message à un contact identifié dans une entreprise cible.",
    subject: "Prise de contact — {{company}}",
    body: `Bonjour {{first_name}},

Je me permets de vous contacter en votre qualité de {{job_title}} chez {{company}}.

Je suis actuellement en recherche d'opportunités sur des missions proches du poste de {{position}}, et votre entreprise fait partie de celles que je suis avec attention.

Seriez-vous disponible pour un court échange dans les prochains jours ?

Bien cordialement,`,
  },
  {
    id: "sys-suivi-echange",
    name: "Suivi après échange",
    description: "Garder le lien après une conversation informelle ou un événement.",
    subject: "Suite à notre échange — {{company}}",
    body: `Bonjour {{first_name}},

Merci encore pour notre échange au sujet de {{company}}. Vos retours m'ont beaucoup éclairé.

Je reste très intéressé par les opportunités qui pourraient se présenter, notamment sur des postes de type {{position}}. N'hésitez pas à me faire signe si un profil comme le mien peut être utile à vos équipes.

Bien cordialement,`,
  },
];

const NOW = "";

export const systemTemplateSeeds = SEEDS;

export const systemTemplateIds = new Set(SEEDS.map((s) => s.id));

export function buildSystemTemplates(
  extract: (text: string) => EmailTemplate["variables"],
): EmailTemplate[] {
  return SEEDS.map((s) => ({
    ...s,
    variables: extract(`${s.subject}\n${s.body}`),
    system: true,
    created_at: NOW,
    updated_at: NOW,
  }));
}
