import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Send, Loader2, Image as ImageIcon, X, Flag, MoreHorizontal, TrendingUp, Hash, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useStudentObjetivo } from "@/hooks/useStudentObjetivo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { validatePostContent, canPostNow, markPosted, containsProfanity } from "@/lib/moderation";

interface Community {
  id: string;
  name: string;
  slug: string;
  category: string | null;
}

type FeedMode = "geral" | "trending" | string;

interface ProfileLite {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  community_id?: string | null;
  profile?: ProfileLite | null;
  liked_by_me?: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: ProfileLite | null;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function Avatar({ profile, size = 40 }: { profile?: ProfileLite | null; size?: number }) {
  const initial = (profile?.display_name || profile?.username || "?").charAt(0).toUpperCase();
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.display_name || "Avatar"}
        className="rounded-full object-cover bg-muted"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export default function Comunidade() {
  const { user, profile, signOut } = useAuth();
  const { bancoRoute, bancoLabel } = useStudentObjetivo(user);
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [composerMedia, setComposerMedia] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [posting, setPosting] = useState(false);
  const [composerCommunity, setComposerCommunity] = useState<string>("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [feedMode, setFeedMode] = useState<FeedMode>("geral");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const meAsProfile: ProfileLite | null = user
    ? {
        id: user.id,
        display_name: profile?.display_name ?? null,
        username: (profile as any)?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
      }
    : null;

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    const { data: postRows, error } = await supabase
      .from("posts")
      .select("id, user_id, content, media_url, likes_count, comments_count, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error("Não consegui carregar o feed.");
      setLoading(false);
      return;
    }
    const rows = (postRows ?? []) as Post[];
    const userIds = Array.from(new Set(rows.map((p) => p.user_id)));
    const profilesById: Record<string, ProfileLite> = {};
    if (userIds.length) {
      const { data: profRows } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);
      (profRows ?? []).forEach((p: any) => {
        profilesById[p.id] = p;
      });
    }
    let likedSet = new Set<string>();
    if (user && rows.length) {
      const { data: likeRows } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", rows.map((p) => p.id));
      likedSet = new Set((likeRows ?? []).map((l: any) => l.post_id));
    }
    setPosts(
      rows.map((p) => ({
        ...p,
        profile: profilesById[p.user_id] ?? null,
        liked_by_me: likedSet.has(p.id),
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  // Realtime: novos posts aparecem no topo
  useEffect(() => {
    const channel = supabase
      .channel("comunidade-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => void fetchFeed(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeed]);

  async function submitPost() {
    if (!user) {
      toast.error("Entre na sua conta para postar.");
      return;
    }
    const content = composer.trim();
    const v = validatePostContent(content);
    if (!v.ok) {
      toast.error(v.error!);
      return;
    }
    const rate = canPostNow();
    if (!rate.ok) {
      toast.error(`Espere ${rate.waitSec}s antes de postar de novo.`);
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content,
      media_url: composerMedia.trim() || null,
    });
    setPosting(false);
    if (error) {
      toast.error("Não consegui publicar.");
      return;
    }
    markPosted();
    setComposer("");
    setComposerMedia("");
    toast.success("Publicado!");
    void fetchFeed();
  }

  async function handleFileSelected(file: File) {
    if (!user) {
      toast.error("Entre na sua conta para enviar imagem.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB).");
      return;
    }
    setUploadingMedia(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `posts/${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("notebook-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setUploadingMedia(false);
      toast.error("Não consegui enviar a imagem.");
      return;
    }
    const { data: pub } = supabase.storage.from("notebook-images").getPublicUrl(path);
    setComposerMedia(pub.publicUrl);
    setUploadingMedia(false);
  }

  async function toggleLike(post: Post) {
    if (!user) {
      toast.error("Entre na sua conta para curtir.");
      return;
    }
    // Otimista
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked_by_me: !p.liked_by_me,
              likes_count: Math.max(0, p.likes_count + (p.liked_by_me ? -1 : 1)),
            }
          : p,
      ),
    );
    if (post.liked_by_me) {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id);
    } else {
      await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
    }
  }

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from("comments")
      .select("id, post_id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as Comment[];
    const userIds = Array.from(new Set(rows.map((c) => c.user_id)));
    const profMap: Record<string, ProfileLite> = {};
    if (userIds.length) {
      const { data: profRows } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);
      (profRows ?? []).forEach((p: any) => (profMap[p.id] = p));
    }
    setComments((prev) => ({
      ...prev,
      [postId]: rows.map((c) => ({ ...c, profile: profMap[c.user_id] ?? null })),
    }));
  }

  async function toggleComments(post: Post) {
    const next = !openComments[post.id];
    setOpenComments((prev) => ({ ...prev, [post.id]: next }));
    if (next && !comments[post.id]) await loadComments(post.id);
  }

  async function submitComment(post: Post) {
    if (!user) {
      toast.error("Entre na sua conta para comentar.");
      return;
    }
    const content = (commentDraft[post.id] || "").trim();
    if (!content) return;
    if (containsProfanity(content)) {
      toast.error("Evite palavrões no comentário.");
      return;
    }
    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      user_id: user.id,
      content,
    });
    if (error) {
      toast.error("Não consegui comentar.");
      return;
    }
    setCommentDraft((prev) => ({ ...prev, [post.id]: "" }));
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, comments_count: p.comments_count + 1 } : p)),
    );
    void loadComments(post.id);
  }

  async function reportPost(post: Post) {
    if (!user) {
      toast.error("Entre na sua conta para denunciar.");
      return;
    }
    const reason = window.prompt("Por que está denunciando este post?", "Conteúdo inadequado");
    if (!reason || !reason.trim()) return;
    const { error } = await supabase
      .from("post_reports")
      .insert({ post_id: post.id, reporter_id: user.id, reason: reason.trim() });
    if (error) {
      if (error.code === "23505") toast.info("Você já denunciou este post.");
      else toast.error("Não consegui enviar a denúncia.");
      return;
    }
    toast.success("Denúncia enviada. Obrigado por avisar.");
  }

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-8">
      {/* Desktop: header global do app */}
      <div className="hidden md:block">
        <DashboardHeader
          user={user}
          bancoRoute={bancoRoute}
          bancoLabel={bancoLabel}
          onSignOut={signOut}
        />
      </div>
      {/* Mobile: header compacto com voltar */}
      <header className="md:hidden sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="container max-w-2xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Comunidade</h1>
            <p className="text-xs text-muted-foreground">Compartilhe progresso, dúvidas e dicas.</p>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        <div className="hidden md:block">
          <h1 className="text-2xl font-heading font-bold tracking-tight">Comunidade</h1>
          <p className="text-sm text-muted-foreground">Compartilhe progresso, dúvidas e dicas.</p>
        </div>
        {/* Composer */}
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3">
          <div className="flex gap-3">
            <Avatar profile={meAsProfile} size={40} />
            <Textarea
              placeholder="O que está estudando hoje? Compartilhe uma dúvida ou conquista..."
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              rows={3}
              maxLength={2000}
              className="resize-none"
            />
          </div>
          {composerMedia && (
            <div className="relative">
              <img src={composerMedia} alt="" className="rounded-lg max-h-60 w-full object-cover" />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => setComposerMedia("")}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFileSelected(f);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
              className="text-muted-foreground"
            >
              {uploadingMedia ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4 mr-1" />
              )}
              {uploadingMedia ? "Enviando..." : composerMedia ? "Trocar imagem" : "Adicionar imagem"}
            </Button>
            <Button
              size="sm"
              onClick={submitPost}
              disabled={posting || !composer.trim()}
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Publicar
            </Button>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhum post ainda</p>
              <p className="text-xs text-muted-foreground mt-1">
                Conte uma conquista, tire uma dúvida ou compartilhe um macete.
                Quem começa primeiro também ajuda a galera.
              </p>
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3">
              <div className="flex items-center gap-3">
                {post.profile?.username ? (
                  <Link to={`/u/${post.profile.username}`} className="flex items-center gap-3 hover:opacity-80">
                    <Avatar profile={post.profile} />
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {post.profile?.display_name || post.profile?.username || "Estudante"}
                      </p>
                      <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar profile={post.profile} />
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {post.profile?.display_name || "Estudante"}
                      </p>
                      <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
                    </div>
                  </div>
                )}
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {user && post.user_id !== user.id && (
                        <DropdownMenuItem onClick={() => reportPost(post)} className="text-destructive">
                          <Flag className="w-4 h-4 mr-2" /> Denunciar
                        </DropdownMenuItem>
                      )}
                      {user && post.user_id === user.id && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={async () => {
                            if (!window.confirm("Apagar este post?")) return;
                            const { error } = await supabase.from("posts").delete().eq("id", post.id);
                            if (error) toast.error("Não consegui apagar.");
                            else {
                              toast.success("Post apagado.");
                              setPosts((prev) => prev.filter((p) => p.id !== post.id));
                            }
                          }}
                        >
                          <X className="w-4 h-4 mr-2" /> Apagar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
              {post.media_url && (
                <img
                  src={post.media_url}
                  alt=""
                  className="rounded-xl w-full max-h-[420px] object-cover border border-border"
                  loading="lazy"
                />
              )}
              <div className="flex items-center gap-1 text-muted-foreground border-t border-border pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLike(post)}
                  className={post.liked_by_me ? "text-red-500" : ""}
                >
                  <Heart className={`w-4 h-4 mr-1 ${post.liked_by_me ? "fill-current" : ""}`} />
                  {post.likes_count}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleComments(post)}>
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {post.comments_count}
                </Button>
              </div>
              {openComments[post.id] && (
                <div className="space-y-3 border-t border-border pt-3">
                  {(comments[post.id] || []).map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar profile={c.profile} size={28} />
                      <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2">
                        <p className="text-xs font-semibold leading-tight">
                          {c.profile?.display_name || c.profile?.username || "Estudante"}
                          <span className="ml-2 font-normal text-muted-foreground">{timeAgo(c.created_at)}</span>
                        </p>
                        <p className="text-sm leading-snug whitespace-pre-wrap mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Comente..."
                      value={commentDraft[post.id] || ""}
                      onChange={(e) => setCommentDraft((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void submitComment(post);
                        }
                      }}
                      className="h-9"
                    />
                    <Button size="sm" onClick={() => submitComment(post)} disabled={!(commentDraft[post.id] || "").trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}