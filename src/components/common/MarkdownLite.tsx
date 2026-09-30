import { Fragment } from "react";

/** Segmente une ligne en texte normal / passages en gras (**...**), sans dépendance markdown —
 * suffisant pour le niveau de mise en forme que renvoient nos prompts IA. */
function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const ORDERED_ITEM_RE = /^\d+[.)]\s+/;
const BULLET_ITEM_RE = /^[-•]\s+/;
const SECTION_HEADING_RE = /^[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ' /-]{3,60}$/;

/** Rendu minimal d'un texte généré par IA : titres de section, gras, listes numérotées/à
 * puces, paragraphes — pour éviter d'afficher le markdown brut (astérisques, etc.) renvoyé par
 * le modèle. Partagé entre l'assistant IA et les autres contenus générés (fiche métier…). */
export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((l) => l.trim());

        if (lines.length === 1 && SECTION_HEADING_RE.test(lines[0]!.trim())) {
          return (
            <p
              key={blockIndex}
              className="mt-4 inline-block rounded-md bg-primary/10 px-2 py-1 text-xs font-bold uppercase tracking-wide text-primary first:mt-0"
            >
              {lines[0]!.trim()}
            </p>
          );
        }

        if (lines.length > 0 && lines.every((l) => ORDERED_ITEM_RE.test(l.trim()))) {
          return (
            <ol key={blockIndex} className="list-none space-y-1.5">
              {lines.map((line, i) => {
                const [, num] = line.trim().match(/^(\d+)[.)]\s+/) ?? [];
                const rest = line.trim().replace(ORDERED_ITEM_RE, "");
                return (
                  <li key={i} className="flex gap-2">
                    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                      {num}
                    </span>
                    <span className="leading-relaxed">{renderInline(rest)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        if (lines.length > 0 && lines.every((l) => BULLET_ITEM_RE.test(l.trim()))) {
          return (
            <ul key={blockIndex} className="list-none space-y-1.5">
              {lines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="leading-relaxed">
                    {renderInline(line.trim().replace(BULLET_ITEM_RE, ""))}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex} className="leading-relaxed">
            {lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 ? <br /> : null}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
