import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNotebookAutosave } from "./useNotebookAutosave";
import { getPendingPage, pendingCount } from "@/lib/notebookOfflineQueue";

const { select, update, eq } = vi.hoisted(() => ({ select: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ update }) } }));
const page = { pageId: "p1", content: "Texto", drawing_data: null, tags: [], template: "grid", baseUpdatedAt: "2026-09-08T00:00:00Z" };
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  update.mockReturnValue({ eq });
  eq.mockReturnValue({ eq, select });
  select.mockResolvedValue({ data: [{ id: "p1" }, { id: "p2" }], error: null });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("notebook autosave", () => {
  it("persists immediately, even if navigation cancels the send timer", () => {
    const { rerender, unmount } = renderHook(({ snapshot }) => useNotebookAutosave("user", snapshot), { initialProps: { snapshot: page } });
    rerender({ snapshot: { ...page, pageId: "p2", content: "Segunda página" } });
    unmount();
    expect(getPendingPage("user", "p1")?.content).toBe("Texto");
    expect(getPendingPage("user", "p2")?.content).toBe("Segunda página");
    expect(update).not.toHaveBeenCalled();
  });
  it("marks synced only after the queued page is acknowledged", async () => {
    const { result } = renderHook(() => useNotebookAutosave("user", page));
    expect(result.current.saveStatus).toBe("saving");
    await act(() => vi.advanceTimersByTimeAsync(801));
    expect(pendingCount("user")).toBe(0);
    expect(result.current.saveStatus).toBe("saved");
  });
  it("keeps an offline copy and retries when the connection returns", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { result } = renderHook(() => useNotebookAutosave("user", page));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.saveStatus).toBe("offline");
    expect(update).not.toHaveBeenCalled();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(result.current.saveStatus).toBe("saved");
  });
  it("does not call a denied server write synchronized", async () => {
    select.mockResolvedValue({ data: [], error: { message: "denied" } });
    const { result } = renderHook(() => useNotebookAutosave("user", page));
    await act(() => vi.advanceTimersByTimeAsync(801));
    expect(result.current.saveStatus).toBe("error");
    expect(pendingCount("user")).toBe(1);
  });
});
