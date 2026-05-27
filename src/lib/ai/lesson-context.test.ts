import { describe, expect, it } from "vitest";
import { formatCurriculumContext } from "@/lib/ai/lesson-context";
import type { LessonGenerationContext } from "@/lib/ai/lesson-context";

function baseContext(
  overrides: Partial<LessonGenerationContext> = {}
): LessonGenerationContext {
  return {
    lessonId: "lesson-1",
    lessonTitle: "Variables and Types",
    curriculumBrief: "",
    positionLine: "Module 1 of 4, Lesson 2 of 6 (lesson 2 of 24 in course)",
    previousLessonTitle: null,
    nextLessonTitle: null,
    lessonObjective: null,
    prebuiltOutline: null,
    ...overrides,
  };
}

describe("formatCurriculumContext", () => {
  it("includes position line always", () => {
    const result = formatCurriculumContext(baseContext());

    expect(result).toContain(
      "Position: Module 1 of 4, Lesson 2 of 6 (lesson 2 of 24 in course)"
    );
  });

  it("includes optional curriculum brief and neighbor lessons", () => {
    const result = formatCurriculumContext(
      baseContext({
        curriculumBrief: "Build foundational Python skills.",
        previousLessonTitle: "Setup",
        nextLessonTitle: "Control Flow",
        lessonObjective: "Understand variable assignment and types.",
      })
    );

    expect(result).toContain("Course brief:\nBuild foundational Python skills.");
    expect(result).toContain("Previous lesson: Setup");
    expect(result).toContain("Next lesson: Control Flow");
    expect(result).toContain(
      "This lesson objective: Understand variable assignment and types."
    );
  });

  it("omits empty optional fields", () => {
    const result = formatCurriculumContext(
      baseContext({ curriculumBrief: "" })
    );

    expect(result).not.toContain("Course brief:");
    expect(result).not.toContain("Previous lesson:");
    expect(result).not.toContain("Next lesson:");
    expect(result).not.toContain("This lesson objective:");
  });
});
