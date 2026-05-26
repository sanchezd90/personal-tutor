import { invokeJson } from "@/lib/ai/invoke-json";
import { MODEL_STRUCTURED } from "@/lib/ai/models";
import {
  syllabusStructureSchema,
  type SyllabusStructure,
} from "@/lib/ai/syllabus-types";

export type { SyllabusStructure } from "@/lib/ai/syllabus-types";

export async function generateSyllabus(
  subjectName: string
): Promise<SyllabusStructure> {
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
Lessons should build on previous content within and across modules.`,
    `Subject: ${subjectName}`,
    { model: MODEL_STRUCTURED, temperature: 0.7 }
  );
}
