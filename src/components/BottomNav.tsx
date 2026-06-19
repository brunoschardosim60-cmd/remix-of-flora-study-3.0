import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, NotebookPen, FileText, BarChart3, Sparkles, Library, BookOpen, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStudentObjetivo } from "@/hooks/useStudentObjetivo";
import { loadTopics } from "@/lib/studyData";
import { isPastDateLocal } from "@/lib/dateUtils";

type Item = { path: string; label: string; icon: any; isAction?: boolean };

const BASE_ITEMS: Item[] = [
  { path: "/", label: "Início", icon: Home },
  { path: "/redacao", label: "Redação", icon: FileText },
  { path: "flora", label: "Flora", icon: Sparkles, isAction: true },
  { path: "/aulao", label: "Aulão", icon: BookOpen },
  { path: "/analise", label: "Análise", icon: BarChart3 },
];

const CONCURSO_ITEMS: Item[] = [
  { path: "/", label: "Início", icon: Home },
  { path: "/banco-concurso", label: "Banco", icon: Library },
  { path: "flora", label: "Flora", icon: Sparkles, isAction: true },
  { path: "/aulao", label: "Aulão", icon: BookOpen },
  { path: "/analise", label: "Análise", icon: BarChart3 },
  // Comunidade omitida intencionalmente: alunos de concurso usam o Banco como hub social.
  // Para adicionar, substitua um dos itens acima por:
  // { path: "/comunidades", label: "Comunidade", icon: Users },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConcurso } = useStudentObjetivo(user);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    const compute = () => {
      try {
        const topics = loadTopics();
        let count = 0;
        for (const t of topics) {
          for (const r of t.revisions || []) {
            if (!r.completed && r.scheduledDate && isPastDateLocal(r.scheduledDate)) count++;
          }
        }
        setOverdueCount(count);
      } catch { setOverdueCount(0); }
    };
    compute();
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key.includes("topics")) compute(); };
    window.addEventListener("storage", onStorage);
    const interval = setInterval(compute, 30000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(interval); };
  }, [location.pathname]);

  const items = isConcurso ? CONCURSO_ITEMS : BASE_ITEMS;

  return (
    <nav aria-label="Navegação principal" className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-around h-14 px-1">
        {items.map((item) => {
          const isFloraAction = (item as any).isAction;
          const active = !isFloraAction && location.pathname === item.path;
          return (
            <button
              key={item.path}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (isFloraAction) {
                  window.dispatchEvent(new CustomEvent("open-flora-chat"));
                } else {
                  navigate(item.path);
                }
              }}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors ${
                isFloraAction
                  ? "text-primary"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5`} aria-hidden="true" />
              {item.label}
              {item.path === "/" && overdueCount > 0 && (
                <span className="absolute top-1 right-[20%] min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {overdueCount > 9 ? "9+" : overdueCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
