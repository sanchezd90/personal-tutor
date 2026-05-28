import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetUser,
  mockCreateClient,
  mockWhere,
  mockFrom,
  mockSelect,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockCreateClient = vi.fn(() => ({
    auth: { getUser: mockGetUser },
  }));
  const mockWhere = vi.fn();
  const mockInnerJoin = vi.fn(function (this: { where: typeof mockWhere }) {
    return this;
  });
  const mockFrom = vi.fn(function (this: { innerJoin: typeof mockInnerJoin; where: typeof mockWhere }) {
    return this;
  });
  const mockSelect = vi.fn(() => ({
    from: mockFrom,
    innerJoin: mockInnerJoin,
    where: mockWhere,
  }));

  mockFrom.mockReturnValue({
    innerJoin: mockInnerJoin,
    where: mockWhere,
  });
  mockInnerJoin.mockReturnValue({
    innerJoin: mockInnerJoin,
    where: mockWhere,
  });

  return {
    mockGetUser,
    mockCreateClient,
    mockWhere,
    mockFrom,
    mockSelect,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

import {
  getAuthUser,
  requireAuth,
  requireContentBlockOwnership,
  requireLessonOwnership,
  requireSyllabusOwnership,
} from "@/lib/auth";

describe("getAuthUser", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockCreateClient.mockClear();
  });

  it("returns user when Supabase session is valid", async () => {
    const user = { id: "user-1", email: "test@example.com" };
    mockGetUser.mockResolvedValue({ data: { user }, error: null });

    await expect(getAuthUser()).resolves.toEqual(user);
  });

  it("returns null when Supabase returns an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid session"),
    });

    await expect(getAuthUser()).resolves.toBeNull();
  });

  it("returns null when createClient throws", async () => {
    mockCreateClient.mockImplementationOnce(() => {
      throw new Error("missing env");
    });

    await expect(getAuthUser()).resolves.toBeNull();
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  it("returns user when authenticated", async () => {
    const user = { id: "user-1" };
    mockGetUser.mockResolvedValue({ data: { user }, error: null });

    await expect(requireAuth()).resolves.toEqual({ user, error: null });
  });

  it("returns unauthorized error when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireAuth()).resolves.toEqual({
      user: null,
      error: "Unauthorized",
    });
  });
});

describe("ownership helpers", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockReset();
  });

  it("requireSyllabusOwnership returns true for matching user", async () => {
    mockWhere.mockResolvedValue([{ userId: "user-1" }]);

    await expect(requireSyllabusOwnership("syllabus-1", "user-1")).resolves.toBe(
      true
    );
  });

  it("requireSyllabusOwnership returns false when syllabus missing or mismatched", async () => {
    mockWhere.mockResolvedValueOnce([]);
    mockWhere.mockResolvedValueOnce([{ userId: "other-user" }]);

    await expect(requireSyllabusOwnership("missing", "user-1")).resolves.toBeFalsy();
    await expect(requireSyllabusOwnership("syllabus-1", "user-1")).resolves.toBe(
      false
    );
  });

  it("requireLessonOwnership checks joined syllabus owner", async () => {
    mockWhere.mockResolvedValue([{ ownerId: "user-1" }]);

    await expect(requireLessonOwnership("lesson-1", "user-1")).resolves.toBe(
      true
    );
    await expect(requireLessonOwnership("lesson-1", "other")).resolves.toBe(
      false
    );
  });

  it("requireContentBlockOwnership checks joined syllabus owner", async () => {
    mockWhere.mockResolvedValue([{ ownerId: "user-1" }]);

    await expect(
      requireContentBlockOwnership("block-1", "user-1")
    ).resolves.toBe(true);
    await expect(
      requireContentBlockOwnership("block-1", "other")
    ).resolves.toBe(false);
  });
});
