import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentBlocks, questions, answers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAnswer } from "@/lib/ai/qa-generator";
import { randomUUID } from "crypto";
import { requireAuth, requireContentBlockOwnership } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAuth();
  if (authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: contentBlockId } = await params;
    const body = await request.json();
    const { question: questionText } = body;

    if (!questionText || typeof questionText !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const [block] = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.id, contentBlockId));

    if (!block) {
      return NextResponse.json(
        { error: "Content block not found" },
        { status: 404 }
      );
    }

    const owns = await requireContentBlockOwnership(contentBlockId, user.id);
    if (!owns) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const answerText = await generateAnswer(block.content, questionText);

    const questionId = randomUUID();
    const answerId = randomUUID();

    await db.insert(questions).values({
      id: questionId,
      contentBlockId,
      question: questionText.trim(),
    });

    await db.insert(answers).values({
      id: answerId,
      questionId,
      answer: answerText,
    });

    return NextResponse.json({
      questionId,
      answerId,
      question: questionText.trim(),
      answer: answerText,
    });
  } catch (error) {
    console.error("Error answering question:", error);
    return NextResponse.json(
      { error: "Failed to answer question" },
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
    const { id: contentBlockId } = await params;

    const owns = await requireContentBlockOwnership(contentBlockId, user.id);
    if (!owns) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const qaList = await db
      .select({
        questionId: questions.id,
        question: questions.question,
        answer: answers.answer,
        askedAt: questions.askedAt,
      })
      .from(questions)
      .innerJoin(answers, eq(answers.questionId, questions.id))
      .where(eq(questions.contentBlockId, contentBlockId))
      .orderBy(questions.askedAt);

    return NextResponse.json(qaList);
  } catch (error) {
    console.error("Error fetching Q&A:", error);
    return NextResponse.json(
      { error: "Failed to fetch Q&A" },
      { status: 500 }
    );
  }
}
