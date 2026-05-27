import { z } from "zod";
import {
  LESSON_BLOCKS_MAX,
  LESSON_BLOCKS_MIN,
} from "@/lib/ai/course-structure";
import { invokeJson } from "@/lib/ai/invoke-json";
import { MODEL_STRUCTURED } from "@/lib/ai/models";
import {
  formatCurriculumContext,
  type LessonGenerationContext,
} from "@/lib/ai/lesson-context";
import type { LessonOutline } from "@/lib/ai/syllabus-types";

const lessonOutlineSchema = z.object({
  blockCount: z.number().min(LESSON_BLOCKS_MIN).max(LESSON_BLOCKS_MAX),
  titles: z.array(z.string()),
});

function fixOutlineTitles(outline: LessonOutline): LessonOutline {
  const titles = outline.titles.slice(0, outline.blockCount);
  while (titles.length < outline.blockCount) {
    titles.push(`Block ${titles.length + 1}`);
  }
  return { blockCount: outline.blockCount, titles };
}

export async function resolveLessonOutline(
  ctx: LessonGenerationContext
): Promise<LessonOutline> {
  if (ctx.prebuiltOutline) {
    return fixOutlineTitles(ctx.prebuiltOutline);
  }

  const curriculum = formatCurriculumContext(ctx);

  const result = await invokeJson(
    lessonOutlineSchema,
    `You are an expert educational curriculum designer. Create a daily lesson block outline for a certificate-level course.
Return JSON: { "blockCount": number (${LESSON_BLOCKS_MIN}-${LESSON_BLOCKS_MAX}), "titles": string[] } with titles.length === blockCount.
Each title: 3-10 words, one major concept or activity per block. Order blocks for a full study session (concept → examples → application → pitfalls → wrap-up where appropriate).`,
    `Lesson: ${ctx.lessonTitle}\n\n${curriculum}`,
    { model: MODEL_STRUCTURED, temperature: 0.6 }
  );

  return fixOutlineTitles(result);
}
