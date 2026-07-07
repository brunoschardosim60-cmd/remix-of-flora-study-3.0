import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Send, X, Camera, Loader2, Mic, Square, StopCircle, RefreshCw, Copy, Check, Volume2, VolumeX, Maximize2, Minimize2, MessageSquarePlus, History, Trash2, Pencil, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FloraQuotaIndicator } from "@/components/FloraQuotaIndicator";
import { FloraIcon } from "@/components/FloraIcon";
import ReactMarkdown from "react-markdown";
import { getSuggestionChips } from "@/lib/floraChat";
import { useFloraChatStream } from "@/hooks/useFloraChatStream";
import { floraTTS } from "@/lib/floraTTS";

interface FloraChat {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export function FloraChatPanel({ isOpen, onClose, initialMessage }: FloraChat) {
  const { messages, input, setInput, isSending, objetivo, send, stop, regenerate, resetChat, threadId, threads, selectThread, deleteThread, renameThread } = useFloraChatStream({ isOpen, onClose });
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showThreads, setShowThreads] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function blobToBase64(blob: Blob): Promise<string> {
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return btoa(bin);
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 500) { toast.error("Áudio muito curto."); return; }
        if (blob.size > 8 * 1024 * 1024) { toast.error("Áudio muito longo (máx ~8MB)."); return; }
        setTranscribing(true);
        try {
          const base64 = await blobToBase64(blob);
          const { data, error } = await supabase.functions.invoke("flora-transcribe", {
            body: { audio: base64, mimeType: mime },
          });
          if (error) throw error;
          const text = String(data?.text || "").trim();
          if (!text) throw new Error("Não consegui transcrever.");
          setInput((prev) => prev ? `${prev} ${text}` : text);
          toast.success("Áudio transcrito. Revise e envie.");
        } catch (e: any) {
          toast.error(e?.message || "Erro ao transcrever");
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e: any) {
      toast.error("Sem permissão de microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handlePhoto = async (file: File) => {
    if (!file) return;
    setOcrLoading(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const base64 = btoa(bin);
      const { data, error } = await supabase.functions.invoke("ocr-notebook", { body: { image: base64 } });
      if (error) throw error;
      const text = String(data?.text || "").trim();
      if (!text) throw new Error("Não consegui ler o texto da foto.");
      // Cria thumbnail pequena para o histórico
      const thumb = await createThumbnail(file, 120);
      window.dispatchEvent(new CustomEvent("flora-chat-append", {
        detail: { role: "user", content: `📷 Foto enviada`, metadata: { thumb, ocrText: text.slice(0, 2000) } },
      }));
      setInput(`Explica essa foto passo a passo:\n\n${text}`);
      toast.success(data?.cached ? "Foto reconhecida do cache." : "Texto extraído. Revise e envie.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao ler foto");
    } finally {
      setOcrLoading(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  async function createThumbnail(file: File, maxSize: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
      img.src = url;
    });
  }

  // Pré-preenche input quando abre com mensagem inicial
  useEffect(() => {
    if (isOpen && initialMessage) setInput(initialMessage);
  }, [isOpen, initialMessage, setInput]);

  // Sticky-to-bottom: só auto-scroll se já está no fundo
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(dist < 80);
  }, []);

  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  // Foco automático no textarea ao abrir, ao terminar envio e ao começar nova conversa
  useEffect(() => {
    if (!isOpen) return;
    if (isSending) return;
    textareaRef.current?.focus();
  }, [isOpen, isSending, messages.length]);

