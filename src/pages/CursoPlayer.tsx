import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveLessonPlayer } from "@/components/InteractiveLessonPlayer";
import type { Lesson } from "@/lib/types";
import { toast } from "sonner";

interface LessonRow {
  id: string;
  title: string;
  subject: string;
  content: Lesson;
}

export default function CursoPlayer() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [row, setRow] = useState<LessonRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("lessons" as any)
        .select("id,title,subject,content")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast.error("Aula não encontrada");
        nav("/cursos");
        return;
      }
      setRow(data as any);
      // upsert progress (started)
      if (user) {
        await supabase.from("lesson_progress" as any).upsert({
          user_id: user.id, lesson_id: id, last_seen_at: new Date().toISOString(),
        }, { onConflict: "user_id,lesson_id" });
      }
      setLoading(false);
    })();
  }, [id, user, nav]);

  const handleComplete = async () => {
    if (!user || !id) return;
    await supabase.from("lesson_progress" as any).upsert({
      user_id: user.id, lesson_id: id,
      completed: true, completed_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id,lesson_id" });
    toast.success("Aula concluída! 🎉");
  };

  if (loading || !row) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 bg-background/90 backdrop-blur border-b border-border">
        <div className="px-4 py-2 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav("/cursos")}><ArrowLeft size={20} /></Button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{row.subject}</p>
            <h1 className="text-sm font-semibold truncate">{row.title}</h1>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        <InteractiveLessonPlayer lesson={row.content} onComplete={handleComplete} onExit={() => nav("/cursos")} materia={row.subject} />
      </main>
    </div>
  );
}