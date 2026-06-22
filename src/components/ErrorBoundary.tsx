import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home, WifiOff, RefreshCw, Lock, ServerCrash } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
    if (/Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(error?.message || "")) {
      this.recoverFromStaleModule();
    }
  }

  private recoverFromStaleModule = async () => {
    const key = "studyflow.stale-module-recovery-at";
    try {
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last < 30_000) return;
      sessionStorage.setItem(key, String(Date.now()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }

      const url = new URL(window.location.href);
      url.searchParams.set("_reload", String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  private handleReload = () => {
    // Tenta limpar caches do SW antes de recarregar, caso o erro venha de chunk antigo
    const reload = () => window.location.reload();
    const w = window as unknown as { caches?: CacheStorage };
    if (w.caches) {
      w.caches.keys()
        .then((keys) => Promise.all(keys.map((k) => w.caches!.delete(k))))
        .finally(reload);
    } else {
      reload();
    }
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const rawMessage = this.state.error?.message ?? "Erro inesperado";
    const friendly = explainError(rawMessage);

    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center space-y-5">
          <div className={`w-14 h-14 mx-auto rounded-2xl ${friendly.tone} flex items-center justify-center`}>
            <friendly.Icon className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">{friendly.title}</h1>
            <p className="text-sm text-muted-foreground">{friendly.description}</p>
            {friendly.hint && (
              <p className="text-xs text-muted-foreground/80 pt-1">💡 {friendly.hint}</p>
            )}
          </div>
          <details className="text-left bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">Detalhes técnicos (para suporte)</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{rawMessage}</pre>
          </details>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={this.handleReload} className="flex-1 gap-2">
              <RotateCcw className="w-4 h-4" /> Recarregar
            </Button>
            <Button onClick={this.handleHome} variant="outline" className="flex-1 gap-2">
              <Home className="w-4 h-4" /> Início
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

type Friendly = {
  title: string;
  description: string;
  hint?: string;
  Icon: typeof AlertTriangle;
  tone: string;
};

function explainError(msg: string): Friendly {
  const m = msg.toLowerCase();

  if (/failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loading chunk/.test(m)) {
    return {
      Icon: RefreshCw,
      tone: "bg-primary/10 text-primary",
      title: "Uma atualização chegou",
      description: "Lançamos uma nova versão do StudyFlow e a versão aberta no seu navegador ficou desatualizada.",
      hint: "Clique em Recarregar para baixar a versão nova — vai levar só alguns segundos.",
    };
  }
  if (/failed to fetch|networkerror|network request failed|load failed/.test(m)) {
    return {
      Icon: WifiOff,
      tone: "bg-amber-500/10 text-amber-500",
      title: "Sem conexão com a internet",
      description: "Não conseguimos falar com o servidor. Pode ser uma queda momentânea da sua rede.",
      hint: "Verifique seu Wi-Fi ou dados móveis e tente novamente.",
    };
  }
  if (/unauthorized|401|jwt|invalid token|not authenticated/.test(m)) {
    return {
      Icon: Lock,
      tone: "bg-amber-500/10 text-amber-500",
      title: "Sua sessão expirou",
      description: "Por segurança, sessões longas são encerradas automaticamente.",
      hint: "Volte para o início e entre novamente na sua conta.",
    };
  }
  if (/500|502|503|504|internal server|server error/.test(m)) {
    return {
      Icon: ServerCrash,
      tone: "bg-destructive/10 text-destructive",
      title: "Nossos servidores tropeçaram",
      description: "Algo deu errado do nosso lado ao processar esta tela. A equipe já é notificada automaticamente.",
      hint: "Tente recarregar em alguns segundos.",
    };
  }
  return {
    Icon: AlertTriangle,
    tone: "bg-destructive/10 text-destructive",
    title: "Algo deu errado",
    description: "Encontramos um problema inesperado ao carregar esta tela.",
    hint: "Na maioria das vezes, recarregar a página resolve.",
  };
}