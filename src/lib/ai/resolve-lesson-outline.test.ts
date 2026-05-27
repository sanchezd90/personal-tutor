import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonGenerationContext } from "@/lib/ai/lesson-context";

const { mockInvokeJson } = vi.hoisted(() => ({
  mockInvokeJson: vi.fn(),
}));

vi.mock("@/lib/ai/invoke-json", () => ({
  invokeJson: mockInvokeJson,
}));

import { resolveLessonOutline } from "@/lib/ai/resolve-lesson-outline";

function baseContext(
  overrides: Partial<LessonGenerationContext> = {}
): LessonGenerationContext {
  return {
    lessonId: "lesson-1",
    lessonTitle: "Intro to Testing",
    curriculumBrief: "Learn testing fundamentals.",
    positionLine: "Module 1 of 4, Lesson 1 of 6 (lesson 1 of 24 in course)",
    previousLessonTitle: null,
    nextLessonTitle: "Next lesson",
    lessonObjective: "Write unit tests.",
    prebuiltOutline: null,
    ...overrides,
  };
}

describe("resolveLessonOutline", () => {
  beforeEach(() => {
    mockInvokeJson.mockReset();
  });

  it("returns fixed prebuilt outline without calling the model", async () => {
    const outline = await resolveLessonOutline(
      baseContext({
        prebuiltOutline: {
          blockCount: 5,
          titles: ["A", "B"],
        },
      })
    );

    expect(outline).toEqual({
      blockCount: 5,
      titles: ["A", "B", "Block 3", "Block 4", "Block 5"],
    });
    expect(mockInvokeJson).not.toHaveBeenCalled();
  });

  it("calls invokeJson when no prebuilt outline exists", async () => {
    mockInvokeJson.mockResolvedValue({
      blockCount: 4,
      titles: ["One", "Two", "Three", "Four"],
    });

    const outline = await resolveLessonOutline(baseContext());

    expect(mockInvokeJson).toHaveBeenCalledOnce();
    expect(outline).toEqual({
      blockCount: 4,
      titles: ["One", "Two", "Three", "Four"],
    });
  });

  it("pads titles when model returns too few", async () => {
    mockInvokeJson.mockResolvedValue({
      blockCount: 4,
      titles: ["Only one"],
    });

    const outline = await resolveLessonOutline(baseContext());

    expect(outline.titles).toEqual([
      "Only one",
      "Block 2",
      "Block 3",
      "Block 4",
    ]);
  });
});
