import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Loader2, Share2 } from "lucide-react";
import { validatePostContent, canPostNow, markPosted } from "@/lib/moderation";

interface Community {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Texto inicial pré-preenchido (ex.: "Estou estudando Razão e Proporção 📚"). */
  defaultContent: string;
  /** Texto curto para o botão de confirmação (default: "Compartilhar"). */
  confirmLabel?: string;
}

export function ShareToCommunityDialog({ open, onClose, defaultContent, confirmLabel = "Compartilhar" }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState(defaultContent);
  const [community, setCommunity] = useState<string>("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContent(defaultContent);
    void (async () => {
      const { data } = await supabase
        .from("communities")
        .select("id, name")
        .order("name");
      setCommunities((data ?? []) as Community[]);
    })();
  }, [open, defaultContent]);

  async function submit() {
    if (!user) {
      toast.error("Entre na sua conta para compartilhar.");
      return;
    }
    const v = validatePostContent(content.trim());
    if (!v.ok) { toast.error(v.error!); return; }
    const rate = canPostNow();
    if (!rate.ok) { toast.error(`Espere ${rate.waitSec}s.`); return; }
    setSending(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      community_id: community || null,
    });
    setSending(false);
    if (error) { toast.error("Não consegui compartilhar."); return; }
    markPosted();
    toast.success("Publicado na Comunidade!");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Compartilhar na Comunidade
          </DialogTitle>
          <DialogDescription>Edite a mensagem antes de publicar.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={2000}
          className="resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <select
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            className="text-sm bg-muted border border-border rounded-md px-2 py-1.5 flex-1"
          >
            <option value="">Sem comunidade (feed geral)</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={sending || !content.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}