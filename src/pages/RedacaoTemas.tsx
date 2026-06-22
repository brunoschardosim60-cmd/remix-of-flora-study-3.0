import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, Pencil, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";

type Theme = {
  id: string;
  year: number | null;
  edition: string;
  tema: string;
  texto_motivador: string;
  eixo: string;
  dificuldade: string;
  origem?: string;
};

export default function RedacaoTemas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [search, setSearch] = useState("");
  const [opened, setOpened] = useState<Theme | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customTema, setCustomTema] = useState("");
  const [customMotivador, setCustomMotivador] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("essay_themes")
        .select("id,year,edition,tema,texto_motivador,eixo,dificuldade,origem")
        .order("year", { ascending: false });
      if (error) toast.error("Erro ao carregar temas");
      else setThemes((data || []) as Theme[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return themes;
    return themes.filter((t) => t.tema.toLowerCase().includes(s) || String(t.year).includes(s));
  }, [themes, search]);

  function startCustom() {
    const tema = customTema.trim();
    if (!tema) { toast.error("Escreva um tema"); return; }
    navigate("/redacao", {
      state: {
        tema,
        textoMotivador: customMotivador.trim() || undefined,
        custom: true,
      },
    });
  }

  function originLabel(t: Theme) {
    const o = (t.origem || "enem_oficial").toLowerCase();
    if (o.includes("enem")) return `ENEM ${t.year ?? ""}`.trim();
    if (o.includes("fuvest")) return `Fuvest ${t.year ?? ""}`.trim();
    if (o.includes("vest")) return `Vestibular ${t.year ?? ""}`.trim();
    return t.year ? `${t.year}` : "Tema";
  }

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-6">
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold leading-tight">Temas de Redação</h1>
            <p className="text-xs text-muted-foreground">{themes.length} temas disponíveis</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCustomOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Tema personalizado</span>
          </Button>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar tema…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((t) => (
              <Card key={t.id} className="p-4 hover:border-primary transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{originLabel(t)}</Badge>
                  <Badge variant="outline" className="capitalize">{t.dificuldade}</Badge>
                </div>
                <h3 className="font-semibold leading-snug mb-3">{t.tema}</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpened(t)}>Ver textos motivadores</Button>
                  <Button size="sm" onClick={() => navigate("/redacao", { state: { tema: t.tema } })}>
                    <Pencil className="w-4 h-4 mr-1" /> Escrever
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {opened && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center p-3 overflow-y-auto" onClick={() => setOpened(null)}>
          <Card className="max-w-3xl w-full my-6 p-4 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="secondary" className="mb-2">{originLabel(opened)}</Badge>
                <h2 className="text-xl font-semibold">{opened.tema}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpened(null)}>Fechar</Button>
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-[60vh] overflow-y-auto pr-2">
              {opened.texto_motivador || "Texto motivador não disponível."}
            </div>
            <Button onClick={() => navigate("/redacao", { state: { tema: opened.tema } })} className="w-full">
              <Pencil className="w-4 h-4 mr-2" /> Escrever sobre este tema
            </Button>
          </Card>
        </div>
      )}

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tema personalizado</DialogTitle>
            <DialogDescription>
              Use um tema de prova específica (Fuvest, Unicamp, concurso, etc.) ou crie o seu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ct-tema">Tema</Label>
              <Input
                id="ct-tema"
                placeholder="Ex: Os impactos da IA no mercado de trabalho brasileiro"
                value={customTema}
                onChange={(e) => setCustomTema(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ct-mot">Texto motivador (opcional)</Label>
              <Textarea
                id="ct-mot"
                placeholder="Cole aqui o(s) texto(s) motivador(es) da prova, se tiver."
                value={customMotivador}
                onChange={(e) => setCustomMotivador(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCustomOpen(false)}>Cancelar</Button>
            <Button onClick={startCustom}>
              <Pencil className="w-4 h-4 mr-2" /> Escrever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}