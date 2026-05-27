import { describe, expect, it } from "vitest";
import { computeLessonProgress, isDeliveredBlock } from "@/lib/progress";

function block(
  overrides: Partial<{
    id: string;
    blockIndex: number;
    title: string | null;
    status: string;
    content: string;
  }> = {}
) {
  return {
    id: "block-1",
    lessonId: "lesson-1",
    blockIndex: 0,
    title: "Intro",
    status: "delivered",
    content: "Some content",
    ...overrides,
  };
}

describe("isDeliveredBlock", () => {
  it("returns true when status is delivered and content is non-empty", () => {
    expect(isDeliveredBlock({ status: "delivered", content: "Hello" })).toBe(
      true
    );
  });

  it("returns false when status is not delivered", () => {
    expect(isDeliveredBlock({ status: "pending", content: "Hello" })).toBe(
      false
    );
  });

  it("returns false when content is empty or whitespace", () => {
    expect(isDeliveredBlock({ status: "delivered", content: "" })).toBe(false);
    expect(isDeliveredBlock({ status: "delivered", content: "   " })).toBe(
      false
    );
  });
});

describe("computeLessonProgress", () => {
  it("returns zero progress when there are no blocks and no outline", () => {
    const result = computeLessonProgress([], new Set());

    expect(result).toEqual({
      progressPct: 0,
      isDone: false,
      readCount: 0,
      totalBlocks: 0,
      blocks: [],
    });
  });

  it("uses outline titles when no block rows exist yet", () => {
    const result = computeLessonProgress([], new Set(), [
      "Warm up",
      "Core concept",
    ]);

    expect(result.totalBlocks).toBe(0);
    expect(result.blocks).toEqual([
      {
        id: null,
        blockIndex: 0,
        title: "Warm up",
        delivered: false,
        read: false,
      },
      {
        id: null,
        blockIndex: 1,
        title: "Core concept",
        delivered: false,
        read: false,
      },
    ]);
  });

  it("computes partial read progress from delivered blocks only", () => {
    const blocks = [
      block({ id: "a", blockIndex: 0, title: "First" }),
      block({ id: "b", blockIndex: 1, title: "Second" }),
      block({
        id: "c",
        blockIndex: 2,
        title: "Pending",
        status: "pending",
        content: "",
      }),
    ];
    const readBlockIds = new Set(["a"]);

    const result = computeLessonProgress(blocks, readBlockIds);

    expect(result.readCount).toBe(1);
    expect(result.totalBlocks).toBe(2);
    expect(result.progressPct).toBe(50);
    expect(result.isDone).toBe(false);
  });

  it("marks lesson done only when all blocks are delivered and fully read", () => {
    const blocks = [
      block({ id: "a", blockIndex: 0 }),
      block({ id: "b", blockIndex: 1 }),
    ];
    const readBlockIds = new Set(["a", "b"]);

    const result = computeLessonProgress(blocks, readBlockIds);

    expect(result.progressPct).toBe(100);
    expect(result.isDone).toBe(true);
  });

  it("does not mark done when all reads complete but a block is undelivered", () => {
    const blocks = [
      block({ id: "a", blockIndex: 0 }),
      block({
        id: "b",
        blockIndex: 1,
        status: "pending",
        content: "",
      }),
    ];
    const readBlockIds = new Set(["a"]);

    const result = computeLessonProgress(blocks, readBlockIds);

    expect(result.progressPct).toBe(100);
    expect(result.isDone).toBe(false);
  });

  it("sorts blocks by blockIndex and defaults missing titles", () => {
    const blocks = [
      block({ id: "b", blockIndex: 1, title: null }),
      block({ id: "a", blockIndex: 0, title: "First" }),
    ];

    const result = computeLessonProgress(blocks, new Set());

    expect(result.blocks.map((b) => b.blockIndex)).toEqual([0, 1]);
    expect(result.blocks[1].title).toBe("Block 2");
  });

  it("does not count undelivered blocks as read even if id is in read set", () => {
    const blocks = [
      block({
        id: "a",
        blockIndex: 0,
        status: "pending",
        content: "",
      }),
    ];

    const result = computeLessonProgress(blocks, new Set(["a"]));

    expect(result.blocks[0].read).toBe(false);
    expect(result.readCount).toBe(0);
  });
});
