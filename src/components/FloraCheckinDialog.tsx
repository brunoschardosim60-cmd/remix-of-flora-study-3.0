import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FloraCheckpointCard } from "@/components/FloraCheckpointCard";
import { useFloraCheckpoint } from "@/hooks/useFloraCheckpoint";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

/**
 * Abre o check-in semanal em modal leve quando o aluno encerra o cronômetro
 * e volta pra tela inicial. Cooldown local: 24 h após fechar, 7 dias após enviar.
 */
const COOLDOWN_KEY = "flora:checkin:lastPrompt";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 h

export function FloraCheckinDialog({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);
  const { current } = useFloraCheckpoint(user);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      // já preencheu essa semana → skip
      if (current) return;
      const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
      if (Date.now() - last < COOLDOWN_MS) return;
      setOpen(true);
    };
    window.addEventListener("flora-checkin-prompt", handler);
    return () => window.removeEventListener("flora-checkin-prompt", handler);
  }, [user, current]);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      // marca cooldown ao fechar sem responder
      try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch {}
    }
    setOpen(v);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
        <VisuallyHidden>
          <DialogTitle>Check-in da semana</DialogTitle>
          <DialogDescription>Registre como foi sua sessão de estudo</DialogDescription>
        </VisuallyHidden>
        <FloraCheckpointCard
          user={user}
          onSubmitted={() => {
            try { localStorage.setItem(COOLDOWN_KEY, String(Date.now() + 6 * 24 * 60 * 60 * 1000)); } catch {}
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}