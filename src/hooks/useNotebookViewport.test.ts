import { describe, expect, it } from "vitest";
import { anchoredScroll } from "./useNotebookViewport";
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
});
