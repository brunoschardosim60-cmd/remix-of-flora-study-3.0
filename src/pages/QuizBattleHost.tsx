import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, PlayCircle, Loader2, Copy, Users, Trophy,
  Sparkles, Database, PencilLine, Share2, SkipForward, Eye, XCircle, CheckCircle2,
} from "lucide-react";
import { Podium } from "./QuizBattlePlay";

type Source = "banco" | "manual" | "flora";

interface ManualQ { enunciado: string; alternativas: string[]; correct_index: number }
interface Battle {
  id: string; code: string; status: string; current_question: number;
  question_count: number; seconds_per_question: number; host_id: string;
  auto_advance: boolean; reveal_seconds: number; revealing_at: string | null;
  question_started_at: string | null;
}
interface Player { id: string; user_id: string; display_name: string; avatar_url: string | null; score: number; streak: number; best_streak: number; correct_count: number }
interface QuestionRow { id: string; position: number; enunciado: string; alternativas: string[]; correct_index: number; explicacao: string | null }

const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

const PRESETS = [
  { label: "Aquecimento", count: 5, seconds: 15 },
  { label: "Padrão", count: 10, seconds: 20 },
  { label: "Maratona", count: 20, seconds: 30 },
];

export default function QuizBattleHost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const groupId = params.get("group");

  const [phase, setPhase] = useState<"config" | "lobby" | "running" | "finished">("config");
  const [creating, setCreating] = useState(false);

  const [source, setSource] = useState<Source>("flora");
  const [topic, setTopic] = useState("");
  const [materia, setMateria] = useState("");
  const [count, setCount] = useState(10);
  const [seconds, setSeconds] = useState(20);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [manualQs, setManualQs] = useState<ManualQ[]>([
    { enunciado: "", alternativas: ["", "", "", ""], correct_index: 0 },
  ]);

  const [battle, setBattle] = useState<Battle | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);

  const manualIssues = useMemo(() => {
    return manualQs.map((q, i) => {
      const alts = q.alternativas.filter((a) => a.trim());
      if (!q.enunciado.trim()) return `Pergunta ${i + 1}: enunciado vazio`;
      if (alts.length < 2) return `Pergunta ${i + 1}: mínimo 2 alternativas`;
      if (q.correct_index >= alts.length) return `Pergunta ${i + 1}: marque a correta`;
      return null;
    }).filter(Boolean) as string[];
  }, [manualQs]);

  async function handleCreate() {
    if (!user) { toast.error("Entre na conta primeiro."); return; }
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        action: "create", source,
        question_count: count,
        seconds_per_question: seconds,
        auto_advance: autoAdvance,
        topic: topic || null,
        materia: materia || null,
        group_id: groupId || null,
      };
      if (source === "manual") {
        if (manualIssues.length > 0) { toast.error(manualIssues[0]); setCreating(false); return; }
        payload.questions = manualQs.map((q) => ({ ...q, alternativas: q.alternativas.filter((a) => a.trim()) }));
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

  // Realtime: players + battle status + answers count
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
    const answersCh = supabase
      .channel(`qb-host-ans-${battle.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_battle_answers", filter: `battle_id=eq.${battle.id}` }, () => {
        // recount via state callback below
      })
      .subscribe();
    supabase.from("quiz_battle_players").select("*").eq("battle_id", battle.id).order("score", { ascending: false })
      .then(({ data }) => setPlayers((data ?? []) as Player[]));
    return () => {
      supabase.removeChannel(playersCh);
      supabase.removeChannel(battleCh);
      supabase.removeChannel(answersCh);
    };
  }, [battle?.id, phase]);

  // Atualiza answeredCount sempre que a pergunta atual muda ou os jogadores mudam
  useEffect(() => {
    if (!battle || phase !== "running") return;
    const currentQ = questions[battle.current_question];
    if (!currentQ) return;
    let cancelled = false;
    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("quiz_battle_answers")
        .select("id", { count: "exact", head: true })
        .eq("battle_id", battle.id).eq("question_id", currentQ.id);
      if (!cancelled) setAnsweredCount(c ?? 0);
    };
    fetchCount();
    const id = setInterval(fetchCount, 1500);
    return () => { cancelled = true; clearInterval(id); };
  }, [battle?.id, battle?.current_question, phase, questions]);

  // Auto-advance: revela ao acabar o tempo (ou quando todos responderam), depois next
  useEffect(() => {
    if (!battle || phase !== "running" || !battle.auto_advance || !battle.question_started_at) return;
    const totalMs = battle.seconds_per_question * 1000;
    const startMs = new Date(battle.question_started_at).getTime();
    const elapsed = Date.now() - startMs;
    const everyoneAnswered = players.length > 0 && answeredCount >= players.length;
    const timeUp = elapsed >= totalMs;

    if (!battle.revealing_at && (timeUp || everyoneAnswered)) {
      supabase.functions.invoke("quiz-battle", { body: { action: "reveal", battle_id: battle.id } });
      return;
    }
    if (battle.revealing_at) {
      const since = Date.now() - new Date(battle.revealing_at).getTime();
      const wait = Math.max(0, battle.reveal_seconds * 1000 - since);
      const t = setTimeout(() => {
        supabase.functions.invoke("quiz-battle", { body: { action: "next", battle_id: battle.id } });
      }, wait);
      return () => clearTimeout(t);
    }
  }, [battle, phase, players.length, answeredCount]);

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
  async function revealNow() {
    if (!battle) return;
    await supabase.functions.invoke("quiz-battle", { body: { action: "reveal", battle_id: battle.id } });
  }
  async function cancelBattle() {
    if (!battle) return;
    if (!confirm("Cancelar a sala?")) return;
    await supabase.functions.invoke("quiz-battle", { body: { action: "cancel", battle_id: battle.id } });
    setPhase("finished");
  }

  function copyCode() {
    if (!battle?.code) return;
    navigator.clipboard.writeText(battle.code);
    toast.success("Código copiado!");
  }
  async function shareLink() {
    if (!battle?.code) return;
    const url = `${window.location.origin}/quiz-battle/entrar?code=${battle.code}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Quiz Battle", text: `Entra na minha sala! Código ${battle.code}`, url }); return; } catch { /* user cancelled */ }
    }
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  const currentQ = battle && phase === "running" ? questions[battle.current_question] : null;
  const joinUrl = battle ? `${typeof window !== "undefined" ? window.location.origin : ""}/quiz-battle/entrar?code=${battle.code}` : "";
  const qrSrc = joinUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(joinUrl)}` : "";

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
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-5">
            {/* Source cards */}
            <div>
              <Label className="mb-2 block">De onde vêm as perguntas?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {([
                  { id: "flora", icon: Sparkles, title: "Flora (IA)", desc: "Você diz o tema, ela gera" },
                  { id: "banco", icon: Database, title: "Banco ENEM", desc: "Questões reais filtradas" },
                  { id: "manual", icon: PencilLine, title: "Manual", desc: "Você escreve cada uma" },
                ] as { id: Source; icon: typeof Sparkles; title: string; desc: string }[]).map((s) => {
                  const Icon = s.icon;
                  const active = source === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSource(s.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:bg-accent/50"}`}
                    >
                      <Icon className={`w-5 h-5 mb-1 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-semibold text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {source !== "manual" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Tema {source === "flora" ? "(obrigatório)" : "(filtra o banco)"}</Label>
                  <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Revolução Francesa, Função quadrática..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Matéria (opcional)</Label>
                  <Input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ex.: História, Matemática..." />
                </div>
              </div>
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
                          className={`w-7 h-7 rounded-full ${COLORS[ai]} text-white text-xs font-bold flex items-center justify-center ${q.correct_index === ai ? "ring-2 ring-foreground" : "opacity-70"}`}
                          title="Marcar correta"
                        >
                          {q.correct_index === ai ? "✓" : String.fromCharCode(65 + ai)}
                        </button>
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
                {manualIssues.length > 0 && (
                  <div className="text-xs text-destructive space-y-0.5">
                    {manualIssues.map((m) => <p key={m}>• {m}</p>)}
                  </div>
                )}
              </div>
            )}

            {/* Presets */}
            <div>
              <Label className="mb-2 block">Presets rápidos</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => {
                  const active = count === p.count && seconds === p.seconds;
                  return (
                    <button
                      key={p.label}
                      onClick={() => { setCount(p.count); setSeconds(p.seconds); }}
                      className={`p-2 rounded-lg border text-sm transition-all ${active ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"}`}
                    >
                      <p className="font-semibold">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.count}q · {p.seconds}s</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><Label>Nº de perguntas</Label><span className="font-mono">{count}</span></div>
                <Slider value={[count]} min={5} max={20} step={1} onValueChange={(v) => setCount(v[0])} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><Label>Segundos por pergunta</Label><span className="font-mono">{seconds}s</span></div>
                <Slider value={[seconds]} min={10} max={60} step={5} onValueChange={(v) => setSeconds(v[0])} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="font-semibold text-sm">Avançar automaticamente</p>
                  <p className="text-xs text-muted-foreground">Passa sozinho quando todos responderem ou o tempo acabar.</p>
                </div>
                <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
              </div>
            </div>

            <Button onClick={handleCreate} disabled={creating} className="w-full gap-2" size="lg">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {creating ? "Criando..." : "Criar sala"}
            </Button>
          </div>
        )}

        {phase === "lobby" && battle && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Código da sala</p>
                <div className="flex justify-center gap-1.5">
                  {battle.code.split("").map((ch, i) => (
                    <div key={i} className="w-10 h-12 sm:w-12 sm:h-14 rounded-lg bg-background border-2 border-primary/40 flex items-center justify-center font-mono font-bold text-2xl sm:text-3xl text-primary">
                      {ch}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-center pt-1">
                  <Button variant="outline" size="sm" onClick={copyCode} className="gap-1.5"><Copy className="w-3.5 h-3.5" /> Copiar</Button>
                  <Button variant="outline" size="sm" onClick={shareLink} className="gap-1.5"><Share2 className="w-3.5 h-3.5" /> Compartilhar</Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
                <img src={qrSrc} alt="QR code" className="w-40 h-40 rounded-lg bg-white p-2" />
                <p className="text-xs text-muted-foreground text-center sm:text-left max-w-[180px]">
                  Aponte a câmera do celular para o QR Code, ou acesse <span className="font-mono">/quiz-battle/entrar</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold">Jogadores</h2>
                </div>
                <span className="text-sm text-muted-foreground">{players.length} / 30</span>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {players.length === 0 && <p className="text-sm text-muted-foreground">Aguardando alguém entrar...</p>}
                {players.map((p) => (
                  <div key={p.id} className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {p.display_name}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={startBattle} disabled={players.length === 0} className="flex-1 gap-2" size="lg">
                  <PlayCircle className="w-4 h-4" /> Começar
                </Button>
                <Button variant="outline" onClick={cancelBattle} className="gap-1.5">
                  <XCircle className="w-4 h-4" /> Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === "running" && battle && currentQ && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Pergunta {battle.current_question + 1} / {battle.question_count}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {answeredCount} / {players.length} responderam
                </span>
              </div>
              <p className="text-lg font-semibold">{currentQ.enunciado}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQ.alternativas.map((alt, i) => (
                  <div key={i} className={`p-3 rounded-xl text-sm flex items-center gap-2 ${i === currentQ.correct_index ? "bg-green-500/15 border border-green-500/40" : "bg-muted/50"}`}>
                    <span className={`w-6 h-6 rounded ${COLORS[i]} text-white text-xs font-bold flex items-center justify-center shrink-0`}>{String.fromCharCode(65 + i)}</span>
                    <span className="flex-1">{alt}</span>
                    {i === currentQ.correct_index && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {!battle.revealing_at && (
                  <Button variant="outline" onClick={revealNow} className="gap-1.5 flex-1">
                    <Eye className="w-4 h-4" /> Revelar resposta
                  </Button>
                )}
                <Button onClick={nextQuestion} className="gap-1.5 flex-1">
                  <SkipForward className="w-4 h-4" />
                  {battle.current_question + 1 >= battle.question_count ? "Finalizar" : "Próxima"}
                </Button>
              </div>
            </div>

            <Leaderboard players={players} />
            <Button variant="ghost" size="sm" onClick={cancelBattle} className="w-full text-muted-foreground">
              Cancelar sala
            </Button>
          </div>
        )}

        {phase === "finished" && (
          <div className="space-y-4">
            <Podium players={players} />
            <Leaderboard players={players} />
            <Button variant="outline" className="w-full" onClick={() => navigate("/comunidade")}>Voltar para Comunidade</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Leaderboard({ players }: { players: Player[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold">Ranking</h2>
      </div>
      {sorted.length === 0 && <p className="text-sm text-muted-foreground">Sem pontos ainda.</p>}
      {sorted.map((p, i) => (
        <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg ${i === 0 ? "bg-yellow-500/10" : i % 2 === 0 ? "bg-muted/30" : ""}`}>
          <span className="text-sm font-medium flex items-center gap-2">
            <span className="text-xs font-bold w-5 text-muted-foreground">{i + 1}º</span>
            {p.display_name}
            {p.best_streak >= 3 && <span className="text-xs text-orange-500">🔥{p.best_streak}</span>}
          </span>
          <span className="text-sm font-bold text-primary">{p.score}</span>
        </div>
      ))}
    </div>
  );
}
