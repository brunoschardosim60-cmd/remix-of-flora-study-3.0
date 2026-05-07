import { useMemo, useState } from "react";
import { Loader2, Save, Sparkles, Scissors, ListChecks, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorHandling";
import { PDFDocument } from "pdf-lib";

type Alt = { letra: string; texto: string };
type Extracted = {
  encontrada: boolean;
  enunciado: string;
  alternativas: Alt[];
  correta: string;
  tema: string;
  observacao: string;
};

type Status = "pending" | "extracting" | "ready" | "missing" | "error" | "saving" | "saved" | "save_error";

interface BatchItem {
  key: string;
  ano: number;
  numero: number;
  pageFrom: number | null;
  pageTo: number | null;
  status: Status;
  error?: string;
  questionId?: string | null;
  dbDisciplina?: string;
  extracted?: Extracted | null;
  selected: boolean;
  expanded: boolean;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function sliceAndEncodePdf(
  src: PDFDocument,
  from: number | null,
  to: number | null,
  fullBytes: Uint8Array,
): Promise<{ base64: string; totalPages: number; usedPages: number }> {
  const total = src.getPageCount();
  if (!from && !to) {
    return { base64: bytesToBase64(fullBytes), totalPages: total, usedPages: total };
  }
  const start = Math.max(1, from ?? 1);
  const end = Math.min(total, to ?? total);
  if (start > end) throw new Error(`Faixa inválida: ${start} > ${end}.`);
  const out = await PDFDocument.create();
  const indices: number[] = [];
  for (let i = start - 1; i <= end - 1; i++) indices.push(i);
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));
  const bytes = await out.save();
  return { base64: bytesToBase64(bytes), totalPages: total, usedPages: indices.length };
}

/** Parser de lista: aceita "ano,numero[,pgInicio,pgFim]" ou "ano numero" por linha. */
function parseBatchInput(raw: string): { items: Omit<BatchItem, "status" | "selected" | "expanded">[]; errors: string[] } {
  const items: Omit<BatchItem, "status" | "selected" | "expanded">[] = [];
  const errors: string[] = [];
  const lines = raw.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return;
    const parts = clean.split(/[,\s]+/).filter(Boolean);
    if (parts.length < 2) {
      errors.push(`Linha ${idx + 1}: "${clean}" — esperado "ano,numero[,pg_inicial,pg_final]".`);
      return;
    }
    const ano = Number(parts[0]);
    const numero = Number(parts[1]);
    const pageFrom = parts[2] ? Number(parts[2]) : null;
    const pageTo = parts[3] ? Number(parts[3]) : null;
    if (!Number.isFinite(ano) || ano < 1990 || ano > 2100) { errors.push(`Linha ${idx + 1}: ano inválido (${parts[0]}).`); return; }
    if (!Number.isFinite(numero) || numero < 1 || numero > 999) { errors.push(`Linha ${idx + 1}: número inválido (${parts[1]}).`); return; }
    if (pageFrom != null && (!Number.isFinite(pageFrom) || pageFrom < 1)) { errors.push(`Linha ${idx + 1}: página inicial inválida.`); return; }
    if (pageTo != null && (!Number.isFinite(pageTo) || pageTo < 1)) { errors.push(`Linha ${idx + 1}: página final inválida.`); return; }
    items.push({ key: `${ano}-${numero}-${idx}`, ano, numero, pageFrom, pageTo });
  });
  return { items, errors };
}

const DEFAULT_PLACEHOLDER = `Cole aqui uma questão por linha. Formatos aceitos:

2024,105
2024,106,12,14
2023 87

# linhas começando com # são ignoradas`;

