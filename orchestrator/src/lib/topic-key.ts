import { createHash } from "crypto";

export type TopicIdentifiers = {
  topicKey: string;
  topicLabel: string;
  topicSignature: string;
};

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those",
  "it", "its", "as", "so", "if", "then", "than", "when", "where", "which", "who", "what", "how",
]);

/**
 * Normalize for topic_signature: lowercase, remove punctuation, remove stopwords, sort tokens.
 * Ensures "A B C" and "C B A" produce same hash.
 */
function normalizeForSignature(text: string): string {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return [...new Set(tokens)].sort().join(" ");
}

/**
 * Normalize topic/outline into stable identifiers for metrics lookup.
 * - topic_key: short, URL-friendly slug (stable across wording variations)
 * - topic_label: human-readable label (first meaningful phrase)
 * - topic_signature: hash of normalized+sorted tokens (word order invariant)
 */
export function extractTopicIdentifiers(outline: string): TopicIdentifiers {
  if (!outline?.trim()) {
    return { topicKey: "", topicLabel: "", topicSignature: "" };
  }

  const trimmed = outline.trim();
  const normalized = trimmed
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim();

  const topicLabel = trimToFirstPhrase(trimmed, 80);

  const slug = normalized
    .slice(0, 120)
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 8)
    .join("-")
    .replace(/-+/g, "-");
  const topicKey = slug || normalized.slice(0, 60).replace(/\s/g, "-");

  const signatureInput = normalizeForSignature(outline.slice(0, 500));
  const topicSignature = signatureInput
    ? createHash("sha256").update(signatureInput).digest("hex")
    : "";

  return { topicKey, topicLabel, topicSignature };
}

function trimToFirstPhrase(text: string, maxLen: number): string {
  const firstLine = text.split(/\n/)[0]?.trim() ?? text;
  if (firstLine.length <= maxLen) return firstLine;
  const lastSpace = firstLine.lastIndexOf(" ", maxLen);
  return lastSpace > maxLen / 2 ? firstLine.slice(0, lastSpace) : firstLine.slice(0, maxLen);
}

/** @deprecated Use extractTopicIdentifiers. Kept for backward compat. */
export function toTopicKey(outline: string): string {
  return extractTopicIdentifiers(outline).topicKey;
}
