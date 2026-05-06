/**
 * FloraInsightBanner
 *
 * Exibe o insight proativo da Flora de forma discreta e contextual.
 * Aparece no topo do dashboard quando há algo relevante a dizer.
 * Não é intrusivo — o usuário pode dispensar.
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Lightbulb, Sparkles } from "lucide-react";
import { FloraInsight } from "@/hooks/useFloraProativa";
import { FloraIcon } from "@/components/FloraIcon";

interface FloraInsightBannerProps {
  insight: FloraInsight | null;
  onDismiss: () => void;
  onAccept: () => void;
  onOpenChat: () => void;
}

const INSIGHT_CONFIG = {
  increase_difficulty: {
    icon: TrendingUp,
    color: "border-emerald-500/30 bg-emerald-500/5",
    iconColor: "text-emerald-500",
    label: "Hora de evoluir",
  },
  reduce_load: {
    icon: TrendingDown,
    color: "border-amber-500/30 bg-amber-500/5",
    iconColor: "text-amber-500",
    label: "Ajuste necessário",
  },
  adjust_plan: {
    icon: Lightbulb,
    color: "border-blue-500/30 bg-blue-500/5",
    iconColor: "text-blue-500",
    label: "Sugestão de plano",
  },
  proactive_suggestion: {
    icon: Sparkles,
    color: "border-primary/30 bg-primary/5",
    iconColor: "text-primary",
    label: "Flora observou",
  },
  nenhuma: {
    icon: Sparkles,
    color: "border-primary/30 bg-primary/5",
    iconColor: "text-primary",
    label: "Flora observou",
  },
};

export function FloraInsightBanner({ insight, onDismiss, onAccept, onOpenChat }: FloraInsightBannerProps) {
  if (!insight || insight.type === "nenhuma") return null;

  const config = INSIGHT_CONFIG[insight.type] || INSIGHT_CONFIG.proactive_suggestion;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {insight && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`rounded-2xl border p-4 ${config.color} relative`}
        >
          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Dispensar"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            {/* Flora icon */}
            <div className="shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FloraIcon size={18} />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              {/* Label */}
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${config.iconColor}`}>
                  {config.label}
                </span>
              </div>

              {/* Mensagem principal */}
              <p className="text-sm font-medium text-foreground leading-snug">
                {insight.reasoning}
              </p>

              {/* Detalhes extras */}
              {insight.changes?.description && (
                <p className="text-xs text-muted-foreground">
                  {insight.changes.description}
                </p>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onOpenChat}
                  className="text-xs font-semibold text-primary hover:underline underline-offset-2 transition-colors"
                >
                  Falar com a Flora →
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  onClick={onDismiss}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Já vi
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
