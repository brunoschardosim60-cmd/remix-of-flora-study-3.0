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
});
