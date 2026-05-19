import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User as UserIcon, Flame, Trophy, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
};

type GamiState = {
  level?: number;
  xp?: number;
  streak?: number;
  totalStudyMinutes?: number;
};

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stats, setStats] = useState<GamiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, is_public")
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();
      if (cancel) return;
      if (!p) { setNotFound(true); setLoading(false); return; }
      setProfile(p as ProfileRow);

      const { data: g } = await supabase
        .from("gamification_profiles")
        .select("state")
        .eq("user_id", (p as ProfileRow).id)
        .maybeSingle();
      if (cancel) return;
      const state = (g?.state ?? {}) as GamiState;
      setStats(state);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [username]);

  // SEO
  useEffect(() => {
    if (profile) {
      const name = profile.display_name || profile.username || "Estudante";
      document.title = `${name} · Perfil StudyFlow`;
      const desc = profile.bio || `Acompanhe o progresso de estudos de ${name} no StudyFlow.`;
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta); }
      meta.setAttribute("content", desc.slice(0, 160));
    }
  }, [profile]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (notFound || !profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6 text-center">
        <div className="space-y-3">
          <h1 className="font-heading text-2xl font-bold">Perfil não encontrado</h1>
          <p className="text-muted-foreground text-sm">Este usuário não existe ou tem perfil privado.</p>
          <Link to="/"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button></Link>
        </div>
      </div>
    );
  }

  const level = stats?.level ?? 1;
  const xp = stats?.xp ?? 0;
  const streak = stats?.streak ?? 0;
  const hours = Math.round((stats?.totalStudyMinutes ?? 0) / 60);
  const displayName = profile.display_name || profile.username || "Estudante";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-heading font-bold text-base">StudyFlow</Link>
          <Link to="/auth"><Button size="sm" variant="outline">Entrar</Button></Link>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 grid place-items-center overflow-hidden shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              : <UserIcon className="w-10 h-10 text-primary" />}
          </div>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-2xl truncate">{displayName}</h1>
            {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
            {profile.bio && <p className="text-sm mt-2 text-foreground/80">{profile.bio}</p>}
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Trophy className="w-4 h-4" />} label="Nível" value={String(level)} />
          <StatCard icon={<Sparkles className="w-4 h-4" />} label="XP" value={xp.toLocaleString("pt-BR")} />
          <StatCard icon={<Flame className="w-4 h-4" />} label="Sequência" value={`${streak}d`} />
          <StatCard icon={<UserIcon className="w-4 h-4" />} label="Horas" value={`${hours}h`} />
        </section>

        <p className="text-xs text-muted-foreground text-center">
          Crie seu perfil em <Link to="/auth" className="text-primary underline">StudyFlow</Link>.
        </p>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs mb-1">{icon}{label}</div>
      <div className="font-heading font-bold text-xl">{value}</div>
    </div>
  );
}
