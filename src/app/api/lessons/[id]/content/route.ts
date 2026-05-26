import { db } from "@/lib/db";
import { lessons, contentBlocks, auditResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { streamContentBlock } from "@/lib/ai/content-generator-stream";
import { shouldAutoAudit } from "@/lib/ai/audit-policy";
import { auditContentBlock } from "@/lib/ai/audit-chain";
import { summarizeBlockContent } from "@/lib/ai/block-summary";
import {
  formatCurriculumContext,
  getLessonGenerationContext,
} from "@/lib/ai/lesson-context";
import { resolveLessonOutline } from "@/lib/ai/resolve-lesson-outline";
import { randomUUID } from "crypto";
import { requireAuth, requireLessonOwnership } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAuth();
  if (authError) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const { id: lessonId } = await params;

    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId));

    if (!lesson) {
      return new Response(JSON.stringify({ error: "Lesson not found" }), {
        status: 404,
      });
    }

    const owns = await requireLessonOwnership(lessonId, user.id);
    if (!owns) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    const ctx = await getLessonGenerationContext(lessonId);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Lesson not found" }), {
        status: 404,
      });
    }

    const existingBlocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.lessonId, lessonId))
      .orderBy(contentBlocks.blockIndex);

    const blockIndex = existingBlocks.length;
    const outline = await resolveLessonOutline(ctx);

    if (blockIndex >= outline.blockCount) {
      return new Response(
        JSON.stringify({ error: "Lesson outline has no more blocks" }),
        { status: 400 }
      );
    }

    const previousSummaries: string[] = [];
    for (const b of existingBlocks) {
      if (b.summary?.trim()) {
        previousSummaries.push(b.summary);
      } else if (b.content.trim()) {
        previousSummaries.push(await summarizeBlockContent(b.content));
      }
    }

    const curriculumContext = formatCurriculumContext(ctx);
    const blockId = randomUUID();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        try {
          for await (const chunk of streamContentBlock(ctx.lessonTitle, blockIndex, {
            blockTitle: outline.titles[blockIndex],
            slimOutline: {
              blockIndex,
              blockCount: outline.blockCount,
              currentTitle: outline.titles[blockIndex],
              previousTitle:
                blockIndex > 0 ? (outline.titles[blockIndex - 1] ?? null) : null,
              nextTitle:
                blockIndex < outline.blockCount - 1
                  ? (outline.titles[blockIndex + 1] ?? null)
                  : null,
            },
            previousSummaries,
            curriculumContext,
          })) {
            fullContent += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          const summary = await summarizeBlockContent(fullContent);

          await db.insert(contentBlocks).values({
            id: blockId,
            lessonId,
            blockIndex,
            title: outline.titles[blockIndex] ?? `Block ${blockIndex + 1}`,
            content: fullContent,
            summary,
            status: "delivered",
          });

          if (shouldAutoAudit(blockIndex, fullContent)) {
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
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode("\n\n[Error generating content. Please try again.]")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error streaming content:", error);
    return new Response(JSON.stringify({ error: "Failed to generate content" }), {
      status: 500,
    });
  }
}
