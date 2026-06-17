import { useState, useEffect, ReactNode } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FocusModeProps {
  isActive: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function FocusMode({ isActive, onToggle, children }: FocusModeProps) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onToggle();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onToggle]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Barra superior minimalista */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Modo Foco Ativado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground cursor-help" onMouseEnter={() => setShowHint(true)} onMouseLeave={() => setShowHint(false)}>
            Pressione ESC para sair
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
            title="Sair do Modo Foco"
            aria-label="Sair do Modo Foco"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conteúdo com padding generoso */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* Dica flutuante */}
      {showHint && (
        <div className="fixed bottom-4 right-4 bg-muted/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
          Pressione <kbd className="px-2 py-1 bg-background rounded text-foreground font-mono">ESC</kbd> para sair
        </div>
      )}
    </div>
  );
}
