import { QA_FULL_CONTENT_THRESHOLD } from "@/lib/ai/models";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

/**
 * For long blocks, send only paragraphs most relevant to the question (keyword overlap).
 */
export function selectRelevantContext(
  blockContent: string,
  question: string
): string {
  if (blockContent.length <= QA_FULL_CONTENT_THRESHOLD) {
    return blockContent;
  }

  const paragraphs = blockContent
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 2) {
    return blockContent.slice(0, QA_FULL_CONTENT_THRESHOLD);
  }

  const qTokens = tokenize(question);
  const scored = paragraphs.map((p, index) => {
    const pTokens = tokenize(p);
    let score = 0;
    for (const t of qTokens) {
      if (pTokens.has(t)) score += 1;
    }
    return { index, score, text: p };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: string[] = [];
  let chars = 0;
  const limit = QA_FULL_CONTENT_THRESHOLD;

  for (const item of scored) {
    if (chars + item.text.length > limit && selected.length > 0) break;
    selected.push(item.text);
    chars += item.text.length;
  }

  if (selected.length === 0) {
    return blockContent.slice(0, limit);
  }

  const ordered = scored
    .filter((s) => selected.includes(s.text))
    .sort((a, b) => a.index - b.index)
    .map((s) => s.text);

  return ordered.join("\n\n");
}
