import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

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

    const message = this.state.error?.message ?? "Erro inesperado";

    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Encontramos um problema ao carregar esta tela. Em geral, recarregar a página resolve.
            </p>
          </div>
          <details className="text-left bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{message}</pre>
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