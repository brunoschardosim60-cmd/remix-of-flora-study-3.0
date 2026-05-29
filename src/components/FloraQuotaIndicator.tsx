import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  action?: string;
}

export function FloraQuotaIndicator({ action }: Props) {
  const { user, profile } = useAuth();
  const [quota, setQuota] = useState<{ used: number; total: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchQuota = async () => {
      const { data } = await supabase.functions.invoke("flora-engine", {
        body: { action: "get_quota" },
      });
      if (data?.quota) setQuota(data.quota);
    };
    fetchQuota();
    
    // Refresh periodically or on chat events
    const handler = () => fetchQuota();
    window.addEventListener("flora-quota-refresh", handler);
    return () => window.removeEventListener("flora-quota-refresh", handler);
  }, [user]);

  const percent = useMemo(() => {
    if (!quota) return 0;
    return Math.min(100, (quota.used / quota.total) * 100);
  }, [quota]);

  if (!quota) return null;

  const isLow = percent > 80;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50 border border-border cursor-help">
          <div className="flex flex-col gap-1 w-12 sm:w-16">
            <Progress value={percent} className={`h-1.5 ${isLow ? "bg-destructive/20" : ""}`} />
          </div>
          <Zap className={`w-3 h-3 ${isLow ? "text-destructive animate-pulse" : "text-primary"}`} />
          <span className="text-[10px] font-medium hidden sm:inline-block">
            {quota.total - quota.used} envios
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Créditos da Flora: {quota.used} / {quota.total} usados hoje</p>
        {isLow && <p className="text-[10px] text-destructive-foreground">Seu limite diário está acabando!</p>}
      </TooltipContent>
    </Tooltip>
  );
}
import { Sparkles } from "lucide-react";
import { getMyTier, getMyQuota, type AITier } from "@/lib/aiUsage";

const TIER_LABEL: Record<AITier, string> = { free: "Free", pro: "Pro", pro_plus: "Pro+" };

/**
 * Mostra discreto o uso atual da Flora (chat/dia) e o tier.
 * Aparece só se restar pouca quota (<25%) ou estourou.
 */
export function FloraQuotaIndicator({ action = "chat" }: { action?: string }) {
  const [tier, setTier] = useState<AITier>("free");
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number; allowed: boolean } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [t, q] = await Promise.all([getMyTier(), getMyQuota(action)]);
      if (!mounted) return;
      setTier(t);
      if (q) setQuota({ used: q.used, limit: q.limit, remaining: q.remaining, allowed: q.allowed });
    })();
    return () => { mounted = false; };
  }, [action]);

  if (!quota) return null;
  const pct = quota.limit > 0 ? quota.used / quota.limit : 0;
  if (pct < 0.75) return null; // só mostra quando perto do limite

  const isOver = !quota.allowed;
  return (
    <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${isOver ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
      <Sparkles className="h-3 w-3" />
      <span>
        {isOver
          ? `Limite ${TIER_LABEL[tier]} atingido (${quota.used}/${quota.limit})`
          : `${quota.remaining} chamadas restantes hoje (${TIER_LABEL[tier]})`}
      </span>
    </div>
  );
}
