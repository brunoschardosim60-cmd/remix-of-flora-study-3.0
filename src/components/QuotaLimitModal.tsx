import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Clock, CreditCard, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import type { QuotaInfo } from "@/lib/quotaErrors";

export interface QuotaLimitEventDetail {
  feature?: string;
  quota: QuotaInfo;
}

const TIER_LABEL: Record<string, string> = { free: "Free", pro: "Pro", pro_plus: "Pro+" };

function timeUntilReset(): string {
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(24, 0, 0, 0);
  const diffMs = reset.getTime() - now.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h${minutes > 0 ? ` ${minutes}min` : ""}`;
  return `${minutes}min`;
}

/**
 * Modal global para limite de IA atingido.
 * Desktop: Dialog. Mobile: Sheet (bottom).
 * Disparado via window.dispatchEvent(new CustomEvent("flora:quota-limit", { detail }))
 */
export function QuotaLimitModal() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<QuotaLimitEventDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<QuotaLimitEventDetail>;
      if (!ce.detail?.quota) return;
      setDetail(ce.detail);
      setOpen(true);
    };
    window.addEventListener("flora:quota-limit", handler as EventListener);
    return () => window.removeEventListener("flora:quota-limit", handler as EventListener);
  }, []);

  if (!detail) return null;

  const { feature, quota } = detail;
  const tierLabel = TIER_LABEL[quota.tier] ?? quota.tier;
  const canUpgrade = quota.tier !== "pro_plus";
  const reset = timeUntilReset();
  const pct = quota.limit > 0 ? Math.min(100, (quota.used / quota.limit) * 100) : 100;

  const handleUpgrade = () => {
    setOpen(false);
    navigate("/settings?tab=plano");
  };

  // Mensagem de pagamento por plano
  const upgradeCopy = quota.tier === "free"
    ? {
        targetPlan: "Pro",
        price: "R$ 19,90/mês",
        pitch: "5x mais chamadas da Flora, redações ilimitadas e quizzes adaptativos.",
        cta: "Assinar Pro",
      }
    : quota.tier === "pro"
      ? {
          targetPlan: "Pro+",
          price: "R$ 39,90/mês",
          pitch: "Uso praticamente ilimitado da Flora, simulados ENEM com explicação e prioridade na fila.",
          cta: "Fazer upgrade para Pro+",
        }
      : null;

  const Body = (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">Plano atual</span>
            <Badge variant="secondary">{tierLabel}</Badge>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{feature ? `Uso de ${feature} hoje` : "Uso hoje"}</span>
            <span>{quota.used}/{quota.limit}</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 shrink-0" />
        <span>O limite reseta em <strong className="text-foreground">{reset}</strong>.</span>
      </div>

      {canUpgrade && upgradeCopy && (
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">Continue estudando agora</span>
            </div>
            <Badge className="bg-primary text-primary-foreground">{upgradeCopy.targetPlan}</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{upgradeCopy.pitch}</p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground pt-1">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            <span>A partir de <strong>{upgradeCopy.price}</strong> · cancele quando quiser</span>
          </div>
        </div>
      )}
    </div>
  );

  const title = canUpgrade
    ? `Seus créditos${feature ? ` de ${feature}` : ""} acabaram`
    : `Limite${feature ? ` de ${feature}` : ""} atingido`;
  const description = canUpgrade
    ? `Você usou todas as chamadas diárias incluídas no plano ${tierLabel}. Para continuar agora, faça upgrade — ou aguarde o reset diário.`
    : `Você usou todas as suas chamadas diárias. O limite reseta em ${reset}.`;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="py-4">{Body}</div>
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            {canUpgrade && upgradeCopy && (
              <Button onClick={handleUpgrade} className="w-full gap-2">
                <CreditCard className="w-4 h-4" /> {upgradeCopy.cta}
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
              Aguardar reset
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {Body}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Aguardar reset</Button>
          {canUpgrade && upgradeCopy && (
            <Button onClick={handleUpgrade} className="gap-2">
              <CreditCard className="w-4 h-4" /> {upgradeCopy.cta}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}