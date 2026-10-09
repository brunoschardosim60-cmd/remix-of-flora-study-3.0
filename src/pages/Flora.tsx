import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Brain, Target, Zap, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Decision {
  id: string;
  decision_type: string;
  reasoning: string;
  accepted: boolean | null;
  created_at: string;
}
interface Memory {
  id: string;
  kind: string;
  subject: string | null;
  description: string;
  confidence: number;
  last_seen_at: string;
}
interface Achievement {
  id: string;
  type: string;
  value: number | null;
  last_earned_at: string | null;
}

const KIND_LABEL: Record<string, string> = {
  hypothesis: "Hipótese",
  weakness: "Ponto fraco",
  strength: "Ponto forte",
  preference: "Preferência",
};

/**
 * Painel da Flora — timeline única de decisões, memórias acadêmicas e conquistas.
 * Espelho legível do que a IA sabe do aluno e do que ela já fez.
 */
export default function Flora() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [dec, mem, ach] = await Promise.all([
        supabase.from("flora_decisions").select("id, decision_type, reasoning, accepted, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("flora_academic_memory").select("id, kind, subject, description, confidence, last_seen_at").eq("user_id", user.id).eq("active", true).order("confidence", { ascending: false }).limit(20),
        supabase.from("student_achievements").select("id, type, value, last_earned_at").eq("user_id", user.id).order("last_earned_at", { ascending: false }).limit(20),
      ]);
      setDecisions((dec.data ?? []) as Decision[]);
      setMemories((mem.data ?? []) as Memory[]);
      setAchievements((ach.data ?? []) as Achievement[]);
      setLoading(false);
    })();
  }, [user?.id]);

  const totalXp = achievements.reduce((sum, a) => sum + (a.value || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="font-heading text-2xl font-semibold">Painel da Flora</h1>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <>
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted/30 border border-border/40 p-3">
                <Brain className="w-4 h-4 text-primary mb-1" />
                <div className="text-xl font-heading font-semibold">{memories.length}</div>
                <div className="text-[11px] text-muted-foreground">memórias ativas</div>
              </div>
              <div className="rounded-xl bg-muted/30 border border-border/40 p-3">
                <MessageSquare className="w-4 h-4 text-primary mb-1" />
                <div className="text-xl font-heading font-semibold">{decisions.length}</div>
                <div className="text-[11px] text-muted-foreground">decisões recentes</div>
              </div>
              <div className="rounded-xl bg-muted/30 border border-border/40 p-3">
                <Zap className="w-4 h-4 text-primary mb-1" />
                <div className="text-xl font-heading font-semibold">{totalXp}</div>
                <div className="text-[11px] text-muted-foreground">XP total</div>
              </div>
            </div>

            {/* Memórias */}
            <section className="space-y-2">
              <h2 className="font-heading font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> O que a Flora sabe de você</h2>
              {memories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma memória ainda — estude um pouco e a Flora começa a mapear.</p>
              ) : (
                <div className="space-y-1.5">
                  {memories.map((m) => (
                    <div key={m.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{KIND_LABEL[m.kind] || m.kind}</span>
                        {m.subject && <span>• {m.subject}</span>}
                        <span className="ml-auto">confiança {Math.round(m.confidence * 100)}%</span>
                      </div>
                      <div className="text-sm mt-1">{m.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Decisões */}
            <section className="space-y-2">
              <h2 className="font-heading font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Últimas decisões</h2>
              {decisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma decisão registrada.</p>
              ) : (
                <div className="space-y-1.5">
                  {decisions.map((d) => (
                    <div key={d.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{d.decision_type}</span>
                        <span>{new Date(d.created_at).toLocaleDateString("pt-BR")}</span>
                        {d.accepted === true && <span className="text-emerald-500 ml-auto">aceita</span>}
                        {d.accepted === false && <span className="text-muted-foreground ml-auto">dispensada</span>}
                        {d.accepted === null && <span className="text-amber-500 ml-auto">pendente</span>}
                      </div>
                      <div className="text-sm mt-1">{d.reasoning}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Conquistas */}
            <section className="space-y-2">
              <h2 className="font-heading font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Conquistas</h2>
              {achievements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem conquistas — conclua metas pra ganhar XP.</p>
              ) : (
                <div className="space-y-1.5">
                  {achievements.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                      <Target className="w-4 h-4 text-primary" />
                      <div className="flex-1 text-sm">{a.type}</div>
                      {a.value != null && <span className="text-xs font-medium text-primary">+{a.value} XP</span>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}