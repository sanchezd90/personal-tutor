import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { syllabi, modules, lessons, contentBlocks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getAuthUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return { user: null, error: "Unauthorized" as const };
  }
  return { user, error: null };
}

export async function requireSyllabusOwnership(syllabusId: string, userId: string) {
  const [syllabus] = await db
    .select()
    .from(syllabi)
    .where(eq(syllabi.id, syllabusId));
  return syllabus && syllabus.userId === userId;
}

export async function requireLessonOwnership(lessonId: string, userId: string) {
  const [row] = await db
    .select({ ownerId: syllabi.userId })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(syllabi, eq(modules.syllabusId, syllabi.id))
    .where(eq(lessons.id, lessonId));
  return row?.ownerId === userId;
}

export async function requireContentBlockOwnership(contentBlockId: string, userId: string) {
  const [row] = await db
    .select({ ownerId: syllabi.userId })
    .from(contentBlocks)
    .innerJoin(lessons, eq(contentBlocks.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(syllabi, eq(modules.syllabusId, syllabi.id))
    .where(eq(contentBlocks.id, contentBlockId));
  return row?.ownerId === userId;
}
