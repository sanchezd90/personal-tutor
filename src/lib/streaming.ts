/**
 * Helpers for streaming AI responses.
 * Content streaming is handled via ReadableStream in API routes.
 */

export function createStreamResponse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
