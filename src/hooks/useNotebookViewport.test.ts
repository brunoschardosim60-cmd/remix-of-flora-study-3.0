import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { anchoredScroll, useNotebookViewport } from "./useNotebookViewport";
afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); });
describe("notebook zoom anchor", () => {
  it("keeps the document point under the pointer when zooming in", () => {
    expect(anchoredScroll(400, 200, 1, 2)).toBe(1000);
  });
  it("reverses the same zoom without changing the reading position", () => {
    expect(anchoredScroll(1000, 200, 2, 1)).toBe(400);
  });
  it("does not scroll outside the paper", () => {
    expect(anchoredScroll(0, 200, 1, 0.35)).toBe(0);
  });
  it("flushes the last reading position when leaving before the next frame", () => {
    vi.useFakeTimers();
    const element = document.createElement("div");
    const ref = { current: element };
    const hook = renderHook(() => useNotebookViewport(ref, true, "test-page", 2, vi.fn()));
    act(() => { vi.advanceTimersByTime(20); });
    element.scrollTop = 600;
    element.dispatchEvent(new Event("scroll"));
    hook.unmount();
    expect(JSON.parse(sessionStorage.getItem("notebook-scroll:test-page")!)).toEqual({ top: 300, left: 0 });
  });
  it("does not overwrite a saved page if unmounted before restoration", () => {
    vi.useFakeTimers();
    sessionStorage.setItem("notebook-scroll:test-page", JSON.stringify({ top: 700, left: 10 }));
    const hook = renderHook(() => useNotebookViewport({ current: document.createElement("div") }, true, "test-page", 1, vi.fn()));
    hook.unmount();
    expect(JSON.parse(sessionStorage.getItem("notebook-scroll:test-page")!).top).toBe(700);
  });
});
