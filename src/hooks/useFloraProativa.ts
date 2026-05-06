/**
 * useFloraProativa
 *
 * Orquestra a Flora proativa: chama analyze_and_suggest quando o usuário
 * abre o app e periodicamente, armazenando o insight para exibição.
 *
 * Regras:
 * - Só roda se o usuário estiver logado
 * - Respeita cooldown de 4h entre chamadas (salvo em localStorage)
 * - Expõe o insight atual e funções para aceitar/dispensar
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FloraInsight {
  type: "increase_difficulty" | "reduce_load" | "adjust_plan" | "proactive_suggestion" | "nenhuma";
  reasoning: string;   // frase curta e motivadora dirigida ao aluno
  details?: string;    // contexto extra
  changes?: { description: string };
  createdAt: number;
}

const STORAGE_KEY = "flora-proativa-insight";
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 horas

function loadCached(): FloraInsight | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: FloraInsight = JSON.parse(raw);
    // Expira após 24h para não mostrar insight velho
    if (Date.now() - parsed.createdAt > 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCached(insight: FloraInsight) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(insight));
  } catch {}
}

function clearCached() {
  localStorage.removeItem(STORAGE_KEY);
}

function getLastCallTime(): number {
  try {
    return parseInt(localStorage.getItem("flora-proativa-last-call") || "0", 10);
  } catch {
    return 0;
  }
}

function setLastCallTime() {
  try {
    localStorage.setItem("flora-proativa-last-call", String(Date.now()));
  } catch {}
}

export function useFloraProativa(userId: string | undefined) {
  const [insight, setInsight] = useState<FloraInsight | null>(() => loadCached());
  const [loading, setLoading] = useState(false);

  const fetchInsight = useCallback(async (force = false) => {
    if (!userId) return;
    const lastCall = getLastCallTime();
    if (!force && Date.now() - lastCall < COOLDOWN_MS) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: { action: "analyze_and_suggest" },
      });
      if (error) throw error;
      if (!data?.suggestion || data.suggestion.type === "nenhuma") {
        setLastCallTime();
        return;
      }
      const newInsight: FloraInsight = {
        ...data.suggestion,
        createdAt: Date.now(),
      };
      setInsight(newInsight);
      saveCached(newInsight);
      setLastCallTime();
    } catch (err) {
      // Falha silenciosa — Flora proativa nunca quebra o app
      console.warn("[FloraProativa] analyze_and_suggest falhou:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Roda na abertura do app (com cooldown)
  useEffect(() => {
    if (!userId) return;
    // Pequeno delay para não competir com o carregamento inicial
    const timer = setTimeout(() => fetchInsight(), 3000);
    return () => clearTimeout(timer);
  }, [userId, fetchInsight]);

  const dismiss = useCallback(() => {
    setInsight(null);
    clearCached();
  }, []);

  const accept = useCallback(async (decisionId?: string) => {
    if (!userId || !insight) return;
    setInsight(null);
    clearCached();
    // Registra aceitação no banco (Flora aprende)
    try {
      if (decisionId) {
        await supabase
          .from("flora_decisions")
          .update({ accepted: true })
          .eq("id", decisionId);
      }
    } catch {}
  }, [userId, insight]);

  return { insight, loading, dismiss, accept, refetch: () => fetchInsight(true) };
}
