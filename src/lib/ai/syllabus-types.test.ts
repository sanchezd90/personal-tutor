import { describe, expect, it } from "vitest";
import {
  normalizeLessonOutline,
  syllabusStructureSchema,
} from "@/lib/ai/syllabus-types";

describe("normalizeLessonOutline", () => {
  it("returns normalized outline when blockCount and titles are valid", () => {
    const result = normalizeLessonOutline({
      title: "Day 1",
      blockCount: 4,
      titles: ["Intro", "Concept", "Practice", "Wrap up"],
    });

    expect(result).toEqual({
      blockCount: 4,
      titles: ["Intro", "Concept", "Practice", "Wrap up"],
    });
  });

  it("truncates extra titles to blockCount", () => {
    const result = normalizeLessonOutline({
      title: "Day 1",
      blockCount: 4,
      titles: ["A", "B", "C", "D", "E"],
    });

    expect(result?.titles).toEqual(["A", "B", "C", "D"]);
  });

  it("pads missing titles up to blockCount", () => {
    const result = normalizeLessonOutline({
      title: "Day 1",
      blockCount: 5,
      titles: ["Intro", "Core", "Practice", "Wrap"],
    });

    expect(result?.titles).toEqual([
      "Intro",
      "Core",
      "Practice",
      "Wrap",
      "Block 5",
    ]);
  });

  it("returns null when blockCount or titles are missing or invalid", () => {
    expect(
      normalizeLessonOutline({ title: "Day 1", titles: ["A", "B", "C", "D"] })
    ).toBeNull();
    expect(
      normalizeLessonOutline({ title: "Day 1", blockCount: 4 })
    ).toBeNull();
    expect(
      normalizeLessonOutline({
        title: "Day 1",
        blockCount: 3,
        titles: ["Only", "Two"],
      })
    ).toBeNull();
    expect(
      normalizeLessonOutline({
        title: "Day 1",
        blockCount: 11,
        titles: Array.from({ length: 11 }, (_, i) => `Block ${i + 1}`),
      })
    ).toBeNull();
  });
});

describe("syllabusStructureSchema", () => {
  it("accepts a valid 4-week syllabus structure", () => {
    const modules = Array.from({ length: 4 }, (_, week) => ({
      title: `Week ${week + 1}`,
      lessons: Array.from({ length: 5 }, (_, day) => ({
        title: `Lesson ${day + 1}`,
        objective: "Learn something",
        blockCount: 4,
        titles: ["A", "B", "C", "D"],
      })),
    }));

    const result = syllabusStructureSchema.safeParse({
      curriculumBrief: "A certification prep course",
      modules,
    });

    expect(result.success).toBe(true);
  });

  it("rejects wrong module count or lesson counts", () => {
    const tooFewModules = syllabusStructureSchema.safeParse({
      curriculumBrief: "Brief",
      modules: Array.from({ length: 3 }, () => ({
        title: "Week",
        lessons: Array.from({ length: 5 }, () => ({ title: "Lesson" })),
      })),
    });

    const tooFewLessons = syllabusStructureSchema.safeParse({
      curriculumBrief: "Brief",
      modules: Array.from({ length: 4 }, () => ({
        title: "Week",
        lessons: Array.from({ length: 4 }, () => ({ title: "Lesson" })),
      })),
    });

    expect(tooFewModules.success).toBe(false);
    expect(tooFewLessons.success).toBe(false);
  });
});
