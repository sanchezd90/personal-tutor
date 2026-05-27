import { describe, expect, it } from "vitest";
import { createStreamResponse } from "@/lib/streaming";

describe("createStreamResponse", () => {
  it("wraps a ReadableStream with plain-text chunked headers", () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("hello"));
        controller.close();
      },
    });

    const response = createStreamResponse(stream);

    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8"
    );
    expect(response.headers.get("Transfer-Encoding")).toBe("chunked");
  });
});
