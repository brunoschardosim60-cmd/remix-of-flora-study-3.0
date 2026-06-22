import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Send, Hash, LogOut, Copy } from "lucide-react";
import { toast } from "sonner";

interface Group {
  id: string; name: string; description: string | null;
  invite_code: string; created_by: string; member_count: number;
}
interface GMsg { id: string; group_id: string; user_id: string; content: string; created_at: string; }

export function GruposPanel() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GMsg[]>([]);
  const [text, setText] = useState("");
  const [profiles, setProfiles] = useState<Map<string, { display_name: string | null }>>(new Map());
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openJoin, setOpenJoin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) void loadGroups(); }, [user]);

  async function loadGroups() {
    if (!user) return;
    const { data: mems } = await supabase
      .from("study_group_members").select("group_id").eq("user_id", user.id);
    const ids = (mems ?? []).map((m: any) => m.group_id);
    if (!ids.length) { setGroups([]); return; }
    const { data } = await supabase.from("study_groups").select("*").in("id", ids).order("created_at", { ascending: false });
    setGroups((data ?? []) as Group[]);
  }

  useEffect(() => {
    if (!active) return;
    void (async () => {
      const { data } = await supabase
        .from("study_group_messages").select("*")
        .eq("group_id", active.id).order("created_at", { ascending: true });
      const msgs = (data ?? []) as GMsg[];
      setMessages(msgs);
      const uids = Array.from(new Set(msgs.map((m) => m.user_id)));
      if (uids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", uids);
        setProfiles(new Map((profs ?? []).map((p: any) => [p.id, p])));
      }
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 99999 }));
    })();
    const ch = supabase
      .channel(`grp-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_group_messages", filter: `group_id=eq.${active.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as GMsg]);
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 99999 }));
        })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [active?.id]);

  async function send() {
    if (!user || !active || !text.trim()) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("study_group_messages").insert({
      group_id: active.id, user_id: user.id, content,
    });
    if (error) { toast.error("Não consegui enviar."); setText(content); }
  }

  async function createGroup() {
    if (!user || !newName.trim()) return;
    const { data, error } = await supabase
      .from("study_groups")
      .insert({ name: newName.trim(), description: newDesc.trim(), created_by: user.id })
      .select().single();
    if (error || !data) { toast.error("Erro ao criar grupo."); return; }
    await supabase.from("study_group_members").insert({ group_id: data.id, user_id: user.id, role: "admin" });
    toast.success("Grupo criado!");
    setOpenCreate(false); setNewName(""); setNewDesc("");
    await loadGroups();
  }

  async function joinByCode() {
    if (!user || !joinCode.trim()) return;
    const { data: g } = await supabase
      .from("study_groups").select("*").eq("invite_code", joinCode.trim()).maybeSingle();
    if (!g) { toast.error("Código inválido."); return; }
    const { error } = await supabase.from("study_group_members").insert({ group_id: g.id, user_id: user.id });
    if (error && !`${error.message}`.includes("duplicate")) { toast.error("Erro ao entrar."); return; }
    toast.success(`Entrou em ${g.name}!`);
    setOpenJoin(false); setJoinCode("");
    await loadGroups();
  }

  async function leaveGroup(g: Group) {
    if (!user) return;
    if (!confirm(`Sair de "${g.name}"?`)) return;
    await supabase.from("study_group_members").delete().eq("group_id", g.id).eq("user_id", user.id);
    setActive(null);
    await loadGroups();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-end">
            <Dialog open={openJoin} onOpenChange={setOpenJoin}>
              <DialogTrigger asChild><Button variant="outline" size="sm">Entrar com código</Button></DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Entrar em grupo</DialogTitle></DialogHeader>
                <Input placeholder="Código de convite" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
                <DialogFooter><Button onClick={joinByCode}>Entrar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Criar</Button></DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Novo grupo de estudo</DialogTitle></DialogHeader>
                <Input placeholder="Nome do grupo" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Textarea placeholder="Descrição (opcional)" rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                <DialogFooter><Button onClick={createGroup} disabled={!newName.trim()}>Criar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <aside className="space-y-2">
          {groups.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Você ainda não está em nenhum grupo. Crie ou entre com um código.</p>
          ) : groups.map((g) => (
            <button key={g.id} onClick={() => setActive(g)}
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition ${active?.id === g.id ? "bg-muted" : ""}`}>
              <p className="font-medium text-sm truncate flex items-center gap-1"><Hash className="w-3 h-3" /> {g.name}</p>
              <p className="text-xs text-muted-foreground">{g.member_count} membro(s)</p>
            </button>
          ))}
        </aside>
        <section className="border border-border rounded-lg bg-card min-h-[60dvh] flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Selecione um grupo.</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="flex-1">
                  <p className="font-medium">{active.name}</p>
                  {active.description && <p className="text-xs text-muted-foreground">{active.description}</p>}
                </div>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => copyCode(active.invite_code)}>
                  <Copy className="w-3 h-3" /> {active.invite_code}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => leaveGroup(active)} title="Sair"><LogOut className="w-4 h-4" /></Button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[55dvh]">
                {messages.map((m) => {
                  const mine = m.user_id === user?.id;
                  const name = profiles.get(m.user_id)?.display_name || "Aluno";
                  return (
                    <div key={m.id} className={`max-w-[75%] ${mine ? "ml-auto" : ""}`}>
                      {!mine && <p className="text-[10px] text-muted-foreground px-2">{name}</p>}
                      <div className={`px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.content}</div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Textarea rows={1} value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Mensagem para o grupo…" className="resize-none min-h-10" />
                <Button onClick={send} disabled={!text.trim()}><Send className="w-4 h-4" /></Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function Grupos() {
  return <GruposPanel />;
}