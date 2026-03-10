import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts";

const lessonOutlineSchema = z.object({
  blockCount: z.number().min(3).max(12),
  titles: z.array(z.string()),
});

export type LessonOutline = z.infer<typeof lessonOutlineSchema>;

const parser = StructuredOutputParser.fromZodSchema(lessonOutlineSchema);

export async function generateLessonOutline(
  lessonTitle: string
): Promise<LessonOutline> {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.6,
  });

  const prompt = new PromptTemplate({
    template: `You are an expert educational curriculum designer. Create an outline for the lesson "{lessonTitle}".

Break the lesson into 3-12 focused blocks. Each block should cover one concept, example, or section. Return the block count and a short title for each block (2-8 words each).

Return a JSON object with this exact structure:
{{
  "blockCount": <number of blocks>,
  "titles": ["Block 1 title", "Block 2 title", ...]
}}

The titles array length must equal blockCount.

{format_instructions}`,
    inputVariables: ["lessonTitle"],
    partialVariables: {
      format_instructions: parser.getFormatInstructions(),
    },
  });

  const chain = prompt.pipe(model).pipe(parser);
  const result = await chain.invoke({ lessonTitle });

  if (result.titles.length !== result.blockCount) {
    result.titles = result.titles.slice(0, result.blockCount);
    while (result.titles.length < result.blockCount) {
      result.titles.push(`Block ${result.titles.length + 1}`);
    }
  }

  return result;
}
