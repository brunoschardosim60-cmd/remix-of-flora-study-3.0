import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type SeedResult = {
  ok: boolean;
  total: number;
  created: number;
  skipped: number;
  errors: number;
  results: Array<{ materia: string; tema: string; status: string; error?: string }>;
};

export function AdminCachePanel() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"rapida" | "completa" | "masterclass">("completa");
  const [kind, setKind] = useState<"lesson" | "questions" | "images">("lesson");
  const [level, setLevel] = useState<"enem" | "concurso">("enem");
  const [result, setResult] = useState<SeedResult | null>(null);
  const [stats, setStats] = useState<{ total: number; lessons: number; quizzes: number; questions: number; images: number } | null>(null);

  const loadStats = async () => {
    const { count: total } = await supabase.from("content_cache").select("*", { count: "exact", head: true });
    const { count: lessons } = await supabase.from("content_cache").select("*", { count: "exact", head: true }).eq("tipo", "lesson");
    const { count: quizzes } = await supabase.from("content_cache").select("*", { count: "exact", head: true }).eq("tipo", "quiz");
    const { count: questions } = await supabase.from("content_cache").select("*", { count: "exact", head: true }).eq("tipo", "questions");
    const { count: images } = await supabase.from("content_cache").select("*", { count: "exact", head: true }).eq("tipo", "image_catalog");
    setStats({ total: total || 0, lessons: lessons || 0, quizzes: quizzes || 0, questions: questions || 0, images: images || 0 });
  };

  const seed = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("seed-content-cache", {
        body: { mode, level, kind, onlyMissing: true },
      });
      if (error) throw error;
      setResult(data as SeedResult);
      toast.success(`Cache populado: ${data.created} novos, ${data.skipped} já existiam, ${data.errors} erros`);
      await loadStats();
    } catch (e: any) {
      toast.error(`Erro: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><Database className="h-4 w-4" /> Estatísticas do Cache</h3>
          <Button size="sm" variant="outline" onClick={loadStats}>Atualizar</Button>
        </div>
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div className="p-3 rounded bg-muted"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-xs text-muted-foreground">Aulas</div><div className="text-2xl font-bold">{stats.lessons}</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-xs text-muted-foreground">Quizzes</div><div className="text-2xl font-bold">{stats.quizzes}</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-xs text-muted-foreground">Questões</div><div className="text-2xl font-bold">{stats.questions}</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-xs text-muted-foreground">Imagens</div><div className="text-2xl font-bold">{stats.images}</div></div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Clique em Atualizar pra ver as estatísticas.</p>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Popular cache com tópicos populares</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Pré-popula conteúdos para reduzir custo de tokens nas próximas aulas.
          Itens existentes são pulados.
        </p>

        {/* Tipo */}
        <div className="mb-2">
          <p className="text-xs font-medium mb-1">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {([
              ["lesson", "Aulas"],
              ["questions", "Questões reais (ENEM/concurso)"],
              ["images", "Catálogo de imagens didáticas"],
            ] as const).map(([k, label]) => (
              <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)} disabled={loading}>
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Nível (ENEM vs concurso) — só relevante para lesson e questions */}
        {kind !== "images" && (
          <div className="mb-2">
            <p className="text-xs font-medium mb-1">Banco de origem</p>
            <div className="flex gap-2">
              {(["enem", "concurso"] as const).map(l => (
                <Button key={l} size="sm" variant={level === l ? "default" : "outline"} onClick={() => setLevel(l)} disabled={loading}>
                  {l === "enem" ? "ENEM" : "Concurso"}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Modo de aula — só pra lesson */}
        {kind === "lesson" && (
          <div className="mb-2">
            <p className="text-xs font-medium mb-1">Profundidade</p>
            <div className="flex flex-wrap gap-2">
              {(["rapida", "completa", "masterclass"] as const).map(m => (
                <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)} disabled={loading}>
                  {m === "rapida" ? "Rápida" : m === "completa" ? "Completa" : "Masterclass"}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Button onClick={seed} disabled={loading} className="w-full sm:w-auto mt-2">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Populando…</>
            : kind === "lesson" ? "Popular aulas agora"
            : kind === "questions" ? "Popular questões reais"
            : "Popular catálogo de imagens"}
        </Button>

        {result && (
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <strong>{result.created}</strong> criadas, <strong>{result.skipped}</strong> puladas, <strong>{result.errors}</strong> erros
            </div>
            <div className="max-h-64 overflow-y-auto border rounded p-2 text-xs space-y-1">
              {result.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  {r.status === "ok" ? <CheckCircle2 className="h-3 w-3 text-green-500" /> :
                   r.status === "skip" ? <CheckCircle2 className="h-3 w-3 text-muted-foreground" /> :
                   <AlertCircle className="h-3 w-3 text-destructive" />}
                  <span className="font-medium">{r.materia}</span>
                  <span className="text-muted-foreground">— {r.tema}</span>
                  {r.error && <span className="text-destructive truncate">({r.error})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}