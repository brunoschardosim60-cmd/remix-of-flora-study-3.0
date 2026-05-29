import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, NotebookPen, FileText, BarChart3, Sun, Moon, CircleDot, LogOut, Settings, Library, Menu, X, Users, GraduationCap } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { CustomThemeDialog } from "@/components/CustomThemeDialog";
import { prefetchRoute } from "@/lib/prefetch";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
  bancoRoute: string;
  bancoLabel: string;
  onSignOut: () => void;
}

export function DashboardHeader({ user, bancoRoute, bancoLabel, onSignOut }: Props) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("black");
    else setTheme("light");
  };
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : CircleDot;

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <h1 className="font-heading font-bold text-lg sm:text-xl">StudyFlow</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Seu plano de estudos inteligente</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 ml-4">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/notebooks")} onMouseEnter={() => prefetchRoute("/notebooks")}>
            <NotebookPen className="w-4 h-4" /> Cadernos
          </Button>
          {user && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(bancoRoute)} onMouseEnter={() => prefetchRoute(bancoRoute)}>
              <Library className="w-4 h-4" /> {bancoLabel}
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/redacao")} onMouseEnter={() => prefetchRoute("/redacao")}>
              <FileText className="w-4 h-4" /> Redação
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/analise")} onMouseEnter={() => prefetchRoute("/analise")}>
              <BarChart3 className="w-4 h-4" /> Análise
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/comunidades")} onMouseEnter={() => prefetchRoute("/comunidades")}>
              <Users className="w-4 h-4" /> Comunidade
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/cursos")} onMouseEnter={() => prefetchRoute("/cursos")}>
              <GraduationCap className="w-4 h-4" /> Cursos
            </Button>
          )}
        </div>

        <div className="flex-1" />
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
          {user && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border shadow-xl p-4 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">StudyFlow</span>
            </div>

            <nav className="space-y-1 flex-1">
              <MobileNavItem icon={NotebookPen} label="Cadernos" path="/notebooks" onClick={() => { navigate("/notebooks"); setMobileMenuOpen(false); }} />
              {user && <MobileNavItem icon={Library} label={bancoLabel} path={bancoRoute} onClick={() => { navigate(bancoRoute); setMobileMenuOpen(false); }} />}
              {user && <MobileNavItem icon={FileText} label="Redação" path="/redacao" onClick={() => { navigate("/redacao"); setMobileMenuOpen(false); }} />}
              {user && <MobileNavItem icon={BarChart3} label="Análise" path="/analise" onClick={() => { navigate("/analise"); setMobileMenuOpen(false); }} />}
              {user && <MobileNavItem icon={Users} label="Comunidade" path="/comunidades" onClick={() => { navigate("/comunidades"); setMobileMenuOpen(false); }} />}
              {user && <MobileNavItem icon={GraduationCap} label="Cursos" path="/cursos" onClick={() => { navigate("/cursos"); setMobileMenuOpen(false); }} />}
            </nav>

            <div className="pt-4 border-t border-border space-y-1">
              <MobileNavItem icon={Settings} label="Configurações" path="/settings" onClick={() => { navigate("/settings"); setMobileMenuOpen(false); }} />
              <button
                onClick={() => { onSignOut(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileNavItem({ icon: Icon, label, path, onClick }: { icon: any; label: string; path: string; onClick: () => void }) {
  const isActive = window.location.pathname === path;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}