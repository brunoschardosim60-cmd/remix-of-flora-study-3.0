import { useEffect, useRef, useState } from "react";
import { Subject, ALL_SUBJECTS, REVISION_PRESETS, RevisionPreset } from "@/lib/studyData";
import { Plus } from "lucide-react";

interface AddTopicFormProps {
  onAdd: (tema: string, materia: Subject, data: string, skipWeekends: boolean, intervals?: readonly number[]) => void;
  openSignal?: number;
  subjects?: Subject[];
}

const PRESET_LABELS: Record<RevisionPreset, string> = {
  curto: "Curto (3x)",
  padrao: "Padrão (6x)",
};

export function AddTopicForm({ onAdd, openSignal = 0, subjects }: AddTopicFormProps) {
  const subjectOptions = subjects && subjects.length ? subjects : ALL_SUBJECTS;
  const [tema, setTema] = useState("");
  const [materia, setMateria] = useState<Subject>(subjectOptions[0] ?? "Matemática");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [preset, setPreset] = useState<RevisionPreset>("padrao");
  const [open, setOpen] = useState(false);
  const topicInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!openSignal) return;

    setOpen(true);
    window.requestAnimationFrame(() => {
      topicInputRef.current?.focus();
      topicInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [openSignal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim()) return;
    onAdd(tema.trim(), materia, data, skipWeekends, REVISION_PRESETS[preset]);
    setTema("");
    setSkipWeekends(false);
    setPreset("padrao");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span>Adicionar tópico</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-4 space-y-3">
      {/* Campo principal em destaque */}
      <input
        ref={topicInputRef}
        type="text"
        value={tema}
        onChange={(e) => setTema(e.target.value)}
        placeholder="Sobre o que é o tópico?"
        autoFocus
        className="w-full px-0 py-1 bg-transparent border-0 border-b border-border/50 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
      />

      {/* Campos secundários compactos */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select
          value={materia}
          onChange={(e) => setMateria(e.target.value as Subject)}
          className="px-2 py-1 rounded-md bg-muted/60 border border-transparent hover:border-border text-xs focus:outline-none focus:border-primary/40"
        >
          {subjectOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="px-2 py-1 rounded-md bg-muted/60 border border-transparent hover:border-border text-xs focus:outline-none focus:border-primary/40"
        />
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as RevisionPreset)}
          title="Padrão de repetição espaçada (Ebbinghaus)"
          className="px-2 py-1 rounded-md bg-muted/60 border border-transparent hover:border-border text-xs focus:outline-none focus:border-primary/40"
        >
          {(Object.keys(PRESET_LABELS) as RevisionPreset[]).map((p) => (
            <option key={p} value={p}>{PRESET_LABELS[p]}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-muted-foreground select-none cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={skipWeekends}
            onChange={(e) => setSkipWeekends(e.target.checked)}
            className="h-3.5 w-3.5 rounded border border-input"
          />
          Pular fins de semana
        </label>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!tema.trim()}
          className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}
