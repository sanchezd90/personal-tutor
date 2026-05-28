import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { ContentBlock } from "@/components/ContentBlock";

function mockQuestionsFetch(items: unknown[] = []) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => items,
    })
  );
}

beforeEach(() => {
  mockQuestionsFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("renders block metadata, title, and markdown content", async () => {
  render(
    <ContentBlock
      blockId="block-1"
      blockNumber={2}
      title="Key Concepts"
      content="**Bold** paragraph"
    />
  );

  await expect.element(page.getByText("Key Concepts")).toBeInTheDocument();
  await expect.element(page.getByText("Block 2")).toBeInTheDocument();
  await expect.element(page.getByText("Bold")).toBeInTheDocument();
});

test("shows verified badge when audit passed", async () => {
  render(
    <ContentBlock
      blockId="block-1"
      blockNumber={1}
      content="Content"
      auditPassed={true}
    />
  );

  await expect.element(page.getByText("Verified")).toBeInTheDocument();
});

test("shows review suggested badge when audit failed", async () => {
  render(
    <ContentBlock
      blockId="block-1"
      blockNumber={1}
      content="Content"
      auditPassed={false}
    />
  );

  await expect.element(page.getByText("Review suggested")).toBeInTheDocument();
});

test("toggles read state through onReadToggle", async () => {
  const onReadToggle = vi.fn().mockResolvedValue(undefined);

  render(
    <ContentBlock
      blockId="block-42"
      blockNumber={1}
      content="Content"
      read={false}
      onReadToggle={onReadToggle}
    />
  );

  await page.getByRole("checkbox").click();

  expect(onReadToggle).toHaveBeenCalledWith("block-42", true);
});

test("hides read toggle when onReadToggle is omitted", async () => {
  render(
    <ContentBlock blockId="block-1" blockNumber={1} content="Content" />
  );

  await expect.element(page.getByRole("checkbox")).not.toBeInTheDocument();
});
