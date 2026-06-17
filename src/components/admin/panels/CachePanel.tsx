import { Sparkles } from "lucide-react";
import { AdminCachePanel } from "@/components/AdminCachePanel";

export function CachePanel() {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Cache Inteligente da Flora</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Pré-popula o cache com aulas dos tópicos mais acessados (instantâneo para alunos, economiza créditos de IA).
      </p>
      <AdminCachePanel />
    </section>
  );
}