import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function* streamContentBlock(
  lessonTitle: string,
  previousBlocks: string[],
  blockIndex: number
): AsyncGenerator<string> {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.7,
    streaming: true,
  });

  const context = previousBlocks.length
    ? `Previous content delivered so far:\n\n${previousBlocks.join("\n\n---\n\n")}`
    : "This is the first block of content for this lesson.";

  const systemPrompt = `You are an expert educational tutor. Deliver content in a clear, engaging way.
Each block should be a focused chunk (e.g., one concept, one example, or one section).
Use markdown for formatting (headers, lists, code blocks when relevant).
Keep each block digestible - typically 2-4 paragraphs or equivalent.`;

  const userPrompt = `Lesson: ${lessonTitle}
Block number: ${blockIndex + 1}

${context}

Deliver the next block of content for this lesson. Do not repeat what was already covered. Continue building on the previous content.`;

  const stream = await model.stream([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);

  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : String(chunk.content);
    if (text) yield text;
  }
}
