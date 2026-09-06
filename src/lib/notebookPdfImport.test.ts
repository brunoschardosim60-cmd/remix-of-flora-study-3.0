import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderPdfPages } from "./notebookPdfImport";
const { pdfDocument, page, getDocument } = vi.hoisted(() => {
  const page = { getViewport: vi.fn(() => ({ width: 600, height: 800 })), render: vi.fn(() => ({ promise: Promise.resolve() })), cleanup: vi.fn() };
  const pdfDocument = { numPages: 1, getPage: vi.fn(async () => page), destroy: vi.fn() };
  return { pdfDocument, page, getDocument: vi.fn(() => ({ promise: Promise.resolve(pdfDocument) })) };
});
vi.mock("pdfjs-dist", () => ({ getDocument, GlobalWorkerOptions: {} }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillRect: vi.fn(), fillStyle: "" } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["test"], { type: "image/jpeg" })));
});
describe("PDF import", () => {
  it("creates a browser canvas, not a canvas on the PDF object", async () => {
    const file = { arrayBuffer: async () => new ArrayBuffer(4) } as File;
    const pages = await renderPdfPages(file);
    expect(pages).toHaveLength(1);
    expect(page.render).toHaveBeenCalledOnce();
    expect(pdfDocument.destroy).toHaveBeenCalledOnce();
  });
  it("releases the PDF worker even when rendering fails", async () => {
    page.render.mockImplementationOnce(() => { throw new Error("bad page"); });
    const file = { arrayBuffer: async () => new ArrayBuffer(4) } as File;
    await expect(renderPdfPages(file)).rejects.toThrow("bad page");
    expect(pdfDocument.destroy).toHaveBeenCalledOnce();
  });
});
