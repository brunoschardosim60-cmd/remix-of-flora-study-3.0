import { useEffect, useState, useCallback } from "react";
import { Bell, Heart, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Notif {
  id: string;
  type: "like" | "comment" | "follow" | "mention";
  post_id: string | null;
  actor_id: string | null;
  read: boolean;
  created_at: string;
  actor_name?: string | null;
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}min`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, post_id, actor_id, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = (data ?? []) as Notif[];
    const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[]));
    const names: Record<string, string> = {};
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", actorIds);
      (profs ?? []).forEach((p: any) => {
        names[p.id] = p.display_name || p.username || "Alguém";
      });
    }
    setItems(rows.map((r) => ({ ...r, actor_name: r.actor_id ? names[r.actor_id] : null })));
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  if (!user) return null;
  const unread = items.filter((i) => !i.read).length;

  async function markAllRead() {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }

  function handleClick(n: Notif) {
    setOpen(false);
    if (n.post_id) navigate(`/comunidade`);
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) void markAllRead(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notificações">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <p className="font-semibold text-sm">Notificações</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">
              Marcar como lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              Sem notificações ainda.
            </p>
          ) : (
            items.map((n) => {
              const Icon = n.type === "like" ? Heart : MessageCircle;
              const verb = n.type === "like" ? "curtiu seu post" : "comentou no seu post";
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-muted/50 border-b border-border/50 last:border-0 ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${n.type === "like" ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-tight">
                      <span className="font-semibold">{n.actor_name || "Alguém"}</span>{" "}
                      <span className="text-muted-foreground">{verb}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}