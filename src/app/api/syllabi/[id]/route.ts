import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  syllabi,
  modules,
  lessons,
  contentBlocks,
  blockReads,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireSyllabusOwnership } from "@/lib/auth";

export async function DELETE(
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

    await db.delete(syllabi).where(eq(syllabi.id, syllabusId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting syllabus:", error);
    return NextResponse.json(
      { error: "Failed to delete syllabus" },
      { status: 500 }
    );
  }
}

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

        const lessonsWithProgress = await Promise.all(
          lessonList.map(async (lesson) => {
            const blocks = await db
              .select({ id: contentBlocks.id })
              .from(contentBlocks)
              .where(eq(contentBlocks.lessonId, lesson.id));
            const blockIds = blocks.map((b) => b.id);
            const totalBlocks = blockIds.length;

            let readCount = 0;
            if (blockIds.length > 0) {
              const reads = await db
                .select()
                .from(blockReads)
                .where(
                  and(
                    inArray(blockReads.contentBlockId, blockIds),
                    eq(blockReads.userId, user.id)
                  )
                );
              readCount = reads.length;
            }

            const progressPct =
              totalBlocks > 0 ? Math.round((readCount / totalBlocks) * 100) : 0;
            const isDone = totalBlocks > 0 && progressPct === 100;

            return {
              ...lesson,
              progressPct,
              isDone,
              readCount,
              totalBlocks,
            };
          })
        );

        return { ...mod, lessons: lessonsWithProgress };
      })
    );

    const allLessons = lessonsByModule.flatMap((m) => m.lessons);
    const doneLessons = allLessons.filter((l) => l.isDone).length;
    const totalLessons = allLessons.length;
    const syllabusProgressPct =
      totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;
    const syllabusIsDone = totalLessons > 0 && syllabusProgressPct === 100;

    return NextResponse.json({
      ...syllabus,
      modules: lessonsByModule,
      progressPct: syllabusProgressPct,
      isDone: syllabusIsDone,
      doneLessons,
      totalLessons,
    });
  } catch (error) {
    console.error("Error fetching syllabus:", error);
    return NextResponse.json(
      { error: "Failed to fetch syllabus" },
      { status: 500 }
    );
  }
}
