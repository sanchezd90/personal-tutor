import { getLessonGenerationContext } from "@/lib/ai/lesson-context";
import { resolveLessonOutline } from "@/lib/ai/resolve-lesson-outline";
import type { LessonOutline } from "@/lib/ai/syllabus-types";

export type { LessonOutline } from "@/lib/ai/syllabus-types";

/** @deprecated Prefer resolveLessonOutline with lesson context */
export async function generateLessonOutline(
  lessonTitle: string
): Promise<LessonOutline> {
  return resolveLessonOutline({
    lessonId: "",
    lessonTitle,
    curriculumBrief: "",
    positionLine: "",
    previousLessonTitle: null,
    nextLessonTitle: null,
    lessonObjective: null,
    prebuiltOutline: null,
  });
}

export async function generateLessonOutlineForLesson(
  lessonId: string
): Promise<LessonOutline> {
  const ctx = await getLessonGenerationContext(lessonId);
  if (!ctx) {
    throw new Error("Lesson not found");
  }
  return resolveLessonOutline(ctx);
}
