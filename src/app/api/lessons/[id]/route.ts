import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons, contentBlocks, modules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;

    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
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

    return NextResponse.json({
      ...lesson,
      moduleTitle: mod?.title,
      blocks,
    });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson" },
      { status: 500 }
    );
  }
}
