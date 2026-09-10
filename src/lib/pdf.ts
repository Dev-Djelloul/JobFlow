import type { Application } from "@/types/application";
import {
  FOLLOW_UP_STATUS_LABELS,
  remoteLabel,
  sourceLabel,
  STATUS_LABELS,
} from "@/types/application";
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
export async function downloadCoverLetterPdf(
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
  doc.save(`jobee-flow-lettre-${safeCompany}-${stamp()}.pdf`);
}
