import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  parseFloraActions,
  sanitizeHistory,
  type FloraMessage,
  type Objetivo,
} from "@/lib/floraChat";
import { useFloraActionExecutor } from "@/hooks/useFloraActionExecutor";
import { useStudentConfig } from "@/hooks/useStudentConfig";

interface Options {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Encapsula toda a parte não-visual do FloraChatPanel:
 *  - carregamento de histórico (action: load_chat) + reorder por seq
 *  - resumo diário (1 vez por dia, controlado por localStorage)
 *  - envio com streaming SSE (action: recommend)
 *  - debounce de save_chat (2s)
 *  - flush em rAF/timeout do texto streamed
 *  - despacho de ações [AÇÃO:...] via useFloraActionExecutor
 */
export function useFloraChatStream({ isOpen, onClose }: Options) {
  const { user } = useAuth();
  const { config: studentConfig } = useStudentConfig();
  const executeAction = useFloraActionExecutor(onClose);
  const [messages, setMessages] = useState<FloraMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDailySummaryLoading, setIsDailySummaryLoading] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [objetivo, setObjetivo] = useState<Objetivo>("enem");
  const pendingAssistantTextRef = useRef("");
  const assistantFlushTimerRef = useRef<number | null>(null);
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flora-engine`;

  const flushAssistantText = useCallback(() => {
    assistantFlushTimerRef.current = null;
    const content = pendingAssistantTextRef.current;
    if (!content) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
      }
      return [...prev, { role: "assistant", content }];
    });
  }, []);

  // Permite que outras partes do app (ex.: executor de ações) adicionem mensagens no chat
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { role?: "user" | "assistant"; content?: string } | undefined;
      if (!detail?.content) return;
      setMessages((prev) => [...prev, { role: detail.role || "assistant", content: detail.content! }]);
    };
    window.addEventListener("flora-chat-append", handler);
    return () => window.removeEventListener("flora-chat-append", handler);
  }, []);

  const queueAssistantText = useCallback((content: string) => {
    pendingAssistantTextRef.current = content;
    if (assistantFlushTimerRef.current !== null) return;
    assistantFlushTimerRef.current = window.setTimeout(flushAssistantText, 60);
  }, [flushAssistantText]);

  // Cleanup do timer
  useEffect(() => () => {
    if (assistantFlushTimerRef.current !== null) {
      window.clearTimeout(assistantFlushTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (studentConfig?.objetivo) setObjetivo(studentConfig.objetivo as Objetivo);
  }, [studentConfig]);

  // Carrega histórico ao abrir
  useEffect(() => {
    if (!isOpen || chatLoaded || !user) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("flora-engine", {
          body: { action: "load_chat" },
        });
        if (data?.messages?.length) {
          const loaded: (FloraMessage & { seq?: number; created_at?: string })[] = data.messages.map((m: any) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            seq: typeof m.seq === "number" ? m.seq : undefined,
            created_at: m.created_at,
          }));
          let outOfOrder = false;
          for (let i = 1; i < loaded.length; i++) {
            const prevSeq = loaded[i - 1].seq ?? -1;
            const curSeq = loaded[i].seq ?? -1;
            if (curSeq < prevSeq) { outOfOrder = true; break; }
          }
          if (outOfOrder) {
            loaded.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
            toast.info("Mensagens foram reordenadas automaticamente.");
          }
          setMessages(loaded.map(({ role, content }) => ({ role, content })));
        }
      } catch { /* silent */ }
      setChatLoaded(true);
    })();
  }, [isOpen, chatLoaded, user]);

  // Resumo diário (1x/dia, só se chat vazio)
  useEffect(() => {
    if (!isOpen || !chatLoaded || !user || isDailySummaryLoading || messages.length > 0) return;
    const todayKey = `flora-daily-summary-${user.id}-${new Date().toISOString().split("T")[0]}`;
    if (typeof window !== "undefined") {
      try {
        if (window.localStorage.getItem(todayKey)) return;
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith("flora-daily-summary-") && k !== todayKey) keysToRemove.push(k);
        }
        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.setItem(todayKey, "1");
      } catch { /* silent */ }
    }

    let cancelled = false;
    (async () => {
      setIsDailySummaryLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            action: "recommend",
            data: {
              message: "Me dê um resumo rápido do meu progresso hoje e o que devo focar. Não repita boas-vindas.",
              history: sanitizeHistory(messages.slice(-5)),
            },
          }),
        });

        if (!resp.ok || !resp.body || cancelled) return;
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let content = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") { buffer = ""; break; }
            try {
              const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
              if (typeof delta === "string") {
                content += delta;
                const { cleanText } = parseFloraActions(content);
                queueAssistantText(cleanText);
              }
            } catch { /* skip */ }
          }
        }

        if (content && !cancelled) {
          const { cleanText } = parseFloraActions(content);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: cleanText } : m));
            }
            return [...prev, { role: "assistant", content: cleanText }];
          });
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setIsDailySummaryLoading(false); }
    })();

    return () => { cancelled = true; setIsDailySummaryLoading(false); };
  }, [isOpen, chatLoaded, user, CHAT_URL, messages, isDailySummaryLoading, queueAssistantText]);

  // Save debounced (2s)
  useEffect(() => {
    if (!user || messages.length === 0 || !chatLoaded) return;
    const timer = setTimeout(() => {
      supabase.functions.invoke("flora-engine", {
        body: {
          action: "save_chat",
          data: { messages: messages.slice(-100).map((m) => ({ role: m.role, content: m.content })) },
        },
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [messages, user, chatLoaded]);

  const send = useCallback(async () => {
    if (!input.trim() || isSending) return;
    const messageToSend = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: messageToSend }]);
    setInput("");
    setIsSending(true);
    let assistantContent = "";

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          action: "recommend",
          data: { message: messageToSend, history: sanitizeHistory(messages.slice(-30)) },
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          const j = await resp.json().catch(() => ({}));
          throw new Error(j?.message || "Limite diário de chamadas IA atingido. Tente amanhã ou faça upgrade.");
        }
        if (resp.status === 503) throw new Error("A Flora está sobrecarregada agora. Tenta em instantes.");
        if (resp.status === 401) throw new Error("Sessão expirada. Recarregue a página.");
        throw new Error(`Erro ${resp.status}. Tenta de novo.`);
      }

      if (!resp.body) {
        const j = await resp.json();
        assistantContent = j?.choices?.[0]?.message?.content || j?.content || JSON.stringify(j);
      } else {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIdx).trim();
            buffer = buffer.slice(newlineIdx + 1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") { buffer = ""; break; }
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                assistantContent += delta;
                const { cleanText } = parseFloraActions(assistantContent);
                queueAssistantText(cleanText);
              }
            } catch { /* skip */ }
          }
        }
      }

      if (assistantContent) {
        const { cleanText, actions } = parseFloraActions(assistantContent);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: cleanText } : m));
          }
          return [...prev, { role: "assistant", content: cleanText }];
        });
        for (const action of actions) executeAction(action);
      } else {
        setMessages((prev) => {
          if (prev[prev.length - 1]?.role !== "assistant") {
            return [...prev, { role: "assistant", content: "Não consegui responder agora. Tenta de novo?" }];
          }
          return prev;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tive um problema. Tenta de novo?";
      console.error("Flora chat error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setIsSending(false);
    }
  }, [CHAT_URL, executeAction, input, isSending, messages, queueAssistantText]);

  return {
    messages,
    input,
    setInput,
    isSending,
    objetivo,
    send,
  };
}
