import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syllabi, subjects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { user, error: authError } = await requireAuth();
  if (authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userSyllabi = await db
      .select({
        id: syllabi.id,
        subjectId: syllabi.subjectId,
        subjectName: subjects.name,
        createdAt: syllabi.createdAt,
      })
      .from(syllabi)
      .innerJoin(subjects, eq(syllabi.subjectId, subjects.id))
      .where(eq(syllabi.userId, user.id))
      .orderBy(desc(syllabi.createdAt));

    return NextResponse.json(userSyllabi);
  } catch (error) {
    console.error("Error fetching syllabi:", error);
    return NextResponse.json(
      { error: "Failed to fetch syllabi" },
      { status: 500 }
    );
  }
}
