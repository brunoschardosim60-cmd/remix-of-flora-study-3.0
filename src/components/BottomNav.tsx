import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, NotebookPen, FileText, BarChart3, Sparkles, Library, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const [isConcurso, setIsConcurso] = useState(false);

  useEffect(() => {
    if (!user) { setIsConcurso(false); return; }
    let cancelled = false;
    supabase
      .from("student_onboarding")
      .select("objetivo")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsConcurso((data?.objetivo || "").toLowerCase() === "concurso");
      });
    return () => { cancelled = true; };
  }, [user]);

  const items = isConcurso ? CONCURSO_ITEMS : BASE_ITEMS;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-around h-14 px-1">
        {items.map((item) => {
          const isFloraAction = (item as any).isAction;
          const active = !isFloraAction && location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => {
                if (isFloraAction) {
                  window.dispatchEvent(new CustomEvent("open-flora-chat"));
                } else {
                  navigate(item.path);
                }
              }}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors ${
                isFloraAction
                  ? "text-primary"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5`} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
