import { useState } from "react";
import { Loader2, Tags } from "lucide-react";
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
  const [result, setResult] = useState<{ updated: number; skipped: number; total: number; temas: Record<string, number> } | null>(null);

  async function runClassification() {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("classify-question-temas", {
        body: { disciplina, limit: Math.min(100, Math.max(1, Number(batch) || 30)) },
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

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Tags className="h-4 w-4 text-primary" />
        <p className="font-medium">Classificar temas das questões (Citologia, Genética…)</p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Usa IA pra preencher o campo <code>tema</code> de questões reais do ENEM que estão sem tema.
        Roda em lotes — clique várias vezes até zerar pendentes.
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