import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { startIdlePrefetch, prefetchForContext } from "@/lib/prefetch";
import type { User } from "@supabase/supabase-js";

/**
 * Bootstrap do dashboard:
 * - aplica cores customizadas
 * - inicia idle prefetch + prefetch específico do contexto "dashboard"
 * - dispara análise proativa da Flora (1x por sessão por dia)
 * - resolve deep-link `?revisar=hoje|atrasadas` rolando até a seção
 *
 * Centralizar evita ruído no Index.tsx e facilita troca da estratégia
 * (ex.: só rodar em rota raiz, ou desabilitar em dispositivos lentos).
 */
export function useDashboardBootstrap(user: User | null) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Custom colors + idle prefetch (uma vez no mount)
  useEffect(() => {
    import("@/components/CustomThemeDialog").then((m) => m.applyCustomColors());
    startIdlePrefetch();
    prefetchForContext("dashboard");
  }, []);

  // Flora: análise proativa 1x/dia/sessão
  useEffect(() => {
    if (!user) return;
    const key = `flora-analyze-${user.id}-${new Date().toISOString().split("T")[0]}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.functions
      .invoke("flora-engine", { body: { action: "analyze_and_suggest" } })
      .then(() => {
        window.dispatchEvent(new Event("flora-decisions-updated"));
      })
      .catch(() => {});
  }, [user]);

  // Deep link de notificações: rola até a seção pedida
  useEffect(() => {
    const target = searchParams.get("revisar");
    if (!target) return;
    const id = target === "atrasadas" ? "revisoes-atrasadas" : "revisoes-hoje";
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      const next = new URLSearchParams(searchParams);
      next.delete("revisar");
      setSearchParams(next, { replace: true });
    }, 600);
    return () => clearTimeout(t);
  }, [searchParams, setSearchParams]);
}