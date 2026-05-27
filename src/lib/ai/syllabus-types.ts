import { z } from "zod";
import {
  COURSE_WEEKS,
  LESSON_BLOCKS_MAX,
  LESSON_BLOCKS_MIN,
  LESSONS_PER_WEEK_MAX,
  LESSONS_PER_WEEK_MIN,
} from "@/lib/ai/course-structure";

export const lessonStructureSchema = z.object({
  title: z.string(),
  objective: z.string().optional(),
  blockCount: z
    .number()
    .min(LESSON_BLOCKS_MIN)
    .max(LESSON_BLOCKS_MAX)
    .optional(),
  titles: z.array(z.string()).optional(),
});

const moduleStructureSchema = z.object({
  title: z.string(),
  lessons: z
    .array(lessonStructureSchema)
    .min(LESSONS_PER_WEEK_MIN)
    .max(LESSONS_PER_WEEK_MAX),
});

export const syllabusStructureSchema = z.object({
  curriculumBrief: z.string(),
  modules: z.array(moduleStructureSchema).length(COURSE_WEEKS),
});

export type SyllabusLessonStructure = z.infer<typeof lessonStructureSchema>;
export type SyllabusStructure = z.infer<typeof syllabusStructureSchema>;

export type LessonOutline = {
  blockCount: number;
  titles: string[];
};

export function normalizeLessonOutline(
  lesson: SyllabusLessonStructure
): LessonOutline | null {
  const blockCount = lesson.blockCount;
  const titles = lesson.titles;
  if (
    blockCount == null ||
    !titles ||
    titles.length < LESSON_BLOCKS_MIN ||
    blockCount < LESSON_BLOCKS_MIN ||
    blockCount > LESSON_BLOCKS_MAX
  ) {
    return null;
  }
  const normalized: LessonOutline = {
    blockCount,
    titles: titles.slice(0, blockCount),
  };
  while (normalized.titles.length < blockCount) {
    normalized.titles.push(`Block ${normalized.titles.length + 1}`);
  }
  return normalized;
}
