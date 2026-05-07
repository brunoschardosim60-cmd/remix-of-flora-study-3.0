/**
 * floraClient.test.ts
 *
 * Testes unitários para funções do floraClient.
 * Estratégia: mockar supabase.functions.invoke e validar:
 *   - Tratamento correto de erros
 *   - Cache de sessão (sessionStorage)
 *   - Dedup (chamadas simultâneas idênticas)
 *   - Retorno nulo em caso de falha sem lançar exceção
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock do módulo supabase ──────────────────────────────────────────────────
const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mockInvoke },
  },
}));

// Mock de quotaErrors para não abrir modais nos testes
vi.mock("@/lib/quotaErrors", () => ({
  handleQuotaError: vi.fn(),
}));

import { floraGenerateQuiz, floraGenerateFlashcards, floraDecideNextTopic, logUserAction } from "@/lib/floraClient";

// ─── helpers ─────────────────────────────────────────────────────────────────

function mockSuccess(data: unknown) {
  mockInvoke.mockResolvedValueOnce({ data, error: null });
}

function mockError(message = "Internal Server Error") {
  mockInvoke.mockResolvedValueOnce({ data: null, error: new Error(message) });
}

// ─── floraGenerateQuiz ────────────────────────────────────────────────────────

describe("floraGenerateQuiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("retorna dados ao receber resposta bem-sucedida", async () => {
    const questions = [{ pergunta: "Q1", correta: 0, alternativas: ["A", "B"] }];
    mockSuccess({ questions });

    const result = await floraGenerateQuiz("Matemática", "Funções");
    expect(result).toEqual({ questions });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith("flora-engine", expect.objectContaining({
      body: expect.objectContaining({ action: "generate_quiz" }),
    }));
  });

  it("retorna null e não lança exceção quando o invoke falha", async () => {
    mockError("quota exceeded");
    const result = await floraGenerateQuiz("Física", "Cinemática");
    expect(result).toBeNull();
  });

  it("usa cache de sessão na segunda chamada idêntica", async () => {
    const questions = [{ pergunta: "Q1", correta: 0, alternativas: ["A", "B"] }];
    mockSuccess({ questions });

    const first = await floraGenerateQuiz("Química", "Mol");
    const second = await floraGenerateQuiz("Química", "Mol");

    expect(first).toEqual({ questions });
    expect(second).toEqual({ questions });
    // invoke só deve ter sido chamado 1 vez — segunda é do cache
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("força nova chamada quando force=true", async () => {
    const v1 = [{ pergunta: "Q1", correta: 0, alternativas: [] }];
    const v2 = [{ pergunta: "Q2", correta: 1, alternativas: [] }];
    mockSuccess({ questions: v1 });
    await floraGenerateQuiz("História", "Revolução Francesa");

    mockSuccess({ questions: v2 });
    const result = await floraGenerateQuiz("História", "Revolução Francesa", "medio", { force: true });

    expect(result).toEqual({ questions: v2 });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("não cacheia quando mode=review_errors", async () => {
    mockSuccess({ questions: [] });
    await floraGenerateQuiz("Biologia", "Mitose", "medio", { mode: "review_errors" });

    mockSuccess({ questions: [] });
    await floraGenerateQuiz("Biologia", "Mitose", "medio", { mode: "review_errors" });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });
});

// ─── floraGenerateFlashcards ──────────────────────────────────────────────────

describe("floraGenerateFlashcards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("retorna flashcards em resposta bem-sucedida", async () => {
    const cards = [{ frente: "O que é mitose?", verso: "Divisão celular" }];
    mockSuccess({ flashcards: cards });

    const result = await floraGenerateFlashcards("Biologia", "Divisão Celular");
    expect(result).toEqual({ flashcards: cards });
  });

  it("retorna null em caso de erro sem lançar", async () => {
    mockError("timeout");
    const result = await floraGenerateFlashcards("Química", "Ligações");
    expect(result).toBeNull();
  });

  it("usa cache na segunda chamada sem pageContent", async () => {
    mockSuccess({ flashcards: [] });
    await floraGenerateFlashcards("Português", "Figuras");
    await floraGenerateFlashcards("Português", "Figuras");
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("não cacheia quando pageContent é passado", async () => {
    mockSuccess({ flashcards: [] });
    await floraGenerateFlashcards("Física", "Óptica", "conteúdo longo...");

    mockSuccess({ flashcards: [] });
    await floraGenerateFlashcards("Física", "Óptica", "conteúdo longo...");

    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });
});

// ─── floraDecideNextTopic ─────────────────────────────────────────────────────

describe("floraDecideNextTopic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna recomendação em sucesso", async () => {
    const recommendation = { tema: "Funções", materia: "Matemática" };
    mockSuccess(recommendation);
    const result = await floraDecideNextTopic();
    expect(result).toEqual(recommendation);
  });

  it("retorna null em erro (não propaga exceção)", async () => {
    mockError("server error");
    const result = await floraDecideNextTopic();
    expect(result).toBeNull();
  });
});

// ─── logUserAction ────────────────────────────────────────────────────────────

describe("logUserAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("chama invoke com action e data corretos", async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: null });
    await logUserAction("quiz_started", "topic-1", "Matemática", { score: 8 });
    expect(mockInvoke).toHaveBeenCalledWith("flora-engine", expect.objectContaining({
      body: expect.objectContaining({
        action: "log_action",
        data: expect.objectContaining({ actionType: "quiz_started", topicId: "topic-1" }),
      }),
    }));
  });

  it("não lança exceção mesmo quando invoke falha", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("network error"));
    await expect(logUserAction("quiz_started")).resolves.toBeUndefined();
  });
});
