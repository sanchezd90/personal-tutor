import { db } from "@/lib/db";
import { lessons, modules, syllabi } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  normalizeLessonOutline,
  type LessonOutline,
  type SyllabusStructure,
} from "@/lib/ai/syllabus-types";

export type LessonGenerationContext = {
  lessonId: string;
  lessonTitle: string;
  curriculumBrief: string;
  positionLine: string;
  previousLessonTitle: string | null;
  nextLessonTitle: string | null;
  lessonObjective: string | null;
  prebuiltOutline: LessonOutline | null;
};

export async function getLessonGenerationContext(
  lessonId: string
): Promise<LessonGenerationContext | null> {
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId));

  if (!lesson) return null;

  const [mod] = await db
    .select()
    .from(modules)
    .where(eq(modules.id, lesson.moduleId));

  if (!mod) return null;

  const [syllabus] = await db
    .select()
    .from(syllabi)
    .where(eq(syllabi.id, mod.syllabusId));

  if (!syllabus) return null;

  const moduleRows = await db
    .select()
    .from(modules)
    .where(eq(modules.syllabusId, mod.syllabusId))
    .orderBy(modules.order);

  const allLessons: { id: string; title: string; moduleOrder: number; lessonOrder: number }[] =
    [];

  for (const m of moduleRows) {
    const lessonRows = await db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, m.id))
      .orderBy(lessons.order);
    for (const l of lessonRows) {
      allLessons.push({
        id: l.id,
        title: l.title,
        moduleOrder: m.order,
        lessonOrder: l.order,
      });
    }
  }

  const lessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  const previousLessonTitle =
    lessonIndex > 0 ? allLessons[lessonIndex - 1].title : null;
  const nextLessonTitle =
    lessonIndex >= 0 && lessonIndex < allLessons.length - 1
      ? allLessons[lessonIndex + 1].title
      : null;

  const moduleIndex = moduleRows.findIndex((m) => m.id === mod.id);
  const lessonsInModule = await db
    .select()
    .from(lessons)
    .where(eq(lessons.moduleId, mod.id))
    .orderBy(lessons.order);
  const lessonIndexInModule = lessonsInModule.findIndex((l) => l.id === lessonId);

  const positionLine = `Module ${moduleIndex + 1} of ${moduleRows.length}, Lesson ${lessonIndexInModule + 1} of ${lessonsInModule.length} (lesson ${lessonIndex + 1} of ${allLessons.length} in course)`;

  const rawStructure = syllabus.structure;
  const structure =
    rawStructure &&
    typeof rawStructure === "object" &&
    "modules" in rawStructure
      ? (rawStructure as SyllabusStructure)
      : null;
  const curriculumBrief =
    structure?.curriculumBrief &&
    typeof structure.curriculumBrief === "string"
      ? structure.curriculumBrief
      : "";
  const structureLesson =
    structure?.modules?.[moduleIndex]?.lessons?.[lessonIndexInModule];

  const lessonObjective = structureLesson?.objective ?? null;
  const prebuiltOutline = structureLesson
    ? normalizeLessonOutline(structureLesson)
    : null;

  return {
    lessonId,
    lessonTitle: lesson.title,
    curriculumBrief,
    positionLine,
    previousLessonTitle,
    nextLessonTitle,
    lessonObjective,
    prebuiltOutline,
  };
}

export function formatCurriculumContext(ctx: LessonGenerationContext): string {
  const parts: string[] = [];

  if (ctx.curriculumBrief) {
    parts.push(`Course brief:\n${ctx.curriculumBrief}`);
  }

  parts.push(`Position: ${ctx.positionLine}`);

  if (ctx.previousLessonTitle) {
    parts.push(`Previous lesson: ${ctx.previousLessonTitle}`);
  }
  if (ctx.nextLessonTitle) {
    parts.push(`Next lesson: ${ctx.nextLessonTitle}`);
  }
  if (ctx.lessonObjective) {
    parts.push(`This lesson objective: ${ctx.lessonObjective}`);
  }

  return parts.join("\n");
}
