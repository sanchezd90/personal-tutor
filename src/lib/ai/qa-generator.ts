import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MODEL_STRUCTURED } from "@/lib/ai/models";
import { selectRelevantContext } from "@/lib/ai/qa-context";

export async function generateAnswer(
  blockContent: string,
  question: string
): Promise<string> {
  const context = selectRelevantContext(blockContent, question);

  const model = new ChatOpenAI({
    model: MODEL_STRUCTURED,
    temperature: 0.3,
  });

  const response = await model.invoke([
    new SystemMessage(
      `You are a helpful tutor. Answer the student's question based on the content block provided.
Be clear and concise. If the question goes beyond the block, you may briefly expand but stay on topic.`
    ),
    new HumanMessage(
      `Content block:\n\n${context}\n\n---\n\nStudent question: ${question}`
    ),
  ]);

  const answer =
    typeof response.content === "string"
      ? response.content
      : String(response.content);
  return answer;
}
