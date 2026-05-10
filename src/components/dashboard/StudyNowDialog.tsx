import { Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import type { StudyNowContent, StudyNowMessage } from "@/hooks/useStudyNow";

const ReactMarkdown = lazy(() => import("react-markdown"));

interface Props {
  content: StudyNowContent;
  messages: StudyNowMessage[];
  followupInput: string;
  followupLoading: boolean;
  onChangeFollowupInput: (value: string) => void;
  onSendFollowup: (request: string) => void;
  onClose: () => void;
  onConfirmStart: () => void;
}

const QUICK_QUESTIONS = [
  "Explica de outro jeito",
  "Dá mais exemplos",
  "Aprofunda esse tema",
  "Por onde começar a ler",
];

export function StudyNowDialog({
  content,
  messages,
  followupInput,
  followupLoading,
  onChangeFollowupInput,
  onSendFollowup,
  onClose,
  onConfirmStart,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-heading text-xl font-bold">{content.tema}</h2>
            <p className="text-sm text-muted-foreground">{content.materia} · briefing com a Flora</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>X</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.role === "flora" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words">
                    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </Suspense>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {followupLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3 text-sm text-muted-foreground">Flora está pensando...</div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <Button
                key={q}
                size="sm"
                variant="outline"
                disabled={followupLoading}
                onClick={() => onSendFollowup(q)}
              >
                {q}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSendFollowup(followupInput);
            }}
          >
            <input
              type="text"
              value={followupInput}
              onChange={(e) => onChangeFollowupInput(e.target.value)}
              placeholder="Pergunta algo antes de começar..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              disabled={followupLoading}
            />
            <Button type="submit" variant="outline" size="sm" disabled={followupLoading || !followupInput.trim()}>
              Enviar
            </Button>
          </form>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button onClick={onConfirmStart}>Tudo claro — iniciar cronômetro</Button>
          </div>
        </div>
      </div>
    </div>
  );
}