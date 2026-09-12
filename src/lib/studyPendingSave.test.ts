import { beforeEach, expect, it, vi } from "vitest";
import { flushStudySave, pendingStudySave, stageStudySave } from "./studyPendingSave";
const state = { topics: [], weekly: [], sessions: [] };
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
it("preserves a failed save for reopening and retries it", async () => {
  stageStudySave("u", state);
  await expect(flushStudySave("u", async () => { throw new Error("offline"); })).rejects.toThrow();
  expect(pendingStudySave("u")?.state).toEqual(state);
  const save = vi.fn().mockResolvedValue(undefined);
  await flushStudySave("u", save);
  expect(save).toHaveBeenCalledWith(state);
  expect(pendingStudySave("u")).toBeNull();
});
it("serializes saves and does not discard edits received while sending", async () => {
  stageStudySave("u", state);
  let release!: () => void;
  const save = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; })).mockResolvedValue(undefined);
  const sending = flushStudySave("u", save);
  stageStudySave("u", state);
  expect(flushStudySave("u", save)).toBe(sending);
  release(); await sending;
  expect(save).toHaveBeenCalledTimes(2);
  expect(pendingStudySave("u")).toBeNull();
});
it("keeps offline changes and isolates accounts", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  stageStudySave("a", state); const save = vi.fn();
  await flushStudySave("a", save);
  expect(save).not.toHaveBeenCalled();
  expect(pendingStudySave("a")).not.toBeNull();
  expect(pendingStudySave("b")).toBeNull();
});
