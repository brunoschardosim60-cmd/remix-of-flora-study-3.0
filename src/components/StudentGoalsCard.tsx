import { useState } from "react";
import { Target, Plus, Check, X } from "lucide-react";
import { useStudentGoalsV2 } from "@/hooks/useStudentGoalsV2";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

/**
 * Card de metas de longo prazo. Formulário inline minimalista;
 * cada meta mostra progresso ajustável via slider e status.
 */
export function StudentGoalsCard({ user }: { user: User | null }) {
  const { goals, create, update, remove } = useStudentGoalsV2(user);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");

  if (!user) return null;

  const handleAdd = async () => {
    if (!title.trim()) return;
    const row = await create({ title: title.trim(), target_date: targetDate || null });
    if (!row) {
      toast.error("Não foi possível criar a meta.");
      return;
    }
    toast.success("Meta criada.");
    setTitle("");
    setTargetDate("");
    setAdding(false);
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Target className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="font-heading font-semibold text-sm">Minhas metas</div>
          <div className="text-[11px] text-muted-foreground">
            {goals.length === 0 ? "Nenhuma meta ativa" : `${goals.length} meta${goals.length > 1 ? "s" : ""} ativa${goals.length > 1 ? "s" : ""}`}
          </div>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Adicionar meta"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {adding && (
        <div className="space-y-2 pt-1">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Passar em Direito na OAB"
            className="w-full text-sm px-3 py-2 rounded-lg bg-muted/40 border border-border/40 focus:outline-none focus:border-primary/40"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-md bg-muted/60 border border-transparent focus:outline-none focus:border-primary/40"
            />
            <button
              onClick={handleAdd}
              disabled={!title.trim()}
              className="ml-auto px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40"
            >
              Salvar
            </button>
            <button
              onClick={() => { setAdding(false); setTitle(""); setTargetDate(""); }}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {goals.map((g) => (
          <div key={g.id} className="p-2.5 rounded-lg bg-muted/30 space-y-1.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{g.title}</div>
                {g.target_date && (
                  <div className="text-[10px] text-muted-foreground">Até {g.target_date}</div>
                )}
              </div>
              <button
                onClick={() => update(g.id, { status: g.progress >= 100 ? "done" : "archived" })}
                className="p-1 rounded-md text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                title={g.progress >= 100 ? "Marcar como concluída" : "Arquivar"}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => remove(g.id)}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Remover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={g.progress}
                onChange={(e) => update(g.id, { progress: Number(e.target.value) })}
                className="flex-1 accent-primary"
                aria-label={`Progresso de ${g.title}`}
              />
              <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">{g.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}