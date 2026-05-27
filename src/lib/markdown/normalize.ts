/** Collapsed GFM tables often arrive as one line: "| A | B | |---| | C | D |". */
function looksLikeCollapsedTableLine(line: string): boolean {
  const pipeCount = (line.match(/\|/g) ?? []).length;
  if (pipeCount < 4) return false;
  return /\|\s*[-:]+/.test(line) || /\|\s+\|/.test(line);
}

function expandCollapsedTableLine(line: string): string {
  return line.replace(/\|\s+\|/g, "|\n|");
}

/**
 * Repairs common model output so GFM tables parse (each row on its own line).
 * Safe to run on full block markdown before render.
 */
export function normalizeMarkdownForRender(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) =>
      looksLikeCollapsedTableLine(line) ? expandCollapsedTableLine(line) : line
    )
    .join("\n");
}
