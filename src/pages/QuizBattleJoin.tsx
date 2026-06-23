import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, LogIn, Loader2, Gamepad2 } from "lucide-react";

export default function QuizBattleJoin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get("code") || "").toUpperCase());
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        else if (user.email) setDisplayName(user.email.split("@")[0]);
      });
  }, [user]);

  async function handleJoin() {
    if (!user) { toast.error("Entre na conta primeiro."); return; }
    const name = displayName.trim() || user.email?.split("@")[0] || "Jogador";
    if (!code.trim() || code.length < 6) { toast.error("Digite o código completo."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("quiz-battle", {
        body: { action: "join", code: code.trim().toUpperCase(), display_name: name },
      });
      if (error || !data?.battle_id) throw new Error(data?.error || error?.message || "Não foi possível entrar.");
      navigate(`/quiz-battle/jogar/${data.battle_id}`);
    } catch (e) {
      const msg = (e as Error).message;
      const friendly = msg === "battle_not_found" ? "Sala não existe" :
                       msg === "battle_already_started" ? "A partida já começou" :
                       msg === "battle_ended" ? "Esta sala já terminou" :
                       msg === "lobby_full" ? "Sala lotada" : msg;
      toast.error(friendly);
    } finally { setLoading(false); }
  }

  const codeChars = code.padEnd(6, " ").split("").slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-2xl font-heading font-bold">Entrar em Quiz Battle</h1>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-2">
          <Gamepad2 className="w-10 h-10 text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Cole o código de 6 letras que o host te passou</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <Label>Código da sala</Label>
            <div className="flex justify-center gap-1.5">
              {codeChars.map((ch, i) => (
                <div key={i} className={`w-10 h-12 sm:w-12 sm:h-14 rounded-lg border-2 flex items-center justify-center font-mono font-bold text-2xl ${ch.trim() ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground"}`}>
                  {ch.trim() || "—"}
                </div>
              ))}
            </div>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="DIGITE AQUI"
              className="text-center text-lg font-mono tracking-[0.3em] uppercase mt-2"
              maxLength={6}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Seu nome no jogo</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Como quer aparecer" maxLength={40} />
          </div>
          <Button onClick={handleJoin} disabled={loading || code.length < 6} className="w-full gap-2" size="lg">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Entrar na sala
          </Button>
        </div>
      </div>
    </div>
  );
}
