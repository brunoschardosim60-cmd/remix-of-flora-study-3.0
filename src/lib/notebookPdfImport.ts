import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface RenderedPdfPage {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
}

export async function renderPdfPages(file: File, onProgress?: (current: number, total: number) => void): Promise<RenderedPdfPage[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  if (document.numPages > 100) {
    await document.destroy();
    throw new Error("O PDF pode ter no máximo 100 páginas por importação.");
  }
  const result: RenderedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onProgress?.(pageNumber, document.numPages);
    const page = await document.getPage(pageNumber);
    const original = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1600 / Math.max(original.width, original.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error(`Não foi possível renderizar a página ${pageNumber}.`);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error(`Falha ao preparar a página ${pageNumber}.`)), "image/jpeg", 0.88);
    });
    result.push({ pageNumber, blob, width: canvas.width, height: canvas.height });
    page.cleanup();
  }
  await document.destroy();
  return result;
}
