import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Thread {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  other?: { id: string; display_name: string | null; avatar_url: string | null };
}
interface Msg { id: string; thread_id: string; sender_id: string; content: string; created_at: string; }

export function MensagensPanel() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void loadThreads();
  }, [user]);

  async function loadThreads() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("dm_threads")
      .select("id, user_a, user_b, last_message_at")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("last_message_at", { ascending: false });
    const list = (data ?? []) as Thread[];
    const otherIds = list.map((t) => (t.user_a === user.id ? t.user_b : t.user_a));
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", otherIds);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((t) => {
        const oid = t.user_a === user.id ? t.user_b : t.user_a;
        t.other = map.get(oid) ?? { id: oid, display_name: "Usuário", avatar_url: null };
      });
    }
    setThreads(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!active) return;
    void (async () => {
      const { data } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("thread_id", active.id)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Msg[]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 99999 }));
    })();
    const ch = supabase
      .channel(`dm-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${active.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Msg]);
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 99999 }));
        })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [active?.id]);

  async function send() {
    if (!user || !active || !text.trim()) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("dm_messages").insert({
      thread_id: active.id, sender_id: user.id, content,
    });
    if (error) { toast.error("Não consegui enviar."); setText(content); }
  }

  async function startNew() {
    if (!user || !newUsername.trim()) return;
    const uname = newUsername.trim().replace(/^@/, "");
    const { data: prof } = await supabase
      .from("profiles").select("id, display_name, avatar_url")
      .eq("username", uname).maybeSingle();
    if (!prof) { toast.error("Usuário não encontrado."); return; }
    if (prof.id === user.id) { toast.error("Você não pode conversar consigo."); return; }
    const [a, b] = [user.id, prof.id].sort();
    const { data: existing } = await supabase
      .from("dm_threads").select("*").eq("user_a", a).eq("user_b", b).maybeSingle();
    let thread: any = existing;
    if (!thread) {
      const { data: created, error } = await supabase
        .from("dm_threads").insert({ user_a: a, user_b: b }).select().single();
      if (error) { toast.error("Erro ao criar conversa."); return; }
      thread = created;
    }
    thread.other = prof;
    setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
    setActive(thread);
    setNewUsername("");
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <aside className="space-y-2">
          <div className="flex gap-1">
            <Input placeholder="@username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startNew()} />
            <Button size="icon" onClick={startNew}><Plus className="w-4 h-4" /></Button>
          </div>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto mt-4" /> :
            threads.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Nenhuma conversa. Inicie com @username acima.</p> :
            threads.map((t) => (
              <button key={t.id} onClick={() => setActive(t)}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition ${active?.id === t.id ? "bg-muted" : ""}`}>
                <p className="font-medium text-sm truncate">{t.other?.display_name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">{new Date(t.last_message_at).toLocaleString("pt-BR")}</p>
              </button>
            ))}
        </aside>
        <section className="border border-border rounded-lg bg-card min-h-[60dvh] flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Selecione uma conversa.</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border font-medium">{active.other?.display_name || "Conversa"}</div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[60dvh]">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender_id === user?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.content}
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Textarea rows={1} value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Mensagem…" className="resize-none min-h-10" />
                <Button onClick={send} disabled={!text.trim()}><Send className="w-4 h-4" /></Button>
              </div>
            </>
          )}
        </section>
    </div>
  );
}

export default function Mensagens() {
  return <MensagensPanel />;
}