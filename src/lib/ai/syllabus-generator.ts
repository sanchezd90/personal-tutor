import { invokeJson } from "@/lib/ai/invoke-json";
import {
  COURSE_WEEKS,
  LESSON_BLOCKS_MAX,
  LESSON_BLOCKS_MIN,
  LESSONS_PER_WEEK_MAX,
  LESSONS_PER_WEEK_MIN,
} from "@/lib/ai/course-structure";
import { MODEL_STRUCTURED, SYLLABUS_MAX_TOKENS } from "@/lib/ai/models";
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
    `You are an expert educational curriculum designer building a formal short course suitable for a certificate of completion.

Course shape (strict):
- Exactly ${COURSE_WEEKS} modules — one per week of a ~one-month program
- Each module has ${LESSONS_PER_WEEK_MIN}–${LESSONS_PER_WEEK_MAX} lessons — one per study day that week (Mon–Fri or equivalent)
- Module titles should name the week and theme, e.g. "Week 1: Foundations of …"
- Lesson titles should be specific daily topics, not vague labels

Return JSON with:
- "curriculumBrief": 300–500 words covering certificate-level learning outcomes, prerequisite knowledge, weekly arc, assessment readiness (what the learner should be able to demonstrate by course end), and how modules build toward professional or exam-level competence
- "modules": array of exactly ${COURSE_WEEKS} { "title", "lessons": [{ "title", "objective", "blockCount", "titles" }] }

Each lesson must include:
- "objective": 1–2 sentences — concrete, measurable skills or knowledge for that study day (certification depth, not trivia)
- "blockCount": integer ${LESSON_BLOCKS_MIN}–${LESSON_BLOCKS_MAX} (enough sections for a full daily study session with substantial reading per section)
- "titles": array of block titles (length === blockCount; each title 3–10 words, one major concept or activity per section)

Depth and progression:
- Treat this as a certificate-prep program, not micro-learning "pills"
- Each week should have a clear competency theme; each day should advance within that theme
- Include theory, worked examples, applied scenarios, common mistakes, and (where relevant) standards or best practices from the field
- Later weeks assume earlier weeks; avoid repeating the same lesson at the same depth
- When the learner provides topic preferences, weave them in without breaking the four-week arc`,
    userPrompt,
    {
      model: MODEL_STRUCTURED,
      temperature: 0.7,
      maxTokens: SYLLABUS_MAX_TOKENS,
    }
  );
}
