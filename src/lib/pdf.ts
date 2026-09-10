import type { Application } from "@/types/application";
import {
  FOLLOW_UP_STATUS_LABELS,
  remoteLabel,
  sourceLabel,
  STATUS_LABELS,
} from "@/types/application";
import type { CvExperience } from "@/types/cv";
import { experiencePeriodLabel, sortExperiences } from "@/lib/cv";
import { formatDate } from "@/lib/format";

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

/** Charge jsPDF + autotable à la demande (export occasionnel, pas besoin dans le bundle principal). */
async function loadPdf() {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  return { jsPDF, autoTable };
}

/** Exporte la liste complète des candidatures dans un PDF tabulaire. */
export async function downloadApplicationsListPdf(applications: Application[]) {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text("Jobee Flow — Mes candidatures", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Exporté le ${formatDate(new Date().toISOString())} · ${applications.length} candidature(s)`,
    14,
    22,
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 28,
    head: [
      ["Entreprise", "Poste", "Localisation", "Contrat", "Statut", "Date", "Prochaine action"],
    ],
    body: applications.map((a) => [
      a.company,
      a.position,
      a.location || "—",
      a.contract_type,
      STATUS_LABELS[a.status],
      formatDate(a.application_date) || "—",
      a.next_action || "—",
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [47, 79, 158] },
    alternateRowStyles: { fillColor: [245, 246, 250] },
  });

  doc.save(`jobee-flow-candidatures-${stamp()}.pdf`);
}

/** Exporte la fiche détaillée d'une candidature dans un PDF. */
export async function downloadApplicationDetailPdf(application: Application) {
  const { jsPDF } = await loadPdf();
  const doc = new jsPDF();
  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;
  let y = 18;

  const heading = (text: string) => {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(47, 79, 158);
    doc.text(text, marginX, y);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    y += 6;
  };

  const field = (label: string, value: string) => {
    if (!value) return;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(label, marginX, y);
    doc.setTextColor(0);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value, maxWidth) as string[];
    doc.text(lines, marginX, y + 4.5);
    y += 4.5 + lines.length * 4.5 + 2;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 14) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(application.position || "Candidature", marginX, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text(application.company || "", marginX, y);
  doc.setTextColor(0);
  y += 10;

  heading("Informations");
  field("Statut", STATUS_LABELS[application.status]);
  field("Localisation", application.location);
  field("Type de contrat", application.contract_type);
  field("Salaire", application.salary);
  field("Télétravail", remoteLabel(application.remote));
  field("Niveau d'expérience", application.experience_level ?? "");
  field("Source", sourceLabel(application.source));
  field("Date de candidature", formatDate(application.application_date));
  field("Date de relance", formatDate(application.follow_up_date));
  field("Prochaine action", application.next_action);

  if (application.notes) {
    ensureSpace(16);
    heading("Notes");
    field("", application.notes);
  }

  if (application.follow_ups.length > 0) {
    ensureSpace(16);
    heading("Relances");
    for (const f of application.follow_ups) {
      ensureSpace(10);
      field(
        `${formatDate(f.date)} · ${FOLLOW_UP_STATUS_LABELS[f.status]}`,
        [f.title, f.description].filter(Boolean).join(" — "),
      );
    }
  }

  if (application.status_history.length > 0) {
    ensureSpace(16);
    heading("Historique des statuts");
    for (const h of application.status_history) {
      ensureSpace(6);
      field(formatDate(h.date), STATUS_LABELS[h.status]);
    }
  }

  const safeCompany = (application.company || "candidature")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  doc.save(`jobee-flow-${safeCompany}-${stamp()}.pdf`);
}

/** Exporte une lettre de motivation (texte libre, générée ou éditée) en PDF prêt à envoyer. */
async function buildCoverLetterDoc(
  text: string,
  application: Pick<Application, "company" | "position">,
  applicantName?: string,
) {
  const { jsPDF } = await loadPdf();
  const doc = new jsPDF();
  const marginX = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;
  let y = 22;

  if (applicantName) {
    doc.setFontSize(11);
    doc.text(applicantName, marginX, y);
    y += 6;
  }
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(formatDate(new Date().toISOString()) || "", marginX, y);
  doc.setTextColor(0);
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Candidature — ${application.position}`, marginX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(application.company, marginX, y);
  doc.setTextColor(0);
  y += 12;

  doc.setFontSize(10.5);
  const paragraphs = text.split(/\n{2,}/);
  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(paragraph.trim(), maxWidth) as string[];
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 22;
      }
      doc.text(line, marginX, y);
      y += 5.5;
    }
    y += 4;
  }

  const safeCompany = (application.company || "candidature")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  return { doc, fileName: `jobee-flow-lettre-${safeCompany}-${stamp()}.pdf` };
}

