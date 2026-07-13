import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { useFloraCheckpoint } from "@/hooks/useFloraCheckpoint";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
  onSubmitted?: () => void;
}

const MOODS = [
  { v: 1, e: "😞", l: "Difícil" },
  { v: 2, e: "😕", l: "Cansado" },
  { v: 3, e: "😐", l: "Neutro" },
  { v: 4, e: "🙂", l: "Bom" },
  { v: 5, e: "🤩", l: "Ótimo" },
];

/**
 * Card de check-in semanal da Flora. Colapsa após salvar.
 * Mostrado apenas pra usuários logados; some depois de preenchido na semana.
 */
export function FloraCheckpointCard({ user, onSubmitted }: Props) {
  const { current, save, weekOf } = useFloraCheckpoint(user);
  const [expanded, setExpanded] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [wins, setWins] = useState("");
  const [difficulties, setDifficulties] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;
  if (current && !expanded) return null; // já preencheu essa semana

  const handleSave = async () => {
    if (mood == null) {
      toast.info("Escolha como foi sua semana.");
      return;
    }
    setSaving(true);
    const row = await save({ mood, wins: wins.trim() || null, difficulties: difficulties.trim() || null });
    setSaving(false);
    if (!row) {
      toast.error("Não consegui salvar agora. Tente de novo em instantes.");
      return;
    }
    toast.success("Check-in registrado. Obrigada por compartilhar!");
    setExpanded(false);
    setMood(null);
    setWins("");
    setDifficulties("");
    onSubmitted?.();
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="font-heading font-semibold text-sm">Check-in da semana</div>
          <div className="text-[11px] text-muted-foreground">Semana de {weekOf} · leva 20 segundos</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Como você se sentiu estudando?</div>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.v}
              onClick={() => setMood(m.v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                mood === m.v
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                  : "bg-muted/60 hover:bg-muted"
              }`}
            >
              <span>{m.e}</span>
              <span>{m.l}</span>
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={wins}
        onChange={(e) => setWins(e.target.value)}
        placeholder="Uma vitória dessa semana (opcional)"
        rows={2}
        className="w-full text-xs px-3 py-2 rounded-lg bg-muted/40 border border-border/40 focus:outline-none focus:border-primary/40 resize-none"
      />
      <textarea
        value={difficulties}
        onChange={(e) => setDifficulties(e.target.value)}
        placeholder="Uma dificuldade (opcional)"
        rows={2}
        className="w-full text-xs px-3 py-2 rounded-lg bg-muted/40 border border-border/40 focus:outline-none focus:border-primary/40 resize-none"
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={saving || mood == null}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? "Salvando..." : "Registrar"}
        </button>
      </div>
    </div>
  );
}