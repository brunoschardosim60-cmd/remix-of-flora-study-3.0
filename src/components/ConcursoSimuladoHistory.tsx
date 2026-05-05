import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { History, Loader2 } from "lucide-react";

type Row = {
  id: string;
  titulo: string;
  banca: string;
  disciplina: string;
  total_questoes: number;
  acertos: number;
  duracao_ms: number;
  origem: string;
  created_at: string;
};

function fmtDur(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return r === 0 ? `${m}min` : `${m}min ${r}s`;
}

/**
 * Histórico consolidado de simulados de concurso (separado da tabela de
 * tentativas individuais). Mostra evolução tipo "simulado X — 7/10 em 12min".
 */
export function ConcursoSimuladoHistory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("concurso_simulado_results")
        .select("id,titulo,banca,disciplina,total_questoes,acertos,duracao_ms,origem,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) {
        setRows((data ?? []) as Row[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Histórico de simulados</h3>
            <p className="text-xs text-muted-foreground">
              Nenhum simulado finalizado ainda. Termine uma sessão IA ou um conjunto de questões para registrar aqui.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Histórico de simulados</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">{rows.length}</Badge>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const pct = r.total_questoes > 0 ? Math.round((r.acertos / r.total_questoes) * 100) : 0;
          const tone = pct >= 70 ? "default" : pct >= 50 ? "secondary" : "destructive";
          return (
            <div key={r.id} className="rounded-lg border border-border/60 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium truncate max-w-[180px]">{r.titulo || `${r.disciplina || "Simulado"}`}</span>
              {r.banca && <Badge variant="outline" className="text-[10px]">{r.banca}</Badge>}
              <Badge variant={tone as any} className="text-[10px]">
                {r.acertos}/{r.total_questoes} · {pct}%
              </Badge>
              <span className="text-muted-foreground">{fmtDur(r.duracao_ms)}</span>
              <span className="ml-auto text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}