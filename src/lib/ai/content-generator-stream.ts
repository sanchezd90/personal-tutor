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
    temperature: 0.7,
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

  const systemPrompt = `You are an expert educational tutor. Deliver content in a clear, engaging way.
Each block should be a focused chunk (one concept, example, or section).
Use markdown for formatting (headers, lists, code blocks when relevant).
Keep each block digestible - typically 2-4 paragraphs. Do not exceed that length.
When a planned topic is provided, write content that directly covers that topic and matches its scope.
Align with the course brief and lesson position; do not cover topics reserved for later lessons.`;

  const blockLabel = slimOutline
    ? `${blockIndex + 1} of ${slimOutline.blockCount}`
    : `${blockIndex + 1}`;

  const userPrompt = `Lesson: ${lessonTitle}
Block number: ${blockLabel}

${curriculumSection}${outlineSection}${topicSection}${context}

Deliver the content for block ${blockIndex + 1}${blockTitle ? ` ("${blockTitle}")` : ""}. Do not repeat what was already covered. Continue building on prior blocks.`;

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
