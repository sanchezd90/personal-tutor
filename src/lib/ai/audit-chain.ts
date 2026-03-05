import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const auditSchema = z.object({
  passed: z.boolean(),
  feedback: z.string().optional(),
});

const parser = StructuredOutputParser.fromZodSchema(auditSchema);

export async function auditContentBlock(
  content: string
): Promise<{ passed: boolean; feedback?: string }> {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.2,
  });

  const response = await model.invoke([
    new SystemMessage(
      `You are a fact-checker for educational content. Review the content block for accuracy.
Return a JSON object with:
- "passed": true if the content appears factually correct, false if there are errors or concerning inaccuracies
- "feedback": optional string with specific feedback (e.g., what to correct) if passed is false

${parser.getFormatInstructions()}`
    ),
    new HumanMessage(`Content to audit:\n\n${content}`),
  ]);

  const text = typeof response.content === "string" ? response.content : String(response.content);
  const result = await parser.parse(text);
  return result;
}
