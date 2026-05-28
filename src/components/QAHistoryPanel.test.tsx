import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { QAHistoryPanel } from "@/components/QAHistoryPanel";

function mockHistoryFetch(items: unknown[] | null, options?: { reject?: boolean }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      if (options?.reject) {
        throw new Error("Network error");
      }

      return {
        ok: true,
        json: async () => items,
      };
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("loads and displays Q&A history items", async () => {
  mockHistoryFetch([
    {
      questionId: "q-1",
      question: "What is recursion?",
      answer: "A function that calls itself.",
      lessonTitle: "Functions",
      blockIndex: 1,
    },
  ]);

  render(<QAHistoryPanel syllabusId="syll-1" />);

  await expect.element(page.getByText("Q&A History")).toBeInTheDocument();
  await expect.element(page.getByText("Functions - Block 2")).toBeInTheDocument();
  await expect.element(page.getByText("What is recursion?")).toBeInTheDocument();
  await expect
    .element(page.getByText("A function that calls itself."))
    .toBeInTheDocument();
});

test("shows empty state when history is empty", async () => {
  mockHistoryFetch([]);

  render(<QAHistoryPanel syllabusId="syll-1" />);

  await expect.element(page.getByText("No questions yet.")).toBeInTheDocument();
});

test("shows empty state when fetch fails", async () => {
  mockHistoryFetch(null, { reject: true });

  render(<QAHistoryPanel syllabusId="syll-1" />);

  await expect.element(page.getByText("No questions yet.")).toBeInTheDocument();
});

test("calls onClose when Close is clicked", async () => {
  mockHistoryFetch([]);
  const onClose = vi.fn();

  render(<QAHistoryPanel syllabusId="syll-1" onClose={onClose} />);

  await page.getByRole("button", { name: "Close" }).click();
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("hides Close button when onClose is omitted", async () => {
  mockHistoryFetch([]);

  render(<QAHistoryPanel syllabusId="syll-1" />);

  await expect.element(page.getByRole("button", { name: "Close" })).not.toBeInTheDocument();
});
