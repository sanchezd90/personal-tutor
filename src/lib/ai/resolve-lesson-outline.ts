import { z } from "zod";
import { invokeJson } from "@/lib/ai/invoke-json";
import { MODEL_STRUCTURED } from "@/lib/ai/models";
import {
  formatCurriculumContext,
  type LessonGenerationContext,
} from "@/lib/ai/lesson-context";
import type { LessonOutline } from "@/lib/ai/syllabus-types";

const lessonOutlineSchema = z.object({
  blockCount: z.number().min(3).max(12),
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
    `You are an expert educational curriculum designer. Create a lesson block outline.
Return JSON: { "blockCount": number (3-12), "titles": string[] } with titles.length === blockCount.
Each title: 2-8 words, one concept per block.`,
    `Lesson: ${ctx.lessonTitle}\n\n${curriculum}`,
    { model: MODEL_STRUCTURED, temperature: 0.6 }
  );

  return fixOutlineTitles(result);
}
