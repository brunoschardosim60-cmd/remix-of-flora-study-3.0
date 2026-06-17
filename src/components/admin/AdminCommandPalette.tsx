import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { AdminUserCard } from "@/lib/adminVault";
import type { AdminSection } from "./AdminSidebar";
import { banUser, impersonateLink, resetPasswordLink, setTier } from "@/lib/adminActions";
import { toErrorMessage } from "@/lib/errorHandling";

const SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "overview", label: "Ir para Visão geral" },
  { id: "usuarios", label: "Ir para Usuários" },
  { id: "moderacao", label: "Ir para Moderação" },
  { id: "ia-tiers", label: "Ir para IA & Tiers" },
  { id: "enem", label: "Ir para ENEM" },
  { id: "concurso", label: "Ir para Concurso" },
  { id: "pdf", label: "Ir para Reprocessar PDF" },
  { id: "cache", label: "Ir para Cache Flora" },
  { id: "logs", label: "Ir para Logs" },
];

export function AdminCommandPalette({
  users,
  onNavigate,
  onRefresh,
}: {
  users: AdminUserCard[];
  onNavigate: (s: AdminSection) => void;
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success(label);
      await onRefresh();
    } catch (e) {
      toast.error(toErrorMessage(e, `Falha em "${label}"`));
    } finally {
      setOpen(false);
    }
  };

  const copy = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado.");
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar usuário, ação ou seção…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Navegar">
          {SECTIONS.map((s) => (
            <CommandItem
              key={s.id}
              value={`nav ${s.id} ${s.label}`}
              onSelect={() => {
                onNavigate(s.id);
                setOpen(false);
              }}
            >
              {s.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Usuários — ações rápidas">
          {users.slice(0, 50).map((u) => (
            <div key={u.id}>
              <CommandItem
                value={`tier-pro ${u.displayName} ${u.id}`}
                onSelect={() => void run(`Tier Pro aplicado em ${u.displayName}`, () => setTier(u.id, "pro"))}
              >
                Definir tier <b className="ml-1">Pro</b> em {u.displayName || u.id}
              </CommandItem>
              <CommandItem
                value={`tier-proplus ${u.displayName} ${u.id}`}
                onSelect={() => void run(`Tier Pro+ aplicado em ${u.displayName}`, () => setTier(u.id, "pro_plus"))}
              >
                Definir tier <b className="ml-1">Pro+</b> em {u.displayName || u.id}
              </CommandItem>
              <CommandItem
                value={`ban ${u.displayName} ${u.id}`}
                onSelect={() => void run(`${u.displayName} banido`, () => banUser(u.id))}
              >
                Banir {u.displayName || u.id}
              </CommandItem>
              <CommandItem
                value={`reset ${u.displayName} ${u.id}`}
                onSelect={() =>
                  void run(`Link de reset para ${u.displayName}`, async () => {
                    const r = await resetPasswordLink(u.id);
                    await copy(r.link);
                  })
                }
              >
                Reset de senha — {u.displayName || u.id}
              </CommandItem>
              <CommandItem
                value={`impersonate ${u.displayName} ${u.id}`}
                onSelect={() =>
                  void run(`Link de login para ${u.displayName}`, async () => {
                    const r = await impersonateLink(u.id);
                    await copy(r.link);
                  })
                }
              >
                Impersonar {u.displayName || u.id}
              </CommandItem>
            </div>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}