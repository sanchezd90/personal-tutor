import { describe, expect, it } from "vitest";
import { QA_FULL_CONTENT_THRESHOLD } from "@/lib/ai/models";
import { selectRelevantContext } from "@/lib/ai/qa-context";

describe("selectRelevantContext", () => {
  it("returns full content when under threshold", () => {
    const content = "Short block about variables and functions.";
    expect(selectRelevantContext(content, "What is a variable?")).toBe(content);
  });

  it("returns truncated content when over threshold with at most two paragraphs", () => {
    const paragraph = "word ".repeat(2000).trim();
    const content = `${paragraph}\n\n${paragraph}`;
    expect(content.length).toBeGreaterThan(QA_FULL_CONTENT_THRESHOLD);

    const result = selectRelevantContext(content, "anything");

    expect(result.length).toBeLessThanOrEqual(QA_FULL_CONTENT_THRESHOLD);
    expect(result).toBe(content.slice(0, QA_FULL_CONTENT_THRESHOLD));
  });

  it("selects paragraphs most relevant to the question", () => {
    const intro = "Introduction to the course overview and logistics.";
    const variables = "Variables store values. Use let and const keywords.";
    const functions =
      "Functions encapsulate reusable logic. Return values with return.";
    const closing = "Summary of next steps and further reading resources.";
    const content = [intro, variables, functions, closing].join("\n\n");

    const longPrefix = "filler ".repeat(2500);
    const longContent = `${longPrefix}\n\n${content}`;

    const result = selectRelevantContext(
      longContent,
      "How do functions return values?"
    );

    expect(result).toContain("Functions encapsulate reusable logic");
    expect(result).not.toContain("Introduction to the course overview");
  });

  it("preserves original paragraph order in selected context", () => {
    const p1 = "Alpha topic about arrays and lists in programming.";
    const p2 = "Beta topic about arrays indexing and mutation rules.";
    const p3 = "Gamma topic about arrays iteration patterns and loops.";
    const filler = "noise ".repeat(3000);
    const content = [filler, p1, p2, p3].join("\n\n");

    const result = selectRelevantContext(content, "arrays indexing mutation");

    const alphaIndex = result.indexOf("Alpha topic");
    const betaIndex = result.indexOf("Beta topic");
    const gammaIndex = result.indexOf("Gamma topic");

    if (alphaIndex >= 0 && betaIndex >= 0) {
      expect(alphaIndex).toBeLessThan(betaIndex);
    }
    if (betaIndex >= 0 && gammaIndex >= 0) {
      expect(betaIndex).toBeLessThan(gammaIndex);
    }
  });
});
