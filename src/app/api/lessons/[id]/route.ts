import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  lessons,
  contentBlocks,
  modules,
  auditResults,
  blockReads,
} from "@/lib/db/schema";
import { eq, inArray, desc, and } from "drizzle-orm";
import { requireAuth, requireLessonOwnership } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAuth();
  if (authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: lessonId } = await params;

    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const owns = await requireLessonOwnership(lessonId, user.id);
    if (!owns) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, lesson.moduleId));

    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.lessonId, lessonId))
      .orderBy(contentBlocks.blockIndex);

    const blockIds = blocks.map((b) => b.id);
    const audits =
      blockIds.length > 0
        ? await db
            .select({
              contentBlockId: auditResults.contentBlockId,
              passed: auditResults.passed,
              auditedAt: auditResults.auditedAt,
            })
            .from(auditResults)
            .where(inArray(auditResults.contentBlockId, blockIds))
            .orderBy(desc(auditResults.auditedAt))
        : [];

    const latestAuditByBlock = new Map<string, boolean>();
    for (const a of audits) {
      if (!latestAuditByBlock.has(a.contentBlockId)) {
        latestAuditByBlock.set(a.contentBlockId, a.passed);
      }
    }

    const readBlockIds =
      blockIds.length > 0
        ? await db
            .select({ contentBlockId: blockReads.contentBlockId })
            .from(blockReads)
            .where(
              and(
                inArray(blockReads.contentBlockId, blockIds),
                eq(blockReads.userId, user.id)
              )
            )
        : [];
    const readSet = new Set(readBlockIds.map((r) => r.contentBlockId));

    const blocksWithAudit = blocks.map((block) => ({
      ...block,
      auditPassed: latestAuditByBlock.get(block.id) ?? null,
      read: readSet.has(block.id),
    }));

    return NextResponse.json({
      ...lesson,
      moduleTitle: mod?.title,
      syllabusId: mod?.syllabusId,
      blocks: blocksWithAudit,
    });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson" },
      { status: 500 }
    );
  }
}
