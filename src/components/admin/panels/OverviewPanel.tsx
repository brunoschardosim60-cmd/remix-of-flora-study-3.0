import { Users, Sparkles, FileQuestion, Database, BookOpen, Clock3 } from "lucide-react";
import type { AdminUserCard } from "@/lib/adminVault";

export function OverviewPanel({ users }: { users: AdminUserCard[] }) {
  const totalHours = users.reduce((s, u) => s + (u.totalHours ?? 0), 0);
  const totalTopics = users.reduce((s, u) => s + (u.topicsCount ?? 0), 0);
  const totalNotebooks = users.reduce((s, u) => s + (u.notebooksCount ?? 0), 0);
  const admins = users.filter((u) => u.isAdmin).length;

  const cards = [
    { label: "Usuários", value: users.length, icon: Users },
    { label: "Admins", value: admins, icon: Sparkles },
    { label: "Horas totais", value: Math.round(totalHours), icon: Clock3 },
    { label: "Temas criados", value: totalTopics, icon: FileQuestion },
    { label: "Cadernos", value: totalNotebooks, icon: BookOpen },
    { label: "Tabelas ativas", value: "45+", icon: Database },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold">Visão geral</h2>
        <p className="text-sm text-muted-foreground">
          Métricas em tempo real dos dados administrativos. Gráficos detalhados chegam no próximo pacote.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card/70 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <c.icon className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">{c.label}</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}