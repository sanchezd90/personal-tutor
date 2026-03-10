import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blockReads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireContentBlockOwnership } from "@/lib/auth";
import { randomUUID } from "node:crypto";

export async function PATCH(
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

    const body = await request.json().catch(() => ({}));
    const read = body.read as boolean | undefined;

    if (typeof read !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid 'read' boolean" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(blockReads)
      .where(
        and(
          eq(blockReads.contentBlockId, contentBlockId),
          eq(blockReads.userId, user.id)
        )
      );

    if (read && existing.length === 0) {
      await db.insert(blockReads).values({
        id: randomUUID(),
        contentBlockId,
        userId: user.id,
      });
    } else if (!read && existing.length > 0) {
      await db
        .delete(blockReads)
        .where(
          and(
            eq(blockReads.contentBlockId, contentBlockId),
            eq(blockReads.userId, user.id)
          )
        );
    }

    return NextResponse.json({ read });
  } catch (error) {
    console.error("Error toggling block read:", error);
    return NextResponse.json(
      { error: "Failed to update read status" },
      { status: 500 }
    );
  }
}
