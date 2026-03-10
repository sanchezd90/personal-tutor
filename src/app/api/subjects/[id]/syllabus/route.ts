import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects, syllabi, modules, lessons } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateSyllabus } from "@/lib/ai/syllabus-generator";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAuth();
  if (authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: subjectId } = await params;

    const [subject] = await db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.userId, user.id)));

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const structure = await generateSyllabus(subject.name);

    const syllabusId = randomUUID();
    await db.insert(syllabi).values({
      id: syllabusId,
      userId: user.id,
      subjectId,
      structure: structure as unknown as { modules: Array<{ title: string; lessons: Array<{ title: string }> }> },
    });

    for (let i = 0; i < structure.modules.length; i++) {
      const mod = structure.modules[i];
      const moduleId = randomUUID();
      await db.insert(modules).values({
        id: moduleId,
        syllabusId,
        order: i,
        title: mod.title,
      });

      for (let j = 0; j < mod.lessons.length; j++) {
        const les = mod.lessons[j];
        await db.insert(lessons).values({
          id: randomUUID(),
          moduleId,
          order: j,
          title: les.title,
        });
      }
    }

    const [syllabus] = await db
      .select()
      .from(syllabi)
      .where(eq(syllabi.id, syllabusId));

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
    console.error("Error generating syllabus:", error);
    return NextResponse.json(
      { error: "Failed to generate syllabus" },
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
    const { id: subjectId } = await params;

    const [subject] = await db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.userId, user.id)));

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const syllabusList = await db
      .select()
      .from(syllabi)
      .where(and(eq(syllabi.subjectId, subjectId), eq(syllabi.userId, user.id)))
      .orderBy(syllabi.createdAt);

    if (syllabusList.length === 0) {
      return NextResponse.json(null);
    }

    const syllabus = syllabusList[syllabusList.length - 1];
    const modulesWithLessons = await db
      .select()
      .from(modules)
      .where(eq(modules.syllabusId, syllabus.id))
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
