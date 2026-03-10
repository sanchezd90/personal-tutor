import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons, contentBlocks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { streamContentBlock } from "@/lib/ai/content-generator-stream";
import { randomUUID } from "crypto";
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

    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const owns = await requireLessonOwnership(lessonId, user.id);
    if (!owns) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingBlocks = await db
      .select({ content: contentBlocks.content })
      .from(contentBlocks)
      .where(eq(contentBlocks.lessonId, lessonId))
      .orderBy(contentBlocks.blockIndex);

    const previousBlocks = existingBlocks.map((b) => b.content);
    const blockIndex = existingBlocks.length;

    const blockId = randomUUID();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        try {
          for await (const chunk of streamContentBlock(
            lesson.title,
            previousBlocks,
            blockIndex
          )) {
            fullContent += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          await db.insert(contentBlocks).values({
            id: blockId,
            lessonId,
            blockIndex,
            content: fullContent,
            status: "delivered",
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
      },
    });
  } catch (error) {
    console.error("Error streaming content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
