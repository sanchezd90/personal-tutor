import {
  generateNextLessonBlock,
  isBlockComplete,
} from "@/lib/ai/generate-lesson-content";
import { requireAuth, requireLessonOwnership } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentBlocks, lessons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    const existingBlocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.lessonId, lessonId))
      .orderBy(contentBlocks.blockIndex);

    const nextBlock = existingBlocks.find((row) => !isBlockComplete(row));
    if (!nextBlock) {
      return new Response(
        JSON.stringify({ error: "Lesson has no more blocks to generate" }),
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await generateNextLessonBlock(lessonId, {
            onChunk: (chunk) => {
              controller.enqueue(encoder.encode(chunk));
            },
          });
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
        "X-Block-Id": nextBlock.id,
        "X-Block-Index": String(nextBlock.blockIndex),
      },
    });
  } catch (error) {
    console.error("Error streaming content:", error);
    return new Response(JSON.stringify({ error: "Failed to generate content" }), {
      status: 500,
    });
  }
}
