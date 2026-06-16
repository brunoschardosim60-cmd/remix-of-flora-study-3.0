/**
 * /aulas — Biblioteca de aulas curadas (lessons) + geração on-demand cacheada.
 * Mostra todas as aulas publicadas agrupadas por matéria. Usuário pode pedir
 * aula nova; primeira vez gera via IA, demais vezes serve do cache compartilhado.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, Sparkles, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { suggestCorrection } from "@/lib/textCorrector";

type Lesson = {
  id: string;
  title: string;
  subject: string;
  topic: string;
  cover_emoji: string | null;
  description: string | null;
  estimated_minutes: number;
};

type OnDemand = {
  materia: string;
  tema: string;
  lesson: any;
  cached: boolean;
};

export default function Aulas() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [askMateria, setAskMateria] = useState("Matemática");
  const [askTema, setAskTema] = useState("");
  const [generating, setGenerating] = useState(false);
  const [onDemand, setOnDemand] = useState<OnDemand | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, subject, topic, cover_emoji, description, estimated_minutes")
        .eq("published", true)
        .order("subject", { ascending: true });
      if (error) toast.error("Erro ao carregar biblioteca");
      setLessons((data as Lesson[]) || []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? lessons.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.topic.toLowerCase().includes(q) ||
            l.subject.toLowerCase().includes(q),
        )
      : lessons;
    const map = new Map<string, Lesson[]>();
    filtered.forEach((l) => {
      const arr = map.get(l.subject) || [];
      arr.push(l);
      map.set(l.subject, arr);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [lessons, search]);

  const askFlora = async () => {
    const raw = askTema.trim();
    if (!raw) {
      toast.info("Digite o tema");
      return;
    }
    const corrected = suggestCorrection(raw);
    if (corrected && corrected !== raw) {
      setAskTema(corrected);
      toast.info(`Corrigi para "${corrected}"`);
    }
    const finalTema = corrected || raw;
    setGenerating(true);
    setOnDemand(null);
    try {
      const { data, error } = await supabase.functions.invoke("lesson-on-demand", {
        body: { materia: askMateria, tema: finalTema },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOnDemand({ materia: askMateria, tema: finalTema, lesson: data.lesson, cached: !!data.cached });
      toast.success(data.cached ? "Aula recuperada do cache" : "Aula gerada pela Flora");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar aula");
    } finally {
      setGenerating(false);
    }
  };

  const SUBJECTS = ["Matemática","Português","Redação","Biologia","Física","Química","História","Geografia","Filosofia","Sociologia","Inglês"];

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-6">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Biblioteca de aulas
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Aulas curadas + geração on-demand pela Flora
            </p>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6">
        {/* Pedir aula on-demand */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Pedir aula sobre…</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={askMateria}
              onChange={(e) => setAskMateria(e.target.value)}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            >
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input
              value={askTema}
              onChange={(e) => setAskTema(e.target.value)}
              placeholder='Ex: "Função quadrática", "Crase", "Revolução Francesa"'
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && askFlora()}
            />
            <Button onClick={askFlora} disabled={generating} className="gap-1.5">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gerar aula
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Primeira vez: a Flora gera (pode demorar ~20s). Próximas pessoas recebem instantaneamente do cache.
          </p>
        </section>

        {/* Aula on-demand recém gerada */}
        {onDemand && (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-lg">{onDemand.lesson?.titulo || onDemand.tema}</h3>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                onDemand.cached ? "bg-green-500/15 text-green-700" : "bg-primary/15 text-primary"
              }`}>
                {onDemand.cached ? "cache" : "novo"}
              </span>
            </div>
            {onDemand.lesson?.introducao && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {onDemand.lesson.introducao}
              </p>
            )}
            {Array.isArray(onDemand.lesson?.blocos) && (
              <div className="space-y-3">
                {onDemand.lesson.blocos.map((b: any, i: number) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="font-semibold text-sm mb-1">{b.titulo}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{b.conteudo}</p>
                    {b.macete && <p className="text-xs mt-2"><span className="font-semibold text-primary">💡 Macete:</span> {b.macete}</p>}
                    {b.analogia && <p className="text-xs mt-1"><span className="font-semibold">🔁 Analogia:</span> {b.analogia}</p>}
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(onDemand.lesson?.resumo) && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-semibold mb-2 text-primary">Resumo</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {onDemand.lesson.resumo.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Busca biblioteca */}
        <section className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar na biblioteca..."
              className="pl-9"
            />
          </div>

          {loading && (
            <div className="text-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            </div>
          )}

          {!loading && grouped.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhuma aula publicada ainda. Use o "Pedir aula" acima — Flora gera e fica salva pra todos.
            </div>
          )}

          {!loading && grouped.map(([subject, items]) => (
            <div key={subject} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-1">{subject}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/aulao?lesson=${l.id}`)}
                    className="text-left rounded-xl border border-border bg-card hover:bg-muted/40 hover:shadow-sm transition-all p-3 flex gap-3"
                  >
                    <div className="text-2xl">{l.cover_emoji || "📚"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.topic}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">~{l.estimated_minutes} min</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}