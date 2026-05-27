import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syllabi, modules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireSyllabusOwnership } from "@/lib/auth";
import { enrichModulesWithProgress } from "@/lib/progress";

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

    const moduleList = await db
      .select()
      .from(modules)
      .where(eq(modules.syllabusId, syllabusId))
      .orderBy(modules.order);

    const { modules: modulesWithLessons, ...progress } =
      await enrichModulesWithProgress(moduleList, user.id, syllabus.structure);

    return NextResponse.json({
      ...syllabus,
      modules: modulesWithLessons,
      ...progress,
    });
  } catch (error) {
    console.error("Error fetching syllabus:", error);
    return NextResponse.json(
      { error: "Failed to fetch syllabus" },
      { status: 500 }
    );
  }
}
