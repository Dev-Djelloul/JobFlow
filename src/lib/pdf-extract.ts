/**
 * Extraction du texte d'un CV PDF, chargée à la demande (pdfjs-dist ne doit pas alourdir
 * le bundle principal). L'extraction n'est jamais parfaite (mises en page complexes, PDF
 * scanné…) — le texte obtenu doit toujours rester modifiable par l'utilisateur.
 */
export async function extractPdfText(file: File): Promise<string> {
  const [pdfjsLib, workerUrlModule] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlModule.default;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }

  return pages.join("\n\n").trim();
}
