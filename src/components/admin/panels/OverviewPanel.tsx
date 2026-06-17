import { useEffect, useState } from "react";
import { Users, Sparkles, FileQuestion, Database, BookOpen, Clock3, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { AdminUserCard } from "@/lib/adminVault";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorHandling";

type DayPoint = { day: string; chamadas: number; sucesso: number };

export function OverviewPanel({ users }: { users: AdminUserCard[] }) {
  const totalHours = users.reduce((s, u) => s + (u.totalHours ?? 0), 0);
  const totalTopics = users.reduce((s, u) => s + (u.topicsCount ?? 0), 0);
  const totalNotebooks = users.reduce((s, u) => s + (u.notebooksCount ?? 0), 0);
  const admins = users.filter((u) => u.isAdmin).length;
  const [series, setSeries] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const { data, error } = await supabase
          .from("ai_usage_logs")
          .select("created_at, success")
          .gte("created_at", since)
          .order("created_at", { ascending: true });
        if (error) throw error;
        const buckets = new Map<string, DayPoint>();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 3600 * 1000);
          const k = d.toISOString().slice(0, 10);
          buckets.set(k, {
            day: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
            chamadas: 0,
            sucesso: 0,
          });
        }
        for (const r of data ?? []) {
          const k = (r.created_at as string).slice(0, 10);
          const b = buckets.get(k);
          if (!b) continue;
          b.chamadas++;
          if (r.success) b.sucesso++;
        }
        if (alive) setSeries(Array.from(buckets.values()));
      } catch (e) {
        reportError("overview chart", e, { devOnly: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
          Métricas em tempo real dos dados administrativos e uso da Flora nos últimos 7 dias.
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

      <div className="rounded-2xl border border-border bg-card/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Uso da Flora — últimos 7 dias</h3>
        </div>
        <div className="h-64 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Carregando…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="chamadas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sucesso" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}