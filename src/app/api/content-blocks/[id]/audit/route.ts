import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentBlocks, auditResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auditContentBlock } from "@/lib/ai/audit-chain";
import { randomUUID } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentBlockId } = await params;

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

    const { passed, feedback } = await auditContentBlock(block.content);

    const auditId = randomUUID();
    await db.insert(auditResults).values({
      id: auditId,
      contentBlockId,
      passed,
      feedback: feedback ?? null,
    });

    return NextResponse.json({ passed, feedback });
  } catch (error) {
    console.error("Error auditing content:", error);
    return NextResponse.json(
      { error: "Failed to audit content" },
      { status: 500 }
    );
  }
}
