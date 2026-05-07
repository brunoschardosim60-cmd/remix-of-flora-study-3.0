import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const BANCAS = ["FGV", "CESPE/Cebraspe", "FCC", "Vunesp", "IBFC", "Quadrix", "AOCP", "Outra"];
const DISCIPLINAS = ["Português", "Matemática", "Direito Constitucional", "Direito Administrativo", "Raciocínio Lógico", "Informática", "Atualidades", "Conhecimentos Gerais", "Outra"];

type Tipo = "multipla_escolha" | "certo_errado";
type Nivel = "facil" | "medio" | "dificil";

export function GenerateQuestionsDialog({ onGenerated }: { onGenerated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [banca, setBanca] = useState("FGV");
  const [materia, setMateria] = useState("Português");
  const [assunto, setAssunto] = useState("");
  const [orgao, setOrgao] = useState("");
  const [cargo, setCargo] = useState("");
  const [quantidade, setQuantidade] = useState(5);
  const [nivel, setNivel] = useState<Nivel>("medio");
  const [tipo, setTipo] = useState<Tipo>("multipla_escolha");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ generated: number; saved: number } | null>(null);

  // Sugere automaticamente C/E quando banca é Cebraspe
  function handleBanca(b: string) {
    setBanca(b);
    if (b.toLowerCase().includes("cespe") || b.toLowerCase().includes("cebraspe")) {
      setTipo("certo_errado");
    } else {
      setTipo("multipla_escolha");
    }
  }

  async function handleGenerate() {
    if (!assunto.trim()) {
      toast.error("Informe o assunto da questão.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { banca, materia, assunto, orgao, cargo, quantidade, nivel, tipo, persist: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as { generated: number; saved: number };
      setResult(r);
      toast.success(`${r.saved} questão${r.saved !== 1 ? "ões" : ""} gerada${r.saved !== 1 ? "s" : ""} e salva${r.saved !== 1 ? "s" : ""}.`);
      onGenerated?.();
    } catch (e: any) {
      const msg = e?.message || "Erro ao gerar questões";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1.5">
          <Wand2 className="w-4 h-4" /> Gerar com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Gerar questões com IA
          </DialogTitle>
          <DialogDescription>
            A IA gera questões no estilo da banca escolhida e salva automaticamente no banco.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Banca</Label>
            <Select value={banca} onValueChange={handleBanca}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BANCAS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multipla_escolha">Múltipla escolha (A–E)</SelectItem>
                <SelectItem value="certo_errado">Certo / Errado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Matéria</Label>
            <Select value={materia} onValueChange={setMateria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DISCIPLINAS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nível</Label>
            <Select value={nivel} onValueChange={(v) => setNivel(v as Nivel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="facil">Fácil</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="dificil">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label>Assunto</Label>
            <Input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex: Interpretação de texto, Concordância verbal, Princípios da Adm. Pública…"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Órgão (opcional)</Label>
            <Input value={orgao} onChange={(e) => setOrgao(e.target.value)} placeholder="Ex: SEFAZ" maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo (opcional)</Label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Auditor Fiscal" maxLength={120} />
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label>Quantidade: <span className="font-semibold">{quantidade}</span></Label>
            <input
              type="range" min={1} max={10} value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">Limite de 10 por geração para garantir qualidade.</p>
          </div>
        </div>

        {result && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
            <Badge variant="secondary" className="mr-2">✓</Badge>
            {result.saved} questão{result.saved !== 1 ? "ões" : ""} salva{result.saved !== 1 ? "s" : ""} no banco.
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Fechar</Button>
          <Button onClick={handleGenerate} disabled={loading || !assunto.trim()}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Gerando…</>
            ) : (
              <><Wand2 className="w-4 h-4 mr-1.5" /> Gerar {quantidade}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}