import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { type Subject } from "@/lib/studyData";
import { toLocalDateStr } from "@/lib/dateUtils";
import { mapDisciplinaToSubject } from "@/lib/concursoMapping";

type Trilha = {
  id: string;
  pacote: string;
  disciplina: string;
  descricao: string;
  topicos: string[];
};

const PACOTE_LABEL: Record<string, string> = {
  basico: "Básico",
  juridico: "Jurídico",
  fiscal: "Fiscal",
  policial: "Policial",
  bancario: "Bancário",
};

type Props = {
  onAddTopic?: (tema: string, materia: Subject, data: string, skipWeekends: boolean) => void;
};

const HIDDEN_KEY = "studyflow.concurso-trails.hidden";

/**
 * Lista trilhas padrão de concurso (Português, Direito Constitucional, etc.)
 * e permite adicionar tópicos ao plano de estudo do aluno.
 */
export function ConcursoTrails({ onAddTopic }: Props) {
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPacote, setOpenPacote] = useState<string | null>(null);
  const [hidden, setHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(HIDDEN_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    const handler = () => {
      try { localStorage.removeItem(HIDDEN_KEY); } catch {}
      setHidden(false);
    };
    window.addEventListener("concurso-trails-show", handler);
    return () => window.removeEventListener("concurso-trails-show", handler);
  }, []);

  useEffect(() => {
    (async () => {
      if (hidden) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("concurso_trilhas")
        .select("id,pacote,disciplina,descricao,topicos")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) {
        toast.error("Erro ao carregar trilhas");
      } else {
        setTrilhas(((data ?? []) as any[]).map((t) => ({
          ...t,
          topicos: Array.isArray(t.topicos) ? t.topicos : [],
        })));
      }
      setLoading(false);
    })();
  }, [hidden]);

  if (hidden) return null;

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const byPacote = new Map<string, Trilha[]>();
  for (const t of trilhas) {
    if (!byPacote.has(t.pacote)) byPacote.set(t.pacote, []);
    byPacote.get(t.pacote)!.push(t);
  }

  const addToPlan = (trilha: Trilha, topico: string) => {
    if (!onAddTopic) return;
    const today = toLocalDateStr(new Date());
    const materia = mapDisciplinaToSubject(trilha.disciplina);
    onAddTopic(`${trilha.disciplina} — ${topico}`, materia, today, true);
    toast.success(`"${topico}" adicionado ao plano com revisões 1/3/7/15.`);
  };

  return (
    <Card className="p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Trilhas de Concurso</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">SUGERIDAS PELA FLORA</Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            try { localStorage.setItem(HIDDEN_KEY, "1"); } catch {}
            setHidden(true);
            toast.success("Trilhas ocultadas. Peça à Flora para mostrar de novo.");
          }}
          aria-label="Ocultar trilhas"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Disciplinas e tópicos padrão de concursos. Adicione ao seu plano para a Flora gerar revisões automáticas.
      </p>

      <div className="space-y-2">
        {Array.from(byPacote.entries()).map(([pacote, items]) => {
          const open = openPacote === pacote;
          return (
            <div key={pacote} className="border border-border/60 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenPacote(open ? null : pacote)}
                className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">{PACOTE_LABEL[pacote] ?? pacote}</Badge>
                  <span className="text-sm font-medium">{items.length} disciplinas</span>
                </div>
                <span className="text-xs text-muted-foreground">{open ? "Recolher" : "Expandir"}</span>
              </button>
              {open && (
                <div className="border-t border-border/60 divide-y divide-border/60">
                  {items.map((t) => (
                    <div key={t.id} className="p-3 space-y-2">
                      <div>
                        <p className="text-sm font-medium">{t.disciplina}</p>
                        {t.descricao && (
                          <p className="text-xs text-muted-foreground">{t.descricao}</p>
                        )}
                      </div>
                      {t.topicos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {t.topicos.map((topico) => (
                            <Button
                              key={topico}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2"
                              onClick={() => addToPlan(t, topico)}
                              disabled={!onAddTopic}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              {topico}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
