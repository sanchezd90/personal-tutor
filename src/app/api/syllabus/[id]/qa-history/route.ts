import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  syllabi,
  modules,
  lessons,
  contentBlocks,
  questions,
  answers,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: syllabusId } = await params;

    const lessonList = await db
      .select()
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(modules.syllabusId, syllabusId));

    const lessonIds = lessonList.map((l) => l.lessons.id);
    if (lessonIds.length === 0) {
      return NextResponse.json([]);
    }

    const blockList = await db
      .select()
      .from(contentBlocks)
      .where(inArray(contentBlocks.lessonId, lessonIds));

    const blockIds = blockList.map((b) => b.id);
    if (blockIds.length === 0) {
      return NextResponse.json([]);
    }

    const questionList = await db
      .select()
      .from(questions)
      .where(inArray(questions.contentBlockId, blockIds));

    const answerList = await db
      .select()
      .from(answers)
      .where(
        inArray(
          answers.questionId,
          questionList.map((q) => q.id)
        )
      );

    const blockMap = new Map(blockList.map((b) => [b.id, b]));
    const lessonMap = new Map(lessonList.map((l) => [l.lessons.id, l.lessons]));
    const answerMap = new Map(answerList.map((a) => [a.questionId, a]));

    const result = questionList
      .map((q) => {
        const block = blockMap.get(q.contentBlockId);
        const lesson = block ? lessonMap.get(block.lessonId) : null;
        const answer = answerMap.get(q.id);
        if (!answer) return null;
        return {
          questionId: q.id,
          question: q.question,
          answer: answer.answer,
          lessonTitle: lesson?.title ?? "Unknown",
          blockIndex: block?.blockIndex ?? 0,
        };
      })
      .filter(Boolean);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Q&A history:", error);
    return NextResponse.json(
      { error: "Failed to fetch Q&A history" },
      { status: 500 }
    );
  }
}
