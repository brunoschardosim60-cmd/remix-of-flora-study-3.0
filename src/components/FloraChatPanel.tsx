import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, X, Camera, Loader2, Mic, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FloraQuotaIndicator } from "@/components/FloraQuotaIndicator";
import { FloraIcon } from "@/components/FloraIcon";
import ReactMarkdown from "react-markdown";
import { getSuggestionChips } from "@/lib/floraChat";
import { useFloraChatStream } from "@/hooks/useFloraChatStream";

interface FloraChat {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export function FloraChatPanel({ isOpen, onClose, initialMessage }: FloraChat) {
  const { messages, input, setInput, isSending, objetivo, send } = useFloraChatStream({ isOpen, onClose });
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
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

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!isOpen) return null;

  const chips = getSuggestionChips(objetivo);

  return (
    <div className="fixed bottom-0 right-0 w-full h-[80vh] sm:bottom-20 sm:right-4 sm:w-[380px] sm:h-[500px] sm:max-w-[calc(100vw-2rem)] sm:max-h-[calc(100vh-6rem)] z-50 sm:rounded-2xl rounded-t-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border bg-primary/5">
        <FloraIcon className="w-6 h-6 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm">Flora</p>
          <p className="text-xs text-muted-foreground">Sua professora parceira</p>
        </div>
        <FloraQuotaIndicator action="chat" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fechar chat da Flora">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
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
          <div key={i} className="animate-fade-in">
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
          <Button type="submit" size="icon" className="shrink-0" disabled={!input.trim() || isSending} aria-label="Enviar mensagem">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
