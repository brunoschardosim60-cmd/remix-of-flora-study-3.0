import { useState } from "react";
import { Loader2, Tags, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DISCIPLINAS = [
  "Biologia", "Química", "Física", "Matemática",
  "História", "Geografia", "Filosofia", "Sociologia",
  "Português", "Literatura", "Linguagens",
  "Humanas", "Natureza", "Ciências Humanas", "Ciências da Natureza",
  "Inglês", "Espanhol", "Artes", "Educação Física",
];

export function AdminTemaClassifierPanel() {
  const [disciplina, setDisciplina] = useState<string>("Biologia");
  const [batch, setBatch] = useState("30");
  const [running, setRunning] = useState(false);
  const [force, setForce] = useState(false);
  const [uncertainOnly, setUncertainOnly] = useState(false);
  const [maxConfidence, setMaxConfidence] = useState("0.70");
  const [result, setResult] = useState<{ updated: number; skipped: number; total: number; temas: Record<string, number> } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkLog, setBulkLog] = useState<string[]>([]);

  async function runClassification() {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("classify-question-temas", {
        body: { disciplina, limit: Math.min(100, Math.max(1, Number(batch) || 30)), force, uncertainOnly, maxConfidence: Number(maxConfidence) || 0.7 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
      toast.success(`Classificadas ${(data as any).updated} de ${(data as any).total} questões.`);
    } catch (e) {
      toast.error("Falha ao classificar: " + ((e as Error)?.message || e));
    } finally {
      setRunning(false);
    }
  }

  async function runBulkAll() {
    if (!confirm("Reclassificar TODAS as disciplinas (force=true)? Pode demorar vários minutos e consumir cota de IA.")) return;
    setBulkRunning(true);
    setBulkLog([]);
    const append = (s: string) => setBulkLog((l) => [...l, s]);
    try {
      for (const disc of DISCIPLINAS) {
        append(`▶ ${disc}: iniciando…`);
        let totalUpdated = 0, totalSkipped = 0, rounds = 0, offset = 0;
        // Loop em chunks de 100 paginando até esgotar a disciplina
        while (rounds < 50) {
          rounds++;
          try {
            const { data, error } = await supabase.functions.invoke("classify-question-temas", {
              body: { disciplina: disc, limit: 100, force: true, offset },
            });
            if (error) throw error;
            if ((data as any)?.error) throw new Error((data as any).error);
            const upd = (data as any).updated ?? 0;
            const skp = (data as any).skipped ?? 0;
            const tot = (data as any).total ?? 0;
            const next = (data as any).nextOffset ?? (offset + tot);
            totalUpdated += upd; totalSkipped += skp;
            append(`   lote ${rounds} (off ${offset}): ${upd} atualizadas / ${skp} puladas / ${tot} questões`);
            if (tot === 0) break;
            offset = next;
          } catch (e) {
            append(`   ⚠ erro: ${(e as Error)?.message || e}`);
            break;
          }
        }
        append(`✓ ${disc}: ${totalUpdated} atualizadas, ${totalSkipped} puladas`);
      }
      toast.success("Reclassificação completa.");
    } catch (e) {
      toast.error("Falha no bulk: " + ((e as Error)?.message || e));
    } finally {
      setBulkRunning(false);
    }
  }

  async function runBulkUncertain() {
    if (!confirm(`Reprocessar só questões incertas (confiança ≤ ${maxConfidence || "0.70"})?`)) return;
    setBulkRunning(true);
    setBulkLog([]);
    const append = (s: string) => setBulkLog((l) => [...l, s]);
    try {
      for (const disc of DISCIPLINAS) {
        append(`▶ ${disc}: reprocessando incertas…`);
        let totalUpdated = 0, totalSkipped = 0, rounds = 0;
        while (rounds < 50) {
          rounds++;
          const { data, error } = await supabase.functions.invoke("classify-question-temas", {
            body: { disciplina: disc, limit: 100, uncertainOnly: true, maxConfidence: Number(maxConfidence) || 0.7, offset: 0 },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          const upd = (data as any).updated ?? 0;
          const skp = (data as any).skipped ?? 0;
          const tot = (data as any).total ?? 0;
          totalUpdated += upd; totalSkipped += skp;
          append(`   lote ${rounds}: ${upd} atualizadas / ${skp} puladas / ${tot} incertas`);
          if (tot === 0 || (upd === 0 && skp === 0)) break;
        }
        append(`✓ ${disc}: ${totalUpdated} atualizadas, ${totalSkipped} puladas`);
      }
      toast.success("Reprocessamento das incertas completo.");
    } catch (e) {
      toast.error("Falha no bulk incerto: " + ((e as Error)?.message || e));
    } finally {
      setBulkRunning(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Tags className="h-4 w-4 text-primary" />
        <p className="font-medium">Classificar temas das questões (Citologia, Genética…)</p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Usa IA pra classificar o <code>tema</code>. Por padrão só processa questões SEM tema.
        Marque "Reclassificar tudo" pra revisar também as já classificadas (útil quando muitas caíram no bucket errado).
      </p>
      <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
        <Select value={disciplina} onValueChange={setDisciplina}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DISCIPLINAS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="number" min={1} max={100} value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Lote" />
        <Button onClick={runClassification} disabled={running}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Classificar lote
        </Button>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
        Reclassificar TUDO (sobrescreve temas existentes — use pra reparar buckets gigantes tipo "Funções")
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={uncertainOnly} onChange={(e) => setUncertainOnly(e.target.checked)} />
          Só incertas/baixa confiança
        </label>
        <Input className="h-8 w-24" type="number" min={0} max={1} step={0.05} value={maxConfidence} onChange={(e) => setMaxConfidence(e.target.value)} />
      </div>
      <div className="mt-4 pt-3 border-t border-border">
        <div className="grid gap-2 md:grid-cols-2">
        <Button onClick={runBulkAll} disabled={bulkRunning || running} variant="secondary" className="w-full">
          {bulkRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
          Reclassificar TODAS as disciplinas (force, em lotes de 100)
        </Button>
        <Button onClick={runBulkUncertain} disabled={bulkRunning || running} variant="secondary" className="w-full">
          {bulkRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
          Reprocessar só incertas
        </Button>
        </div>
        {bulkLog.length > 0 && (
          <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-5">
            {bulkLog.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
      {result && (
        <div className="mt-3 rounded-xl border border-border bg-background p-3 text-sm">
          <p><strong>{result.updated}</strong> atualizadas · {result.skipped} puladas · {result.total} no lote</p>
          {Object.keys(result.temas).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(result.temas).map(([t, n]) => (
                <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t}: {n}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}