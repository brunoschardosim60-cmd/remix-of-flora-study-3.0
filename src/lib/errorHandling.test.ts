import { describe, it, expect } from "vitest";
import { getFriendlyErrorMessage } from "@/lib/errorHandling";

describe("errorHandling", () => {
  it("deve retornar mensagem amigável para erro de quota", async () => {
    const quotaError = { error: "quota_exceeded", message: "Limite atingido" };
    const result = await getFriendlyErrorMessage(quotaError);
    expect(result).toBe("Limite atingido");
  });

  it("deve detectar erro de quota por status 402", async () => {
    const paymentError = { status: 402, message: "Payment Required" };
    const result = await getFriendlyErrorMessage(paymentError);
    expect(result).toContain("créditos");
  });

  it("deve detectar erro de rede", async () => {
    const networkError = new Error("Failed to fetch");
    const result = await getFriendlyErrorMessage(networkError);
    expect(result).toContain("conexão");
  });

  it("deve usar fallback para erros desconhecidos", async () => {
    const unknownError = new Error("Algo estranho aconteceu");
    const result = await getFriendlyErrorMessage(unknownError, "Fallback");
    expect(result).toBe("Algo estranho aconteceu");
  });
});