export async function downloadCoverLetterPdf(
  text: string,
  application: Pick<Application, "company" | "position">,
  applicantName?: string,
) {
  const { doc, fileName } = await buildCoverLetterDoc(text, application, applicantName);
  doc.save(fileName);
}

/** Génère le PDF de la lettre de motivation sans le télécharger — pour l'assembler avec
 * d'autres pièces jointes (ex. dans une pièce jointe email) avant un unique téléchargement. */
export async function coverLetterPdfBlob(
  text: string,
  application: Pick<Application, "company" | "position">,
  applicantName?: string,
): Promise<{ blob: Blob; fileName: string }> {
  const { doc, fileName } = await buildCoverLetterDoc(text, application, applicantName);
  return { blob: doc.output("blob") as Blob, fileName };
}

/**
 * Dessine l'en-tête d'un CV (nom + ligne de contact) et renvoie la position Y après l'en-tête.
 * L'email/téléphone restent en texte, LinkedIn et le site web sont de vrais liens cliquables
 * (jsPDF n'en crée jamais automatiquement, même pour du texte qui ressemble à une URL — il faut
 * explicitement appeler `textWithLink`).
 */
function drawCvHeader(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  marginX: number,
  startY: number,
  options: {
    applicantName?: string | undefined;
    subtitle?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    linkedinUrl?: string | undefined;
    websiteUrl?: string | undefined;
  },
): number {
  let y = startY;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(47, 79, 158);
  doc.text(options.applicantName || "Curriculum Vitae", marginX, y);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  y += 7;

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(options.subtitle, marginX, y);
    doc.setTextColor(0);
    y += 6;
  }

  const items: { text: string; url?: string }[] = [];
  if (options.email) items.push({ text: options.email });
  if (options.phone) items.push({ text: options.phone });
  if (options.linkedinUrl) items.push({ text: "LinkedIn", url: options.linkedinUrl });
  if (options.websiteUrl) items.push({ text: "Site web", url: options.websiteUrl });

  if (items.length > 0) {
    doc.setFontSize(10);
    let x = marginX;
    items.forEach((item, i) => {
      if (i > 0) {
        doc.setTextColor(160);
        doc.text("   ·   ", x, y);
        x += doc.getTextWidth("   ·   ");
      }
      if (item.url) {
        doc.setTextColor(37, 99, 235);
        doc.textWithLink(item.text, x, y, { url: item.url });
      } else {
        doc.setTextColor(120);
        doc.text(item.text, x, y);
      }
      x += doc.getTextWidth(item.text);
    });
    doc.setTextColor(0);
    y += 8;
  } else {
    y += 3;
  }

  return y;
}

