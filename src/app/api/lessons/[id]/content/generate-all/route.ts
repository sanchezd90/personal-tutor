import { NextResponse } from "next/server";
import { generateLessonContent } from "@/lib/ai/generate-lesson-content";
import { requireAuth, requireLessonOwnership } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    const result = await generateLessonContent(lessonId);

    if (result.alreadyComplete) {
      return NextResponse.json({
        ok: true,
        message: "Lesson already has blocks",
        blockCount: result.blockCount,
      });
    }

    return NextResponse.json({
      ok: true,
      blockCount: result.blockCount,
      resumed: result.resumed,
    });
  } catch (error) {
    console.error("Error generating lesson content:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson content" },
      { status: 500 }
    );
  }
}
