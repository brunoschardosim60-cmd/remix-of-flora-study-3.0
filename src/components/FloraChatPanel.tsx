import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, X } from "lucide-react";
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
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
          <Button type="submit" size="icon" className="shrink-0" disabled={!input.trim() || isSending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
