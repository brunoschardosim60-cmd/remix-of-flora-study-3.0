import { useState, useEffect } from "react";
import { AlertTriangle, ImageIcon, ChevronRight } from "lucide-react";

export function QuestionImages({ urls, label }: { urls: string[]; label: string }) {
  const [show, setShow] = useState(false);
  const [errorUrls, setErrorUrls] = useState<Set<string>>(new Set());

  if (!urls?.length) return null;
  
  const validUrls = urls.filter(u => !errorUrls.has(u));
  if (validUrls.length === 0 && urls.length > 0) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3 my-2">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-destructive">Imagens indisponíveis</p>
          <p className="text-xs text-muted-foreground">Esta questão depende de imagens que não puderam ser carregadas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden my-2">
      <button
        onClick={() => setShow((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <ImageIcon className="w-4 h-4 shrink-0" />
        <span className="font-medium">{show ? "Ocultar" : "Ver"} imagem da prova</span>
        <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${show ? "rotate-90" : ""}`} />
      </button>
      {show && (
        <div className="border-t border-border bg-white dark:bg-zinc-900 p-3 space-y-3">
          {urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${label} — imagem ${i + 1}`}
              onError={() => setErrorUrls(prev => {
                const n = new Set(prev);
                n.add(url);
                return n;
              })}
              className="w-full h-auto rounded-lg object-contain max-h-[420px]"
            />
          ))}
        </div>
      )}
    </div>
  );
}
