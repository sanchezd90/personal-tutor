import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { generateSyllabus } from "@/lib/ai/syllabus-generator";
import { syllabi, modules, lessons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    await db.insert(subjects).values({
      id,
      name: name.trim(),
    });

    return NextResponse.json({ id, name: name.trim() });
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allSubjects = await db.select().from(subjects).orderBy(subjects.createdAt);
    return NextResponse.json(allSubjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}
