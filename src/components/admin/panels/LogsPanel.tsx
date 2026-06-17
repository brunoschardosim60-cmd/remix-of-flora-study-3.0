import { ScrollText } from "lucide-react";

export function LogsPanel() {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-xl font-semibold">Logs de ações</h2>
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Em construção (Pacote C)</p>
        <p>Listagem paginada de <code>admin_action_logs</code> com filtros por ator, alvo e tipo de ação.</p>
      </div>
    </section>
  );
}