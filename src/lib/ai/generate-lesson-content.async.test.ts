import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetLessonGenerationContext,
  mockResolveLessonOutline,
  mockStreamContentBlock,
  mockSummarizeBlockContent,
  mockAuditContentBlock,
  mockInsert,
  mockUpdate,
  mockOrderBy,
  mockWhere,
  mockFrom,
  mockSelect,
} = vi.hoisted(() => {
  const mockGetLessonGenerationContext = vi.fn();
  const mockResolveLessonOutline = vi.fn();
  const mockStreamContentBlock = vi.fn();
  const mockSummarizeBlockContent = vi.fn();
  const mockAuditContentBlock = vi.fn();
  const mockInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
  const mockUpdate = vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  }));
  const mockOrderBy = vi.fn();
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  mockOrderBy.mockResolvedValue([]);

  return {
    mockGetLessonGenerationContext,
    mockResolveLessonOutline,
    mockStreamContentBlock,
    mockSummarizeBlockContent,
    mockAuditContentBlock,
    mockInsert,
    mockUpdate,
    mockOrderBy,
    mockWhere,
    mockFrom,
    mockSelect,
  };
});

vi.mock("@/lib/ai/lesson-context", () => ({
  getLessonGenerationContext: mockGetLessonGenerationContext,
  formatCurriculumContext: vi.fn(() => "curriculum context"),
}));

vi.mock("@/lib/ai/resolve-lesson-outline", () => ({
  resolveLessonOutline: mockResolveLessonOutline,
}));

vi.mock("@/lib/ai/content-generator-stream", () => ({
  streamContentBlock: mockStreamContentBlock,
}));

vi.mock("@/lib/ai/block-summary", () => ({
  summarizeBlockContent: mockSummarizeBlockContent,
}));

vi.mock("@/lib/ai/audit-chain", () => ({
  auditContentBlock: mockAuditContentBlock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}));

import {
  generateLessonContent,
  generateNextLessonBlock,
} from "@/lib/ai/generate-lesson-content";

const lessonContext = {
  lessonId: "lesson-1",
  lessonTitle: "Testing Basics",
  curriculumBrief: "Learn to test code.",
  positionLine: "Module 1 of 4, Lesson 1 of 6 (lesson 1 of 24 in course)",
  previousLessonTitle: null,
  nextLessonTitle: "Next",
  lessonObjective: "Write tests.",
  prebuiltOutline: {
    blockCount: 2,
    titles: ["Intro", "Practice"],
  },
};

describe("generateLessonContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLessonGenerationContext.mockResolvedValue(lessonContext);
    mockResolveLessonOutline.mockResolvedValue({
      blockCount: 2,
      titles: ["Intro", "Practice"],
    });
    mockSummarizeBlockContent.mockResolvedValue("summary");
    mockAuditContentBlock.mockResolvedValue({ passed: true, feedback: null });
    mockStreamContentBlock.mockImplementation(async function* () {
      yield "Generated ";
      yield "content";
    });
  });

  it("returns alreadyComplete when all existing blocks are delivered", async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: "block-1",
        lessonId: "lesson-1",
        blockIndex: 0,
        title: "Intro",
        content: "Done",
        summary: "summary",
        status: "delivered",
      },
      {
        id: "block-2",
        lessonId: "lesson-1",
        blockIndex: 1,
        title: "Practice",
        content: "Done",
        summary: "summary",
        status: "delivered",
      },
    ]);

    await expect(generateLessonContent("lesson-1")).resolves.toEqual({
      blockCount: 2,
      deliveredCount: 2,
      hasMore: false,
      resumed: false,
      alreadyComplete: true,
    });
  });

  it("generates the first block when lesson has no content yet", async () => {
    const pendingBlocks = [
      {
        id: "block-1",
        lessonId: "lesson-1",
        blockIndex: 0,
        title: "Intro",
        content: "",
        summary: null,
        status: "pending",
      },
      {
        id: "block-2",
        lessonId: "lesson-1",
        blockIndex: 1,
        title: "Practice",
        content: "",
        summary: null,
        status: "pending",
      },
    ];

    mockOrderBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(pendingBlocks)
      .mockResolvedValueOnce(pendingBlocks)
      .mockResolvedValueOnce(pendingBlocks);

    const result = await generateLessonContent("lesson-1");

    expect(result).toEqual({
      blockCount: 2,
      deliveredCount: 1,
      hasMore: true,
      resumed: false,
    });
    expect(mockStreamContentBlock).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
  });
});

describe("generateNextLessonBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLessonGenerationContext.mockResolvedValue(lessonContext);
    mockResolveLessonOutline.mockResolvedValue({
      blockCount: 2,
      titles: ["Intro", "Practice"],
    });
    mockSummarizeBlockContent.mockResolvedValue("summary");
    mockAuditContentBlock.mockResolvedValue({ passed: true, feedback: null });
    mockStreamContentBlock.mockImplementation(async function* () {
      yield "Next block content";
    });
  });

  it("returns complete when all blocks are delivered", async () => {
    mockOrderBy.mockResolvedValue([
      {
        id: "block-1",
        lessonId: "lesson-1",
        blockIndex: 0,
        title: "Intro",
        content: "Done",
        summary: "summary",
        status: "delivered",
      },
      {
        id: "block-2",
        lessonId: "lesson-1",
        blockIndex: 1,
        title: "Practice",
        content: "Done",
        summary: "summary",
        status: "delivered",
      },
    ]);

    await expect(generateNextLessonBlock("lesson-1")).resolves.toEqual({
      blockCount: 2,
      deliveredCount: 2,
      blockIndex: -1,
      blockId: "",
      complete: true,
    });
  });

  it("generates the next incomplete block", async () => {
    mockOrderBy
      .mockResolvedValueOnce([
        {
          id: "block-1",
          lessonId: "lesson-1",
          blockIndex: 0,
          title: "Intro",
          content: "Done",
          summary: "summary",
          status: "delivered",
        },
        {
          id: "block-2",
          lessonId: "lesson-1",
          blockIndex: 1,
          title: "Practice",
          content: "",
          summary: null,
          status: "pending",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "block-1",
          lessonId: "lesson-1",
          blockIndex: 0,
          title: "Intro",
          content: "Done",
          summary: "summary",
          status: "delivered",
        },
        {
          id: "block-2",
          lessonId: "lesson-1",
          blockIndex: 1,
          title: "Practice",
          content: "",
          summary: null,
          status: "pending",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "block-1",
          lessonId: "lesson-1",
          blockIndex: 0,
          title: "Intro",
          content: "Done",
          summary: "summary",
          status: "delivered",
        },
        {
          id: "block-2",
          lessonId: "lesson-1",
          blockIndex: 1,
          title: "Practice",
          content: "Generated content",
          summary: "summary",
          status: "delivered",
        },
      ]);

    const result = await generateNextLessonBlock("lesson-1");

    expect(result).toEqual({
      blockCount: 2,
      deliveredCount: 2,
      blockIndex: 1,
      blockId: "block-2",
      complete: true,
    });
    expect(mockStreamContentBlock).toHaveBeenCalled();
  });
});
