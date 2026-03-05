import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function generateAnswer(blockContent: string, question: string): Promise<string> {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3,
  });

  const response = await model.invoke([
    new SystemMessage(
      `You are a helpful tutor. Answer the student's question based on the content block provided. 
Be clear and concise. If the question goes beyond the block, you may briefly expand but stay on topic.`
    ),
    new HumanMessage(
      `Content block:\n\n${blockContent}\n\n---\n\nStudent question: ${question}`
    ),
  ]);

  const answer = typeof response.content === "string" ? response.content : String(response.content);
  return answer;
}
