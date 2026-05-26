import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

type ContentBlockOptions = {
  blockTitle?: string;
  outlineTitles?: string[];
};

export async function* streamContentBlock(
  lessonTitle: string,
  previousBlocks: string[],
  blockIndex: number,
  options: ContentBlockOptions = {}
): AsyncGenerator<string> {
  const { blockTitle, outlineTitles } = options;
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.7,
    streaming: true,
  });

  const context = previousBlocks.length
    ? `Previous content delivered so far:\n\n${previousBlocks.join("\n\n---\n\n")}`
    : "This is the first block of content for this lesson.";

  const outlineSection =
    outlineTitles && outlineTitles.length > 0
      ? `Full lesson outline:\n${outlineTitles.map((title, i) => `${i + 1}. ${title}`).join("\n")}\n\n`
      : "";

  const topicSection = blockTitle
    ? `Planned topic for this block: ${blockTitle}\n\n`
    : "";

  const systemPrompt = `You are an expert educational tutor. Deliver content in a clear, engaging way.
Each block should be a focused chunk (e.g., one concept, one example, or one section).
Use markdown for formatting (headers, lists, code blocks when relevant).
Keep each block digestible - typically 2-4 paragraphs or equivalent.
When a planned topic is provided, write content that directly covers that topic and matches its scope.`;

  const userPrompt = `Lesson: ${lessonTitle}
Block number: ${blockIndex + 1}${outlineTitles ? ` of ${outlineTitles.length}` : ""}

${outlineSection}${topicSection}${context}

Deliver the content for block ${blockIndex + 1}${blockTitle ? ` ("${blockTitle}")` : ""}. Do not repeat what was already covered. Continue building on the previous content.`;

  const stream = await model.stream([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);

  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : String(chunk.content);
    if (text) yield text;
  }
}
