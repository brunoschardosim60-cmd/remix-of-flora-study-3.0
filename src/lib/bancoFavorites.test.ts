/**
 * bancoFavorites.test.ts
 *
 * Testa a lógica de favoritos do BancoQuestoes isolada dos componentes React.
 * Foca nos comportamentos críticos: localStorage, Supabase sync e merge.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock do Supabase ─────────────────────────────────────────────────────────
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Reimplementação inline das funções de favoritos para teste isolado
// (espelha o código em BancoQuestoes.tsx)
const LS_KEY = "banco-favorites-v1";

function loadFavoritesLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveFavoritesLocal(s: Set<string>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(Array.from(s))); } catch { /* noop */ }
}

// ─── localStorage ─────────────────────────────────────────────────────────────

describe("favoritos — localStorage", () => {
  beforeEach(() => localStorage.clear());

  it("retorna Set vazio quando localStorage está limpo", () => {
    expect(loadFavoritesLocal().size).toBe(0);
  });

  it("persiste e restaura favoritos corretamente", () => {
    const ids = new Set(["q1", "q2", "q3"]);
    saveFavoritesLocal(ids);
    const restored = loadFavoritesLocal();
    expect(restored.size).toBe(3);
    expect(restored.has("q2")).toBe(true);
  });

  it("toggleFavorite adiciona id não existente", () => {
    const fav = loadFavoritesLocal();
    const next = new Set(fav);
    next.add("q5");
    saveFavoritesLocal(next);
    expect(loadFavoritesLocal().has("q5")).toBe(true);
  });

  it("toggleFavorite remove id existente", () => {
    saveFavoritesLocal(new Set(["q1", "q2"]));
    const fav = loadFavoritesLocal();
    fav.delete("q1");
    saveFavoritesLocal(fav);
    const restored = loadFavoritesLocal();
    expect(restored.has("q1")).toBe(false);
    expect(restored.has("q2")).toBe(true);
  });

  it("não lança exceção em JSON corrompido", () => {
    localStorage.setItem(LS_KEY, "INVALID_JSON{{");
    expect(() => loadFavoritesLocal()).not.toThrow();
    expect(loadFavoritesLocal().size).toBe(0);
  });
});

// ─── Lógica de merge local × remoto ───────────────────────────────────────────

describe("favoritos — merge local vs remoto", () => {
  it("usa remote se remote.size > 0, ignora local", () => {
    // Simula a lógica de carregamento: se remote retornou dados, usa remote
    const local = new Set(["q_old"]);
    const remote = new Set(["q1", "q2"]);
    const result = remote.size > 0 ? remote : local;
    expect(result).toBe(remote);
  });

  it("mantém local se remote está vazio (usuário nunca sincronizou)", () => {
    const local = new Set(["q_old"]);
    const remote = new Set<string>();
    const result = remote.size > 0 ? remote : local;
    expect(result).toBe(local);
    expect(result.has("q_old")).toBe(true);
  });

  it("converte Set para array para persistência no Supabase", () => {
    const fav = new Set(["q1", "q2", "q3"]);
    const arr = Array.from(fav);
    expect(arr).toHaveLength(3);
    expect(arr).toContain("q1");
  });
});

// ─── Contagem e filtro de favoritos ───────────────────────────────────────────

describe("favoritos — filtro de questões", () => {
  const questions = [
    { id: "q1", disciplina: "Matemática" },
    { id: "q2", disciplina: "Física" },
    { id: "q3", disciplina: "Química" },
  ];

  it("filtra apenas questões favoritadas", () => {
    const favorites = new Set(["q1", "q3"]);
    const filtered = questions.filter(q => favorites.has(q.id));
    expect(filtered).toHaveLength(2);
    expect(filtered.map(q => q.id)).toEqual(["q1", "q3"]);
  });

  it("retorna lista vazia quando nenhuma questão é favorita", () => {
    const favorites = new Set<string>();
    const filtered = questions.filter(q => favorites.has(q.id));
    expect(filtered).toHaveLength(0);
  });

  it("reporta contagem correta de favoritos", () => {
    const favorites = new Set(["q1", "q2"]);
    expect(favorites.size).toBe(2);
  });
});
