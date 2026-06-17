import { useState } from "react";
import { FileUp, Loader2, Save, Sparkles, Search, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Recorta um PDF mantendo apenas as páginas no intervalo [from, to] (1-based, inclusivo). */
async function sliceAndEncodePdf(
  file: File,
  from: number | null,
  to: number | null,
): Promise<{ base64: string; totalPages: number; usedPages: number }> {
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf);
  const total = src.getPageCount();

  // Sem recorte definido → manda tudo
  if (!from && !to) {
    return { base64: bytesToBase64(new Uint8Array(buf)), totalPages: total, usedPages: total };
  }

  const start = Math.max(1, from ?? 1);
  const end = Math.min(total, to ?? total);
  if (start > end) {
    throw new Error(`Faixa inválida: página ${start} > ${end}.`);
  }

  const out = await PDFDocument.create();
  const indices: number[] = [];
  for (let i = start - 1; i <= end - 1; i++) indices.push(i);
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));
  const bytes = await out.save();
  return { base64: bytesToBase64(bytes), totalPages: total, usedPages: indices.length };
}

export function AdminPdfReprocessPanel() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ano, setAno] = useState("");
  const [numero, setNumero] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [hint, setHint] = useState("");
  const [pageFrom, setPageFrom] = useState("");
  const [pageTo, setPageTo] = useState("");
  const [pdfTotalPages, setPdfTotalPages] = useState<number | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Selecione um arquivo PDF.");
      return;
    }
    if (f.size > 18 * 1024 * 1024) {
      toast.error("PDF muito grande (máx 18MB).");
      return;
    }
    setPdfFile(f);
    setExtracted(null);
    setPdfTotalPages(null);
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      setPdfTotalPages(doc.getPageCount());
    } catch {
      // Silencioso: sem total, ainda dá pra mandar tudo
    }
  }

  async function findQuestionInDb() {
    if (!ano || !numero) {
      toast.error("Informe ano e número da questão.");
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("id,ano,numero,disciplina")
        .eq("ano", Number(ano))
        .eq("numero", Number(numero))
        .limit(5);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Nenhuma questão com esse ano + número no banco.");
        setQuestionId(null);
        return;
      }
      if (data.length > 1) {
        toast.warning(`${data.length} questões encontradas — usando a primeira (${data[0].disciplina}).`);
      }
      setQuestionId(data[0].id);
      if (data[0].disciplina) setDisciplina(data[0].disciplina);
      toast.success(`Questão encontrada no banco: ${data[0].disciplina}`);
    } catch (e: any) {
      reportError("buscar questão", e, { devOnly: true });
      toast.error(e?.message || "Erro ao buscar questão.");
    } finally {
      setSearching(false);
    }
  }

  async function extract() {
    if (!pdfFile) { toast.error("Envie o PDF primeiro."); return; }
    if (!numero) { toast.error("Informe o número da questão."); return; }

    setExtracting(true);
    setExtracted(null);
    try {
      const from = pageFrom ? Number(pageFrom) : null;
      const to = pageTo ? Number(pageTo) : null;
      const { base64, totalPages, usedPages } = await sliceAndEncodePdf(pdfFile, from, to);
      if (usedPages < totalPages) {
        toast.info(`PDF recortado: enviando ${usedPages} de ${totalPages} páginas à IA.`);
      }
      const { data, error } = await supabase.functions.invoke("extract-question-from-pdf", {
        body: {
          pdfBase64: base64,
          numero: Number(numero),
          ano: ano ? Number(ano) : undefined,
          disciplina: disciplina || undefined,
          hint: hint || undefined,
          pageRange: from || to ? { from: from ?? 1, to: to ?? totalPages } : undefined,
        },
      });
      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || "Erro desconhecido");
      if (!data.encontrada) {
        toast.error(`Questão ${numero} não encontrada no PDF. ${data.observacao || ""}`);
        setExtracted(data as Extracted);
        return;
      }
      setExtracted(data as Extracted);
      toast.success("Questão extraída! Revise e ajuste antes de salvar.");
    } catch (e: any) {
      reportError("extrair questão do PDF", e, { devOnly: true });
      toast.error(e?.message || "Erro ao extrair questão.");
    } finally {
      setExtracting(false);
    }
  }

  function updateAlt(i: number, field: "letra" | "texto", v: string) {
    if (!extracted) return;
    const next = [...extracted.alternativas];
    next[i] = { ...next[i], [field]: field === "letra" ? v.toUpperCase().slice(0, 1) : v };
    setExtracted({ ...extracted, alternativas: next });
  }

  async function applyToDb() {
    if (!extracted) return;
    if (!questionId) {
      toast.error("Busque a questão no banco antes (botão 'Buscar no banco').");
      return;
    }
    if (extracted.alternativas.length !== 5) {
      const ok = window.confirm(`Vai salvar com ${extracted.alternativas.length} alternativas (não 5). Continuar?`);
      if (!ok) return;
    }
    if (!extracted.correta || !extracted.alternativas.find((a) => a.letra === extracted.correta)) {
      const ok = window.confirm("Gabarito vazio ou inválido. Salvar mesmo assim?");
      if (!ok) return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("questions")
        .update({
          enunciado: extracted.enunciado,
          alternativas: extracted.alternativas as any,
          ...(extracted.correta ? { correta: extracted.correta } : {}),
          ...(extracted.tema ? { tema: extracted.tema } : {}),
        })
        .eq("id", questionId);
      if (error) throw error;
      toast.success(`Questão ${ano}/Q${numero} atualizada no banco.`);
    } catch (e: any) {
      reportError("salvar questão reprocessada", e, { devOnly: true });
      toast.error(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Upload + parâmetros */}
      <div className="grid lg:grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Arquivo PDF da prova</label>
          <div className="flex items-center gap-2">
            <Input aria-label="Arquivo PDF da prova" type="file" accept="application/pdf" onChange={handleFile} className="flex-1" />
            {pdfFile && (
              <Badge variant="secondary" className="shrink-0">
                {pdfFile.name.length > 28 ? pdfFile.name.slice(0, 25) + "…" : pdfFile.name} · {(pdfFile.size / 1024 / 1024).toFixed(1)}MB
                {pdfTotalPages != null && ` · ${pdfTotalPages}p`}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ano</label>
          <Input value={ano} onChange={(e) => setAno(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2024" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Número da questão</label>
          <Input value={numero} onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="105" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Disciplina (opcional)</label>
          <Input value={disciplina} onChange={(e) => setDisciplina(e.target.value)} placeholder="Matemática" />
        </div>
      </div>

      {/* Recorte de páginas */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Scissors className="w-3.5 h-3.5" />
          Restringir IA a uma faixa de páginas (opcional, recomendado em PDFs grandes)
        </div>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Página inicial</label>
            <Input
              value={pageFrom}
              onChange={(e) => setPageFrom(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="ex: 12"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">
              Página final {pdfTotalPages != null && <span className="text-foreground/40">(de {pdfTotalPages})</span>}
            </label>
            <Input
              value={pageTo}
              onChange={(e) => setPageTo(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="ex: 14"
              inputMode="numeric"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setPageFrom(""); setPageTo(""); }}
            disabled={!pageFrom && !pageTo}
          >
            Limpar
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Se preenchido, o PDF é recortado no navegador antes de ir para a IA — leitura mais precisa e mais barata.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Contexto extra (opcional)</label>
        <Input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Ex: questão sobre função quadrática, página 14…" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={findQuestionInDb} disabled={searching || !ano || !numero}>
          {searching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Buscar no banco
        </Button>
        <Button onClick={extract} disabled={extracting || !pdfFile || !numero}>
          {extracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Extrair com IA
        </Button>
        {questionId && (
          <Badge variant="secondary" className="self-center">
            DB: <span className="font-mono ml-1">{questionId.slice(0, 8)}…</span>
          </Badge>
        )}
      </div>

      {extracting && (
        <div className="text-xs text-muted-foreground italic">
          Enviando PDF ao Gemini e extraindo a questão {numero}… isso pode levar 10–30 segundos.
        </div>
      )}

      {/* Resultado editável */}
      {extracted && (
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Resultado da extração</h3>
            {extracted.encontrada ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">encontrada</Badge>
            ) : (
              <Badge variant="destructive">não encontrada</Badge>
            )}
            {extracted.observacao && (
              <span className="text-xs text-muted-foreground italic truncate">{extracted.observacao}</span>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Enunciado <span className="text-foreground/40">({extracted.enunciado.length} chars)</span>
            </label>
            <Textarea
              value={extracted.enunciado}
              onChange={(e) => setExtracted({ ...extracted, enunciado: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Alternativas ({extracted.alternativas.length}/5)
            </label>
            <div className="space-y-2">
              {extracted.alternativas.map((alt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setExtracted({ ...extracted, correta: alt.letra })}
                    className={`shrink-0 w-9 h-9 rounded-md border-2 font-semibold text-sm transition-colors ${
                      extracted.correta === alt.letra
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-600"
                        : "border-border hover:border-primary/50"
                    }`}
                    title="Marcar como correta"
                  >
                    {alt.letra || "?"}
                  </button>
                  <Textarea
                    value={alt.texto}
                    onChange={(e) => updateAlt(i, "texto", e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tema (opcional)</label>
              <Input aria-label="Tema" value={extracted.tema} onChange={(e) => setExtracted({ ...extracted, tema: e.target.value })} />
            </div>
            <Button onClick={applyToDb} disabled={saving || !questionId}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Aplicar ao banco
            </Button>
          </div>

          {!questionId && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <FileUp className="w-3.5 h-3.5" /> Clique em "Buscar no banco" para localizar o registro a ser atualizado.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}