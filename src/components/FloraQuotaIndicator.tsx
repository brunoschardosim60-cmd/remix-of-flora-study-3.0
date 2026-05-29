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
  const { user } = useAuth();
  const [quota, setQuota] = useState<{ used: number; total: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchQuota = async () => {
      try {
        const { data } = await supabase.functions.invoke("flora-engine", {
          body: { action: "get_quota" },
        });
        if (data?.quota) setQuota(data.quota);
      } catch (err) {
        console.error("Error fetching quota:", err);
      }
    };
    fetchQuota();
    
    // Refresh on chat events
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
