import { describe, it, expect } from "vitest";
import { parseFloraActions, sanitizeHistory, getSuggestionChips } from "./floraChat";

describe("parseFloraActions", () => {
  it("retorna texto original quando não há ações", () => {
    const { cleanText, actions } = parseFloraActions("Bora estudar matemática hoje.");
    expect(actions).toEqual([]);
    expect(cleanText).toBe("Bora estudar matemática hoje.");
  });

  it("extrai [AÇÃO:QUIZ] com payload JSON", () => {
    const input = `Vamos treinar funções. [AÇÃO:QUIZ]{"materia":"Matemática","tema":"Funções"} Bora?`;
    const { cleanText, actions } = parseFloraActions(input);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("QUIZ");
    expect(actions[0].payload).toEqual({ materia: "Matemática", tema: "Funções" });
    expect(cleanText).not.toContain("[AÇÃO:");
    expect(cleanText).not.toContain("{");
  });

  it("extrai [AÇÃO:FLASHCARDS]", () => {
    const input = `[AÇÃO:FLASHCARDS]{"materia":"Bio","tema":"Célula"}`;
    const { actions } = parseFloraActions(input);
    expect(actions[0]).toEqual({ type: "FLASHCARDS", payload: { materia: "Bio", tema: "Célula" } });
  });

  it("extrai [AÇÃO:CRONOGRAMA] com slots aninhados", () => {
    const input = `Cronograma pronto. [AÇÃO:CRONOGRAMA]{"slots":[{"dia":1,"horario":"08:00","materia":"Mat"}]}`;
    const { actions, cleanText } = parseFloraActions(input);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("CRONOGRAMA");
    expect((actions[0].payload as any).slots).toHaveLength(1);
    expect(cleanText).toBe("Cronograma pronto.");
  });

  it("extrai [AÇÃO:POMODORO]", () => {
    const input = `[AÇÃO:POMODORO]{"workMin":25,"subject":"Física"}`;
    const { actions } = parseFloraActions(input);
    expect(actions[0].type).toBe("POMODORO");
    expect(actions[0].payload).toEqual({ workMin: 25, subject: "Física" });
  });

  it("ignora JSON malformado sem quebrar", () => {
    const input = `[AÇÃO:QUIZ]{materia: nope}`;
    const { actions } = parseFloraActions(input);
    expect(actions).toHaveLength(0);
  });

  it("processa múltiplas ações na mesma resposta", () => {
    const input = `Tá. [AÇÃO:QUIZ]{"a":1} e [AÇÃO:FLASHCARDS]{"b":2}`;
    const { actions } = parseFloraActions(input);
    expect(actions.map((a) => a.type)).toEqual(["QUIZ", "FLASHCARDS"]);
  });
});

describe("sanitizeHistory", () => {
  it("mantém mensagens do usuário intactas", () => {
    const out = sanitizeHistory([{ role: "user", content: "Quero quiz" }]);
    expect(out[0].content).toBe("Quero quiz");
  });

  it("remove blocos [AÇÃO:...] das mensagens do assistant", () => {
    const out = sanitizeHistory([
      { role: "assistant", content: `Bora. [AÇÃO:QUIZ]{"materia":"Mat","tema":"Fn"} Vamos?` },
    ]);
    expect(out[0].content).not.toContain("[AÇÃO:");
    expect(out[0].content).not.toContain("{");
  });
});

describe("getSuggestionChips", () => {
  it("retorna chips para ENEM", () => {
    expect(getSuggestionChips("enem")).toContain("Quero um quiz ENEM");
  });
  it("retorna chips para concurso", () => {
    expect(getSuggestionChips("concurso")).toContain("Simular questão de concurso");
  });
  it("retorna fallback para objetivo desconhecido", () => {
    expect(getSuggestionChips("xpto")).toContain("Me ajuda a estudar");
  });
});