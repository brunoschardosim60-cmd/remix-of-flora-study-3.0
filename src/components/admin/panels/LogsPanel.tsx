import { useEffect, useState } from "react";
import { ScrollText, ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorHandling";
import { PanelSkeleton, EmptyState } from "../PanelHelpers";

interface LogRow {
  id: string;
  admin_id: string;
  user_id: string;
  action_type: string;
  note: string;
  created_at: string;
}

const PAGE_SIZE = 25;

export function LogsPanel() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [live, setLive] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        let q = supabase
          .from("admin_action_logs")
          .select("id, admin_id, user_id, action_type, note, created_at")
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
        if (actionFilter.trim()) q = q.ilike("action_type", `%${actionFilter.trim()}%`);
        if (userFilter.trim()) q = q.eq("user_id", userFilter.trim());
        const { data, error } = await q;
        if (error) throw error;
        if (alive) setRows((data ?? []) as LogRow[]);
      } catch (e) {
        reportError("logs panel", e, { devOnly: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, actionFilter, userFilter]);

  // Realtime: append new rows on page 0, no filters set
  useEffect(() => {
    if (page !== 0) return;
    const channel = supabase
      .channel("admin_action_logs_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_action_logs" },
        (payload) => {
          const row = payload.new as LogRow;
          if (actionFilter.trim() && !row.action_type.includes(actionFilter.trim())) return;
          if (userFilter.trim() && row.user_id !== userFilter.trim()) return;
          setRows((prev) => [row, ...prev].slice(0, PAGE_SIZE));
        }
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
      setLive(false);
    };
  }, [page, actionFilter, userFilter]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-xl font-semibold">Logs de ações admin</h2>
        {page === 0 && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              live ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
            }`}
            title={live ? "Recebendo eventos em tempo real" : "Conectando…"}
          >
            <Radio className="h-3 w-3" /> {live ? "ao vivo" : "off"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Filtrar por ação"
          placeholder="Filtrar por ação (ex: ban_user)"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          className="h-9 max-w-xs"
        />
        <Input
          aria-label="Filtrar por user_id alvo"
          placeholder="user_id alvo (uuid exato)"
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setPage(0);
          }}
          className="h-9 max-w-sm"
        />
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs text-muted-foreground">Página {page + 1}</span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={rows.length < PAGE_SIZE || loading}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card/70">
        {loading ? (
          <div className="p-3"><PanelSkeleton rows={6} /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nenhum log encontrado"
            description="Ajuste os filtros ou aguarde novas ações administrativas."
          />
        ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Quando</th>
              <th className="px-3 py-2 text-left">Ação</th>
              <th className="px-3 py-2 text-left">Alvo</th>
              <th className="px-3 py-2 text-left">Admin</th>
              <th className="px-3 py-2 text-left">Nota</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {r.action_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{r.user_id}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.admin_id}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.note}</td>
                </tr>
              ))}
          </tbody>
        </table>
        )}
      </div>
    </section>
  );
}