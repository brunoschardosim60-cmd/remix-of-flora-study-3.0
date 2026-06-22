/**
 * FloraTour — tour de boas-vindas mostrando a Flora resolvendo uma questão
 * de exemplo em ~30s. Mostrado uma vez após o onboarding inicial.
 *
 * Trigger: ao montar verifica `flora_tour_seen` no localStorage. Se ausente,
 * abre o overlay automaticamente. Botão de skip + check final marcam como visto.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloraIcon } from "@/components/FloraIcon";
import { useAuth } from "@/hooks/useAuth";

const SEEN_KEY_BASE = "flora_tour_seen";
const seenKeyFor = (userId?: string | null) =>
  userId ? `${SEEN_KEY_BASE}:${userId}` : SEEN_KEY_BASE;

type Step = {
  title: string;
  caption: string;
  body: React.ReactNode;
};

const STEPS: Step[] = [
  {
    title: "Oi! Eu sou a Flora",
    caption: "Sua professora particular com IA",
    body: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Em 30 segundos eu te mostro como ajudo no seu estudo. Bora?
      </p>
    ),
  },
  {
    title: "Você manda uma questão",
    caption: "Exemplo · Matemática · ENEM",
    body: (
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
        Um capital de R$ 2.000 foi aplicado a juros compostos de 5% ao mês.
        Qual o montante após 3 meses?
      </div>
    ),
  },
  {
    title: "Eu resolvo passo a passo",
    caption: "Sem decoreba — entendendo o porquê",
    body: (
      <div className="space-y-2 text-sm">
        <TypingLine delay={0}>1. M = C · (1 + i)ⁿ</TypingLine>
        <TypingLine delay={0.6}>2. M = 2000 · (1,05)³</TypingLine>
        <TypingLine delay={1.2}>3. M = 2000 · 1,157625</TypingLine>
        <TypingLine delay={1.8}>
          <span className="font-semibold text-primary">M ≈ R$ 2.315,25</span>
        </TypingLine>
      </div>
    ),
  },
  {
    title: "E acompanho seu progresso",
    caption: "Pontos fracos, revisões, simulados",
    body: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Conforme você estuda, eu identifico onde travar mais e monto revisões e
        simulados focados no que importa. Você só precisa começar.
      </p>
    ),
  },
];

function TypingLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-lg bg-card border border-border px-3 py-2"
    >
      {children}
    </motion.div>
  );
}

export function FloraTour({ forceOpen = false, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    // Só mostra para usuários logados, uma vez por usuário (por dispositivo).
    if (loading || !user) return;
    try {
      const key = seenKeyFor(user.id);
      if (localStorage.getItem(key)) return;
      // Migração: se já viu antes (chave antiga global), não reabre.
      if (localStorage.getItem(SEEN_KEY_BASE)) {
        localStorage.setItem(key, "1");
        return;
      }
      setOpen(true);
    } catch { /* ignore */ }
  }, [forceOpen, loading, user]);

  const close = () => {
    try {
      localStorage.setItem(seenKeyFor(user?.id), "1");
      localStorage.setItem(SEEN_KEY_BASE, "1");
    } catch { /* ignore */ }
    setOpen(false);
    onClose?.();
  };

  const isLast = step === STEPS.length - 1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-background/85 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Tour da Flora"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <FloraIcon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {STEPS[step].caption}
                </span>
              </div>
              <button
                onClick={close}
                aria-label="Pular tour"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-6 space-y-4 min-h-[220px]">
              <h2 className="text-xl font-bold">{STEPS[step].title}</h2>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {STEPS[step].body}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-muted"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {!isLast && (
                  <Button variant="ghost" size="sm" onClick={close}>
                    Pular
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => (isLast ? close() : setStep((s) => s + 1))}
                >
                  {isLast ? (
                    <>Começar <Check className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Próximo <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  ,
    document.body,
  );
}

export default FloraTour;