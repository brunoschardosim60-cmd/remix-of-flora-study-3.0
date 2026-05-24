/**
 * src/lib/lessonCache.ts
 *
 * Cache local de lições geradas — salva em localStorage por (tema + materia).
 * Permite ao aluno continuar uma aula após fechar a aba, sem chamar a IA de novo.
 *
 * Limites:
 *   - 10 lições no máximo (LRU)
 *   - 7 dias de TTL
 *   - Inclui estado de progresso (bloco + cena atual)
 */

import type { Lesson } from "@/lib/types";

const KEY = "studyflow:lesson-cache:v2";
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias
const MAX = 10;

export interface LessonCacheEntry {
  lesson: Lesson;
  tema: string;
  materia: string;
  savedAt: number;
  lastAccessAt: number;
  /** Progresso: bloco atual */
  blockIdx?: number;
  /** Progresso: cena atual dentro do bloco */
  sceneIdx?: number;
}

type Store = Record<string, LessonCacheEntry>;

function cacheKey(tema: string, materia: string): string {
  const norm = (s: string) =>
    (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  return `${norm(tema)}|${norm(materia)}`;
}

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch { return {}; }
}

function write(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // quota exceeded — poda pela metade e tenta de novo
    try {
      const pruned = prune(store, Math.floor(MAX / 2));
      localStorage.setItem(KEY, JSON.stringify(pruned));
    } catch { /* desiste silenciosamente */ }
  }
}

function prune(store: Store, keep: number): Store {
  return Object.fromEntries(
    Object.entries(store)
      .sort(([, a], [, b]) => b.lastAccessAt - a.lastAccessAt)
      .slice(0, keep)
  );
}

function evictExpired(store: Store): Store {
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(store).filter(([, e]) => now - e.savedAt < TTL)
  );
}

/** Salva uma lição no cache. Chame após cada bloco ser preenchido. */
export function saveLesson(
  tema: string,
  materia: string,
  lesson: Lesson,
  progress?: { blockIdx?: number; sceneIdx?: number },
): void {
  const store = evictExpired(read());
  const k = cacheKey(tema, materia);
  const now = Date.now();
  store[k] = {
    lesson,
    tema,
    materia,
    savedAt: store[k]?.savedAt ?? now,
    lastAccessAt: now,
    blockIdx: progress?.blockIdx ?? store[k]?.blockIdx,
    sceneIdx: progress?.sceneIdx ?? store[k]?.sceneIdx,
  };
  // Aplica LRU
  const entries = Object.entries(store);
  if (entries.length > MAX) write(prune(store, MAX));
  else write(store);
}

/** Recupera uma lição do cache. Retorna null se não existir ou expirou. */
export function loadLesson(tema: string, materia: string): LessonCacheEntry | null {
  const store = read();
  const k = cacheKey(tema, materia);
  const entry = store[k];
  if (!entry) return null;
  if (Date.now() - entry.savedAt > TTL) {
    delete store[k];
    write(store);
    return null;
  }
  // Atualiza lastAccess
  entry.lastAccessAt = Date.now();
  store[k] = entry;
  write(store);
  return entry;
}

/** Salva apenas o progresso (sem reescrever a lição inteira). */
export function saveProgress(
  tema: string,
  materia: string,
  blockIdx: number,
  sceneIdx: number,
): void {
  const store = read();
  const k = cacheKey(tema, materia);
  if (!store[k]) return;
  store[k].blockIdx = blockIdx;
  store[k].sceneIdx = sceneIdx;
  store[k].lastAccessAt = Date.now();
  write(store);
}

/** Lista todas as lições em cache, mais recente primeiro. */
export function listCachedLessons(): LessonCacheEntry[] {
  const store = evictExpired(read());
  write(store); // persiste a evição
  return Object.values(store).sort((a, b) => b.lastAccessAt - a.lastAccessAt);
}

/** Remove uma lição do cache. */
export function removeLesson(tema: string, materia: string): void {
  const store = read();
  delete store[cacheKey(tema, materia)];
  write(store);
}

/** Limpa todo o cache de lições. */
export function clearLessonCache(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
