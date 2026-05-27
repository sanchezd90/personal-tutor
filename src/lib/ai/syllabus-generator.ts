import { invokeJson } from "@/lib/ai/invoke-json";
import { MODEL_STRUCTURED } from "@/lib/ai/models";
import {
  syllabusStructureSchema,
  type SyllabusStructure,
} from "@/lib/ai/syllabus-types";

export type { SyllabusStructure } from "@/lib/ai/syllabus-types";

export async function generateSyllabus(
  subjectName: string,
  topicsDescription?: string
): Promise<SyllabusStructure> {
  const trimmedTopics = topicsDescription?.trim();
  const userPrompt = trimmedTopics
    ? `Subject: ${subjectName}

Topics the learner wants covered (prioritize these when designing modules and lessons):
${trimmedTopics}`
    : `Subject: ${subjectName}`;

  return invokeJson(
    syllabusStructureSchema,
    `You are an expert educational curriculum designer. Create a comprehensive syllabus.
Return JSON with:
- "curriculumBrief": 150-250 words covering subject goals, progression, and how modules fit together
- "modules": array of { "title", "lessons": [{ "title", "objective", "blockCount", "titles" }] }
Each lesson must include:
- "objective": one sentence learning goal
- "blockCount": integer 3-12
- "titles": array of block titles (length === blockCount, 2-8 words each)
Lessons should build on previous content within and across modules.
When the learner provides topic preferences, weave them into the syllabus while keeping a coherent progression.`,
    userPrompt,
    { model: MODEL_STRUCTURED, temperature: 0.7 }
  );
}
