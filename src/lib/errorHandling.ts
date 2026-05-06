import { toast } from "sonner";
import { parseFunctionError } from "@/lib/quotaErrors";

interface ReportErrorOptions {
  toastMessage?: string;
  devOnly?: boolean;
}

export function isLocalDev() {
  return typeof window !== "undefined" && window.location.hostname === "127.0.0.1";
}

export function toErrorMessage(error: unknown, fallback = "Algo deu errado.") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  const maybeError = error as { message?: unknown };
  if (maybeError?.message && typeof maybeError.message === "string") {
    return maybeError.message;
  }

  return fallback;
}

export async function getFriendlyErrorMessage(error: unknown, fallback = "Algo deu errado.") {
  try {
    const parsed = await parseFunctionError(error);
    if (parsed.isQuota || parsed.status === 402 || parsed.status === 429) {
      const msg = parsed.message || "";
      const lower = msg.toLowerCase();
      const isFriendly = lower.includes("crédito") || lower.includes("limite") || lower.includes("requisições");
      if (isFriendly) return msg;
      if (parsed.status === 429) {
        return "Limite de requisições atingido. Aguarde um momento e tente novamente.";
      }
      return "Seus créditos de IA acabaram. Tente novamente mais tarde ou faça upgrade.";
    }
  } catch {
    // Ignore parse failures and continue to default message.
  }

  const raw = toErrorMessage(error, fallback);
  const lowerRaw = raw.toLowerCase();

  if (lowerRaw.includes("quota") || lowerRaw.includes("créditos") || lowerRaw.includes("payment_required") || lowerRaw.includes("402")) {
    return "Créditos de IA esgotados. Tente novamente mais tarde ou faça upgrade.";
  }
  if (lowerRaw.includes("429") || lowerRaw.includes("too many requests") || lowerRaw.includes("limite diário")) {
    return "Limite de requisições atingido. Aguarde um momento e tente novamente.";
  }
  if (lowerRaw.includes("network") || lowerRaw.includes("failed to fetch") || lowerRaw.includes("timeout")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return raw;
}

export function reportError(context: string, error: unknown, options?: ReportErrorOptions) {
  if (!options?.devOnly || isLocalDev()) {
    console.error(context, error);
  }

  if (options?.toastMessage) {
    toast.error(options.toastMessage);
  }
}

export async function runWithErrorToast<T>(
  task: () => Promise<T>,
  context: string,
  toastMessage: string,
) {
  try {
    return await task();
  } catch (error) {
    reportError(context, error, { toastMessage });
    throw error;
  }
}
