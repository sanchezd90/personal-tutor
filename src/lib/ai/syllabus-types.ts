import { z } from "zod";

export const lessonStructureSchema = z.object({
  title: z.string(),
  objective: z.string().optional(),
  blockCount: z.number().min(3).max(12).optional(),
  titles: z.array(z.string()).optional(),
});

export const syllabusStructureSchema = z.object({
  curriculumBrief: z.string(),
  modules: z.array(
    z.object({
      title: z.string(),
      lessons: z.array(lessonStructureSchema),
    })
  ),
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
    titles.length < 3 ||
    blockCount < 3 ||
    blockCount > 12
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
