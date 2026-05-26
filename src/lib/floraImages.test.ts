import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCachedImage, cacheImage } from "./floraImages";

describe("floraImages cache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getCachedImage", () => {
    it("returns null when nothing is cached", () => {
      expect(getCachedImage("foo")).toBeNull();
    });

    it("returns the cached url after cacheImage", () => {
      cacheImage("mitose", "https://example.com/a.png");
      expect(getCachedImage("mitose")).toBe("https://example.com/a.png");
    });

    it("returns null and removes the entry when stored JSON is corrupted", () => {
      localStorage.setItem("flora-image-broken", "{not-json");
      expect(getCachedImage("broken")).toBeNull();
      expect(localStorage.getItem("flora-image-broken")).toBeNull();
    });

    it("returns null when the stored payload lacks a string url", () => {
      localStorage.setItem(
        "flora-image-bad-shape",
        JSON.stringify({ url: 123, timestamp: Date.now() })
      );
      expect(getCachedImage("bad-shape")).toBeNull();
    });

    it("returns null when window is undefined (SSR)", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error simulate SSR
      delete globalThis.window;
      try {
        expect(getCachedImage("ssr")).toBeNull();
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });

  describe("cacheImage", () => {
    it("stores a JSON payload with url and timestamp", () => {
      cacheImage("celula", "https://example.com/c.png");
      const stored = JSON.parse(localStorage.getItem("flora-image-celula")!);
      expect(stored.url).toBe("https://example.com/c.png");
      expect(typeof stored.timestamp).toBe("number");
    });

    it("does not throw when localStorage quota is full", () => {
      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err: any = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      });
      expect(() => cacheImage("big", "https://example.com/big.png")).not.toThrow();
      expect(spy).toHaveBeenCalled();
    });

    it("does not throw when window is undefined (SSR)", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error simulate SSR
      delete globalThis.window;
      try {
        expect(() => cacheImage("ssr", "https://example.com/x.png")).not.toThrow();
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });
});