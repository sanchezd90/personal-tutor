import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { z } from "zod";
import { MODEL_STRUCTURED } from "@/lib/ai/models";

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return match ? match[1].trim() : trimmed;
}

type InvokeJsonOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export async function invokeJson<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
  options: InvokeJsonOptions = {}
): Promise<T> {
  const model = new ChatOpenAI({
    model: options.model ?? MODEL_STRUCTURED,
    temperature: options.temperature ?? 0.5,
    maxTokens: options.maxTokens,
    modelKwargs: { response_format: { type: "json_object" } },
  });

  const response = await model.invoke([
    new SystemMessage(`${system}\n\nRespond with valid JSON only.`),
    new HumanMessage(user),
  ]);

  const text =
    typeof response.content === "string"
      ? response.content
      : String(response.content);

  return schema.parse(JSON.parse(stripJsonFence(text)));
}
