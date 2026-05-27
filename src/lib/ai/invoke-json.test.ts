import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class MockChatOpenAI {
    invoke = mockInvoke;
  },
}));

import { invokeJson } from "@/lib/ai/invoke-json";

describe("invokeJson", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("parses plain JSON responses", async () => {
    mockInvoke.mockResolvedValue({
      content: '{"blockCount":4,"titles":["A","B","C","D"]}',
    });

    const schema = z.object({
      blockCount: z.number(),
      titles: z.array(z.string()),
    });

    const result = await invokeJson(schema, "System prompt", "User prompt");

    expect(result).toEqual({
      blockCount: 4,
      titles: ["A", "B", "C", "D"],
    });
  });

  it("strips markdown JSON fences before parsing", async () => {
    mockInvoke.mockResolvedValue({
      content: '```json\n{"value": 42}\n```',
    });

    const schema = z.object({ value: z.number() });
    const result = await invokeJson(schema, "System", "User");

    expect(result).toEqual({ value: 42 });
  });

  it("throws when response does not match schema", async () => {
    mockInvoke.mockResolvedValue({
      content: '{"value":"not-a-number"}',
    });

    const schema = z.object({ value: z.number() });

    await expect(invokeJson(schema, "System", "User")).rejects.toThrow();
  });
});
