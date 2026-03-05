import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts";

const syllabusSchema = z.object({
  modules: z.array(
    z.object({
      title: z.string(),
      lessons: z.array(z.object({ title: z.string() })),
    })
  ),
});

export type SyllabusStructure = z.infer<typeof syllabusSchema>;

const parser = StructuredOutputParser.fromZodSchema(syllabusSchema);

export async function generateSyllabus(subjectName: string): Promise<SyllabusStructure> {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.7,
  });

  const prompt = new PromptTemplate({
    template: `You are an expert educational curriculum designer. Create a comprehensive syllabus for learning "{subject}".

The syllabus should be structured as modules, each containing multiple lessons. Each lesson should be a focused topic that builds on previous content.

Return a JSON object with this exact structure:
{{
  "modules": [
    {{
      "title": "Module title",
      "lessons": [
        {{ "title": "Lesson title" }},
        ...
      ]
    }},
    ...
  ]
}}

Subject: {subject}

{format_instructions}`,
    inputVariables: ["subject"],
    partialVariables: {
      format_instructions: parser.getFormatInstructions(),
    },
  });

  const chain = prompt.pipe(model).pipe(parser);
  const result = await chain.invoke({ subject: subjectName });
  return result as SyllabusStructure;
}
