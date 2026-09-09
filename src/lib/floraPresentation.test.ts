import { describe, expect, it } from "vitest";
import { decisionLabel, decisionReason } from "./floraPresentation";

describe("orientações legíveis da Flora", () => {
  it("traduz categorias internas sem expor chaves técnicas", () => {
    expect(decisionLabel("risk_alert")).toBe("Retomar os estudos");
    expect(decisionLabel("unknown_internal_kind")).toBe("Orientação de estudo");
  });
  it("sinaliza duração antiga impossível sem alterar o registro", () => {
    const original = "Você está estudando há 384.6h sem pausa";
    expect(decisionReason("fatigue", original)).toContain("inconsistente");
    expect(decisionReason("fatigue", "Você está estudando há 524,2h sem pausa")).toContain("inconsistente");
    expect(original).toContain("384.6h");
  });
  it("preserva orientações normais", () => {
    expect(decisionReason("fatigue", "Que tal uma pausa?")).toBe("Que tal uma pausa?");
  });
});
