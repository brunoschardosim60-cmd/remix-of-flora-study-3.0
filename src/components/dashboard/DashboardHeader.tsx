import { useNavigate } from "react-router-dom";
import { BookOpen, NotebookPen, FileText, BarChart3, Sun, Moon, CircleDot, Settings, Library, Users, MessageCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { CustomThemeDialog } from "@/components/CustomThemeDialog";
import { prefetchRoute } from "@/lib/prefetch";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
  bancoRoute: string;
  bancoLabel: string;
  onSignOut?: () => void;
}

export function DashboardHeader({ user, bancoRoute, bancoLabel }: Props) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("black");
    else setTheme("light");
  };
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : CircleDot;

  return (
    <header className="border-b border-border bg-card sticky top-0 z-10">
      <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-[120px]">
          <h1 className="font-heading font-bold text-lg sm:text-xl">StudyFlow</h1>
          <p className="text-xs text-muted-foreground hidden lg:block">Seu plano de estudos inteligente</p>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/notebooks")} onMouseEnter={() => prefetchRoute("/notebooks")}>
            <NotebookPen className="w-4 h-4" /> Cadernos
          </Button>
          {user && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(bancoRoute)} onMouseEnter={() => prefetchRoute(bancoRoute)}>
              <Library className="w-4 h-4" /> {bancoLabel}
            </Button>
          )}
          {user && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/redacao")} onMouseEnter={() => prefetchRoute("/redacao")}>
              <FileText className="w-4 h-4" /> Redação
            </Button>
          )}
          {user && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/analise")} onMouseEnter={() => prefetchRoute("/analise")}>
              <BarChart3 className="w-4 h-4" /> Análise
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/comunidade")} onMouseEnter={() => prefetchRoute("/comunidade")} aria-label="Comunidade">
              <Users className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <CustomThemeDialog />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={cycleTheme} aria-label="Trocar tema">
            <ThemeIcon className="w-4 h-4" />
          </Button>
          {user && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/settings")} aria-label="Configurações">
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      {/* Quick-nav: aparece em telas até lg para não cortar os ícones do header */}
      <div className="lg:hidden border-t border-border/60 bg-card/80">
        <div className="container max-w-7xl mx-auto px-2 py-2 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate("/notebooks")}>
            <NotebookPen className="w-4 h-4" /> Cadernos
          </Button>
          {user && (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(bancoRoute)}>
              <Library className="w-4 h-4" /> {bancoLabel}
            </Button>
          )}
          {user && (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate("/redacao")}>
              <FileText className="w-4 h-4" /> Redação
            </Button>
          )}
          {user && (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate("/analise")}>
              <BarChart3 className="w-4 h-4" /> Análise
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/comunidade")} aria-label="Comunidade">
              <Users className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}