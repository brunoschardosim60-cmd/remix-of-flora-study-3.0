import { useEffect, useMemo, useState } from "react";
import { DollarSign, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorHandling";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PanelSkeleton, EmptyState } from "../PanelHelpers";
import { exportUsersCSV } from "@/lib/adminActions";

/**
 * Dashboard de custos da IA por provider/modelo.
 * Lê ai_usage_logs dos últimos N dias e calcula custos via cost_estimate (já gravado
 * pelo _shared/usage.ts) — não recalculamos preços no client.
 * Filtros: tier (cruzando com user_tiers) e action_type.
 */

type Row = {
  id: string;
  user_id: string;
  action_type: string;
  model: string;
  cost_estimate: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  created_at: string;
  metadata: { provider?: string } | null;
};

const RANGE_DAYS = 30;

function pickProvider(r: Row): string {
  const p = r.metadata?.provider;
  if (p && p !== "unknown") return p;
  // fallback: deriva do model
  const m = (r.model || "").toLowerCase();
  if (m.includes("gemini")) return "gemini";
  if (m.includes("gpt")) return "openai";
  if (m.includes("llama") && m.includes("cerebras")) return "cerebras";
  if (m.includes("groq") || m.includes("scout")) return "groq";
  if (m.includes("mistral") || m.includes("nemo")) return "mistral";
  if (m.includes("deepseek")) return "deepseek";
  return "outro";
}

export function CostsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tiers, setTiers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - RANGE_DAYS * 86400_000).toISOString();
        const [logsRes, tiersRes] = await Promise.all([
          supabase
            .from("ai_usage_logs")
            .select("id, user_id, action_type, model, cost_estimate, tokens_in, tokens_out, created_at, metadata")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(10000),
          supabase.from("user_tiers").select("user_id, tier"),
        ]);
        if (logsRes.error) throw logsRes.error;
        const tierMap = new Map<string, string>();
        for (const t of tiersRes.data ?? []) tierMap.set(t.user_id as string, (t.tier as string) || "free");
        if (!alive) return;
        setRows((logsRes.data ?? []) as Row[]);
        setTiers(tierMap);
      } catch (e) {
        reportError("costs panel", e, { devOnly: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const a = actionFilter.trim().toLowerCase();
    return rows.filter((r) => {
      if (tierFilter !== "all" && (tiers.get(r.user_id) || "free") !== tierFilter) return false;
      if (a && !r.action_type.toLowerCase().includes(a)) return false;
      return true;
    });
  }, [rows, tiers, tierFilter, actionFilter]);

  const totals = useMemo(() => {
    let cost = 0, tin = 0, tout = 0;
    for (const r of filtered) {
      cost += Number(r.cost_estimate || 0);
      tin += Number(r.tokens_in || 0);
      tout += Number(r.tokens_out || 0);
    }
    return { cost, tin, tout, calls: filtered.length };
  }, [filtered]);

  const byProvider = useMemo(() => {
    const m = new Map<string, { provider: string; cost: number; calls: number }>();
    for (const r of filtered) {
      const p = pickProvider(r);
      const cur = m.get(p) || { provider: p, cost: 0, calls: 0 };
      cur.cost += Number(r.cost_estimate || 0);
      cur.calls += 1;
      m.set(p, cur);
    }
    return [...m.values()].sort((a, b) => b.cost - a.cost);
  }, [filtered]);

  const byModel = useMemo(() => {
    const m = new Map<string, { model: string; cost: number; calls: number }>();
    for (const r of filtered) {
      const k = r.model || "(sem modelo)";
      const cur = m.get(k) || { model: k, cost: 0, calls: 0 };
      cur.cost += Number(r.cost_estimate || 0);
      cur.calls += 1;
      m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => b.cost - a.cost).slice(0, 15);
  }, [filtered]);

  const byDay = useMemo(() => {
    const m = new Map<string, { day: string; cost: number; calls: number }>();
    // sementes pra todos os dias da janela
    for (let i = RANGE_DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const k = d.toISOString().slice(0, 10);
      m.set(k, { day: k.slice(5), cost: 0, calls: 0 });
    }
    for (const r of filtered) {
      const k = r.created_at.slice(0, 10);
      const cur = m.get(k);
      if (!cur) continue;
      cur.cost += Number(r.cost_estimate || 0);
      cur.calls += 1;
    }
    return [...m.values()];
  }, [filtered]);

  const distinctActions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(r.action_type);
    return [...s].sort();
  }, [rows]);

  const exportCSV = () => {
    if (!filtered.length) {
      toast.info("Nenhuma linha para exportar");
      return;
    }
    exportUsersCSV(
      filtered.map((r) => ({
        created_at: r.created_at,
        user_id: r.user_id,
        tier: tiers.get(r.user_id) || "free",
        action_type: r.action_type,
        model: r.model,
        provider: pickProvider(r),
        tokens_in: r.tokens_in ?? 0,
        tokens_out: r.tokens_out ?? 0,
        cost_estimate: r.cost_estimate ?? 0,
      })),
      `ai-costs-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success(`${filtered.length} linha(s) exportada(s)`);
  };

  const kpis = [
    { label: "Custo total", value: `$${totals.cost.toFixed(2)}`, hint: `${RANGE_DAYS} dias` },
    { label: "Chamadas", value: totals.calls.toLocaleString("pt-BR") },
    { label: "Tokens in", value: totals.tin.toLocaleString("pt-BR") },
    { label: "Tokens out", value: totals.tout.toLocaleString("pt-BR") },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
            <DollarSign className="h-5 w-5 text-primary" /> Custos IA — últimos {RANGE_DAYS} dias
          </h2>
          <p className="text-sm text-muted-foreground">
            Baseado em <code>ai_usage_logs.cost_estimate</code> (gravado server-side).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar por tier"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="all">Todos tiers</option>
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="pro_plus">pro_plus</option>
          </select>
          <Input
            list="costs-action-list"
            placeholder="Filtrar ação"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 max-w-xs"
          />
          <datalist id="costs-action-list">
            {distinctActions.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={loading}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <PanelSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Sem dados de uso"
          description="Nenhuma chamada de IA registrada nos últimos 30 dias."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border border-border bg-card/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <p className="mt-1 font-heading text-2xl font-bold">{k.value}</p>
                {k.hint && <p className="mt-1 text-[11px] text-muted-foreground">{k.hint}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <h3 className="mb-3 text-sm font-medium">Custo por dia</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    formatter={(v: number, name) => (name === "cost" ? `$${v.toFixed(3)}` : v)}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" name="Custo (USD)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <h3 className="mb-3 text-sm font-medium">Por provider</h3>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1 text-left">Provider</th>
                    <th className="py-1 text-right">Chamadas</th>
                    <th className="py-1 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {byProvider.map((r) => (
                    <tr key={r.provider} className="border-t border-border/40">
                      <td className="py-1 font-mono text-[12px]">{r.provider}</td>
                      <td className="py-1 text-right">{r.calls.toLocaleString("pt-BR")}</td>
                      <td className="py-1 text-right font-medium">${r.cost.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <h3 className="mb-3 text-sm font-medium">Top modelos</h3>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1 text-left">Modelo</th>
                    <th className="py-1 text-right">Chamadas</th>
                    <th className="py-1 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((r) => (
                    <tr key={r.model} className="border-t border-border/40">
                      <td className="max-w-[260px] truncate py-1 font-mono text-[11px]" title={r.model}>{r.model}</td>
                      <td className="py-1 text-right">{r.calls.toLocaleString("pt-BR")}</td>
                      <td className="py-1 text-right font-medium">${r.cost.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}