import { z } from "zod";
import { invokeJson } from "@/lib/ai/invoke-json";
import { MODEL_STRUCTURED } from "@/lib/ai/models";

const auditSchema = z.object({
  passed: z.boolean(),
  feedback: z.string().optional(),
});

const batchAuditSchema = z.object({
  results: z.array(
    z.object({
      index: z.number(),
      passed: z.boolean(),
      feedback: z.string().optional(),
    })
  ),
});

export async function auditContentBlock(
  content: string
): Promise<{ passed: boolean; feedback?: string }> {
  return invokeJson(
    auditSchema,
    `Fact-check educational content. Return JSON: { "passed": boolean, "feedback"?: string }.
feedback is required when passed is false.`,
    `Content to audit:\n\n${content}`,
    { model: MODEL_STRUCTURED, temperature: 0.2 }
  );
}

export type BlockAuditInput = {
  index: number;
  content: string;
};

export async function auditContentBlocksBatch(
  blocks: BlockAuditInput[]
): Promise<Array<{ index: number; passed: boolean; feedback?: string }>> {
  if (blocks.length === 0) return [];
  if (blocks.length === 1) {
    const single = await auditContentBlock(blocks[0].content);
    return [{ index: blocks[0].index, ...single }];
  }

  const numbered = blocks
    .map(
      (b, i) =>
        `--- Block ${i} (index ${b.index}) ---\n${b.content.slice(0, 4000)}`
    )
    .join("\n\n");

  const result = await invokeJson(
    batchAuditSchema,
    `Fact-check each numbered educational block. Return JSON:
{ "results": [{ "index": <original index field>, "passed": boolean, "feedback"?: string }] }
One result per block, using the index value from each block header.`,
    numbered,
    { model: MODEL_STRUCTURED, temperature: 0.2, maxTokens: 800 }
  );

  return result.results;
}
