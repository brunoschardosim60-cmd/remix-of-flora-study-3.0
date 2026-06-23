import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Check, X, Flame, Triangle, Diamond, Circle, Square } from "lucide-react";
import { Leaderboard } from "./QuizBattleHost";

interface Battle {
  id: string; code: string; status: string; current_question: number;
  question_count: number; seconds_per_question: number; question_started_at: string | null;
  reveal_seconds: number; revealing_at: string | null; auto_advance: boolean;
}
interface Player { id: string; user_id: string; display_name: string; avatar_url: string | null; score: number; streak: number; best_streak: number; correct_count: number }
interface QuestionRow { id: string; position: number; enunciado: string; alternativas: string[]; correct_index: number; explicacao: string | null }

const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
const ICONS = [Triangle, Diamond, Circle, Square];

export default function QuizBattlePlay() {
  const { battleId } = useParams<{ battleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number; streak: number; streak_bonus: number; correct_index: number } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const answeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!battleId) return;
    (async () => {
      const [{ data: b }, { data: qs }] = await Promise.all([
        supabase.from("quiz_battles").select("*").eq("id", battleId).single(),
        supabase.from("quiz_battle_questions").select("*").eq("battle_id", battleId).order("position"),
      ]);
      setBattle(b as Battle);
      setQuestions((qs ?? []) as QuestionRow[]);
    })();

    const battleCh = supabase
      .channel(`qb-play-battle-${battleId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quiz_battles", filter: `id=eq.${battleId}` }, (payload) => {
        const b = payload.new as Battle;
        setBattle((prev) => {
          if (prev && prev.current_question !== b.current_question) {
            setChosen(null);
            setFeedback(null);
            answeredFor.current = null;
          }
          return b;
        });
      })
      .subscribe();
    const playersCh = supabase
      .channel(`qb-play-players-${battleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_battle_players", filter: `battle_id=eq.${battleId}` }, async () => {
        const { data } = await supabase.from("quiz_battle_players").select("*").eq("battle_id", battleId).order("score", { ascending: false });
        setPlayers((data ?? []) as Player[]);
      })
      .subscribe();
    supabase.from("quiz_battle_players").select("*").eq("battle_id", battleId).order("score", { ascending: false })
      .then(({ data }) => setPlayers((data ?? []) as Player[]));
    return () => { supabase.removeChannel(battleCh); supabase.removeChannel(playersCh); };
  }, [battleId]);

  useEffect(() => {
    if (!battle || battle.status !== "running" || !battle.question_started_at) { setRemaining(0); return; }
    const startMs = new Date(battle.question_started_at).getTime();
    const totalMs = battle.seconds_per_question * 1000;
    const tick = () => {
      const left = Math.max(0, totalMs - (Date.now() - startMs));
      setRemaining(Math.ceil(left / 1000));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [battle?.question_started_at, battle?.status, battle?.seconds_per_question]);

  async function answer(idx: number) {
    if (!battle || !user) return;
    const q = questions[battle.current_question];
    if (!q || answeredFor.current === q.id) return;
    setChosen(idx);
    answeredFor.current = q.id;
    try {
      const { data, error } = await supabase.functions.invoke("quiz-battle", {
        body: { action: "answer", battle_id: battle.id, question_id: q.id, choice_index: idx },
      });
      if (error) throw error;
      if (data?.ok) setFeedback({
        correct: !!data.correct, points: data.points || 0,
        streak: data.streak || 0, streak_bonus: data.streak_bonus || 0,
        correct_index: data.correct_index ?? -1,
      });
      else if (data?.already_answered) setFeedback({ correct: false, points: 0, streak: 0, streak_bonus: 0, correct_index: -1 });
    } catch { /* ignora */ }
  }

  if (!battle) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (battle.status === "lobby") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-lg font-semibold">Aguardando o host começar...</p>
          <p className="text-sm text-muted-foreground">Código: <span className="font-mono font-bold">{battle.code}</span></p>
          <p className="text-xs text-muted-foreground">{players.length} jogador{players.length === 1 ? "" : "es"} na sala</p>
        </div>
      </div>
    );
  }

  if (battle.status === "finished" || battle.status === "cancelled") {
    const me = players.find((p) => p.user_id === user?.id);
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-4 pt-8">
          <Podium players={players} />
          {me && (
            <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-2xl font-bold text-primary">{me.correct_count}</p><p className="text-xs text-muted-foreground">Acertos</p></div>
              <div><p className="text-2xl font-bold text-orange-500">{me.best_streak}</p><p className="text-xs text-muted-foreground">Melhor streak</p></div>
              <div><p className="text-2xl font-bold">{me.score}</p><p className="text-xs text-muted-foreground">Pontos</p></div>
            </div>
          )}
          <Leaderboard players={players} />
          <Button variant="outline" className="w-full" onClick={() => navigate("/comunidade")}>Voltar</Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[battle.current_question];
  if (!currentQ) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const totalMs = battle.seconds_per_question * 1000;
  const elapsedMs = battle.question_started_at ? Date.now() - new Date(battle.question_started_at).getTime() : 0;
  const timeRatio = Math.max(0, Math.min(1, 1 - elapsedMs / totalMs));
  const timeColor = timeRatio > 0.5 ? "bg-green-500" : timeRatio > 0.25 ? "bg-yellow-500" : "bg-destructive";
  const showResult = feedback !== null || !!battle.revealing_at || remaining === 0;
  const correctIndex = feedback?.correct_index ?? (battle.revealing_at || remaining === 0 ? currentQ.correct_index : -1);
  const me = players.find((p) => p.user_id === user?.id);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">Pergunta {battle.current_question + 1} de {battle.question_count}</span>
          <div className="flex items-center gap-3">
            {me && me.streak >= 2 && (
              <span className="flex items-center gap-1 text-orange-500 font-bold text-sm">
                <Flame className="w-4 h-4" /> {me.streak}
              </span>
            )}
            <span className={`font-mono font-bold text-lg ${remaining <= 5 ? "text-destructive" : "text-primary"}`}>{remaining}s</span>
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${timeColor} transition-all duration-300`} style={{ width: `${timeRatio * 100}%` }} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 min-h-[100px] flex items-center">
          <p className="text-lg font-semibold leading-snug">{currentQ.enunciado}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQ.alternativas.map((alt, i) => {
            const disabled = chosen !== null || remaining === 0 || showResult;
            const isChosen = chosen === i;
            const isCorrect = correctIndex === i;
            const dim = showResult && correctIndex >= 0 && !isCorrect && !isChosen;
            const Icon = ICONS[i % ICONS.length];
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={disabled}
                className={`${COLORS[i % COLORS.length]} text-white p-5 rounded-2xl text-left font-semibold transition-all min-h-[100px] ${dim ? "opacity-40" : disabled ? "opacity-95" : "hover:scale-[1.02] active:scale-95"} ${isChosen ? "ring-4 ring-foreground scale-[1.02]" : ""} ${showResult && isCorrect ? "ring-4 ring-white" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-7 h-7 shrink-0" fill="currentColor" />
                  <span className="flex-1">{alt}</span>
                  {showResult && isCorrect && <Check className="w-6 h-6 shrink-0" />}
                  {showResult && isChosen && !isCorrect && <X className="w-6 h-6 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className={`rounded-xl p-3 text-center font-semibold ${feedback.correct ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-destructive/15 text-destructive"}`}>
            {feedback.correct ? (
              <span>
                Acertou! +{feedback.points} pts
                {feedback.streak_bonus > 0 && <span className="ml-2 text-orange-500">🔥 +{feedback.streak_bonus} streak</span>}
              </span>
            ) : "Errou — esperando próxima"}
          </div>
        )}

        {battle.revealing_at && currentQ.explicacao && (
          <div className="rounded-xl p-3 bg-primary/10 border border-primary/30 text-sm">
            <p className="font-semibold mb-1">Por quê:</p>
            <p className="text-muted-foreground">{currentQ.explicacao}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Podium({ players }: { players: Player[] }) {
  const top = [...players].sort((a, b) => b.score - a.score).slice(0, 3);
  const [first, second, third] = [top[0], top[1], top[2]];
  const slot = (p: Player | undefined, h: string, place: number, color: string) => (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      {p ? (
        <>
          <div className={`w-12 h-12 rounded-full ${color} text-white flex items-center justify-center font-bold text-xl shadow-lg`}>{place}</div>
          <p className="text-sm font-semibold text-center truncate w-full">{p.display_name}</p>
          <p className="text-xs text-muted-foreground">{p.score} pts</p>
        </>
      ) : <div className="text-xs text-muted-foreground h-[76px] flex items-end">—</div>}
      <div className={`w-full ${h} ${color} rounded-t-xl flex items-start justify-center pt-2 text-white font-bold`}>{place}º</div>
    </div>
  );
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 justify-center">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-bold">Pódio</h2>
      </div>
      <div className="flex items-end gap-2">
        {slot(second, "h-16", 2, "bg-zinc-400")}
        {slot(first, "h-24", 1, "bg-yellow-500")}
        {slot(third, "h-12", 3, "bg-orange-600")}
      </div>
    </div>
  );
}
