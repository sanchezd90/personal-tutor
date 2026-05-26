import { db } from "@/lib/db";
import { contentBlocks, auditResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { streamContentBlock, type SlimOutlineSlice } from "@/lib/ai/content-generator-stream";
import { summarizeBlockContent } from "@/lib/ai/block-summary";
import { shouldAutoAudit } from "@/lib/ai/audit-policy";
import { auditContentBlock } from "@/lib/ai/audit-chain";
import {
  formatCurriculumContext,
  getLessonGenerationContext,
} from "@/lib/ai/lesson-context";
import { resolveLessonOutline } from "@/lib/ai/resolve-lesson-outline";
import type { LessonOutline } from "@/lib/ai/syllabus-types";

type ContentBlockRow = typeof contentBlocks.$inferSelect;

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

export function isBlockComplete(block: {
  content: string;
  status: string;
}): boolean {
  return block.status === "delivered" && block.content.trim().length > 0;
}

async function loadLessonBlocks(lessonId: string): Promise<ContentBlockRow[]> {
  return db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.lessonId, lessonId))
    .orderBy(contentBlocks.blockIndex);
}

async function ensureBlockRows(
  lessonId: string,
  outline: LessonOutline,
  existingBlocks: ContentBlockRow[]
): Promise<ContentBlockRow[]> {
  if (existingBlocks.length >= outline.blockCount) {
    return existingBlocks;
  }

  for (let i = existingBlocks.length; i < outline.blockCount; i++) {
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

  return loadLessonBlocks(lessonId);
}

async function buildPreviousSummaries(
  blockRows: ContentBlockRow[],
  upToIndex: number
): Promise<string[]> {
  const previousSummaries: string[] = [];

  for (let i = 0; i < upToIndex; i++) {
    const row = blockRows[i];
    if (!row || !isBlockComplete(row)) continue;

    const summary =
      row.summary?.trim() || (await summarizeBlockContent(row.content));
    if (!row.summary) {
      await db
        .update(contentBlocks)
        .set({ summary })
        .where(eq(contentBlocks.id, row.id));
    }
    previousSummaries.push(summary);
  }

  return previousSummaries;
}

async function auditBlockIfNeeded(
  blockId: string,
  blockIndex: number,
  content: string
): Promise<void> {
  if (!shouldAutoAudit(blockIndex, content)) return;

  try {
    const { passed, feedback } = await auditContentBlock(content);
    await db.insert(auditResults).values({
      id: randomUUID(),
      contentBlockId: blockId,
      passed,
      feedback: feedback ?? null,
    });
  } catch (auditErr) {
    console.error("Audit error (block still saved):", auditErr);
  }
}

export type GenerateBlockOptions = {
  onChunk?: (chunk: string) => void;
};

export async function generateBlockAtIndex(
  lessonId: string,
  blockIndex: number,
  options: GenerateBlockOptions = {}
): Promise<{ blockId: string; content: string }> {
  const ctx = await getLessonGenerationContext(lessonId);
  if (!ctx) {
    throw new Error("Lesson not found");
  }

  const outline = await resolveLessonOutline(ctx);
  if (blockIndex < 0 || blockIndex >= outline.blockCount) {
    throw new Error("Block index out of range");
  }

  let blockRows = await loadLessonBlocks(lessonId);
  blockRows = await ensureBlockRows(lessonId, outline, blockRows);

  const row = blockRows[blockIndex];
  if (!row) {
    throw new Error("Block row not found");
  }

  if (isBlockComplete(row)) {
    return { blockId: row.id, content: row.content };
  }

  const previousSummaries = await buildPreviousSummaries(blockRows, blockIndex);
  const curriculumContext = formatCurriculumContext(ctx);

  let fullContent = "";
  for await (const chunk of streamContentBlock(ctx.lessonTitle, blockIndex, {
    blockTitle: outline.titles[blockIndex],
    slimOutline: slimOutlineSlice(outline, blockIndex),
    previousSummaries,
    curriculumContext,
  })) {
    fullContent += chunk;
    options.onChunk?.(chunk);
  }

  const summary = await summarizeBlockContent(fullContent);

  await db
    .update(contentBlocks)
    .set({
      content: fullContent,
      summary,
      status: "delivered",
    })
    .where(eq(contentBlocks.id, row.id));

  await auditBlockIfNeeded(row.id, blockIndex, fullContent);

  return { blockId: row.id, content: fullContent };
}

export type GenerateLessonContentResult = {
  blockCount: number;
  deliveredCount: number;
  hasMore: boolean;
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

  const existingBlocks = await loadLessonBlocks(lessonId);
  const startedWithBlocks = existingBlocks.length > 0;
  const deliveredBlocks = existingBlocks.filter(isBlockComplete);

  if (
    startedWithBlocks &&
    deliveredBlocks.length === existingBlocks.length &&
    existingBlocks.length > 0
  ) {
    return {
      blockCount: existingBlocks.length,
      deliveredCount: deliveredBlocks.length,
      hasMore: false,
      resumed: false,
      alreadyComplete: true,
    };
  }

  const outline = await resolveLessonOutline(ctx);
  await ensureBlockRows(lessonId, outline, existingBlocks);

  const firstBlock = (await loadLessonBlocks(lessonId))[0];
  if (!firstBlock || isBlockComplete(firstBlock)) {
    const blockRows = await loadLessonBlocks(lessonId);
    const deliveredCount = blockRows.filter(isBlockComplete).length;
    return {
      blockCount: outline.blockCount,
      deliveredCount,
      hasMore: deliveredCount < outline.blockCount,
      resumed: startedWithBlocks,
    };
  }

  await generateBlockAtIndex(lessonId, 0);

  return {
    blockCount: outline.blockCount,
    deliveredCount: 1,
    hasMore: outline.blockCount > 1,
    resumed: startedWithBlocks,
  };
}

export type GenerateNextBlockResult = {
  blockCount: number;
  deliveredCount: number;
  blockIndex: number;
  blockId: string;
  complete: boolean;
};

export async function generateNextLessonBlock(
  lessonId: string,
  options: GenerateBlockOptions = {}
): Promise<GenerateNextBlockResult> {
  const ctx = await getLessonGenerationContext(lessonId);
  if (!ctx) {
    throw new Error("Lesson not found");
  }

  const outline = await resolveLessonOutline(ctx);
  let blockRows = await loadLessonBlocks(lessonId);
  blockRows = await ensureBlockRows(lessonId, outline, blockRows);

  const nextBlock = blockRows.find((row) => !isBlockComplete(row));
  if (!nextBlock) {
    return {
      blockCount: outline.blockCount,
      deliveredCount: blockRows.length,
      blockIndex: -1,
      blockId: "",
      complete: true,
    };
  }

  const { blockId } = await generateBlockAtIndex(
    lessonId,
    nextBlock.blockIndex,
    options
  );

  const updatedBlocks = await loadLessonBlocks(lessonId);
  const deliveredCount = updatedBlocks.filter(isBlockComplete).length;

  return {
    blockCount: outline.blockCount,
    deliveredCount,
    blockIndex: nextBlock.blockIndex,
    blockId,
    complete: deliveredCount >= outline.blockCount,
  };
}
