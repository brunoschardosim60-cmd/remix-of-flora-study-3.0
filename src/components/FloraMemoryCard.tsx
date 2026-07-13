import { useEffect, useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Memory {
  id: string;
  kind: "strength" | "weakness" | "pattern" | "hypothesis" | "preference";
  subject: string | null;
  description: string;
  confidence: number;
  last_seen_at: string;
}

const KIND_LABEL: Record<Memory["kind"], string> = {
  strength: "Ponto forte",
  weakness: "Ponto de atenção",
  pattern: "Padrão observado",
  hypothesis: "Hipótese",
  preference: "Preferência",
};

const KIND_TONE: Record<Memory["kind"], string> = {
  strength: "bg-emerald-500/10 text-emerald-500",
  weakness: "bg-amber-500/10 text-amber-500",
  pattern: "bg-primary/10 text-primary",
  hypothesis: "bg-muted text-muted-foreground",
  preference: "bg-secondary/20 text-secondary-foreground",
};

/**
 * Mostra o que a Flora tem observado sobre o aluno.
 * Linguagem sempre em hipótese — nunca fato definitivo.
 * Só aparece se houver ao menos 1 memória ativa.
 */
export function FloraMemoryCard({ user }: { user: User | null }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.functions
      .invoke("flora-engine", { body: { action: "get_academic_memory", data: { limit: 8 } } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data?.memories ?? []) as Memory[];
        setMemories(list);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  if (!user || memories.length === 0) return null;

  const top = open ? memories : memories.slice(0, 3);

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-left"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Brain className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="font-heading font-semibold text-sm">O que a Flora tem observado</div>
          <div className="text-[11px] text-muted-foreground">
            {memories.length} sinal{memories.length > 1 ? "is" : ""} · hipóteses, não conclusões
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div className="space-y-2">
        {top.map((m) => (
          <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${KIND_TONE[m.kind]}`}>
              {KIND_LABEL[m.kind]}
            </span>
            <p className="text-xs text-foreground/90 flex-1 leading-relaxed">
              Acho que {m.description}
            </p>
            <span className="text-[10px] text-muted-foreground tabular-nums" title="Confiança da Flora">
              {Math.round(m.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>

      {!open && memories.length > 3 && (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-primary hover:underline"
        >
          Ver mais {memories.length - 3}
        </button>
      )}
    </div>
  );
}