import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syllabi, modules, lessons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireSyllabusOwnership } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAuth();
  if (authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: syllabusId } = await params;

    const owns = await requireSyllabusOwnership(syllabusId, user.id);
    if (!owns) {
      return NextResponse.json({ error: "Syllabus not found" }, { status: 404 });
    }

    const [syllabus] = await db
      .select()
      .from(syllabi)
      .where(eq(syllabi.id, syllabusId));

    if (!syllabus) {
      return NextResponse.json({ error: "Syllabus not found" }, { status: 404 });
    }

    const modulesWithLessons = await db
      .select()
      .from(modules)
      .where(eq(modules.syllabusId, syllabusId))
      .orderBy(modules.order);

    const lessonsByModule = await Promise.all(
      modulesWithLessons.map(async (mod) => {
        const lessonList = await db
          .select()
          .from(lessons)
          .where(eq(lessons.moduleId, mod.id))
          .orderBy(lessons.order);
        return { ...mod, lessons: lessonList };
      })
    );

    return NextResponse.json({
      ...syllabus,
      modules: lessonsByModule,
    });
  } catch (error) {
    console.error("Error fetching syllabus:", error);
    return NextResponse.json(
      { error: "Failed to fetch syllabus" },
      { status: 500 }
    );
  }
}
