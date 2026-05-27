import { describe, expect, it } from "vitest";
import { normalizeMarkdownForRender } from "@/lib/markdown/normalize";

describe("normalizeMarkdownForRender", () => {
  it("leaves normal markdown unchanged", () => {
    const input = "# Title\n\nParagraph one.\n\nParagraph two.";
    expect(normalizeMarkdownForRender(input)).toBe(input);
  });

  it("expands collapsed GFM table rows onto separate lines", () => {
    const collapsed = "| A | B | |---|---| | C | D |";
    const result = normalizeMarkdownForRender(collapsed);

    expect(result).toContain("|\n|");
    expect(result.split("\n").length).toBeGreaterThan(1);
  });

  it("does not expand lines with too few pipes", () => {
    const input = "| A | B |";
    expect(normalizeMarkdownForRender(input)).toBe(input);
  });

  it("processes multiline input line by line", () => {
    const input = [
      "Regular paragraph",
      "| H1 | H2 | |---| | v1 | v2 |",
      "Another paragraph",
    ].join("\n");

    const result = normalizeMarkdownForRender(input);
    const lines = result.split("\n");

    expect(lines[0]).toBe("Regular paragraph");
    expect(lines.at(-1)).toBe("Another paragraph");
    expect(result).toContain("|\n|");
  });
});
