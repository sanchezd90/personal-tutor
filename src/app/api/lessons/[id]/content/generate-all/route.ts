import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons, contentBlocks, auditResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { streamContentBlock } from "@/lib/ai/content-generator-stream";
import { auditContentBlock } from "@/lib/ai/audit-chain";
import { generateLessonOutline } from "@/lib/ai/lesson-outline-generator";
import { randomUUID } from "node:crypto";
import { requireAuth, requireLessonOwnership } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAuth();
  if (authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: lessonId } = await params;

    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId));

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const owns = await requireLessonOwnership(lessonId, user.id);
    if (!owns) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingBlocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.lessonId, lessonId))
      .orderBy(contentBlocks.blockIndex);

    if (existingBlocks.length > 0) {
      return NextResponse.json({
        ok: true,
        message: "Lesson already has blocks",
        blockCount: existingBlocks.length,
      });
    }

    const outline = await generateLessonOutline(lesson.title);

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
        status: "pending",
      });
    }

    const previousBlocks: string[] = [];
    for (let i = 0; i < outline.blockCount; i++) {
      let fullContent = "";
      for await (const chunk of streamContentBlock(
        lesson.title,
        previousBlocks,
        i
      )) {
        fullContent += chunk;
      }

      previousBlocks.push(fullContent);

      const blockId = blockIds[i];
      if (!blockId) continue;

      await db
        .update(contentBlocks)
        .set({
          content: fullContent,
          status: "delivered",
        })
        .where(eq(contentBlocks.id, blockId));

      try {
        const { passed, feedback } = await auditContentBlock(fullContent);
        await db.insert(auditResults).values({
          id: randomUUID(),
          contentBlockId: blockId,
          passed,
          feedback: feedback ?? null,
        });
      } catch (auditErr) {
        console.error("Audit error (block still created):", auditErr);
      }
    }

    return NextResponse.json({
      ok: true,
      blockCount: outline.blockCount,
    });
  } catch (error) {
    console.error("Error generating lesson content:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson content" },
      { status: 500 }
    );
  }
}
