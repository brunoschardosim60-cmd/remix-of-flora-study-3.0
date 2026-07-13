import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Plus, Check, X, Sparkles, Pencil, ChevronDown } from "lucide-react";
import { useStudentGoalsV2 } from "@/hooks/useStudentGoalsV2";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

/**
 * Card de metas de longo prazo. Formulário inline minimalista;
 * cada meta mostra progresso ajustável via slider e status.
 */
export function StudentGoalsCard({ user }: { user: User | null }) {
  const { goals, create, update, remove } = useStudentGoalsV2(user);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [subject, setSubject] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ title: string; target_date: string | null; priority: number; kind: string }>>([]);

  if (!user) return null;

  const resetForm = () => {
    setTitle(""); setTargetDate(""); setPriority(2); setDescription("");
    setTarget(""); setActionFilter(""); setSubject(""); setShowAdvanced(false);
    setAdding(false);
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    const metadata: Record<string, unknown> = {};
    const t = Number(target);
    if (Number.isFinite(t) && t > 0) metadata.target = t;
    if (actionFilter.trim()) metadata.action = actionFilter.trim();
    if (subject.trim()) metadata.subject = subject.trim();
    const row = await create({
      title: title.trim(),
      target_date: targetDate || null,
      priority,
      description: description.trim() || null,
      ...(Object.keys(metadata).length ? { metadata } : {}),
    } as any);
    if (!row) {
      toast.error("Não foi possível criar a meta.");
      return;
    }
    toast.success("Meta criada.");
    resetForm();
  };

  const startEdit = (id: string, curTitle: string, curDate: string | null) => {
    setEditingId(id);
    setEditTitle(curTitle);
    setEditDate(curDate || "");
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    await update(editingId, { title: editTitle.trim(), target_date: editDate || null });
    toast.success("Meta atualizada.");
    setEditingId(null);
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: { action: "suggest_goals" },
      });
      if (error) throw error;
      const list = Array.isArray(data?.goals) ? data.goals : [];
      if (list.length === 0) toast.info("A Flora não achou sugestões novas.");
      setSuggestions(list);
    } catch (_e) {
      toast.error("Não foi possível pedir sugestões agora.");
    } finally {
      setSuggesting(false);
    }
  };

  const acceptSuggestion = async (idx: number) => {
    const s = suggestions[idx];
    if (!s) return;
    const row = await create({ title: s.title, target_date: s.target_date, priority: (s.priority as 1 | 2 | 3), kind: s.kind });
    if (!row) {
      toast.error("Não foi possível criar a meta.");
      return;
    }
    toast.success("Meta adicionada.");
    setSuggestions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Target className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <button
            onClick={() => navigate("/metas")}
            className="font-heading font-semibold text-sm text-left hover:underline"
            title="Ver todas as metas"
          >
            Minhas metas
          </button>
          <div className="text-[11px] text-muted-foreground">
            {goals.length === 0 ? "Nenhuma meta ativa" : `${goals.length} meta${goals.length > 1 ? "s" : ""} ativa${goals.length > 1 ? "s" : ""}`}
          </div>
        </div>
        {!adding && (
          <>
            <button
              onClick={handleSuggest}
              disabled={suggesting}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Sugerir metas com a Flora"
              title="Flora sugere metas pra você"
            >
              <Sparkles className={`w-4 h-4 ${suggesting ? "animate-pulse" : ""}`} />
            </button>
            <button
              onClick={() => setAdding(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Adicionar meta"
            >
              <Plus className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Sugestões da Flora
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{s.title}</div>
                {s.target_date && (
                  <div className="text-[10px] text-muted-foreground">Até {s.target_date}</div>
                )}
              </div>
              <button
                onClick={() => acceptSuggestion(i)}
                className="p-1 rounded-md text-emerald-500 hover:bg-emerald-500/10"
                title="Aceitar sugestão"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSuggestions((prev) => prev.filter((_, j) => j !== i))}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted"
                title="Descartar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

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
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)}
              className="text-xs px-2 py-1.5 rounded-md bg-muted/60 border border-transparent focus:outline-none focus:border-primary/40"
              title="Prioridade"
            >
              <option value={1}>Baixa</option>
              <option value={2}>Média</option>
              <option value={3}>Alta</option>
            </select>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-[11px] px-2 py-1.5 rounded-md text-muted-foreground hover:bg-muted flex items-center gap-1"
            >
              Avançado <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={handleAdd}
              disabled={!title.trim()}
              className="ml-auto px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40"
            >
              Salvar
            </button>
            <button
              onClick={resetForm}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {showAdvanced && (
            <div className="space-y-2 pt-1 border-t border-border/30">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição (opcional)"
                rows={2}
                className="w-full text-xs px-2 py-1.5 rounded-md bg-muted/40 border border-border/40 focus:outline-none focus:border-primary/40 resize-none"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={1}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Alvo (nº)"
                  className="text-xs px-2 py-1.5 rounded-md bg-muted/40 border border-border/40 focus:outline-none focus:border-primary/40"
                  title="Quantidade alvo (ex.: 100 questões)"
                />
                <input
                  type="text"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  placeholder="Ação"
                  className="text-xs px-2 py-1.5 rounded-md bg-muted/40 border border-border/40 focus:outline-none focus:border-primary/40"
                  title="Filtro (ex.: generate_quiz)"
                />
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Matéria"
                  className="text-xs px-2 py-1.5 rounded-md bg-muted/40 border border-border/40 focus:outline-none focus:border-primary/40"
                  title="Matéria (opcional)"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Se preencher alvo, a Flora atualiza o progresso conforme suas ações.</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {goals.map((g) => (
          <div key={g.id} className="p-2.5 rounded-lg bg-muted/30 space-y-1.5">
            {editingId === g.id ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-sm px-2 py-1 rounded-md bg-muted/60 border border-primary/40 focus:outline-none"
                />
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="text-[11px] px-1.5 py-1 rounded-md bg-muted/60 focus:outline-none"
                />
                <button onClick={saveEdit} className="p-1 rounded-md text-emerald-500 hover:bg-emerald-500/10" title="Salvar">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1 rounded-md text-muted-foreground hover:bg-muted" title="Cancelar">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{g.title}</div>
                  {g.target_date && (
                    <div className="text-[10px] text-muted-foreground">Até {g.target_date}</div>
                  )}
                </div>
                <button
                  onClick={() => startEdit(g.id, g.title, g.target_date)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
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
            )}
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