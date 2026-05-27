import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  lessons,
  contentBlocks,
  modules,
  syllabi,
  auditResults,
  blockReads,
} from "@/lib/db/schema";
import { eq, inArray, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

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

    const [lessonRow] = await db
      .select({
        lesson: lessons,
        moduleTitle: modules.title,
        syllabusId: modules.syllabusId,
        ownerId: syllabi.userId,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(syllabi, eq(modules.syllabusId, syllabi.id))
      .where(eq(lessons.id, lessonId));

    if (!lessonRow) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (lessonRow.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { lesson, moduleTitle, syllabusId } = lessonRow;

    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.lessonId, lessonId))
      .orderBy(contentBlocks.blockIndex);

    const blockIds = blocks.map((b) => b.id);

    const [audits, readBlockIds] =
      blockIds.length > 0
        ? await Promise.all([
            db
              .select({
                contentBlockId: auditResults.contentBlockId,
                passed: auditResults.passed,
                auditedAt: auditResults.auditedAt,
              })
              .from(auditResults)
              .where(inArray(auditResults.contentBlockId, blockIds))
              .orderBy(desc(auditResults.auditedAt)),
            db
              .select({ contentBlockId: blockReads.contentBlockId })
              .from(blockReads)
              .where(
                and(
                  inArray(blockReads.contentBlockId, blockIds),
                  eq(blockReads.userId, user.id)
                )
              ),
          ])
        : [[], []];

    const latestAuditByBlock = new Map<string, boolean>();
    for (const a of audits) {
      if (!latestAuditByBlock.has(a.contentBlockId)) {
        latestAuditByBlock.set(a.contentBlockId, a.passed);
      }
    }

    const readSet = new Set(readBlockIds.map((r) => r.contentBlockId));

    const blocksWithAudit = blocks.map((block) => ({
      ...block,
      auditPassed: latestAuditByBlock.get(block.id) ?? null,
      read: readSet.has(block.id),
    }));

    return NextResponse.json({
      ...lesson,
      moduleTitle,
      syllabusId,
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
