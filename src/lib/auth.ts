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
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) return false;
  const [mod] = await db.select().from(modules).where(eq(modules.id, lesson.moduleId));
  if (!mod) return false;
  const [syllabus] = await db.select().from(syllabi).where(eq(syllabi.id, mod.syllabusId));
  return syllabus && syllabus.userId === userId;
}

export async function requireContentBlockOwnership(contentBlockId: string, userId: string) {
  const [block] = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.id, contentBlockId));
  if (!block) return false;
  return requireLessonOwnership(block.lessonId, userId);
}
