import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { listAdminUsers, type AdminUserCard } from "@/lib/adminVault";
import { reportError } from "@/lib/errorHandling";
import { AdminSidebar, type AdminSection } from "./AdminSidebar";
import { UsersWorkspacePanel } from "./panels/UsersWorkspacePanel";
import { AITiersPanel } from "./panels/AITiersPanel";
import { EnemPanel } from "./panels/EnemPanel";
import { ConcursoPanel } from "./panels/ConcursoPanel";
import { PdfPanel } from "./panels/PdfPanel";
import { CachePanel } from "./panels/CachePanel";
import { OverviewPanel } from "./panels/OverviewPanel";
import { ModerationPanel } from "./panels/ModerationPanel";
import { LogsPanel } from "./panels/LogsPanel";

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: "Visão geral",
  usuarios: "Usuários",
  moderacao: "Moderação",
  "ia-tiers": "IA & Tiers",
  enem: "ENEM",
  concurso: "Concurso / Direito",
  pdf: "Reprocessar PDF",
  cache: "Cache Flora",
  logs: "Logs admin",
};

export function AdminShell() {
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSection>("overview");
  const [users, setUsers] = useState<AdminUserCard[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const refreshUsers = async () => {
    setLoadingUsers(true);
    try {
      const next = await listAdminUsers();
      setUsers(next);
    } catch (error) {
      reportError("Erro ao carregar usuarios do admin:", error, { devOnly: true });
      toast.error("Não foi possível carregar os usuários do painel admin.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    void refreshUsers();
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AdminSidebar active={section} onChange={setSection} userCount={users.length} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="shrink-0" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              aria-label="Voltar para o início"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading text-base font-semibold sm:text-lg">
                Painel Admin · {SECTION_TITLES[section]}
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshUsers()}
              disabled={loadingUsers}
              className="shrink-0"
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </header>

          <main className="flex-1 overflow-x-hidden p-3 sm:p-5">
            {section === "overview" && <OverviewPanel users={users} />}
            {section === "usuarios" && (
              <UsersWorkspacePanel
                users={users}
                loadingUsers={loadingUsers}
                onRefreshUsers={refreshUsers}
              />
            )}
            {section === "moderacao" && (
              <ModerationPanel users={users} onRefreshUsers={refreshUsers} />
            )}
            {section === "ia-tiers" && (
              <AITiersPanel users={users.map((u) => ({ id: u.id, display_name: u.displayName }))} />
            )}
            {section === "enem" && <EnemPanel />}
            {section === "concurso" && <ConcursoPanel />}
            {section === "pdf" && <PdfPanel />}
            {section === "cache" && <CachePanel />}
            {section === "logs" && <LogsPanel />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}