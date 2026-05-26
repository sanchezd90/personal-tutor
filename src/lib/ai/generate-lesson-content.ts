import { db } from "@/lib/db";
import { contentBlocks, auditResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { streamContentBlock, type SlimOutlineSlice } from "@/lib/ai/content-generator-stream";
import { summarizeBlockContent } from "@/lib/ai/block-summary";
import { shouldAutoAudit } from "@/lib/ai/audit-policy";
import { auditContentBlocksBatch } from "@/lib/ai/audit-chain";
import {
  formatCurriculumContext,
  getLessonGenerationContext,
} from "@/lib/ai/lesson-context";
import { resolveLessonOutline } from "@/lib/ai/resolve-lesson-outline";
import type { LessonOutline } from "@/lib/ai/syllabus-types";

function slimOutlineSlice(
  outline: LessonOutline,
  index: number
): SlimOutlineSlice {
  return {
    blockIndex: index,
    blockCount: outline.blockCount,
    currentTitle: outline.titles[index],
    previousTitle: index > 0 ? (outline.titles[index - 1] ?? null) : null,
    nextTitle:
      index < outline.blockCount - 1
        ? (outline.titles[index + 1] ?? null)
        : null,
  };
}

function isBlockComplete(block: {
  content: string;
  status: string;
}): boolean {
  return (
    block.status === "delivered" &&
    block.content.trim().length > 0
  );
}

export type GenerateLessonContentResult = {
  blockCount: number;
  resumed: boolean;
  alreadyComplete?: boolean;
};

export async function generateLessonContent(
  lessonId: string
): Promise<GenerateLessonContentResult> {
  const ctx = await getLessonGenerationContext(lessonId);
  if (!ctx) {
    throw new Error("Lesson not found");
  }

  const existingBlocks = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.lessonId, lessonId))
    .orderBy(contentBlocks.blockIndex);

  const startedWithBlocks = existingBlocks.length > 0;
  const allComplete =
    startedWithBlocks && existingBlocks.every(isBlockComplete);

  if (allComplete) {
    return {
      blockCount: existingBlocks.length,
      resumed: false,
      alreadyComplete: true,
    };
  }

  const outline = await resolveLessonOutline(ctx);
  const curriculumContext = formatCurriculumContext(ctx);

  let blockRows = existingBlocks;

  if (blockRows.length === 0) {
    const blockIds: string[] = [];
    for (let i = 0; i < outline.blockCount; i++) {
      const blockId = randomUUID();
      blockIds.push(blockId);
      await db.insert(contentBlocks).values({
        id: blockId,
        lessonId,
        blockIndex: i,
        title: outline.titles[i] ?? `Block ${i + 1}`,
        content: "",
        summary: null,
        status: "pending",
      });
    }
    blockRows = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.lessonId, lessonId))
      .orderBy(contentBlocks.blockIndex);
  } else if (blockRows.length < outline.blockCount) {
    for (let i = blockRows.length; i < outline.blockCount; i++) {
      await db.insert(contentBlocks).values({
        id: randomUUID(),
        lessonId,
        blockIndex: i,
        title: outline.titles[i] ?? `Block ${i + 1}`,
        content: "",
        summary: null,
        status: "pending",
      });
    }
    blockRows = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.lessonId, lessonId))
      .orderBy(contentBlocks.blockIndex);
  }

  const previousSummaries: string[] = [];
  for (let i = 0; i < outline.blockCount; i++) {
    const row = blockRows[i];
    if (!row) continue;

    if (isBlockComplete(row)) {
      const summary =
        row.summary?.trim() ||
        (await summarizeBlockContent(row.content));
      if (!row.summary) {
        await db
          .update(contentBlocks)
          .set({ summary })
          .where(eq(contentBlocks.id, row.id));
      }
      previousSummaries.push(summary);
      continue;
    }

    let fullContent = "";
    for await (const chunk of streamContentBlock(ctx.lessonTitle, i, {
      blockTitle: outline.titles[i],
      slimOutline: slimOutlineSlice(outline, i),
      previousSummaries,
      curriculumContext,
    })) {
      fullContent += chunk;
    }

    const summary = await summarizeBlockContent(fullContent);
    previousSummaries.push(summary);

    await db
      .update(contentBlocks)
      .set({
        content: fullContent,
        summary,
        status: "delivered",
      })
      .where(eq(contentBlocks.id, row.id));
  }

  const finalBlocks = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.lessonId, lessonId))
    .orderBy(contentBlocks.blockIndex);

  const toAudit = finalBlocks
    .filter((b) => shouldAutoAudit(b.blockIndex, b.content))
    .map((b) => ({ index: b.blockIndex, content: b.content, blockId: b.id }));

  if (toAudit.length > 0) {
    try {
      const auditResultsList = await auditContentBlocksBatch(
        toAudit.map((b) => ({ index: b.index, content: b.content }))
      );
      for (const ar of auditResultsList) {
        const block = toAudit.find((b) => b.index === ar.index);
        if (!block) continue;
        await db.insert(auditResults).values({
          id: randomUUID(),
          contentBlockId: block.blockId,
          passed: ar.passed,
          feedback: ar.feedback ?? null,
        });
      }
    } catch (auditErr) {
      console.error("Batch audit error (blocks still saved):", auditErr);
    }
  }

  return {
    blockCount: outline.blockCount,
    resumed: startedWithBlocks && !allComplete,
  };
}
