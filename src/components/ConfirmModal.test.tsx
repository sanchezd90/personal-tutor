import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { ConfirmModal } from "@/components/ConfirmModal";

test("does not render when closed", async () => {
  render(
    <ConfirmModal
      open={false}
      title="Delete item"
      message="Are you sure?"
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  );

  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
});

test("renders title, message, and action buttons when open", async () => {
  render(
    <ConfirmModal
      open
      title="Delete item"
      message="This cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Keep"
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  );

  const dialog = page.getByRole("dialog");
  await expect.element(dialog).toBeInTheDocument();
  await expect.element(page.getByText("Delete item")).toBeInTheDocument();
  await expect.element(page.getByText("This cannot be undone.")).toBeInTheDocument();
  await expect.element(page.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  await expect.element(page.getByRole("button", { name: "Delete" })).toBeInTheDocument();
});

test("calls onConfirm and onCancel from button clicks", async () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmModal
      open
      title="Delete item"
      message="Are you sure?"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );

  await page.getByRole("button", { name: "Cancel" }).click();
  expect(onCancel).toHaveBeenCalledTimes(1);

  await page.getByRole("button", { name: "Confirm" }).click();
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test("calls onCancel when Escape is pressed", async () => {
  const onCancel = vi.fn();

  render(
    <ConfirmModal
      open
      title="Delete item"
      message="Are you sure?"
      onConfirm={() => {}}
      onCancel={onCancel}
    />
  );

  await userEvent.keyboard("{Escape}");
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("shows loading state and ignores Escape while loading", async () => {
  const onCancel = vi.fn();

  render(
    <ConfirmModal
      open
      title="Delete item"
      message="Are you sure?"
      loading
      onConfirm={() => {}}
      onCancel={onCancel}
    />
  );

  await expect
    .element(page.getByRole("button", { name: "Deleting..." }))
    .toBeDisabled();
  await expect.element(page.getByRole("button", { name: "Cancel" })).toBeDisabled();

  await userEvent.keyboard("{Escape}");
  expect(onCancel).not.toHaveBeenCalled();
});
