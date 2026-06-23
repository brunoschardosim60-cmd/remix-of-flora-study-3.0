import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, LogIn, Loader2 } from "lucide-react";

export default function QuizBattleJoin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get("code") || "").toUpperCase());
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!user) { toast.error("Entre na conta primeiro."); return; }
    const name = displayName.trim() || user.email?.split("@")[0] || "Jogador";
    if (!code.trim()) { toast.error("Digite o código."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("quiz-battle", {
        body: { action: "join", code: code.trim().toUpperCase(), display_name: name },
      });
      if (error || !data?.battle_id) throw new Error(data?.error || error?.message || "Não foi possível entrar.");
      navigate(`/quiz-battle/jogar/${data.battle_id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-2xl font-heading font-bold">Entrar em Quiz Battle</h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Código da sala</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABCDEF"
              className="text-center text-2xl font-mono tracking-[0.3em] uppercase"
              maxLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Seu nome no jogo</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Como quer aparecer" />
          </div>
          <Button onClick={handleJoin} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Entrar
          </Button>
        </div>
      </div>
    </div>
  );
}