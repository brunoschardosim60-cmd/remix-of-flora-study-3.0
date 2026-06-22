// Helpers de quota + logging de uso da IA.
// Reutilizado por todas edge functions que chamam IA (flora-engine, essay-corrector, solve-math).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

/**
 * Tabela de preços por provider (USD por 1M tokens).
 * Referência: preços públicos de Nov/2024 dos providers usados em providers.ts.
 * Quando não conseguimos identificar o provider, cai no fallback genérico.
 */
export const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  // Gemini 2.0 Flash (gratuito até quota; valor médio para estimativa)
  gemini:             { in: 0.10, out: 0.40 },
  gemini_2:           { in: 0.10, out: 0.40 },
  gemini_25_preview:  { in: 0.15, out: 0.60 },
  gemini_25_preview_2:{ in: 0.15, out: 0.60 },
  // Groq Llama 4 Scout
  groq:               { in: 0.11, out: 0.34 },
  // Mistral nemo
  mistral:            { in: 0.15, out: 0.15 },
  // Cerebras Llama
  cerebras:           { in: 0.10, out: 0.10 },
  // DeepSeek chat
  deepseek:           { in: 0.27, out: 1.10 },
  // OpenAI gpt-4o-mini
  openai:             { in: 0.15, out: 0.60 },
  // Lovable AI Gateway (gemini-2.5-flash via gateway)
  lovable:            { in: 0.10, out: 0.40 },
  // Hits de cache/dedup não custam nada
  cache:              { in: 0,    out: 0 },
  dedup:              { in: 0,    out: 0 },
};
const FALLBACK_PRICE = { in: 0.25, out: 0.75 };

export function estimateCost(provider: string | undefined, tokensIn: number, tokensOut: number): number {
  const p = (provider && MODEL_PRICING[provider]) || FALLBACK_PRICE;
  return (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out;
}

export interface QuotaResult {
  tier: "free" | "pro" | "pro_plus" | string;
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
  /** True quando o bloqueio veio do rate-limit por minuto/hora (não da quota diária). */
  rate_limited?: boolean;
  /** Segundos sugeridos antes do usuário tentar de novo (quando rate_limited). */
  retry_after?: number;
}

/**
 * Rate-limits por minuto e por hora (proteção anti-loop / anti-abuso).
 * Calibrado pra ser bem mais largo do que uso humano normal mas barrar bugs
 * que fariam dezenas de chamadas em segundos.
 */
const RATE_LIMITS: Record<string, { perMinute: number; perHour: number }> = {
  free:     { perMinute: 6,  perHour: 60 },
  pro:      { perMinute: 20, perHour: 250 },
  pro_plus: { perMinute: 60, perHour: 800 },
};

async function checkOneRateWindow(
  supabase: SupabaseClient,
  userId: string,
  windowSeconds: number,
  max: number,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  try {
    const { data, error } = await supabase.rpc("check_user_rate_limit", {
      p_user_id: userId,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error || !data) return { allowed: true, used: 0, limit: max }; // fail-open p/ rate (não bloqueia se RPC falhar)
    return data as { allowed: boolean; used: number; limit: number };
  } catch {
    return { allowed: true, used: 0, limit: max };
  }
}

/** Verifica rate-limit (minuto/hora) + quota diária antes de chamar IA. */
export async function checkQuota(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
): Promise<QuotaResult> {
  try {
    const { data, error } = await supabase.rpc("check_ai_quota", {
      p_user_id: userId,
      p_action: actionType,
    });
    if (error || !data) {
      console.error("[usage] check_ai_quota FAIL-CLOSED:", error?.message);
      return { tier: "free", limit: 0, used: 0, remaining: 0, allowed: false };
    }
    const quota = data as QuotaResult;
    if (!quota.allowed) return quota;

    // Rate-limit por tier — barra loops antes de queimar a quota diária inteira
    const limits = RATE_LIMITS[quota.tier] ?? RATE_LIMITS.free;
    const [minute, hour] = await Promise.all([
      checkOneRateWindow(supabase, userId, 60, limits.perMinute),
      checkOneRateWindow(supabase, userId, 3600, limits.perHour),
    ]);
    if (!minute.allowed) {
      return { ...quota, allowed: false, rate_limited: true, retry_after: 60 };
    }
    if (!hour.allowed) {
      return { ...quota, allowed: false, rate_limited: true, retry_after: 3600 };
    }
    return quota;
  } catch (e) {
    console.error("[usage] check_ai_quota exception FAIL-CLOSED:", e);
    return { tier: "free", limit: 0, used: 0, remaining: 0, allowed: false };
  }
}

/** Log de uma chamada IA (sucesso ou falha). Roda fire-and-forget. */
export async function logAIUsage(
  supabase: SupabaseClient,
  params: {
    userId: string;
    actionType: string;
    model?: string;
    provider?: string;
    tokensIn?: number;
    tokensOut?: number;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const tokensIn = params.tokensIn ?? 0;
    const tokensOut = params.tokensOut ?? 0;
    const cost = estimateCost(params.provider, tokensIn, tokensOut);
    const metadata = { ...(params.metadata ?? {}), provider: params.provider ?? "unknown" };
    await supabase.from("ai_usage_logs").insert({
      user_id: params.userId,
      action_type: params.actionType,
      model: params.model ?? "",
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_estimate: cost,
      success: params.success,
      error_message: params.errorMessage ?? "",
      metadata,
    });
  } catch (e) {
    console.warn("[usage] logAIUsage failed:", e);
  }
}

/** Helper p/ criar resposta JSON 429 quando quota estourou. */
export function quotaExceededResponse(quota: QuotaResult, corsHeaders: Record<string, string>): Response {
  if (quota.rate_limited) {
    const wait = quota.retry_after === 3600
      ? "uma hora"
      : `${quota.retry_after ?? 60} segundos`;
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: `Muitas requisições em pouco tempo. Aguarde ${wait} e tente novamente.`,
        quota,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(quota.retry_after ?? 60),
        },
      },
    );
  }
  return new Response(
    JSON.stringify({
      error: "quota_exceeded",
      message: `Limite diário do plano ${quota.tier} atingido (${quota.used}/${quota.limit}). Tente novamente amanhã ou faça upgrade.`,
      quota,
    }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
