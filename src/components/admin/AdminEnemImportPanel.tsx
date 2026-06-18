import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Result = {
  year: number; offset: number; total: number; hasMore: boolean;
  fetched: number; inserted: number; skipped: number; failed: number;
  nextOffset: number;
};

export function AdminEnemImportPanel() {
  const [year, setYear] = useState(2023);
  const [loading, setLoading] = useState(false);
  const [autoAll, setAutoAll] = useState(false);
  const [log, setLog] = useState<Result[]>([]);

  async function importBatch(yr: number, offset: number): Promise<Result | null> {
    const { data, error } = await supabase.functions.invoke("import-enem-questions", {
      body: { year: yr, offset, limit: 50 },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Falha");
      return null;
    }
    return data as Result;
  }

  async function runOne() {
    setLoading(true);
    setLog([]);
    const r = await importBatch(year, 0);
    if (r) setLog([r]);
    setLoading(false);
  }

  async function runFullYear() {
    setLoading(true);
    setAutoAll(true);
    setLog([]);
    let offset = 0;
    let safety = 0;
    while (safety++ < 20) {
      const r = await importBatch(year, offset);
      if (!r) break;
      setLog((prev) => [...prev, r]);
      if (!r.hasMore || r.fetched === 0) break;
      offset = r.nextOffset;
      await new Promise((res) => setTimeout(res, 400));
    }
    toast.success("Import do ano concluído");
    setAutoAll(false);
    setLoading(false);
  }

  const totalInserted = log.reduce((s, r) => s + r.inserted, 0);
  const totalSkipped = log.reduce((s, r) => s + r.skipped, 0);
  const totalFailed = log.reduce((s, r) => s + r.failed, 0);

  return (
    <section className="rounded-2xl border border-border/70 bg-background/75 p-4 mb-4">
      <div className="mb-3 flex items-center gap-2">
        <Download className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Importar ENEM oficial (enem.dev)</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Importa questões oficiais do ENEM de um ano específico (2009-2023). Origem = <code>enem.dev</code>.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Input
          type="number" min={2009} max={2023}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28"
          disabled={loading}
        />
        <Button onClick={runOne} disabled={loading} variant="outline" size="sm">
          {loading && !autoAll ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar 50"}
        </Button>
        <Button onClick={runFullYear} disabled={loading} size="sm">
          {loading && autoAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Importar ano todo
        </Button>
      </div>
      {log.length > 0 && (
        <div className="text-xs space-y-1">
          <p className="font-medium">
            Inseridas: {totalInserted} · Já existiam: {totalSkipped} · Falhas: {totalFailed}
          </p>
          <details>
            <summary className="cursor-pointer text-muted-foreground">Detalhes por batch</summary>
            <ul className="mt-2 space-y-1 max-h-48 overflow-auto">
              {log.map((r, i) => (
                <li key={i} className="text-muted-foreground">
                  offset {r.offset} → fetched {r.fetched}, +{r.inserted}, skip {r.skipped}, fail {r.failed}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}