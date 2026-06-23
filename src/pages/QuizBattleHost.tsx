import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, PlayCircle, Loader2, Copy, Users, Trophy } from "lucide-react";

type Source = "banco" | "manual" | "flora";

interface ManualQ { enunciado: string; alternativas: string[]; correct_index: number }

interface Battle {
  id: string; code: string; status: string; current_question: number;
  question_count: number; seconds_per_question: number; host_id: string;
}
interface Player { id: string; user_id: string; display_name: string; avatar_url: string | null; score: number }
interface QuestionRow { id: string; position: number; enunciado: string; alternativas: string[]; correct_index: number }

export default function QuizBattleHost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const groupId = params.get("group");

  const [phase, setPhase] = useState<"config" | "lobby" | "running" | "finished">("config");
  const [creating, setCreating] = useState(false);

  // Config
  const [source, setSource] = useState<Source>("flora");
  const [topic, setTopic] = useState("");
  const [materia, setMateria] = useState("");
  const [count, setCount] = useState(10);
  const [seconds, setSeconds] = useState(20);
  const [manualQs, setManualQs] = useState<ManualQ[]>([
    { enunciado: "", alternativas: ["", "", "", ""], correct_index: 0 },
  ]);

  // Live state
  const [battle, setBattle] = useState<Battle | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  // Cria
  async function handleCreate() {
    if (!user) { toast.error("Entre na conta primeiro."); return; }
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        action: "create", source,
        question_count: count,
        seconds_per_question: seconds,
        topic: topic || null,
        materia: materia || null,
        group_id: groupId || null,
      };
      if (source === "manual") {
        const cleaned = manualQs
          .map((q) => ({ ...q, alternativas: q.alternativas.filter((a) => a.trim()) }))
          .filter((q) => q.enunciado.trim() && q.alternativas.length >= 2);
        if (cleaned.length === 0) { toast.error("Adicione pelo menos 1 pergunta válida."); setCreating(false); return; }
        payload.questions = cleaned;
      }
      if (source === "flora" && !topic.trim()) {
        toast.error("Diga o tema para a Flora gerar."); setCreating(false); return;
      }
      const { data, error } = await supabase.functions.invoke("quiz-battle", { body: payload });
      if (error || !data?.battle_id) throw new Error(data?.error || error?.message || "Falha ao criar");
      const { data: b } = await supabase.from("quiz_battles").select("*").eq("id", data.battle_id).single();
      const { data: qs } = await supabase.from("quiz_battle_questions").select("*").eq("battle_id", data.battle_id).order("position");
      setBattle(b as Battle);
      setQuestions((qs ?? []) as QuestionRow[]);
      setPhase("lobby");
      toast.success(`Sala criada! Código ${data.code}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setCreating(false); }
  }

  // Realtime: lobby + status
  useEffect(() => {
    if (!battle?.id) return;
    const playersCh = supabase
      .channel(`qb-host-players-${battle.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_battle_players", filter: `battle_id=eq.${battle.id}` }, async () => {
        const { data } = await supabase.from("quiz_battle_players").select("*").eq("battle_id", battle.id).order("score", { ascending: false });
        setPlayers((data ?? []) as Player[]);
      })
      .subscribe();
    const battleCh = supabase
      .channel(`qb-host-battle-${battle.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quiz_battles", filter: `id=eq.${battle.id}` }, (payload) => {
        const b = payload.new as Battle;
        setBattle(b);
        if (b.status === "running" && phase !== "running") setPhase("running");
        if (b.status === "finished" && phase !== "finished") setPhase("finished");
      })
      .subscribe();
    // load inicial players
    supabase.from("quiz_battle_players").select("*").eq("battle_id", battle.id).order("score", { ascending: false })
      .then(({ data }) => setPlayers((data ?? []) as Player[]));
    return () => { supabase.removeChannel(playersCh); supabase.removeChannel(battleCh); };
  }, [battle?.id, phase]);

  async function startBattle() {
    if (!battle) return;
    const { error } = await supabase.functions.invoke("quiz-battle", { body: { action: "start", battle_id: battle.id } });
    if (error) toast.error(error.message);
  }

  async function nextQuestion() {
    if (!battle) return;
    const { data, error } = await supabase.functions.invoke("quiz-battle", { body: { action: "next", battle_id: battle.id } });
    if (error) toast.error(error.message);
    if (data?.finished) setPhase("finished");
  }

  function copyCode() {
    if (!battle?.code) return;
    navigator.clipboard.writeText(battle.code);
    toast.success("Código copiado!");
  }

  const currentQ = battle && phase === "running" ? questions[battle.current_question] : null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-heading font-bold">Quiz Battle</h1>
            <p className="text-sm text-muted-foreground">Crie uma sala e chame os amigos pelo código.</p>
          </div>
        </div>

        {phase === "config" && (
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(["flora", "banco", "manual"] as Source[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`p-3 rounded-xl border text-sm font-medium ${source === s ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                >
                  {s === "flora" ? "Flora (IA)" : s === "banco" ? "Banco ENEM" : "Manual"}
                </button>
              ))}
            </div>

            {source !== "manual" && (
              <>
                <div className="space-y-1.5">
                  <Label>Tema {source === "flora" ? "(obrigatório)" : "(opcional, filtra o banco)"}</Label>
                  <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Revolução Francesa, Função quadrática..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Matéria (opcional)</Label>
                  <Input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ex.: História, Matemática..." />
                </div>
              </>
            )}

            {source === "manual" && (
              <div className="space-y-3">
                {manualQs.map((q, i) => (
                  <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Pergunta {i + 1}</Label>
                      {manualQs.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setManualQs(manualQs.filter((_, idx) => idx !== i))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={q.enunciado}
                      onChange={(e) => setManualQs(manualQs.map((m, idx) => idx === i ? { ...m, enunciado: e.target.value } : m))}
                      placeholder="Enunciado"
                      rows={2}
                    />
                    {q.alternativas.map((a, ai) => (
                      <div key={ai} className="flex items-center gap-2">
                        <button
                          onClick={() => setManualQs(manualQs.map((m, idx) => idx === i ? { ...m, correct_index: ai } : m))}
                          className={`w-6 h-6 rounded-full border-2 ${q.correct_index === ai ? "bg-primary border-primary" : "border-border"}`}
                          title="Marcar correta"
                        />
                        <Input
                          value={a}
                          onChange={(e) => setManualQs(manualQs.map((m, idx) => idx === i ? { ...m, alternativas: m.alternativas.map((x, xi) => xi === ai ? e.target.value : x) } : m))}
                          placeholder={`Alternativa ${String.fromCharCode(65 + ai)}`}
                        />
                      </div>
                    ))}
                  </div>
                ))}
                <Button variant="outline" onClick={() => setManualQs([...manualQs, { enunciado: "", alternativas: ["", "", "", ""], correct_index: 0 }])} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Adicionar pergunta
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nº de perguntas</Label>
                <Input type="number" min={5} max={20} value={count} onChange={(e) => setCount(Number(e.target.value) || 10)} />
              </div>
              <div className="space-y-1.5">
                <Label>Segundos por pergunta</Label>
                <Input type="number" min={10} max={60} value={seconds} onChange={(e) => setSeconds(Number(e.target.value) || 20)} />
              </div>
            </div>

            <Button onClick={handleCreate} disabled={creating} className="w-full gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {creating ? "Criando..." : "Criar sala"}
            </Button>
          </div>
        )}

        {phase === "lobby" && battle && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Código da sala</p>
              <div className="text-5xl font-mono font-bold tracking-[0.3em] text-primary">{battle.code}</div>
              <Button variant="outline" size="sm" onClick={copyCode} className="gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Copiar
              </Button>
              <p className="text-xs text-muted-foreground">Amigos entram em /quiz-battle/entrar</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">Jogadores ({players.length})</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {players.length === 0 && <p className="text-sm text-muted-foreground">Aguardando...</p>}
                {players.map((p) => (
                  <div key={p.id} className="px-3 py-1.5 rounded-full bg-muted text-sm">{p.display_name}</div>
                ))}
              </div>
              <Button onClick={startBattle} disabled={players.length === 0} className="w-full gap-2">
                <PlayCircle className="w-4 h-4" /> Começar
              </Button>
            </div>
          </div>
        )}

        {phase === "running" && battle && currentQ && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Pergunta {battle.current_question + 1} / {battle.question_count}</span>
              </div>
              <p className="text-lg font-semibold">{currentQ.enunciado}</p>
              <div className="grid grid-cols-2 gap-2">
                {currentQ.alternativas.map((alt, i) => (
                  <div key={i} className={`p-3 rounded-xl text-sm ${i === currentQ.correct_index ? "bg-green-500/15 border border-green-500/40" : "bg-muted/50"}`}>
                    {String.fromCharCode(65 + i)}) {alt}
                  </div>
                ))}
              </div>
              <Button onClick={nextQuestion} className="w-full">
                {battle.current_question + 1 >= battle.question_count ? "Finalizar" : "Próxima pergunta"}
              </Button>
            </div>

            <Leaderboard players={players} />
          </div>
        )}

        {phase === "finished" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-2">
              <Trophy className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-xl font-bold">Fim do quiz!</h2>
            </div>
            <Leaderboard players={players} podium />
            <Button variant="outline" className="w-full" onClick={() => navigate("/comunidade")}>Voltar para Comunidade</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Leaderboard({ players, podium }: { players: Player[]; podium?: boolean }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold">Ranking</h2>
      </div>
      {sorted.length === 0 && <p className="text-sm text-muted-foreground">Sem pontos ainda.</p>}
      {sorted.map((p, i) => (
        <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg ${podium && i === 0 ? "bg-yellow-500/10" : i % 2 === 0 ? "bg-muted/30" : ""}`}>
          <span className="text-sm font-medium">{i + 1}. {p.display_name}</span>
          <span className="text-sm font-bold text-primary">{p.score}</span>
        </div>
      ))}
    </div>
  );
}