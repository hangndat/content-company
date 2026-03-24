/**
 * Jaccard similarity for titles - word n-gram based.
 */

const STOP_WORDS = new Set([
  "và", "của", "cho", "với", "là", "có", "được", "trong", "vào", "ra",
  "the", "a", "an", "of", "to", "in", "for", "on", "at", "by",
]);

function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function toBigrams(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    out.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return out;
}

function toTokenSet(title: string): Set<string> {
  const tokens = tokenize(title);
  const set = new Set(tokens);
  const bigrams = toBigrams(tokens);
  bigrams.forEach((b) => set.add(b));
  return set;
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = toTokenSet(a);
  const setB = toTokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const x of setA) {
    if (setB.has(x)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
