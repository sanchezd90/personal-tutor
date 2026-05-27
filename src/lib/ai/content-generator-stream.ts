import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CONTENT_MAX_TOKENS, MODEL_CONTENT } from "@/lib/ai/models";

export type SlimOutlineSlice = {
  blockIndex: number;
  blockCount: number;
  currentTitle?: string;
  previousTitle?: string | null;
  nextTitle?: string | null;
};

export type ContentBlockOptions = {
  blockTitle?: string;
  slimOutline?: SlimOutlineSlice;
  previousSummaries?: string[];
  curriculumContext?: string;
};

function buildOutlineSection(slim: SlimOutlineSlice): string {
  const lines = [
    `Block ${slim.blockIndex + 1} of ${slim.blockCount}`,
    slim.previousTitle ? `Previous block topic: ${slim.previousTitle}` : null,
    slim.currentTitle ? `This block topic: ${slim.currentTitle}` : null,
    slim.nextTitle ? `Next block topic: ${slim.nextTitle}` : null,
  ].filter(Boolean);

  return `Lesson block plan:\n${lines.join("\n")}\n\n`;
}

export async function* streamContentBlock(
  lessonTitle: string,
  blockIndex: number,
  options: ContentBlockOptions = {}
): AsyncGenerator<string> {
  const {
    blockTitle,
    slimOutline,
    previousSummaries = [],
    curriculumContext,
  } = options;

  const model = new ChatOpenAI({
    model: MODEL_CONTENT,
    temperature: 0.5,
    maxTokens: CONTENT_MAX_TOKENS,
    streaming: true,
  });

  const context =
    previousSummaries.length > 0
      ? `Prior blocks covered (summaries only):\n\n${previousSummaries.map((s, i) => `Block ${i + 1}: ${s}`).join("\n\n")}`
      : "This is the first block of content for this lesson.";

  const outlineSection = slimOutline ? buildOutlineSection(slimOutline) : "";

  const curriculumSection = curriculumContext
    ? `${curriculumContext}\n\n`
    : "";

  const topicSection = blockTitle
    ? `Planned topic for this block: ${blockTitle}\n\n`
    : "";

  const systemPrompt = `You are an expert educational tutor writing a certificate-level short course. Each block is one major section of a daily lesson — the depth and length of several pages in a study booklet.

Cover the planned topic exhaustively for certification readiness:
- Core definitions, principles, and why they matter
- Mechanisms, relationships, and how pieces fit together
- Worked examples, applied scenarios, and decision frameworks
- Edge cases, common mistakes, misconceptions, and how to avoid them
- Field standards, conventions, or exam-relevant distinctions where applicable

Use markdown with clear hierarchy (## / ###), bullet lists, tables, and code blocks when relevant. Structure long material into scannable sections rather than one wall of text.
Use the full length budget: aim for substantial multi-section content (roughly 3–6 booklet pages of teaching density), not a brief overview.
Avoid filler: no throat-clearing ("In this section…"), motivational fluff, vague generalities, or repeating the lesson title.
Every paragraph should teach something new. When a planned topic is provided, cover it completely within scope.
Align with the course brief and lesson position; do not cover topics reserved for later lessons or later blocks in this lesson.`;

  const blockLabel = slimOutline
    ? `${blockIndex + 1} of ${slimOutline.blockCount}`
    : `${blockIndex + 1}`;

  const userPrompt = `Lesson: ${lessonTitle}
Block number: ${blockLabel}

${curriculumSection}${outlineSection}${topicSection}${context}

Deliver fact-dense content for block ${blockIndex + 1}${blockTitle ? ` ("${blockTitle}")` : ""}. Do not repeat what was already covered. Build on prior blocks with new information only.`;

  const stream = await model.stream([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);

  for await (const chunk of stream) {
    const text =
      typeof chunk.content === "string" ? chunk.content : String(chunk.content);
    if (text) yield text;
  }
}
