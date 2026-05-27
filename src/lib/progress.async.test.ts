import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockWhere, mockFrom, mockSelect } = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  return { mockWhere, mockFrom, mockSelect };
});

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

import {
  computeSyllabusProgressSummary,
  computeSyllabusProgressSummaries,
  fetchBlocksAndReadsForLessons,
} from "@/lib/progress";

describe("fetchBlocksAndReadsForLessons", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockReset();
  });

  it("returns empty maps when no lesson ids are provided", async () => {
    const result = await fetchBlocksAndReadsForLessons([], "user-1");

    expect(result.blocksByLesson.size).toBe(0);
    expect(result.readBlockIds.size).toBe(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("groups blocks by lesson and collects read ids for delivered blocks", async () => {
    mockWhere
      .mockResolvedValueOnce([
        {
          id: "block-a",
          lessonId: "lesson-1",
          blockIndex: 0,
          title: "Intro",
          status: "delivered",
          content: "Content A",
        },
        {
          id: "block-b",
          lessonId: "lesson-2",
          blockIndex: 0,
          title: "Intro",
          status: "pending",
          content: "",
        },
      ])
      .mockResolvedValueOnce([{ contentBlockId: "block-a" }]);

    const result = await fetchBlocksAndReadsForLessons(
      ["lesson-1", "lesson-2"],
      "user-1"
    );

    expect(result.blocksByLesson.get("lesson-1")).toHaveLength(1);
    expect(result.blocksByLesson.get("lesson-2")).toHaveLength(1);
    expect(result.readBlockIds).toEqual(new Set(["block-a"]));
  });
});

describe("computeSyllabusProgressSummary", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockReset();
  });

  it("returns zero summary when syllabus has no modules", async () => {
    mockWhere.mockResolvedValueOnce([]);

    await expect(
      computeSyllabusProgressSummary("syllabus-1", "user-1")
    ).resolves.toEqual({
      progressPct: 0,
      isDone: false,
      doneLessons: 0,
      totalLessons: 0,
    });
  });

  it("aggregates lesson completion across modules", async () => {
    mockWhere
      .mockResolvedValueOnce([{ id: "module-1" }])
      .mockResolvedValueOnce([{ id: "lesson-1" }, { id: "lesson-2" }])
      .mockResolvedValueOnce([
        {
          id: "block-1",
          lessonId: "lesson-1",
          blockIndex: 0,
          title: "Done",
          status: "delivered",
          content: "Complete",
        },
      ])
      .mockResolvedValueOnce([{ contentBlockId: "block-1" }]);

    const summary = await computeSyllabusProgressSummary(
      "syllabus-1",
      "user-1"
    );

    expect(summary.totalLessons).toBe(2);
    expect(summary.doneLessons).toBe(1);
    expect(summary.progressPct).toBe(50);
    expect(summary.isDone).toBe(false);
  });
});

describe("computeSyllabusProgressSummaries", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockReset();
  });

  it("returns default summaries for empty syllabus id list", async () => {
    const summaries = await computeSyllabusProgressSummaries([], "user-1");

    expect(summaries.size).toBe(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("computes per-syllabus summaries in one batch", async () => {
    mockWhere
      .mockResolvedValueOnce([
        { id: "module-1", syllabusId: "syllabus-a" },
        { id: "module-2", syllabusId: "syllabus-b" },
      ])
      .mockResolvedValueOnce([
        { id: "lesson-a", moduleId: "module-1", order: 0 },
        { id: "lesson-b", moduleId: "module-2", order: 0 },
      ])
      .mockResolvedValueOnce([
        {
          id: "block-a",
          lessonId: "lesson-a",
          blockIndex: 0,
          title: "Done",
          status: "delivered",
          content: "Complete",
        },
      ])
      .mockResolvedValueOnce([{ contentBlockId: "block-a" }]);

    const summaries = await computeSyllabusProgressSummaries(
      ["syllabus-a", "syllabus-b"],
      "user-1"
    );

    expect(summaries.get("syllabus-a")).toEqual({
      progressPct: 100,
      isDone: true,
      doneLessons: 1,
      totalLessons: 1,
    });
    expect(summaries.get("syllabus-b")).toEqual({
      progressPct: 0,
      isDone: false,
      doneLessons: 0,
      totalLessons: 1,
    });
  });
});
