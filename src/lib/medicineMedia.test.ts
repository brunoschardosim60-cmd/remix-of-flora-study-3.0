import { afterEach, describe, expect, it, vi } from "vitest";
import { isMedicalImageReady, preloadMedicalImage, resetMedicalImageCacheForTests } from "./medicineMedia";

class SuccessfulImage {
  static requests: string[] = [];
  decoding = "auto";
  fetchPriority = "auto";
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  decode = vi.fn(() => Promise.resolve());

  set src(value: string) {
    SuccessfulImage.requests.push(value);
    queueMicrotask(() => this.onload?.());
  }
}

describe("medicineMedia", () => {
  afterEach(() => {
    resetMedicalImageCacheForTests();
    SuccessfulImage.requests = [];
    vi.unstubAllGlobals();
  });

  it("deduplica solicitações e mantém a imagem original em cache", async () => {
    vi.stubGlobal("Image", SuccessfulImage);

    await Promise.all([
      preloadMedicalImage("/medicine/atlas/organs-anterior-v2.png", "high"),
      preloadMedicalImage("/medicine/atlas/organs-anterior-v2.png", "high"),
    ]);

    expect(SuccessfulImage.requests).toEqual(["/medicine/atlas/organs-anterior-v2.png"]);
    expect(isMedicalImageReady("/medicine/atlas/organs-anterior-v2.png")).toBe(true);
  });
});
