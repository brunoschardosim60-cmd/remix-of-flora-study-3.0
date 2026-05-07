import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Target, TrendingDown, TrendingUp, Loader2, Gauge } from "lucide-react";
import { computeReviewPhase, type ReviewPhase } from "@/lib/concursoMapping";
import { toast } from "sonner";

type Row = {
  disciplina: string;
  tema: string;
  banca: string;
  total: number;
  acertos: number;
  ultimaTentativa: string | null;
};

const PAGE_SIZE = 300;
const ABANDONO_DIAS = 14;

const PHASE_LABEL: Record<ReviewPhase, string> = {
  introducao: "Introdução",
  consolidacao: "Consolidação",
  manutencao: "Manutenção",
  reforco: "Reforço",
};

/**
 * Painel de desempenho específico para concurso.
 * Filtros (banca, disciplina), paginação incremental, regra de abandono por
 * última tentativa do tópico e sugestão de fase híbrida da Flora.
 */
export function ConcursoDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [bancaFilter, setBancaFilter] = useState<string>("Todas");
  const [discFilter, setDiscFilter] = useState<string>("Todas");
  const [adjusting, setAdjusting] = useState<string | null>(null);

  async function loadPage(from: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { fetched: 0 };
    const { data, error } = await supabase
      .from("concurso_question_attempts")
      .select("acertou,created_at,question:concurso_questions(disciplina,tema,banca)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { fetched: 0 };

    const map = new Map<string, Row>();
    // Mantém os agregados anteriores (modo incremental)
    for (const r of rows) map.set(`${r.disciplina}::${r.tema}::${r.banca}`, { ...r });
    for (const a of (data ?? []) as any[]) {
      const disc = a?.question?.disciplina || "—";
      const tema = a?.question?.tema || "—";
      const banca = a?.question?.banca || "—";
      const key = `${disc}::${tema}::${banca}`;
      if (!map.has(key)) map.set(key, { disciplina: disc, tema, banca, total: 0, acertos: 0, ultimaTentativa: null });
      const r = map.get(key)!;
      r.total++;
      if (a.acertou) r.acertos++;
      if (!r.ultimaTentativa || a.created_at > r.ultimaTentativa) r.ultimaTentativa = a.created_at;
    }
    setRows(Array.from(map.values()).sort((a, b) => b.total - a.total));
    return { fetched: data?.length ?? 0 };
  }

  useEffect(() => {
    (async () => {
      const { fetched } = await loadPage(0);
      setOffset(fetched);
      setHasMore(fetched === PAGE_SIZE);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    const { fetched } = await loadPage(offset);
    setOffset((o) => o + fetched);
    setHasMore(fetched === PAGE_SIZE);
    setLoadingMore(false);
  }

  const bancas = useMemo(() => ["Todas", ...Array.from(new Set(rows.map((r) => r.banca).filter(Boolean))).sort()], [rows]);
  const disciplinas = useMemo(() => ["Todas", ...Array.from(new Set(rows.map((r) => r.disciplina).filter(Boolean))).sort()], [rows]);

  const filtered = useMemo(
    () => rows.filter((r) => (bancaFilter === "Todas" || r.banca === bancaFilter) && (discFilter === "Todas" || r.disciplina === discFilter)),
    [rows, bancaFilter, discFilter],
  );

  async function applyHybridAdjustment(disc: string, phase: ReviewPhase) {
    if (!confirm(`Aplicar fase "${PHASE_LABEL[phase]}" em ${disc}? A Flora ajustará a carga de revisões.`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setAdjusting(disc);
    try {
      await supabase.from("flora_decisions").insert({
        user_id: user.id,
        decision_type: "concurso_review_phase",
        reasoning: `Disciplina ${disc} → fase ${phase}`,
        recommendation: { disciplina: disc, phase },
        accepted: true,
      });
      toast.success(`Fase "${PHASE_LABEL[phase]}" aplicada em ${disc}.`);
    } catch {
      toast.error("Não foi possível salvar o ajuste.");
    } finally {
      setAdjusting(null);
    }
  }

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
          <Target className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Desempenho de Concurso</h3>
            <p className="text-xs text-muted-foreground">
              Resolva questões no Banco de Concurso para ver suas estatísticas por disciplina e tema.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const now = Date.now();

  // Agrupa por disciplina (após filtros)
  const byDisc = new Map<string, Row[]>();
  for (const r of filtered) {
    if (!byDisc.has(r.disciplina)) byDisc.set(r.disciplina, []);
    byDisc.get(r.disciplina)!.push(r);
  }

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Desempenho por Disciplina</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">CONCURSO</Badge>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2">
        <Select value={bancaFilter} onValueChange={setBancaFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Banca" /></SelectTrigger>
          <SelectContent>{bancas.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={discFilter} onValueChange={setDiscFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>{disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum dado para esses filtros.
        </p>
      )}

      <div className="space-y-4">
        {Array.from(byDisc.entries()).map(([disc, temas]) => {
          const total = temas.reduce((s, t) => s + t.total, 0);
          const acertos = temas.reduce((s, t) => s + t.acertos, 0);
          const accuracy = total > 0 ? Math.round((acertos / total) * 100) : 0;
          const ultima = temas.reduce<string | null>((m, t) => (!m || (t.ultimaTentativa && t.ultimaTentativa > m) ? t.ultimaTentativa : m), null);
          const diasDesdeUltimaDisc = ultima ? Math.floor((now - new Date(ultima).getTime()) / 86400000) : 999;
          const phaseInfo = computeReviewPhase({ total, acertos, diasDesdeUltima: diasDesdeUltimaDisc });
          return (
            <div key={disc} className="border border-border/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-medium text-sm">{disc}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{total} questões</span>
                  <Badge variant={accuracy >= 70 ? "default" : accuracy >= 50 ? "secondary" : "destructive"}>
                    {accuracy}% acerto
                  </Badge>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    accuracy >= 70 ? "bg-emerald-500" : accuracy >= 50 ? "bg-amber-500" : "bg-destructive"
                  }`}
                  style={{ width: `${accuracy}%` }}
                />
              </div>
              {/* Fase híbrida (Flora) */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Gauge className="w-3 h-3" /> Fase: <strong className="text-foreground">{PHASE_LABEL[phaseInfo.phase]}</strong>
                </span>
                <span className="text-[11px] text-muted-foreground flex-1 min-w-0 truncate">
                  {phaseInfo.reason}
                </span>
                {phaseInfo.adjust !== "manter" && (
                  <Button
                    size="sm"
                    variant={phaseInfo.adjust === "aumentar" ? "destructive" : "outline"}
                    className="h-6 text-[10px] px-2"
                    onClick={() => applyHybridAdjustment(disc, phaseInfo.phase)}
                    disabled={adjusting === disc}
                  >
                    {phaseInfo.adjust === "aumentar" ? "Aumentar carga" : "Reduzir carga"}
                  </Button>
                )}
              </div>
              {/* Temas com sinais críticos */}
              {/* Fase híbrida POR TEMA (com justificativa da Flora) */}
              <div className="space-y-1.5 pt-1">
                {temas.slice(0, 8).map((t) => {
                  const acc = t.total > 0 ? Math.round((t.acertos / t.total) * 100) : 0;
                  const diasSemTentar = t.ultimaTentativa
                    ? Math.floor((now - new Date(t.ultimaTentativa).getTime()) / 86400000)
                    : 999;
                  const errosRecorrentes = (t.total - t.acertos) >= 3;
                  const abandonado = t.ultimaTentativa != null && diasSemTentar >= ABANDONO_DIAS && acc < 80 && t.total >= 2;
                  const temaPhase = computeReviewPhase({
                    total: t.total,
                    acertos: t.acertos,
                    diasDesdeUltima: diasSemTentar,
                  });
                  const adjustKey = `${disc}::${t.tema}`;
                  return (
                    <div
                      key={t.tema}
                      className="flex flex-wrap items-center gap-2 text-[11px] rounded-md border border-border/40 px-2 py-1.5 bg-muted/30"
                    >
                      <span className="font-medium truncate max-w-[160px]">{t.tema}</span>
                      <Badge
                        variant={acc >= 70 ? "default" : acc >= 50 ? "secondary" : "destructive"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {acc}%
                      </Badge>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Gauge className="w-3 h-3" />
                        <strong className="text-foreground">{PHASE_LABEL[temaPhase.phase]}</strong>
                      </span>
                      {errosRecorrentes && (
                        <span className="flex items-center gap-1 text-destructive" title="Erro recorrente (3+ erros)">
                          <TrendingDown className="w-3 h-3" />
                        </span>
                      )}
                      {abandonado && (
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400" title={`${diasSemTentar}d sem tentar`}>
                          <AlertTriangle className="w-3 h-3" />
                        </span>
                      )}
                      <span className="text-muted-foreground flex-1 min-w-[120px] truncate" title={temaPhase.reason}>
                        {temaPhase.reason}
                      </span>
                      {temaPhase.adjust !== "manter" && (
                        <Button
                          size="sm"
                          variant={temaPhase.adjust === "aumentar" ? "destructive" : "outline"}
                          className="h-5 text-[10px] px-1.5"
                          onClick={() => applyHybridAdjustment(`${disc} · ${t.tema}`, temaPhase.phase)}
                          disabled={adjusting === adjustKey}
                        >
                          {temaPhase.adjust === "aumentar" ? "Aumentar" : "Reduzir"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-muted-foreground flex flex-wrap gap-3 pt-1 border-t border-border/40">
        <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-destructive" /> erro recorrente (3+ erros)</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-600" /> abandono (≥14d)</span>
        {hasMore && (
          <Button
            size="sm" variant="ghost" className="ml-auto h-6 text-[11px] px-2"
            onClick={loadMore} disabled={loadingMore}
          >
            {loadingMore ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Carregar mais ({offset})
          </Button>
        )}
      </div>
    </Card>
  );
}
