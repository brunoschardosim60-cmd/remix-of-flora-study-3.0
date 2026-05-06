import { supabase } from "@/integrations/supabase/client";
import { handleQuotaError } from "@/lib/quotaErrors";

/**
 * 🔒 Segurança: NENHUMA destas funções envia userId no body.
 * O edge function `flora-engine` extrai o userId direto do JWT (Authorization header),
 * evitando que um cliente manipule o body para agir como outro usuário.
 *
 * OTIMIZAÇÕES v2:
 *   - Cache em memória (sessionStorage) para quiz e flashcards (TTL 5 min)
 *   - Debounce: bloqueia chamadas duplicadas simultâneas (clique duplo, StrictMode)
 *   - Resultado de quiz/flashcard só regenera se o usuário pedir explicitamente
 */

// ─── Cache cliente (sessionStorage, sobrevive refresh da aba) ────────────────
const CACHE_TTL_MS = 5 * 60 * 1000;

interface ClientCacheEntry { value: unknown; expiresAt: number; }

function clientCacheKey(fn: string, ...args: unknown[]): string {
  return `flora:${fn}:${args.map(a => JSON.stringify(a)).join(":")}`;
}

function clientCacheGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: ClientCacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) { sessionStorage.removeItem(key); return null; }
    return entry.value as T;
  } catch { return null; }
}

function clientCacheSet(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + CACHE_TTL_MS }));
  } catch { /* sessionStorage cheio — ignora silenciosamente */ }
}

// ─── Dedup: evita chamadas simultâneas idênticas (clique duplo, React StrictMode) ─
const _inFlight = new Map<string, Promise<unknown>>();

async function withDedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (_inFlight.has(key)) {
    if (import.meta.env.DEV) console.log(`[floraClient] dedup: aguardando ${key}`);
    return _inFlight.get(key) as Promise<T>;
  }
  const promise = fn().finally(() => _inFlight.delete(key));
  _inFlight.set(key, promise);
  return promise;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function logUserAction(
  actionType: string,
  topicId?: string,
  materia?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.functions.invoke("flora-engine", {
      body: { action: "log_action", data: { actionType, topicId, materia, metadata } },
    });
  } catch (err) {
    console.warn("Failed to log user action:", err);
  }
}

export async function getFloraRecommendation(opts: { action: string; data: Record<string, unknown> }, tag: string) {
  const { action, data } = opts;
  const { data: res, error } = await supabase.functions.invoke("flora-engine", {
    body: { action, data },
  });
  if (error) throw error;
  return res;
}

