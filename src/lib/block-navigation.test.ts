import { describe, expect, it } from "vitest";
import {
  blockAnchorId,
  lessonBlockHref,
  parseBlockIndexFromHash,
} from "@/lib/block-navigation";

describe("blockAnchorId", () => {
  it("returns 1-based anchor ids", () => {
    expect(blockAnchorId(0)).toBe("block-1");
    expect(blockAnchorId(4)).toBe("block-5");
  });
});

describe("lessonBlockHref", () => {
  it("builds lesson URL with block hash", () => {
    expect(lessonBlockHref("abc-123", 2)).toBe("/lesson/abc-123#block-3");
  });
});

describe("parseBlockIndexFromHash", () => {
  it("parses hash with or without leading #", () => {
    expect(parseBlockIndexFromHash("#block-3")).toBe(2);
    expect(parseBlockIndexFromHash("block-3")).toBe(2);
  });

  it("returns null for invalid hashes", () => {
    expect(parseBlockIndexFromHash("")).toBe(null);
    expect(parseBlockIndexFromHash("#section-1")).toBe(null);
    expect(parseBlockIndexFromHash("#block-0")).toBe(null);
    expect(parseBlockIndexFromHash("#block-abc")).toBe(null);
  });
});
