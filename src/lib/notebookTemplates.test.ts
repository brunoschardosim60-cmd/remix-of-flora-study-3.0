import { describe, expect, it } from "vitest";
import { getTemplatesForSubject } from "./notebookTemplates";

describe("medical notebook quick blocks", () => {
  it.each(["Medicina", "HAM", "SOI", "IESC", "PIEPE", "MCM"])(
    "offers adapted blocks for %s",
    (subject) => {
      const templates = getTemplatesForSubject(subject);
      expect(templates.length).toBeGreaterThanOrEqual(2);
      expect(templates.every((template) => template.html.trim().length > 80)).toBe(true);
    },
  );

  it("keeps patient-identification guidance in the anamnesis block", () => {
    const anamnesis = getTemplatesForSubject("IESC").find((template) => template.id === "iesc-anamnese");
    expect(anamnesis?.html).toContain("Não registre dados identificáveis");
  });
});
