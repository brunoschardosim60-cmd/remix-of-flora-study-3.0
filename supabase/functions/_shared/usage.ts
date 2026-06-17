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
}

/** Verifica quota antes de chamar IA. Retorna allowed=false se estourou. */
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
    return data as QuotaResult;
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
  return new Response(
    JSON.stringify({
      error: "quota_exceeded",
      message: `Limite diário do plano ${quota.tier} atingido (${quota.used}/${quota.limit}). Tente novamente amanhã ou faça upgrade.`,
      quota,
    }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
