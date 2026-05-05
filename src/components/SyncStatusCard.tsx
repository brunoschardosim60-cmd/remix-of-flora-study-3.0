import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Cloud, RefreshCcw } from "lucide-react";

type SyncStatus = "local" | "local_only" | "offline" | "syncing" | "synced" | "error";
type SyncMode = "remote" | "local_only";

interface SyncStatusCardProps {
  status: SyncStatus;
  studySyncMode: SyncMode;
  isLoggedIn: boolean;
  canRestoreFromLocal: boolean;
  onRestoreFromLocal: () => void | Promise<void>;
}

function statusCopy(status: SyncStatus, studySyncMode: SyncMode, isLoggedIn: boolean) {
  if (!isLoggedIn) {
    return {
      label: "Local",
      detail: "Seu progresso esta salvo neste dispositivo.",
      icon: Cloud,
      variant: "outline" as const,
    };
  }

  if (studySyncMode === "local_only" || status === "local_only") {
    return {
      label: "Local",
      detail: "Sua conta funciona normalmente, mas o plano de estudo ainda esta operando no armazenamento local.",
      icon: Cloud,
      variant: "outline" as const,
    };
  }

  if (status === "syncing") {
    return {
      label: "Sincronizando",
      detail: "Salvando suas mudancas na nuvem agora.",
      icon: RefreshCcw,
      variant: "outline" as const,
    };
  }

  if (status === "synced") {
    return {
      label: "Sincronizado",
      detail: "Seu plano esta alinhado entre dispositivo e conta.",
      icon: CheckCircle2,
      variant: "secondary" as const,
    };
  }

  if (status === "offline") {
    return {
      label: "Offline",
      detail: "Você está sem conexão. Alterações serão sincronizadas assim que voltar.",
      icon: Cloud,
      variant: "outline" as const,
    };
  }

  if (status === "error") {
    return {
      label: "Erro de sync",
      detail: "Houve falha ao enviar seus dados. O conteudo local foi mantido.",
      icon: AlertTriangle,
      variant: "destructive" as const,
    };
  }

  return {
    label: "Local",
    detail: "Voce esta trabalhando so com o armazenamento local.",
    icon: Cloud,
    variant: "outline" as const,
  };
}

export function SyncStatusCard({
  status,
  studySyncMode,
  isLoggedIn,
  canRestoreFromLocal,
  onRestoreFromLocal,
}: SyncStatusCardProps) {
  // Por padrão o sync é silencioso. Só aparece em dois casos:
  // 1) Erro real de sincronização
  // 2) Há dados locais que podem ser restaurados (botão de ação útil)
  // 3) Status offline para informar usuário
  const showForError = status === "error";
  const showForOffline = status === "offline";
  const showForRestore = isLoggedIn && canRestoreFromLocal && studySyncMode === "remote";
  if (!showForError && !showForRestore && !showForOffline) return null;

  const copy = statusCopy(status, studySyncMode, isLoggedIn);
  const Icon = copy.icon;

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-border/70 bg-card/85 p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.14),transparent_70%)]" />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative space-y-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${status === "syncing" ? "animate-spin" : ""}`} />
            <Badge variant={copy.variant}>{copy.label}</Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">{copy.detail}</p>
        </div>

        {isLoggedIn && canRestoreFromLocal && studySyncMode === "remote" ? (
          <Button variant="outline" size="sm" onClick={() => void onRestoreFromLocal()} className="relative gap-2 bg-background/80">
            <RefreshCcw className="h-4 w-4" />
            Restaurar do local
          </Button>
        ) : null}
      </div>
    </section>
  );
}
