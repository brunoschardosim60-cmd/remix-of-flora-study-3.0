import { ShieldAlert } from "lucide-react";

export function ModerationPanel() {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-xl font-semibold">Moderação</h2>
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Em construção (Pacote B)</p>
        <p>
          Aqui virá: banir/desbanir, reset de senha, promoção de admin, link de impersonação,
          notificação de usuário e ações em massa.
        </p>
      </div>
    </section>
  );
}