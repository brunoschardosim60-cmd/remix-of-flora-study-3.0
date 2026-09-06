import { describe, expect, it } from "vitest";
import { buildStandaloneNotebookHtml, notebookExportFilename, notebookHtmlToPlainText, notebookToMarkdown, notebookToPlainText } from "./notebookExport";

const pages = [{ pageNumber: 1, content: '<h1>Coração</h1><p>Fluxo <strong>sistêmico</strong>.</p><img src="/heart.png" alt="Coração">' }];

describe("notebookExport", () => {
  it("cria nomes portáveis e previsíveis", () => {
    expect(notebookExportFilename("Anatomia — Coração", "samsung-notes", "pdf")).toBe("anatomia-coracao-samsung-notes.pdf");
  });

  it("preserva texto, estrutura e imagens nos formatos portáteis", () => {
    expect(notebookHtmlToPlainText(pages[0].content)).toContain("Coração");
    expect(notebookToPlainText("Medicina", pages)).toContain("PÁGINA 1");
    expect(notebookToMarkdown("Medicina", pages)).toContain("![Coração](/heart.png)");
    const html = buildStandaloneNotebookHtml("Medicina", pages);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('/heart.png');
    expect(html).toContain("Página 1");
  });
  it("exports crop, zoom and rotation with static styles and no executable content", () => {
    const html = buildStandaloneNotebookHtml("Teste", [{ pageNumber: 1, content: '<img src="/heart.png" width="360" data-natural-ratio="2" data-crop-enabled="true" data-crop-aspect="1:1" data-crop-zoom="2" data-crop-y="100" data-rotation="90" onerror="alert(1)"><script>alert(1)</script>' }]);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const image = doc.querySelector("img")!;
    expect(image.style.width).toBe("400%");
    expect(image.style.top).toBe("-100%");
    expect(image.style.transform).toContain("rotate(90deg)");
    expect(image.parentElement!.style.overflow).toBe("hidden");
    expect(image.getAttribute("onerror")).toBeNull();
    expect(doc.querySelector("script")).toBeNull();
  });
});
