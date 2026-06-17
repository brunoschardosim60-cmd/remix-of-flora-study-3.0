import { useMemo, useState } from "react";
import { ShieldAlert, Ban, KeyRound, UserCog, LogIn, MessageSquare, Download, Loader2, Crown, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { AdminUserCard } from "@/lib/adminVault";
import {
  banUser,
  unbanUser,
  resetPasswordLink,
  impersonateLink,
  setAdmin,
  setTier,
  bulkSetTier,
  notifyUser,
  exportUsersCSV,
  setRole,
  type AppRole,
} from "@/lib/adminActions";
import { toErrorMessage } from "@/lib/errorHandling";
import { EmptyState, PanelSkeleton } from "../PanelHelpers";

type Tier = "free" | "pro" | "pro_plus";

export function ModerationPanel({
  users,
  onRefreshUsers,
  loadingUsers = false,
}: {
  users: AdminUserCard[];
  onRefreshUsers: () => Promise<void>;
  loadingUsers?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkTier, setBulkTierState] = useState<Tier>("pro");
  const [notifyOpen, setNotifyOpen] = useState<string | null>(null);
  const [notifyMsg, setNotifyMsg] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.displayName || "").toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    );
  }, [users, search]);

  const allChecked = filtered.length > 0 && filtered.every((u) => selected.has(u.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) filtered.forEach((u) => next.delete(u.id));
    else filtered.forEach((u) => next.add(u.id));
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const wrap = async (id: string, label: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(label);
      await onRefreshUsers();
    } catch (e) {
      toast.error(toErrorMessage(e, `Falha em "${label}"`));
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência.");
  };

  const doBulkTier = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await bulkSetTier(ids, bulkTier);
      toast.success(`Tier "${bulkTier}" aplicado a ${ids.length} usuário(s).`);
      setSelected(new Set());
      await onRefreshUsers();
    } catch (e) {
      toast.error(toErrorMessage(e, "Falha no bulk de tier"));
    }
  };

  const doExport = () => {
    const subset = selected.size > 0 ? users.filter((u) => selected.has(u.id)) : filtered;
    exportUsersCSV(
      subset.map((u) => ({
        id: u.id,
        nome: u.displayName,
        admin: u.isAdmin ? "sim" : "nao",
        horas: u.totalHours,
        temas: u.topicsCount,
        cadernos: u.notebooksCount,
      })),
      `usuarios-${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  const sendNotify = async () => {
    if (!notifyOpen || !notifyMsg.trim()) return;
    try {
      await notifyUser(notifyOpen, notifyMsg.trim());
      toast.success("Mensagem enviada para o usuário.");
      setNotifyOpen(null);
      setNotifyMsg("");
    } catch (e) {
      toast.error(toErrorMessage(e, "Falha ao notificar"));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-xl font-semibold">Moderação</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar usuário"
          placeholder="Buscar por nome ou id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs"
        />
        <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
        <div className="ml-auto flex items-center gap-2">
          <Select value={bulkTier} onValueChange={(v) => setBulkTierState(v as Tier)}>
            <SelectTrigger className="h-9 w-32" aria-label="Tier para aplicar em massa">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="pro_plus">Pro+</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={doBulkTier} disabled={selected.size === 0}>
            Aplicar tier ({selected.size})
          </Button>
          <Button size="sm" variant="outline" onClick={doExport}>
            <Download className="mr-2 h-4 w-4" />
            CSV ({selected.size || filtered.length})
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card/70">
        {loadingUsers ? (
          <div className="p-3"><PanelSkeleton rows={6} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum usuário encontrado"
            description="Ajuste a busca ou aguarde novos cadastros."
          />
        ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2">
                <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Selecionar todos" />
              </th>
              <th className="px-3 py-2 text-left">Usuário</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const busy = busyId === u.id;
              return (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={selected.has(u.id)}
                      onCheckedChange={() => toggleOne(u.id)}
                      aria-label={`Selecionar ${u.displayName}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{u.displayName || "Sem nome"}</p>
                    <p className="text-[11px] text-muted-foreground">{u.id}</p>
                  </td>
                  <td className="px-3 py-2">
                    {u.isAdmin && (
                      <span className="mr-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Banir 1 ano"
                        onClick={() => void wrap(u.id, "Usuário banido", () => banUser(u.id))}
                        disabled={busy}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Desbanir"
                        onClick={() => void wrap(u.id, "Usuário desbanido", () => unbanUser(u.id))}
                        disabled={busy}
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Reset de senha"
                        onClick={() =>
                          void wrap(u.id, "Link de reset gerado", async () => {
                            const r = await resetPasswordLink(u.id);
                            await copyLink(r.link);
                          })
                        }
                        disabled={busy}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Gerar link de impersonação"
                        onClick={() =>
                          void wrap(u.id, "Link de login gerado", async () => {
                            const r = await impersonateLink(u.id);
                            await copyLink(r.link);
                          })
                        }
                        disabled={busy}
                      >
                        <LogIn className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title={u.isAdmin ? "Rebaixar admin" : "Promover admin"}
                        onClick={() =>
                          void wrap(u.id, u.isAdmin ? "Rebaixado" : "Promovido", () =>
                            setAdmin(u.id, !u.isAdmin)
                          )
                        }
                        disabled={busy}
                      >
                        <Crown className={`h-4 w-4 ${u.isAdmin ? "text-primary" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Notificar via Flora"
                        onClick={() => {
                          setNotifyOpen(u.id);
                          setNotifyMsg("");
                        }}
                        disabled={busy}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Select
                        defaultValue="__none__"
                        onValueChange={(v) =>
                          v !== "__none__" &&
                          void wrap(u.id, `Tier "${v}" aplicado`, () => setTier(u.id, v as Tier))
                        }
                      >
                        <SelectTrigger className="h-7 w-24 text-xs" aria-label="Definir tier">
                          <SelectValue placeholder="Tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" disabled>Tier…</SelectItem>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="pro_plus">Pro+</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        defaultValue="__none__"
                        onValueChange={(v) => {
                          if (v === "__none__") return;
                          const [role, op] = v.split(":") as [AppRole, "grant" | "revoke"];
                          void wrap(
                            u.id,
                            `${op === "grant" ? "Concedido" : "Revogado"}: ${role}`,
                            () => setRole(u.id, role, op === "grant")
                          );
                        }}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs" aria-label="Papéis granulares">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" disabled>Roles…</SelectItem>
                          <SelectItem value="moderator:grant">+ moderator</SelectItem>
                          <SelectItem value="moderator:revoke">− moderator</SelectItem>
                          <SelectItem value="support:grant">+ support</SelectItem>
                          <SelectItem value="support:revoke">− support</SelectItem>
                          <SelectItem value="admin:grant">+ admin</SelectItem>
                          <SelectItem value="admin:revoke">− admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {notifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setNotifyOpen(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-semibold">Notificar usuário</h3>
            <p className="text-xs text-muted-foreground">A mensagem será inserida como aviso da Flora no chat do aluno.</p>
            <Textarea
              className="mt-3"
              value={notifyMsg}
              onChange={(e) => setNotifyMsg(e.target.value)}
              placeholder="Ex: identificamos um problema na sua conta e já corrigimos…"
              aria-label="Mensagem ao usuário"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNotifyOpen(null)}>Cancelar</Button>
              <Button onClick={() => void sendNotify()} disabled={!notifyMsg.trim()}>Enviar</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}