  // Atalho Esc: para geração se streaming, senão fecha o painel
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isSending) { e.preventDefault(); stop(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isSending, stop]);

  const copyMessage = async (content: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    } catch {
      toast.error("Não consegui copiar");
    }
  };

  const speakMessage = async (content: string, idx: number) => {
    try {
      if (speakingIdx === idx) {
        floraTTS.stopAudio();
        setSpeakingIdx(null);
        return;
      }
      floraTTS.stopAudio();
      setSpeakingIdx(idx);
      // remove markdown bem simples pra ficar mais natural na fala
      const clean = content.replace(/```[\s\S]*?```/g, "").replace(/[*_#>`~]/g, "").replace(/!\[.*?\]\(.*?\)/g, "").trim();
      if (!clean) { setSpeakingIdx(null); return; }
      const blob = await floraTTS.generateAudio({ text: clean.slice(0, 2500) });
      floraTTS.playAudio(blob, () => setSpeakingIdx((c) => (c === idx ? null : c)));
    } catch (e: any) {
      setSpeakingIdx(null);
      toast.error(e?.message || "Não consegui falar agora");
    }
  };

  const handleNewChat = async () => {
    floraTTS.stopAudio();
    setSpeakingIdx(null);
    await resetChat();
    toast.success("Nova conversa criada.");
  };

  if (!isOpen) return null;

  const chips = getSuggestionChips(objetivo);
  const lastMsg = messages[messages.length - 1];
  const showFollowupChips =
    !isSending && messages.length > 0 && lastMsg?.role === "assistant";

  const panel = (
    <>
      {/* Backdrop: clique fora fecha o chat */}
      <div
        className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent"
        onClick={onClose}
        aria-hidden
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          expanded
            ? "fixed inset-4 sm:top-8 sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[min(760px,calc(100vw-4rem))] sm:h-auto z-50 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
            : "fixed bottom-0 right-0 w-full h-[72vh] sm:bottom-20 sm:right-4 sm:w-[340px] sm:h-[460px] sm:max-w-[calc(100vw-2rem)] sm:max-h-[calc(100vh-6rem)] z-50 sm:rounded-2xl rounded-t-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
        }
      >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border bg-primary/5">
        <FloraIcon className="w-6 h-6 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm">Flora</p>
          <p className="text-xs text-muted-foreground">Sua professora parceira</p>
        </div>
        <FloraQuotaIndicator action="chat" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowThreads((v) => !v)} aria-label="Histórico de conversas" title="Histórico">
          <History className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewChat} aria-label="Nova conversa" title="Nova conversa">
          <MessageSquarePlus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "Reduzir painel" : "Expandir painel"} title={expanded ? "Reduzir" : "Expandir"}>
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fechar chat da Flora">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {showThreads && (
        <div className="border-b border-border bg-muted/30 flex flex-col max-h-64">
          <div className="px-3 py-2 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={threadQuery}
                onChange={(e) => setThreadQuery(e.target.value)}
                placeholder="Buscar conversa..."
                className="w-full text-xs pl-7 pr-2 py-1.5 rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {(() => {
              const q = threadQuery.trim().toLowerCase();
              const filtered = q ? threads.filter((t) => t.title.toLowerCase().includes(q)) : threads;
              if (filtered.length === 0) {
                return <p className="text-xs text-muted-foreground px-4 py-3">{q ? "Nenhuma conversa encontrada." : "Sem conversas salvas ainda."}</p>;
              }
              return (
                <ul className="divide-y divide-border">
                  {filtered.map((t) => (
                    <li key={t.id} className={`flex items-center gap-1 px-3 py-2 hover:bg-muted/60 ${threadId === t.id ? "bg-primary/5" : ""}`}>
                      {renamingId === t.id ? (
                        <form
                          className="flex-1 min-w-0 flex gap-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void renameThread(t.id, renameDraft);
                            setRenamingId(null);
                          }}
                        >
                          <input
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => setRenamingId(null)}
                            onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                            className="flex-1 text-xs px-2 py-1 rounded border border-input bg-background"
                            maxLength={60}
                          />
                        </form>
                      ) : (
                        <button
                          onClick={() => { selectThread(t.id); setShowThreads(false); }}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className="text-xs font-medium truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(t.updated_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenameDraft(t.title); setRenamingId(t.id); }}
                        className="text-muted-foreground hover:text-foreground p-1 rounded"
                        aria-label="Renomear conversa"
                        title="Renomear"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm("Apagar essa conversa?")) void deleteThread(t.id); }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                        aria-label="Apagar conversa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-3 px-2">
            <FloraIcon className="w-10 h-10 text-primary mx-auto" />
            <div className="text-sm text-foreground space-y-2 text-left bg-muted rounded-xl px-3 py-3 mr-8">
              <p className="font-semibold">Oi! Eu sou a Flora, sua professora parceira.</p>
              <p>Estou aqui pra te ajudar de verdade. Posso:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>Montar seu cronograma semanal</li>
                <li>Criar quizzes e flashcards</li>
                <li>Escrever redações e provas</li>
                <li>Tirar dúvidas de qualquer matéria</li>
                <li>Organizar suas revisões</li>
              </ul>
              <p>Me diz: por onde quer começar?</p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              {chips.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="animate-fade-in group">
            <div className={`rounded-xl px-3 py-2 text-sm overflow-hidden break-words ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground ml-8"
                : "bg-muted mr-8"
            }`}>
              {(msg as any).metadata?.thumb && (
                <img
                  src={(msg as any).metadata.thumb}
                  alt="Foto enviada"
                  className="rounded-lg mb-1.5 max-w-[140px] max-h-[140px] object-cover"
                />
              )}
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert [overflow-wrap:anywhere]">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "assistant" && msg.content && (
              <div className="flex gap-1 mt-1 mr-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => copyMessage(msg.content, i)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted"
                  aria-label="Copiar mensagem"
                >
                  {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedIdx === i ? "Copiado" : "Copiar"}
                </button>
                <button
                  onClick={() => void speakMessage(msg.content, i)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted"
                  aria-label={speakingIdx === i ? "Parar fala" : "Ouvir mensagem"}
                >
                  {speakingIdx === i ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  {speakingIdx === i ? "Parar" : "Ouvir"}
                </button>
                {i === messages.length - 1 && !isSending && (
                  <button
                    onClick={() => void regenerate()}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted"
                    aria-label="Regenerar resposta"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {isSending && messages[messages.length - 1]?.role === "user" && (
          <div className="bg-muted rounded-xl px-3 py-3 mr-8 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <FloraIcon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Flora pensando</span>
              <span className="flex gap-0.5 ml-0.5">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}

        {showFollowupChips && (
          <div className="flex flex-wrap gap-1.5 mr-8 pt-1">
            {chips.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePhoto(f); }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => photoRef.current?.click()}
            disabled={ocrLoading || isSending || recording || transcribing}
            aria-label="Explica essa foto"
            title="Explica essa foto"
          >
            {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </Button>
          {(input.trim().length === 0 || recording || transcribing) && (
            <Button
              type="button"
              variant={recording ? "destructive" : "ghost"}
              size="icon"
              className="shrink-0"
              onClick={recording ? stopRecording : startRecording}
              disabled={ocrLoading || isSending}
              aria-label={recording ? "Parar gravação" : "Gravar áudio"}
              title={recording ? "Parar gravação" : "Gravar áudio"}
            >
              {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={isSending ? "Flora pensando..." : "Fala comigo..."}
            className="flex-1 text-sm resize-none rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-100"
            disabled={isSending}
            rows={1}
            style={{ minHeight: "38px", maxHeight: "120px" }}
          />
          {isSending ? (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="shrink-0"
              onClick={stop}
              aria-label="Parar geração"
              title="Parar geração"
            >
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" className="shrink-0" disabled={!input.trim()} aria-label="Enviar mensagem">
              <Send className="w-4 h-4" />
            </Button>
          )}
        </form>
      </div>
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(panel, document.body) : panel;
}
