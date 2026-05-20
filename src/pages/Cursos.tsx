import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Clock, CheckCircle2, PlayCircle, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LessonRow {
  id: string;
  title: string;
  subject: string;
  topic: string;
  level: string;
  estimated_minutes: number;
  cover_emoji: string | null;
  description: string | null;
}

interface ProgressRow {
  lesson_id: string;
  completed: boolean;
  current_block: number;
}

export default function Cursos() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: ls } = await supabase
        .from("lessons" as any)
        .select("id,title,subject,topic,level,estimated_minutes,cover_emoji,description")
        .eq("published", true)
        .order("subject")
        .order("created_at");
      setLessons((ls as any) || []);
      if (user) {
        const { data: pr } = await supabase
          .from("lesson_progress" as any)
          .select("lesson_id,completed,current_block")
          .eq("user_id", user.id);
        const map: Record<string, ProgressRow> = {};
        (pr as any || []).forEach((p: ProgressRow) => { map[p.lesson_id] = p; });
        setProgress(map);
      }
      setLoading(false);
    })();
  }, [user]);

  const grouped = lessons.reduce<Record<string, LessonRow[]>>((acc, l) => {
    (acc[l.subject] ||= []).push(l); return acc;
  }, {});

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft size={20} /></Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-primary" size={22} />
            <h1 className="text-lg font-semibold">Cursos Flora</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl font-bold mb-1">Aulas completas, no estilo cursinho</h2>
          <p className="text-sm text-muted-foreground">Conteúdo estruturado, exemplos, macetes e quiz no final. A Flora te guia em cada bloco.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : lessons.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhuma aula publicada ainda.</p>
        ) : (
          Object.entries(grouped).map(([subject, items]) => (
            <section key={subject}>
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">{subject}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {items.map(l => {
                  const p = progress[l.id];
                  return (
                    <Card
                      key={l.id}
                      onClick={() => nav(`/cursos/${l.id}`)}
                      className="p-4 cursor-pointer hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{l.cover_emoji || "📚"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold leading-tight">{l.title}</h4>
                            {p?.completed && <CheckCircle2 className="text-green-500 shrink-0" size={16} />}
                          </div>
                          {l.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{l.description}</p>}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock size={12} />{l.estimated_minutes}min</span>
                            <span className="capitalize">{l.level}</span>
                            {p && !p.completed && p.current_block > 0 && (
                              <span className="text-primary flex items-center gap-1"><PlayCircle size={12} />continuar</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}