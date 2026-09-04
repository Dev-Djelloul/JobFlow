import type { Application } from "@/types/application";
import type { Contact } from "@/types/contact";
import { companyKey } from "./companies";

/**
 * Détection PURE de doublons d'entreprises : aucune fusion automatique,
 * aucune écriture. Le résultat est une suggestion à valider par l'utilisateur.
 */

/** Suffixes juridiques / commerciaux courants retirés pour la comparaison. */
const LEGAL_SUFFIXES = [
  "inc",
  "incorporated",
  "llc",
  "ltd",
  "limited",
  "sa",
  "sas",
  "sasu",
  "sarl",
  "eurl",
  "gmbh",
  "bv",
  "plc",
  "corp",
  "corporation",
  "co",
  "company",
  "group",
  "groupe",
];

/** Forme canonique agressive : accents, ponctuation, espaces et suffixes retirés. */
export function canonicalCompany(name: string): string {
  const base = companyKey(name)
    .replace(/[.,''`"()\-_/&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = base.split(" ").filter(Boolean);
  while (words.length > 1 && LEGAL_SUFFIXES.includes(words[words.length - 1]!)) {
    words.pop();
  }
  return words.join(" ");
}

export interface CompanyDuplicateSuggestion {
  id: string;
  /** Clés `companyKey` des variantes détectées. */
  keys: string[];
  /** Libellés tels que saisis. */
  names: string[];
  /** Nombre de candidatures par variante, même ordre que `names`. */
  counts: number[];
  canonical: string;
  reason: string;
}

/**
 * Rapproche uniquement les variantes dont la forme canonique est identique
 * (casse, accents, ponctuation, espaces, suffixe juridique). « OpenAI France »
 * n'est jamais rapproché de « OpenAI » : la preuve est jugée insuffisante.
 */
export function findSimilarCompanies(applications: Application[]): CompanyDuplicateSuggestion[] {
  const byKey = new Map<string, { name: string; count: number }>();
  for (const app of applications) {
    const key = companyKey(app.company);
    if (!key) continue;
    const entry = byKey.get(key);
    if (entry) entry.count++;
    else byKey.set(key, { name: (app.company ?? "").trim(), count: 1 });
  }

  const groups = new Map<string, { key: string; name: string; count: number }[]>();
  for (const [key, { name, count }] of byKey) {
    const canonical = canonicalCompany(name || key);
    if (!canonical) continue;
    const list = groups.get(canonical) ?? [];
    list.push({ key, name: name || key, count });
    groups.set(canonical, list);
  }

  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([canonical, list]) => {
      const sorted = [...list].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
      return {
        id: `dup-${canonical.replace(/\s+/g, "-")}`,
        canonical,
        keys: sorted.map((v) => v.key),
        names: sorted.map((v) => v.name),
        counts: sorted.map((v) => v.count),
        reason:
          "Ces libellés deviennent identiques après normalisation (casse, accents, ponctuation, suffixe juridique).",
      };
    })
    .sort((a, b) => b.counts.reduce((x, y) => x + y, 0) - a.counts.reduce((x, y) => x + y, 0));
}

export interface MergePlan {
  targetName: string;
  /** Candidatures qui seront renommées. */
  applications: Application[];
  /** Contacts qui seront renommés. */
  contacts: Contact[];
}

/** Décrit précisément ce qu'une fusion changerait — sans rien modifier. */
export function planMerge(
  suggestion: CompanyDuplicateSuggestion,
  targetName: string,
  applications: Application[],
  contacts: Contact[],
): MergePlan {
  const keys = new Set(suggestion.keys);
  const targetKey = companyKey(targetName);
  return {
    targetName,
    applications: applications.filter(
      (a) => keys.has(companyKey(a.company)) && companyKey(a.company) !== targetKey,
    ),
    contacts: contacts.filter(
      (c) => keys.has(companyKey(c.company)) && companyKey(c.company) !== targetKey,
    ),
  };
}

/**
 * Fusion : renomme uniquement le libellé d'entreprise. Aucune candidature,
 * aucun contact, aucune relance et aucun historique n'est supprimé.
 */
export function applyMerge(
  suggestion: CompanyDuplicateSuggestion,
  targetName: string,
  applications: Application[],
  contacts: Contact[],
): { applications: Application[]; contacts: Contact[] } {
  const keys = new Set(suggestion.keys);
  const now = new Date().toISOString();
  return {
    applications: applications.map((a) =>
      keys.has(companyKey(a.company)) && a.company !== targetName
        ? { ...a, company: targetName, updated_at: now }
        : a,
    ),
    contacts: contacts.map((c) =>
      keys.has(companyKey(c.company)) && c.company !== targetName
        ? { ...c, company: targetName, updated_at: now }
        : c,
    ),
  };
}
