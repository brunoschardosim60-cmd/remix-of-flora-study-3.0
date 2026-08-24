import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { medicalNotebookTemplates } from "./medicalNotebookTemplates";

const imageSources = (html: string) => [...html.matchAll(/<img\s+[^>]*src="([^"]+)"/g)].map((match) => match[1]);

describe("medicalNotebookTemplates", () => {
  it("entrega cadernos guiados e multipágina, não listas de títulos vazios", () => {
    expect(medicalNotebookTemplates.length).toBeGreaterThanOrEqual(6);
    expect(new Set(medicalNotebookTemplates.map((template) => template.id)).size).toBe(medicalNotebookTemplates.length);

    for (const template of medicalNotebookTemplates) {
      expect(template.pages.length).toBeGreaterThanOrEqual(4);
      expect(template.description.length).toBeGreaterThan(45);
      expect(template.pages.some((page) => imageSources(page.html).length > 0)).toBe(true);
      expect(template.pages.some((page) => page.html.includes("→"))).toBe(true);

      for (const page of template.pages) {
        expect(page.title.trim().length).toBeGreaterThan(4);
        expect(page.purpose.trim().length).toBeGreaterThan(8);
        expect(page.html.length).toBeGreaterThan(350);
      }
    }
  });

  it("aponta apenas para imagens médicas existentes no projeto", () => {
    const paths = medicalNotebookTemplates.flatMap((template) => [
      template.coverImage,
      ...template.pages.flatMap((page) => imageSources(page.html)),
    ]);

    for (const imagePath of new Set(paths)) {
      expect(imagePath.startsWith("/medicine/")).toBe(true);
      expect(existsSync(resolve(process.cwd(), "public", imagePath.replace(/^\//, "")))).toBe(true);
    }
  });

  it("não usa a marca Samsung para descrever o editor", () => {
    expect(JSON.stringify(medicalNotebookTemplates).toLocaleLowerCase("pt-BR")).not.toContain("samsung");
  });
});

