import { describe, expect, it } from "vitest";
import { isBlockComplete } from "@/lib/ai/generate-lesson-content";

describe("isBlockComplete", () => {
  it("matches delivered blocks with non-empty content", () => {
    expect(
      isBlockComplete({ status: "delivered", content: "Lesson content" })
    ).toBe(true);
  });

  it("rejects pending or empty blocks", () => {
    expect(isBlockComplete({ status: "pending", content: "" })).toBe(false);
    expect(isBlockComplete({ status: "delivered", content: "  " })).toBe(
      false
    );
  });
});
