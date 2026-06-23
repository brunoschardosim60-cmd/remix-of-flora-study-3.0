import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Check, X } from "lucide-react";
import { Leaderboard } from "./QuizBattleHost";

interface Battle {
  id: string; code: string; status: string; current_question: number;
  question_count: number; seconds_per_question: number; question_started_at: string | null;
}
interface Player { id: string; user_id: string; display_name: string; avatar_url: string | null; score: number }
interface QuestionRow { id: string; position: number; enunciado: string; alternativas: string[]; correct_index: number }

const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

export default function QuizBattlePlay() {
  const { battleId } = useParams<{ battleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const answeredFor = useRef<string | null>(null); // question id

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
        setBattle(b);
        // virou de pergunta → reseta
        setChosen(null);
        setFeedback(null);
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

  // Cronômetro
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
      if (data?.ok) setFeedback({ correct: !!data.correct, points: data.points || 0 });
      else if (data?.already_answered) setFeedback({ correct: false, points: 0 });
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
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-4 pt-12">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-2">
            <Trophy className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Quiz finalizado!</h2>
          </div>
          <Leaderboard players={players} podium />
          <Button variant="outline" className="w-full" onClick={() => navigate("/comunidade")}>Voltar</Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[battle.current_question];
  if (!currentQ) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{battle.current_question + 1} / {battle.question_count}</span>
          <span className={`font-mono font-bold text-lg ${remaining <= 5 ? "text-destructive" : "text-primary"}`}>{remaining}s</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-lg font-semibold">{currentQ.enunciado}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQ.alternativas.map((alt, i) => {
            const disabled = chosen !== null || remaining === 0;
            const showResult = feedback !== null;
            const isChosen = chosen === i;
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={disabled}
                className={`${COLORS[i % COLORS.length]} text-white p-5 rounded-2xl text-left font-semibold transition-all min-h-[100px] ${disabled ? "opacity-90" : "hover:scale-[1.02]"} ${isChosen ? "ring-4 ring-foreground" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{alt}</span>
                  {showResult && isChosen && (feedback?.correct
                    ? <Check className="w-6 h-6" />
                    : <X className="w-6 h-6" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className={`rounded-xl p-3 text-center font-semibold ${feedback.correct ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-destructive/15 text-destructive"}`}>
            {feedback.correct ? `Acertou! +${feedback.points} pts` : "Errou — esperando próxima"}
          </div>
        )}

      </div>
    </div>
  );
}