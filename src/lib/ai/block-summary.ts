import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { MODEL_STRUCTURED, SUMMARY_MAX_TOKENS } from "@/lib/ai/models";

export async function summarizeBlockContent(content: string): Promise<string> {
  const model = new ChatOpenAI({
    model: MODEL_STRUCTURED,
    temperature: 0.2,
    maxTokens: SUMMARY_MAX_TOKENS,
  });

  const response = await model.invoke([
    new SystemMessage(
      `Summarize the educational content below in 50-120 words for use as context when writing the next section.
List only concepts and facts already stated. Do not add new information, examples, or opinions.`
    ),
    new HumanMessage(content),
  ]);

  const text =
    typeof response.content === "string"
      ? response.content
      : String(response.content);

  return text.trim();
}
