import type { ReactNode } from "react";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { SyllabusTree } from "@/components/SyllabusTree";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const modules = [
  {
    id: "mod-1",
    syllabusId: "syll-1",
    order: 0,
    title: "Getting Started",
    lessons: [
      {
        id: "lesson-1",
        moduleId: "mod-1",
        order: 0,
        title: "Introduction",
        progressPct: 50,
        isDone: false,
        blocks: [
          {
            id: "block-1",
            blockIndex: 0,
            title: "Overview",
            delivered: true,
            read: true,
          },
          {
            id: "block-2",
            blockIndex: 1,
            title: "Setup",
            delivered: false,
            read: false,
          },
        ],
      },
      {
        id: "lesson-2",
        moduleId: "mod-1",
        order: 1,
        title: "Variables",
        progressPct: 100,
        isDone: true,
        blocks: [],
      },
    ],
  },
];

test("renders modules, lessons, and progress", async () => {
  render(<SyllabusTree modules={modules} />);

  await expect.element(page.getByText("Module 1: Getting Started")).toBeInTheDocument();
  await expect.element(page.getByText("1. Introduction")).toBeInTheDocument();
  await expect.element(page.getByText("2. Variables")).toBeInTheDocument();
  await expect.element(page.getByText("50%")).toBeInTheDocument();
  await expect.element(page.getByText("100%")).toBeInTheDocument();
  await expect.element(page.getByText("Done")).toBeInTheDocument();
});

test("links lessons and delivered block sections", async () => {
  render(<SyllabusTree modules={modules} />);

  await expect
    .element(page.getByRole("link", { name: "1. Introduction" }))
    .toHaveAttribute("href", "/lesson/lesson-1");

  await page.getByText("1 of 2 sections generated").click();

  await expect
    .element(page.getByRole("link", { name: "Overview" }))
    .toHaveAttribute("href", "/lesson/lesson-1#block-1");
  await expect.element(page.getByText("Read")).toBeInTheDocument();
  await expect.element(page.getByText("Setup")).toBeInTheDocument();
});
