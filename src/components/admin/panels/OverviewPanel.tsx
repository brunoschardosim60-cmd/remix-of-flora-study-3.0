import { useEffect, useState } from "react";
import {
  Users,
  Sparkles,
  FileQuestion,
  BookOpen,
  Clock3,
  Activity,
  Zap,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { AdminUserCard } from "@/lib/adminVault";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorHandling";
import { PanelLoading } from "../PanelHelpers";

type DayPoint = { day: string; chamadas: number; sucesso: number };
type Kpis = { dau: number; paidCount: number; conversion: number; aiCost30d: number };

export function OverviewPanel({ users }: { users: AdminUserCard[] }) {
  const totalHours = users.reduce((s, u) => s + (u.totalHours ?? 0), 0);
  const totalTopics = users.reduce((s, u) => s + (u.topicsCount ?? 0), 0);
  const totalNotebooks = users.reduce((s, u) => s + (u.notebooksCount ?? 0), 0);
  const admins = users.filter((u) => u.isAdmin).length;
  const [series, setSeries] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

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

  // KPIs: DAU, conversão tier, custo IA 30 dias
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const [dauRes, tierRes, costRes] = await Promise.all([
          supabase.from("user_actions").select("user_id").gte("created_at", since24h),
          supabase.from("user_tiers").select("tier"),
          supabase.from("ai_usage_logs").select("cost_estimate").gte("created_at", since30d),
        ]);
        const dau = new Set((dauRes.data ?? []).map((r) => r.user_id as string)).size;
        const tiers = tierRes.data ?? [];
        const paid = tiers.filter((t) => t.tier !== "free").length;
        const total = Math.max(tiers.length, 1);
        const cost = (costRes.data ?? []).reduce((s, r) => s + Number(r.cost_estimate ?? 0), 0);
        if (alive)
          setKpis({
            dau,
            paidCount: paid,
            conversion: (paid / total) * 100,
            aiCost30d: cost,
          });
      } catch (e) {
        reportError("overview kpis", e, { devOnly: true });
      } finally {
        if (alive) setKpiLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cards: Array<{ label: string; value: string | number; icon: typeof Users; hint?: string }> = [
    { label: "Usuários", value: users.length, icon: Users },
    { label: "Admins", value: admins, icon: Sparkles },
    { label: "DAU (24h)", value: kpis?.dau ?? "—", icon: Zap, hint: "Usuários ativos nas últimas 24h" },
    {
      label: "Conversão paga",
      value: kpis ? `${kpis.conversion.toFixed(1)}%` : "—",
      icon: TrendingUp,
      hint: kpis ? `${kpis.paidCount} pro / pro+` : undefined,
    },
    {
      label: "Custo IA (30d)",
      value: kpis ? `$${kpis.aiCost30d.toFixed(2)}` : "—",
      icon: DollarSign,
      hint: "Soma de cost_estimate em ai_usage_logs",
    },
    { label: "Horas totais", value: Math.round(totalHours), icon: Clock3 },
    { label: "Temas criados", value: totalTopics, icon: FileQuestion },
    { label: "Cadernos", value: totalNotebooks, icon: BookOpen },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold">Visão geral</h2>
        <p className="text-sm text-muted-foreground">
          Métricas em tempo real dos dados administrativos e uso da Flora nos últimos 7 dias.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card/70 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <c.icon className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">{c.label}</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-bold">
              {kpiLoading && c.value === "—" ? (
                <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted/60" />
              ) : (
                c.value
              )}
            </p>
            {c.hint && <p className="mt-1 text-[11px] text-muted-foreground">{c.hint}</p>}
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
            <PanelLoading label="Carregando série de uso…" />
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