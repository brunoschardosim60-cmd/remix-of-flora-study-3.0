/**
 * Cache local de explicações da Flora para questões.
 *
 * Por que: cada clique em "Explicar com Flora" chama o edge function
 * `explain-question`, gastando quota da IA mesmo quando o aluno reabre a mesma
 * questão minutos depois. Como a explicação não muda (questão é fixa), cacheamos
 * por question_id em localStorage — TTL longo (30 dias).
 *
 * Limites:
 *   - 200 explicações no máximo (LRU por last-access)
 *   - 30 dias de TTL
 *   - Sai silenciosamente em quota_exceeded do localStorage
 *
 * Usado em: src/pages/BancoQuestoes.tsx, src/pages/BancoConcurso.tsx
 */

const STORAGE_KEY = "studyflow:explain-cache:v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const MAX_ENTRIES = 200;

export interface ExplainCacheEntry {
  text: string;
  createdAt: number;
  lastAccessAt: number;
  /** Inclui a alternativa marcada para que a explicação corresponda à resposta do aluno. */
  signature: string;
}

type Cache = Record<string, ExplainCacheEntry>;

function readCache(): Cache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Cache) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage cheio — tenta podar e gravar de novo, depois desiste
    try {
      const pruned = pruneCache(cache, Math.floor(MAX_ENTRIES / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } catch {
      /* silencia */
    }
  }
}

function pruneCache(cache: Cache, keep: number): Cache {
  const entries = Object.entries(cache);
  entries.sort((a, b) => b[1].lastAccessAt - a[1].lastAccessAt);
  const out: Cache = {};
  for (const [k, v] of entries.slice(0, keep)) out[k] = v;
  return out;
}

function buildSignature(alternativaMarcada: string): string {
  return `alt:${alternativaMarcada || ""}`;
}

export function getCachedExplanation(
  questionId: string,
  alternativaMarcada: string,
): string | null {
  if (!questionId) return null;
  const cache = readCache();
  const entry = cache[questionId];
  if (!entry) return null;

  const expired = Date.now() - entry.createdAt > TTL_MS;
  const sigMismatch = entry.signature !== buildSignature(alternativaMarcada);
  if (expired || sigMismatch) {
    delete cache[questionId];
    writeCache(cache);
    return null;
  }

  // Atualiza lastAccessAt (LRU)
  entry.lastAccessAt = Date.now();
  cache[questionId] = entry;
  writeCache(cache);
  return entry.text;
}

export function setCachedExplanation(
  questionId: string,
  alternativaMarcada: string,
  text: string,
): void {
  if (!questionId || !text) return;
  const cache = readCache();
  cache[questionId] = {
    text,
    createdAt: Date.now(),
    lastAccessAt: Date.now(),
    signature: buildSignature(alternativaMarcada),
  };

  // Aplica LRU se ultrapassar limite
  const keys = Object.keys(cache);
  if (keys.length > MAX_ENTRIES) {
    writeCache(pruneCache(cache, MAX_ENTRIES));
  } else {
    writeCache(cache);
  }
}

export function clearExplainCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
