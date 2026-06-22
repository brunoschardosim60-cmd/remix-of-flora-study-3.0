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
import { generateImageFromPrompt } from "@/lib/floraImages";

// Detecta pedidos de geração de imagem ("desenha…", "gera uma imagem de…", "ilustra…").
// Retorna o prompt limpo ou null.
function extractImageRequest(text: string): string | null {
  const t = text.trim();
  const re = /^(?:flora,?\s+)?(?:me\s+)?(?:desenha|desenhe|gera(?:r)?(?:\s+uma)?\s+imagem(?:\s+de)?|cria(?:r)?(?:\s+uma)?\s+imagem(?:\s+de)?|faz(?:er)?(?:\s+uma)?\s+imagem(?:\s+de)?|ilustra(?:r|\s+isso)?|imagem\s+de|figura\s+de)\s*[:,]?\s*(.+)$/i;
  const m = t.match(re);
  if (!m) return null;
  const prompt = m[1].trim();
  return prompt.length >= 2 ? prompt : null;
}

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
  const executeAction = useFloraActionExecutor(onClose);
  const [messages, setMessages] = useState<FloraMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDailySummaryLoading, setIsDailySummaryLoading] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [objetivo, setObjetivo] = useState<Objetivo>("enem");
  const pendingAssistantTextRef = useRef("");
  const assistantFlushTimerRef = useRef<number | null>(null);
  const sendAbortRef = useRef<AbortController | null>(null);
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
      const detail = (e as CustomEvent).detail as { role?: "user" | "assistant"; content?: string; metadata?: Record<string, unknown> } | undefined;
      if (!detail?.content) return;
      setMessages((prev) => [...prev, { role: detail.role || "assistant", content: detail.content!, metadata: detail.metadata }]);
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
    sendAbortRef.current?.abort();
  }, []);

  // Cancela stream em andamento quando o painel é fechado
  useEffect(() => {
    if (!isOpen && sendAbortRef.current) {
      sendAbortRef.current.abort();
      sendAbortRef.current = null;
    }
  }, [isOpen]);

  // Objetivo do onboarding (ajusta chips)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_onboarding")
      .select("objetivo")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.objetivo) setObjetivo(data.objetivo as Objetivo);
      });
  }, [user]);

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
            metadata: m.metadata || undefined,
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
          setMessages(loaded.map(({ role, content, metadata }) => ({ role, content, metadata })));
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
          data: { messages: messages.slice(-100).map((m) => ({ role: m.role, content: m.content, metadata: m.metadata || {} })) },
        },
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [messages, user, chatLoaded]);

  const send = useCallback(async (overrideText?: string) => {
    const raw = overrideText !== undefined ? overrideText : input;
    if (!raw.trim() || isSending) return;
    const messageToSend = raw.trim();
    setMessages((prev) => [...prev, { role: "user", content: messageToSend }]);
    if (overrideText === undefined) setInput("");
    setIsSending(true);

    // Intercepta pedidos de imagem antes de chamar o LLM
    const imgPrompt = extractImageRequest(messageToSend);
    if (imgPrompt) {
      try {
        const url = await generateImageFromPrompt(imgPrompt);
        if (url) {
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: `Aqui está: **${imgPrompt}**\n\n![${imgPrompt}](${url})`,
          }]);
        } else {
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: "Não consegui gerar a imagem agora. Tenta de novo daqui a pouco?",
          }]);
        }
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: "Deu erro ao gerar a imagem." }]);
      } finally {
        setIsSending(false);
      }
      return;
    }

    let assistantContent = "";
    sendAbortRef.current?.abort();
    const abort = new AbortController();
    sendAbortRef.current = abort;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          action: "recommend",
          data: {
            message: messageToSend,
            history: sanitizeHistory(messages.slice(-8)),
            currentPath: typeof window !== "undefined" ? window.location.pathname : "/",
          },
        }),
        signal: abort.signal,
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
      if ((err as any)?.name === "AbortError") {
        setIsSending(false);
        return;
      }
      const msg = err instanceof Error ? err.message : "Tive um problema. Tenta de novo?";
      console.error("Flora chat error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      if (sendAbortRef.current === abort) sendAbortRef.current = null;
      setIsSending(false);
    }
  }, [CHAT_URL, executeAction, input, isSending, messages, queueAssistantText]);

  const stop = useCallback(() => {
    sendAbortRef.current?.abort();
    sendAbortRef.current = null;
    if (assistantFlushTimerRef.current !== null) {
      window.clearTimeout(assistantFlushTimerRef.current);
      assistantFlushTimerRef.current = null;
    }
    const pending = pendingAssistantTextRef.current;
    if (pending) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: pending + " _(interrompido)_" } : m));
        }
        return [...prev, { role: "assistant", content: pending + " _(interrompido)_" }];
      });
    }
    pendingAssistantTextRef.current = "";
    setIsSending(false);
  }, []);

  const regenerate = useCallback(async () => {
    if (isSending) return;
    // Find last user message; drop everything after it (incluindo última assistente)
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[lastUserIdx].content;
    setMessages((prev) => prev.slice(0, lastUserIdx));
    setInput(lastUserMsg);
    // pequena espera pro state assentar e então dispara
    setTimeout(() => {
      // Reusa send lendo input atual — usamos um fluxo simples: dispara via evento
      window.dispatchEvent(new CustomEvent("flora-chat-regenerate-trigger"));
    }, 30);
  }, [isSending, messages]);

  return {
    messages,
    input,
    setInput,
    isSending,
    objetivo,
    send,
    stop,
    regenerate,
  };
}
