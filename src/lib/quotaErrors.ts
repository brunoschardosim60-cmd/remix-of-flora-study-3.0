import { toast } from "sonner";

/**
 * Tenta extrair payload JSON de um erro vindo de supabase.functions.invoke.
 * Edge functions retornam 429 com body { error: "quota_exceeded", message, quota }.
 * O cliente do Supabase embrulha isso em um FunctionsHttpError cujo `context`
 * contém a Response original — precisamos ler `.json()` dela.
 */
export interface QuotaInfo {
  tier: string;
  used: number;
  limit: number;
  remaining: number;
  allowed?: boolean;
}

export interface ParsedFunctionError {
  isQuota: boolean;
  status?: number;
  message?: string;
  quota?: QuotaInfo;
}

export async function parseFunctionError(err: unknown): Promise<ParsedFunctionError> {
  try {
    const anyErr = err as { context?: Response; status?: number; message?: string };
    const ctx = anyErr?.context;
    if (ctx && typeof ctx.json === "function") {
      const status = ctx.status;
      try {
        const body = await ctx.clone().json();
        if (body?.error === "quota_exceeded" || status === 429 || status === 402) {
          return { isQuota: true, status, message: body?.message, quota: body?.quota };
        }
        return { isQuota: false, status, message: body?.message ?? anyErr.message };
      } catch {
        return { isQuota: status === 429 || status === 402, status, message: anyErr.message };
      }
    }
    // Sem context: detectar pelo status/error plano no objeto.
    const plain = err as { status?: number; message?: string; error?: string };
    const status = plain?.status;
    const isQuota = plain?.error === "quota_exceeded" || status === 402 || status === 429;
    return { isQuota, status, message: plain?.message };
  } catch {
    return { isQuota: false };
  }
}

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
};

/** Retorna até quando o limite reseta (próxima 00:00 local). */
function timeUntilReset(): string {
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(24, 0, 0, 0);
  const diffMs = reset.getTime() - now.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h${minutes > 0 ? ` ${minutes}min` : ""}`;
  return `${minutes}min`;
}

/**
 * Mostra toast amigável quando uma chamada de IA é bloqueada por quota.
 * Inclui próximo passo: upgrade (se Free/Pro) ou aguardar reset.
 * Retorna `true` se o erro era de quota e foi tratado.
 */
export async function handleQuotaError(err: unknown, opts?: { feature?: string; onUpgrade?: () => void }): Promise<boolean> {
  const parsed = await parseFunctionError(err);
  if (!parsed.isQuota) return false;

  const tier = parsed.quota?.tier ?? "free";
  const tierLabel = TIER_LABEL[tier] ?? tier;
  const used = parsed.quota?.used ?? 0;
  const limit = parsed.quota?.limit ?? 0;
  const feature = opts?.feature ? ` de ${opts.feature}` : "";
  const reset = timeUntilReset();

  const canUpgrade = tier !== "pro_plus";
  const description = canUpgrade
    ? `Você usou ${used}/${limit} hoje. Reseta em ${reset}.`
    : `Você usou ${used}/${limit} hoje. Reseta em ${reset}.`;

  // Toast curto só como confirmação visual; decisão real fica no modal global.
  toast.error(`Limite diário${feature} atingido`, { description, duration: 4000 });

  // Dispara modal global (Dialog desktop / Sheet mobile)
  if (typeof window !== "undefined" && parsed.quota) {
    window.dispatchEvent(
      new CustomEvent("flora:quota-limit", {
        detail: {
          feature: opts?.feature,
          quota: {
            tier: parsed.quota.tier,
            used: parsed.quota.used,
            limit: parsed.quota.limit,
            remaining: parsed.quota.remaining,
            allowed: false,
          },
        },
      }),
    );
  }

  return true;
}