/** Exporte le CV (profil + expériences professionnelles) en PDF. */
export async function downloadCvPdf(
  experiences: CvExperience[],
  options: {
    applicantName?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
    cvSummary?: string;
  } = {},
) {
  const { jsPDF } = await loadPdf();
  const doc = new jsPDF();
  const marginX = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;
  let y = 20;

  const ensureSpace = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 16) {
      doc.addPage();
      y = 20;
    }
  };

  y = drawCvHeader(doc, marginX, y, options);

  if (options.cvSummary) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Profil", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(options.cvSummary, maxWidth) as string[];
    ensureSpace(lines.length * 5);
    doc.text(lines, marginX, y);
    y += lines.length * 5 + 6;
  }

  const sorted = sortExperiences(experiences);
  if (sorted.length > 0) {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Expérience professionnelle", marginX, y);
    y += 7;

    for (const exp of sorted) {
      ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(exp.title || "Poste", marginX, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(90);
      const meta = [exp.company, exp.location].filter(Boolean).join(" · ");
      if (meta) {
        doc.text(meta, marginX, y);
        y += 4.5;
      }
      const period = experiencePeriodLabel(exp);
      if (period) {
        doc.setTextColor(140);
        doc.text(period, marginX, y);
        y += 5;
      }
      doc.setTextColor(0);

      if (exp.description) {
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(exp.description, maxWidth) as string[];
        ensureSpace(lines.length * 4.5);
        doc.text(lines, marginX, y);
        y += lines.length * 4.5;
      }
      y += 6;
    }
  }

  const safeName = (options.applicantName || "cv").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`jobee-flow-${safeName}-${stamp()}.pdf`);
}

/** Une ligne est considérée comme un titre de section si elle est courte et tout en majuscules. */
function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return false;
  const letters = trimmed.replace(/[^a-zàâäéèêëïîôöùûüçA-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

interface GeneratedCvPdfOptions {
  applicantName?: string | undefined;
  targetPosition?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  linkedinUrl?: string | undefined;
  websiteUrl?: string | undefined;
}

async function buildGeneratedCvDoc(text: string, options: GeneratedCvPdfOptions = {}) {
  const { jsPDF } = await loadPdf();
  const doc = new jsPDF();
  const marginX = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;
  let y = 20;

  const ensureSpace = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 16) {
      doc.addPage();
      y = 20;
    }
  };

  y = drawCvHeader(doc, marginX, y, {
    applicantName: options.applicantName,
    subtitle: options.targetPosition,
    email: options.email,
    phone: options.phone,
    linkedinUrl: options.linkedinUrl,
    websiteUrl: options.websiteUrl,
  });

  // L'IA reçoit la consigne de ne jamais écrire de bloc "coordonnées" (l'en-tête ci-dessus
  // s'en charge, avec de vrais liens cliquables) ; on ignore par sécurité tout ce qu'elle aurait
  // pu écrire avant le premier vrai titre de section, au cas où elle l'aurait quand même fait.
  const allLines = text.split("\n");
  const firstHeadingIndex = allLines.findIndex((l) => isSectionHeading(l.trim()));
  const rawLines = firstHeadingIndex > 0 ? allLines.slice(firstHeadingIndex) : allLines;
  doc.setFontSize(10);
  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) {
      y += 3;
      continue;
    }
    if (isSectionHeading(line)) {
      ensureSpace(9);
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(47, 79, 158);
      doc.text(line, marginX, y);
      doc.setTextColor(0);
      y += 5.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      continue;
    }
    const wrapped = doc.splitTextToSize(line, maxWidth) as string[];
    for (const w of wrapped) {
      ensureSpace(5);
      doc.text(w, marginX, y);
      y += 5;
    }
  }

  const safeName = (options.applicantName || "cv-ats").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return { doc, fileName: `jobee-flow-${safeName}-ats-${stamp()}.pdf` };
}

/** Exporte un CV généré par IA (texte libre structuré en sections) en PDF prêt à envoyer. */
export async function downloadGeneratedCvPdf(text: string, options: GeneratedCvPdfOptions = {}) {
  const { doc, fileName } = await buildGeneratedCvDoc(text, options);
  doc.save(fileName);
}

/** Génère le PDF du CV ATS sans le télécharger — pour l'assembler avec d'autres pièces
 * jointes (ex. dans un email) avant un unique téléchargement. */
export async function generatedCvPdfBlob(
  text: string,
  options: GeneratedCvPdfOptions = {},
): Promise<{ blob: Blob; fileName: string }> {
  const { doc, fileName } = await buildGeneratedCvDoc(text, options);
  return { blob: doc.output("blob") as Blob, fileName };
}
