import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { QASidebar } from "@/components/QASidebar";

function createFetchMock(handlers: {
  getItems?: unknown[];
  postResponse?: Record<string, string>;
}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.endsWith("/questions") && (!init || init.method === "GET")) {
      return {
        ok: true,
        json: async () => handlers.getItems ?? [],
      };
    }

    if (url.endsWith("/questions") && init?.method === "POST") {
      return {
        ok: true,
        json: async () =>
          handlers.postResponse ?? {
            questionId: "q-new",
            question: "What is a variable?",
            answer: "A named storage location.",
          },
      };
    }

    throw new Error(`Unhandled fetch: ${url} ${init?.method ?? "GET"}`);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("loads and displays existing questions", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      getItems: [
        {
          questionId: "q-1",
          question: "What is scope?",
          answer: "The region where a variable is visible.",
          askedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    })
  );

  render(<QASidebar contentBlockId="block-1" />);

  await expect.element(page.getByText("What is scope?")).toBeInTheDocument();
  await expect
    .element(page.getByText("The region where a variable is visible."))
    .toBeInTheDocument();
});

test("shows empty state when there are no questions", async () => {
  vi.stubGlobal("fetch", createFetchMock({ getItems: [] }));

  render(<QASidebar contentBlockId="block-1" />);

  await expect.element(page.getByText("No questions yet.")).toBeInTheDocument();
});

test("submits a question and clears the input", async () => {
  const fetchMock = createFetchMock({ getItems: [] });
  vi.stubGlobal("fetch", fetchMock);

  render(<QASidebar contentBlockId="block-1" />);

  await page
    .getByPlaceholder("Ask a question about this block...")
    .fill("What is a variable?");
  await page.getByRole("button", { name: "Ask" }).click();

  await expect.element(page.getByText("What is a variable?")).toBeInTheDocument();
  await expect
    .element(page.getByText("A named storage location."))
    .toBeInTheDocument();
  await expect
    .element(page.getByPlaceholder("Ask a question about this block..."))
    .toHaveValue("");

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/content-blocks/block-1/questions",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ question: "What is a variable?" }),
    })
  );
});

test("keeps Ask disabled until question text is entered", async () => {
  vi.stubGlobal("fetch", createFetchMock({ getItems: [] }));

  render(<QASidebar contentBlockId="block-1" />);

  await expect.element(page.getByRole("button", { name: "Ask" })).toBeDisabled();

  await page
    .getByPlaceholder("Ask a question about this block...")
    .fill("Help me understand loops");

  await expect.element(page.getByRole("button", { name: "Ask" })).toBeEnabled();
});