export function AdminPdfBatchPanel() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number | null>(null);
  const [rawList, setRawList] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { toast.error("Selecione um arquivo PDF."); return; }
    if (f.size > 18 * 1024 * 1024) { toast.error("PDF muito grande (máx 18MB)."); return; }
    setPdfFile(f);
    setPdfTotalPages(null);
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      setPdfTotalPages(doc.getPageCount());
    } catch {}
  }

  function buildList() {
    const { items: parsed, errors } = parseBatchInput(rawList);
    setParseErrors(errors);
    if (parsed.length === 0) {
      setItems([]);
      if (errors.length === 0) toast.error("Nenhuma questão válida na lista.");
      return;
    }
    setItems(parsed.map((p) => ({ ...p, status: "pending", selected: true, expanded: false })));
    toast.success(`${parsed.length} questão(ões) carregada(s).`);
  }

  function patchItem(key: string, patch: Partial<BatchItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function patchExtracted(key: string, patch: Partial<Extracted>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key && it.extracted ? { ...it, extracted: { ...it.extracted, ...patch } } : it)),
    );
  }

  function updateAlt(key: string, i: number, field: "letra" | "texto", v: string) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key || !it.extracted) return it;
        const next = [...it.extracted.alternativas];
        next[i] = { ...next[i], [field]: field === "letra" ? v.toUpperCase().slice(0, 1) : v };
        return { ...it, extracted: { ...it.extracted, alternativas: next } };
      }),
    );
  }

  async function runExtraction() {
    if (!pdfFile) { toast.error("Envie o PDF primeiro."); return; }
    if (items.length === 0) { toast.error("Carregue a lista antes."); return; }
    setRunning(true);
    try {
      const buf = await pdfFile.arrayBuffer();
      const fullBytes = new Uint8Array(buf);
      const src = await PDFDocument.load(buf);

      // 1) Pré-busca em lote no banco (1 query) por (ano, numero)
      const anosUnicos = Array.from(new Set(items.map((i) => i.ano)));
      const numerosUnicos = Array.from(new Set(items.map((i) => i.numero)));
      const { data: dbRows } = await supabase
        .from("questions")
        .select("id,ano,numero,disciplina")
        .in("ano", anosUnicos)
        .in("numero", numerosUnicos);
      const dbIndex = new Map<string, { id: string; disciplina: string }>();
      (dbRows ?? []).forEach((r) => {
        if (r.ano != null && r.numero != null) {
          dbIndex.set(`${r.ano}:${r.numero}`, { id: r.id, disciplina: r.disciplina ?? "" });
        }
      });

      // 2) Para cada item: recorta PDF, chama edge function (sequencial pra respeitar rate-limit)
      for (const item of items) {
        const dbHit = dbIndex.get(`${item.ano}:${item.numero}`);
        patchItem(item.key, {
          status: "extracting",
          questionId: dbHit?.id ?? null,
          dbDisciplina: dbHit?.disciplina ?? "",
        });
        try {
          const { base64, totalPages, usedPages } = await sliceAndEncodePdf(src, item.pageFrom, item.pageTo, fullBytes);
          const { data, error } = await supabase.functions.invoke("extract-question-from-pdf", {
            body: {
              pdfBase64: base64,
              numero: item.numero,
              ano: item.ano,
              disciplina: dbHit?.disciplina || undefined,
              pageRange:
                item.pageFrom || item.pageTo
                  ? { from: item.pageFrom ?? 1, to: item.pageTo ?? totalPages }
                  : undefined,
            },
          });
          if (error) throw error;
          if (!data || data.error) throw new Error(data?.error || "Erro desconhecido");
          const extracted = data as Extracted;
          patchItem(item.key, {
            extracted,
            status: extracted.encontrada ? "ready" : "missing",
          });
          // pequena pausa entre chamadas para suavizar rate-limit
          await new Promise((r) => setTimeout(r, 400));
          // referência para evitar warning sobre `usedPages`
          if (usedPages > totalPages) console.warn("inconsistência de paginação");
        } catch (e: any) {
          reportError(`extrair lote ${item.ano}/${item.numero}`, e, { devOnly: true });
          patchItem(item.key, { status: "error", error: e?.message || "Falha ao extrair" });
        }
      }
    } finally {
      setRunning(false);
    }
  }

  async function saveSelected() {
    const toSave = items.filter((it) => it.selected && it.status === "ready" && it.extracted);
    if (toSave.length === 0) {
      toast.error("Selecione ao menos uma questão pronta.");
      return;
    }
    const semId = toSave.filter((it) => !it.questionId);
    if (semId.length > 0) {
      const ok = window.confirm(
        `${semId.length} questão(ões) selecionada(s) não foi(ram) localizada(s) no banco e serão ignoradas. Continuar com as restantes?`,
      );
      if (!ok) return;
    }
    const valid = toSave.filter((it) => it.questionId);
    if (valid.length === 0) return;

    setSavingAll(true);
    try {
      for (const it of valid) {
        patchItem(it.key, { status: "saving" });
        try {
          const ex = it.extracted!;
          const { error } = await supabase
            .from("questions")
            .update({
              enunciado: ex.enunciado,
              alternativas: ex.alternativas as any,
              ...(ex.correta ? { correta: ex.correta } : {}),
              ...(ex.tema ? { tema: ex.tema } : {}),
            })
            .eq("id", it.questionId!);
          if (error) throw error;
          patchItem(it.key, { status: "saved" });
        } catch (e: any) {
          reportError(`salvar lote ${it.ano}/${it.numero}`, e, { devOnly: true });
          patchItem(it.key, { status: "save_error", error: e?.message || "Falha ao salvar" });
        }
      }
      toast.success(`${valid.length} questão(ões) atualizada(s) no banco.`);
    } finally {
      setSavingAll(false);
    }
  }

  const summary = useMemo(() => {
    const byStatus = items.reduce<Record<string, number>>((acc, it) => {
      acc[it.status] = (acc[it.status] ?? 0) + 1;
      return acc;
    }, {});
    const selected = items.filter((it) => it.selected && it.status === "ready").length;
    return { byStatus, selected, total: items.length };
  }, [items]);

  const allSelected = items.length > 0 && items.every((it) => it.selected || it.status !== "ready");

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Reprocessamento em lote</h3>
        <Badge variant="outline" className="text-[10px]">a partir do mesmo PDF</Badge>
      </div>

      {/* Upload do PDF */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Arquivo PDF da prova</label>
        <div className="flex items-center gap-2">
          <Input type="file" accept="application/pdf" onChange={handleFile} className="flex-1" />
          {pdfFile && (
            <Badge variant="secondary" className="shrink-0">
              {pdfFile.name.length > 24 ? pdfFile.name.slice(0, 21) + "…" : pdfFile.name}
              {pdfTotalPages != null && ` · ${pdfTotalPages}p`}
            </Badge>
          )}
        </div>
      </div>

      {/* Lista de questões */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Lista de questões (uma por linha)
        </label>
        <Textarea
          value={rawList}
          onChange={(e) => setRawList(e.target.value)}
          rows={8}
          placeholder={DEFAULT_PLACEHOLDER}
          className="font-mono text-xs"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={buildList} disabled={!rawList.trim()}>
            Carregar lista
          </Button>
          {parseErrors.length > 0 && (
            <Badge variant="destructive" className="text-[11px]">
              {parseErrors.length} linha(s) com erro
            </Badge>
          )}
          {items.length > 0 && (
            <Badge variant="secondary" className="text-[11px]">
              {items.length} questão(ões) na fila
            </Badge>
          )}
        </div>
        {parseErrors.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-destructive">
            {parseErrors.slice(0, 5).map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
            {parseErrors.length > 5 && <li>… e mais {parseErrors.length - 5}</li>}
          </ul>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
          <Scissors className="w-3 h-3" />
          Formato: <code className="px-1 rounded bg-muted">ano,numero</code> ou <code className="px-1 rounded bg-muted">ano,numero,pg_inicio,pg_fim</code>
        </p>
      </div>

      {/* Ações principais */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button onClick={runExtraction} disabled={running || !pdfFile || items.length === 0}>
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {running ? "Extraindo…" : `Extrair ${items.length || ""} com IA`}
        </Button>
        <Button
          variant="default"
          onClick={saveSelected}
          disabled={savingAll || running || summary.selected === 0}
        >
          {savingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar selecionadas ({summary.selected})
        </Button>
        {items.length > 0 && (
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                const v = checked === true;
                setItems((prev) => prev.map((it) => (it.status === "ready" ? { ...it, selected: v } : it)));
              }}
            />
            selecionar todas prontas
          </label>
        )}
      </div>

      {/* Resumo de status */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {summary.byStatus.pending && <Badge variant="outline">aguardando: {summary.byStatus.pending}</Badge>}
          {summary.byStatus.extracting && <Badge variant="outline">extraindo: {summary.byStatus.extracting}</Badge>}
          {summary.byStatus.ready && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">prontas: {summary.byStatus.ready}</Badge>}
          {summary.byStatus.missing && <Badge variant="destructive">não encontradas: {summary.byStatus.missing}</Badge>}
          {summary.byStatus.error && <Badge variant="destructive">erros: {summary.byStatus.error}</Badge>}
          {summary.byStatus.saved && <Badge className="bg-primary/15 text-primary border-primary/30">salvas: {summary.byStatus.saved}</Badge>}
          {summary.byStatus.save_error && <Badge variant="destructive">falha ao salvar: {summary.byStatus.save_error}</Badge>}
        </div>
      )}

      {/* Lista para revisão */}
      {items.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          {items.map((it) => (
            <BatchRow
              key={it.key}
              item={it}
              onToggleSelected={(v) => patchItem(it.key, { selected: v })}
              onToggleExpanded={() => patchItem(it.key, { expanded: !it.expanded })}
              onPatchExtracted={(patch) => patchExtracted(it.key, patch)}
              onUpdateAlt={(i, f, v) => updateAlt(it.key, i, f, v)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function BatchRow({
  item,
  onToggleSelected,
  onToggleExpanded,
  onPatchExtracted,
  onUpdateAlt,
}: {
  item: BatchItem;
  onToggleSelected: (v: boolean) => void;
  onToggleExpanded: () => void;
  onPatchExtracted: (patch: Partial<Extracted>) => void;
  onUpdateAlt: (i: number, f: "letra" | "texto", v: string) => void;
}) {
  const ex = item.extracted;
  const statusBadge = (() => {
    switch (item.status) {
      case "pending": return <Badge variant="outline">aguardando</Badge>;
      case "extracting": return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />extraindo</Badge>;
      case "ready": return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3" />pronta</Badge>;
      case "missing": return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />não encontrada</Badge>;
      case "error": return <Badge variant="destructive">erro</Badge>;
      case "saving": return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />salvando</Badge>;
      case "saved": return <Badge className="bg-primary/15 text-primary border-primary/30">salva</Badge>;
      case "save_error": return <Badge variant="destructive">falha ao salvar</Badge>;
    }
  })();

  const canExpand = item.status === "ready" || item.status === "missing" || item.status === "error" || item.status === "save_error" || item.status === "saved";

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center gap-2 px-3 py-2">
        <Checkbox
          disabled={item.status !== "ready"}
          checked={item.selected && item.status === "ready"}
          onCheckedChange={(v) => onToggleSelected(v === true)}
        />
        <button
          type="button"
          onClick={canExpand ? onToggleExpanded : undefined}
          className={`flex-1 flex items-center gap-2 text-left text-sm ${canExpand ? "cursor-pointer hover:text-primary" : "cursor-default"}`}
        >
          {canExpand && (item.expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
          <span className="font-mono text-xs text-muted-foreground">{item.ano}/Q{item.numero}</span>
          {item.dbDisciplina && <span className="text-xs text-muted-foreground">· {item.dbDisciplina}</span>}
          {(item.pageFrom || item.pageTo) && (
            <span className="text-[11px] text-muted-foreground">· pgs {item.pageFrom ?? "?"}–{item.pageTo ?? "?"}</span>
          )}
          {!item.questionId && item.status !== "pending" && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">sem id no banco</Badge>
          )}
          {ex?.enunciado && (
            <span className="ml-2 truncate text-xs text-muted-foreground">{ex.enunciado.slice(0, 70)}…</span>
          )}
        </button>
        {statusBadge}
      </div>

      {item.expanded && (
        <div className="border-t border-border px-3 py-3 space-y-3">
          {item.error && (
            <div className="text-xs text-destructive">{item.error}</div>
          )}
          {ex && (
            <>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Enunciado <span className="text-foreground/40">({ex.enunciado.length} chars)</span>
                </label>
                <Textarea
                  value={ex.enunciado}
                  onChange={(e) => onPatchExtracted({ enunciado: e.target.value })}
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-2 block">
                  Alternativas ({ex.alternativas.length}/5)
                </label>
                <div className="space-y-2">
                  {ex.alternativas.map((alt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => onPatchExtracted({ correta: alt.letra })}
                        className={`shrink-0 w-8 h-8 rounded-md border-2 font-semibold text-xs transition-colors ${
                          ex.correta === alt.letra
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-600"
                            : "border-border hover:border-primary/50"
                        }`}
                        title="Marcar como correta"
                      >
                        {alt.letra || "?"}
                      </button>
                      <Textarea
                        value={alt.texto}
                        onChange={(e) => onUpdateAlt(i, "texto", e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Tema</label>
                <Input value={ex.tema} onChange={(e) => onPatchExtracted({ tema: e.target.value })} />
              </div>
              {ex.observacao && (
                <p className="text-[11px] italic text-muted-foreground">{ex.observacao}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}