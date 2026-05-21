/**
 * src/pages/Cursos.tsx — atualizado
 * Usa useImageSearch (edge function → Unsplash → Pexels → Pixabay)
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Clock, CheckCircle2, PlayCircle, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImageSearch } from "@/hooks/useImageSearch";

interface LessonRow {
  id: string;
  title: string;
  subject: string;
  topic: string;
  level: string;
  estimated_minutes: number;
  cover_emoji: string | null;
  cover_image_url: string | null;
  description: string | null;
}

interface ProgressRow {
  lesson_id: string;
  completed: boolean;
  current_block: number;
}

// ─── Card com imagem de capa ──────────────────────────────────────────────────
function LessonCard({
  lesson,
  progress,
  onClick,
}: {
  lesson: LessonRow;
  progress?: ProgressRow;
  onClick: () => void;
}) {
  const [aiImgFailed, setAiImgFailed] = useState(false);

  // Busca foto via edge function (Unsplash → Pexels → Pixabay)
  // Só ativa se não há cover_image_url já salva (evita chamada desnecessária)
  const needsSearch = !lesson.cover_image_url || aiImgFailed;
  const { url: searchUrl, loading: searchLoading } = useImageSearch(
    `${lesson.topic} ${lesson.subject}`,
    needsSearch
  );

  // Prioridade: cover_image_url (IA, persistida no banco) → busca nos provedores
  const coverSrc = !aiImgFailed && lesson.cover_image_url
    ? lesson.cover_image_url
    : searchUrl;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all duration-200"
    >
      {/* Imagem de capa */}
      <div className="relative w-full h-36 bg-muted overflow-hidden">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => {
              if (!aiImgFailed) setAiImgFailed(true);
            }}
          />
        ) : (
          // Fallback: gradiente com emoji
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20">
            {searchLoading ? (
              <Loader2 className="animate-spin text-muted-foreground/50" size={24} />
            ) : (
              <span className="text-5xl select-none">{lesson.cover_emoji || "📚"}</span>
            )}
          </div>
        )}

        {/* Overlay para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Badge matéria */}
        <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider bg-black/50 text-white/90 rounded-full px-2 py-0.5 backdrop-blur-sm">
          {lesson.subject}
        </span>

        {/* Badge nível */}
        <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider bg-black/50 text-white/90 rounded-full px-2 py-0.5 backdrop-blur-sm capitalize">
          {lesson.level}
        </span>

        {/* Concluído */}
        {progress?.completed && (
          <div className="absolute bottom-2 right-2 bg-green-500 rounded-full p-0.5">
            <CheckCircle2 className="text-white" size={14} />
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <h4 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
          {lesson.title}
        </h4>
        {lesson.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {lesson.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {lesson.estimated_minutes}min
          </span>
          {progress && !progress.completed && progress.current_block > 0 && (
            <span className="text-primary flex items-center gap-1 font-medium">
              <PlayCircle size={11} />
              continuar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function Cursos() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string>("Todas");

  useEffect(() => {
    (async () => {
      const { data: ls } = await supabase
        .from("lessons" as any)
        .select("id,title,subject,topic,level,estimated_minutes,cover_emoji,cover_image_url,description")
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
        ((pr as any) || []).forEach((p: ProgressRow) => { map[p.lesson_id] = p; });
        setProgress(map);
      }
      setLoading(false);
    })();
  }, [user]);

  const subjects = ["Todas", ...Array.from(new Set(lessons.map((l) => l.subject)))];
  const filtered = activeSubject === "Todas" ? lessons : lessons.filter((l) => l.subject === activeSubject);
  const grouped = filtered.reduce<Record<string, LessonRow[]>>((acc, l) => {
    (acc[l.subject] ||= []).push(l); return acc;
  }, {});

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-primary" size={22} />
            <h1 className="text-lg font-semibold">Cursos Flora</h1>
          </div>
        </div>

        {/* Filtro por matéria */}
        {subjects.length > 2 && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  activeSubject === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-10">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl font-bold mb-1">Aulas completas, no estilo cursinho</h2>
          <p className="text-sm text-muted-foreground">
            Conteúdo estruturado, exemplos, macetes e quiz no final. A Flora te guia em cada bloco.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : lessons.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhuma aula publicada ainda.</p>
        ) : (
          Object.entries(grouped).map(([subject, items]) => (
            <section key={subject}>
              {activeSubject === "Todas" && (
                <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">{subject}</h3>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((l) => (
                  <LessonCard key={l.id} lesson={l} progress={progress[l.id]} onClick={() => nav(`/cursos/${l.id}`)} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