export async function floraStudyNow() {
  try {
    const { data, error } = await supabase.functions.invoke("flora-engine", {
      body: { action: "decide_next_topic" },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("Failed to get Flora recommendation:", err);
    return null;
  }
}

export async function floraStudyNow() {
  try {
    const { data, error } = await supabase.functions.invoke("flora-engine", {
      body: { action: "study_now" },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("Failed to get study content:", err);
    return null;
  }
}

export async function floraStudyNowFollowup(args: {
  tema: string;
  materia: string;
  previousContent: string;
  userRequest: string;
}) {
  try {
    const { data, error } = await supabase.functions.invoke("flora-engine", {
      body: { action: "study_now_followup", data: args },
    });
    if (error) throw error;
    return data as { conteudo: string };
  } catch (err) {
    console.warn("Failed to get study followup:", err);
    return null;
  }
}

/**
 * floraGenerateQuiz
 *
 * Cache: resultados ficam 5 min no sessionStorage.
 * Se o usuário abrir o mesmo quiz de "Matemática / Funções" duas vezes na mesma
 * sessão, a segunda chamada é instantânea — zero requisições à IA.
 *
 * Debounce: clique duplo no botão não dispara 2 chamadas simultâneas.
 *
 * Para forçar regeneração (botão "Novo quiz"), passe force: true.
 */
export async function floraGenerateQuiz(
  materia: string,
  tema: string,
  difficulty: string = "medio",
  options?: {
    questionCount?: number;
    mode?: "normal" | "review_errors";
    previousErrors?: string[];
    force?: boolean;
    pageContent?: string;
  }
) {
  const cacheK = clientCacheKey("quiz", materia, tema, difficulty, options?.questionCount, options?.mode, options?.pageContent?.slice(0, 50));

  if (!options?.force && options?.mode !== "review_errors" && !options?.pageContent) {
    const cached = clientCacheGet(cacheK);
    if (cached) { if (import.meta.env.DEV) console.log("[floraClient] quiz: cache HIT"); return cached; }
  }

  return withDedup(cacheK, async () => {
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: {
          action: "generate_quiz",
          data: {
            materia,
            tema,
            difficulty,
            questionCount: options?.questionCount,
            mode: options?.mode,
            previousErrors: options?.previousErrors,
            pageContent: options?.pageContent,
          },
        },
      });
      if (error) throw error;
      if (!options?.force && options?.mode !== "review_errors" && !options?.pageContent) clientCacheSet(cacheK, data);
      return data;
    } catch (err) {
      await handleQuotaError(err, { feature: "quiz" });
      console.warn("Failed to generate quiz:", err);
      return null;
    }
  });
}

/**
 * floraGenerateFlashcards
 *
 * Cache: 5 min no sessionStorage.
 * Debounce: clique duplo não gera 2 chamadas.
 * Para forçar regeneração passe force: true.
 */
export async function floraGenerateFlashcards(
  materia: string,
  tema: string,
  pageContent?: string,
  options?: { force?: boolean }
) {
  // pageContent pode variar muito — não cacheia se vier conteúdo de página
  const useCache = !pageContent && !options?.force;
  const cacheK = clientCacheKey("flashcards", materia, tema);

  if (useCache) {
    const cached = clientCacheGet(cacheK);
    if (cached) { if (import.meta.env.DEV) console.log("[floraClient] flashcards: cache HIT"); return cached; }
  }

  return withDedup(cacheK, async () => {
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: {
          action: "generate_flashcards",
          data: { materia, tema, pageContent },
        },
      });
      if (error) throw error;
      if (useCache) clientCacheSet(cacheK, data);
      return data;
    } catch (err) {
      await handleQuotaError(err, { feature: "flashcards" });
      console.warn("Failed to generate flashcards:", err);
      return null;
    }
  });
}

export async function checkOnboardingComplete(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("student_onboarding")
      .select("completed")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.completed === true;
  } catch {
    return false;
  }
}

export async function floraGenerateLesson(topic: string, materia: string, level: 'enem' | 'concurso' | 'basico', didacticStyle: 'macetes' | 'aprofundado' | 'normal', content: string) {
  return getFloraRecommendation(
    { action: "generate_lesson", data: { topic, materia, level, didacticStyle, content } },
    "generate_lesson",
  );
}

import { SentimentAnalysisResult } from "./types";

export async function floraAnalyzeSentiment(lastMessage: string, chatHistory: { role: string; content: string }[]): Promise<SentimentAnalysisResult | null> {
  const { data, error } = await supabase.functions.invoke("flora-engine", {
    body: {
      action: "SENTIMENT_ANALYSIS",
      data: {
        lastMessage,
        chatHistory,
      },
    },
  });

  if (error) {
    console.error("Erro ao analisar sentimento:", error);
    return null;
  }

  return data.sentiment as SentimentAnalysisResult;
}

import { Draft } from "./types";

export async function floraGenerateDraft(topic: string, requirements: string): Promise<Draft | null> {
  const { data, error } = await supabase.functions.invoke("flora-engine", {
    body: {
      action: "GENERATE_DRAFT",
      data: {
        topic,
        requirements,
      },
    },
  });

  if (error) {
    console.error("Erro ao gerar rascunho:", error);
    return null;
  }

  return data.draft as Draft;
}
