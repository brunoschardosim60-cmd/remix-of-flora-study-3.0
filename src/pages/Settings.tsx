import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomThemeDialog } from "@/components/CustomThemeDialog";
import { DashboardCustomizer } from "@/components/DashboardCustomizer";
import { TwoFactorPanel } from "@/components/TwoFactorPanel";
import { Sun, Moon, CircleDot, LogOut, ArrowLeft, Shield, User, Target, Sparkles, Bell, BellOff, Loader2, Save, LayoutDashboard, Calendar, Download, FileDown, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Globe, Copy } from "lucide-react";
import { toast } from "sonner";
import { getMyTier, getMyQuota, type AITier } from "@/lib/aiUsage";

const TIER_LABEL: Record<AITier, string> = { free: "Free", pro: "Pro", pro_plus: "Pro+" };

const OBJECTIVES = [
  { value: "enem", label: "ENEM" },
  { value: "vestibular", label: "Vestibular" },
  { value: "concurso", label: "Concurso" },
  { value: "faculdade", label: "Faculdade" },
  { value: "aprender", label: "Aprender por conta" },
];

const BANCAS = [
  { value: "cespe", label: "CESPE/Cebraspe" },
  { value: "fcc", label: "FCC" },
  { value: "vunesp", label: "Vunesp" },
  { value: "fgv", label: "FGV" },
  { value: "outras", label: "Outras" },
];

export default function Settings() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Public profile
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [savingPublic, setSavingPublic] = useState(false);

  // Onboarding
  const [objetivo, setObjetivo] = useState("");
  const [metaResultado, setMetaResultado] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [banca, setBanca] = useState("");
  const [cargo, setCargo] = useState("");
  const [orgao, setOrgao] = useState("");

  // Quota
  const [tier, setTier] = useState<AITier>("free");
  const [quotas, setQuotas] = useState<{ action: string; used: number; limit: number }[]>([]);

  // Notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

  const themes = [
    { id: "light" as const, label: "Claro", icon: Sun },
    { id: "dark" as const, label: "Escuro", icon: Moon },
    { id: "black" as const, label: "Preto", icon: CircleDot },
  ];

  // Load profile + onboarding + quota
  useEffect(() => {
    if (!user) return;
    // Profile
    supabase.from("profiles").select("display_name, username, bio, is_public").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        if ((data as any)?.username) setUsername((data as any).username);
        if ((data as any)?.bio) setBio((data as any).bio);
        if ((data as any)?.is_public) setIsPublic(Boolean((data as any).is_public));
      });
    // Onboarding
    supabase.from("student_onboarding").select("objetivo,meta_resultado,banca,cargo,orgao").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.objetivo) setObjetivo(data.objetivo);
        if (data?.meta_resultado) setMetaResultado(data.meta_resultado);
        if ((data as any)?.banca) setBanca((data as any).banca);
        if ((data as any)?.cargo) setCargo((data as any).cargo);
        if ((data as any)?.orgao) setOrgao((data as any).orgao);
      });
    // Quota
    (async () => {
      const t = await getMyTier();
      setTier(t);
      const actions = ["chat", "quiz", "essay_correction", "solve_math"];
      const results = await Promise.all(actions.map(a => getMyQuota(a)));
      setQuotas(results.filter(Boolean).map((q, i) => ({
        action: actions[i],
        used: q!.used,
        limit: q!.limit,
      })));
    })();
    // Notifications
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, [user]);

  async function handleSaveProfile() {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
      if (error) throw error;
      toast.success("Nome atualizado.");
    } catch {
      toast.error("Erro ao salvar nome.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePublic() {
    if (!user) return;
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (isPublic && !cleanUsername) {
      toast.error("Defina um username para tornar seu perfil público.");
      return;
    }
    if (cleanUsername && cleanUsername.length < 3) {
      toast.error("Username precisa ter no mínimo 3 caracteres.");
      return;
    }
    setSavingPublic(true);
    try {
      const { error } = await supabase.from("profiles").update({
        username: cleanUsername || null,
        bio: bio.trim() || null,
        is_public: isPublic,
      }).eq("id", user.id);
      if (error) {
        if (String(error.message).includes("duplicate") || String((error as any).code) === "23505") {
          toast.error("Esse username já está em uso.");
        } else {
          throw error;
        }
        return;
      }
      setUsername(cleanUsername);
      toast.success(isPublic ? "Perfil público atualizado." : "Perfil salvo.");
    } catch {
      toast.error("Erro ao salvar perfil público.");
    } finally {
      setSavingPublic(false);
    }
  }

  function copyPublicUrl() {
    if (!username) return;
    const url = `${window.location.origin}/u/${username}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copiado!"));
  }

  async function handleSaveGoal() {
    if (!user) return;
    setSavingGoal(true);
    try {
      const isConcurso = objetivo === "concurso";
      const { error } = await supabase.from("student_onboarding").upsert({
        user_id: user.id,
        objetivo,
        meta_resultado: metaResultado,
        banca: isConcurso ? banca : "",
        cargo: isConcurso ? cargo : "",
        orgao: isConcurso ? orgao : "",
        completed: true,
      } as any);
      if (error) throw error;
      toast.success("Objetivo atualizado. A Flora vai se adaptar.");
    } catch {
      toast.error("Erro ao salvar objetivo.");
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleRequestNotifications() {
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") {
      toast.success("Notificações ativadas! Você receberá lembretes de revisão.");
    } else {
      toast.info("Permissão negada. Você pode alterar nas configurações do navegador.");
    }
  }

  function handleExportCalendar() {
    const now = new Date();
    const events = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      d.setHours(9 + i * 2, 0, 0, 0);
      const end = new Date(d.getTime() + 60 * 60000);
      const fmt = (x: Date) => x.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      return [
        "BEGIN:VEVENT",
        `DTSTART:${fmt(d)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:📚 Sessão ${i + 1} - Flora Study`,
        `UID:flora-${i}-${Date.now()}@flora-study.app`,
        "END:VEVENT",
      ].join("\r\n");
    }).join("\r\n");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Flora Study//PT",
      "X-WR-CALNAME:Flora Study",
      events,
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flora-study.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Cronograma exportado! Importe o .ics no seu calendário.");
  }

  const ACTION_LABELS: Record<string, string> = {
    chat: "Chat Flora",
    quiz: "Quiz",
    essay_correction: "Correção de redação",
    solve_math: "Resolver matemática",
  };

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-6">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-heading font-bold text-lg">Configurações</h1>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-3 sm:px-4 py-6 space-y-6">
        {/* Profile */}
        {user && (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <h2 className="font-heading font-semibold text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Perfil
            </h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome de exibição</label>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome..."
                  className="flex-1"
                />
                <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Conta: {user.email}</p>
          </section>
        )}

        {/* Public profile */}
        {user && (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Perfil público
              </h2>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <p className="text-xs text-muted-foreground">
              Quando ativo, qualquer pessoa pode ver seu nome, bio e estatísticas (nível, XP, sequência e horas).
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground text-sm">@</span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="seu_username"
                  maxLength={24}
                  className="flex-1"
                />
              </div>
              {username && (
                <button type="button" onClick={copyPublicUrl} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                  <Copy className="w-3 h-3" /> {window.location.origin}/u/{username}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Estudando para o ENEM 2026..."
                maxLength={160}
              />
            </div>
            <Button onClick={handleSavePublic} disabled={savingPublic} size="sm" className="w-full sm:w-auto">
              {savingPublic ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar perfil público
            </Button>
          </section>
        )}

        {/* 2FA */}
        {user && <TwoFactorPanel />}

        {/* Objetivo */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <h2 className="font-heading font-semibold text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Objetivo de estudo
          </h2>
          <div className="flex flex-wrap gap-2">
            {OBJECTIVES.map((obj) => (
              <button
                key={obj.value}
                onClick={() => setObjetivo(obj.value)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  objetivo === obj.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
              >
                {obj.label}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Meta</label>
            <Input
              value={metaResultado}
              onChange={(e) => setMetaResultado(e.target.value)}
              placeholder="Ex: Nota 900 no ENEM, Passar em Medicina..."
            />
          </div>

          {objetivo === "concurso" && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Concurso alvo</p>
              <div className="space-y-1">
                <label className="text-sm font-medium">Banca</label>
                <div className="flex flex-wrap gap-2">
                  {BANCAS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => setBanca(b.value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        banca === b.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Cargo</label>
                <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Auditor Fiscal" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Órgão</label>
                <Input value={orgao} onChange={(e) => setOrgao(e.target.value)} placeholder="Ex: Receita Federal" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Trocar a banca aqui recalibra todos os quizzes, simulados e correções de redação a partir da próxima geração.
              </p>
            </div>
          )}

          <Button onClick={handleSaveGoal} disabled={savingGoal || !objetivo} size="sm" className="gap-1.5">
            {savingGoal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar objetivo
          </Button>
        </section>

        {/* Theme */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <h2 className="font-heading font-semibold text-base">Tema</h2>
          <div className="flex gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-sm font-medium ${
                  theme === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
              >
                <t.icon className="w-5 h-5" />
                {t.label}
              </button>
            ))}
          </div>
          <div className="pt-2">
            <CustomThemeDialog />
          </div>
        </section>

        {/* Quota */}
        {(() => {
          const totalUsed = quotas.reduce((s, q) => s + q.used, 0);
          const totalLimit = quotas.reduce((s, q) => s + q.limit, 0);
          const pct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
          const barColor = pct >= 90 ? "bg-destructive" : pct >= 60 ? "bg-yellow-500" : "bg-primary";
          return (
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
              <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Uso de IA hoje
                <Badge variant="secondary" className="text-xs">{TIER_LABEL[tier]}</Badge>
              </h2>
              {quotas.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{totalUsed} de {totalLimit} ações</span>
                    <span className={pct >= 90 ? "text-destructive font-semibold" : "text-foreground font-medium"}>{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                    {quotas.map((q) => (
                      <span key={q.action}>
                        {ACTION_LABELS[q.action] || q.action}: {q.used}/{q.limit}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              )}
            </section>
          );
        })()}

        {/* Notifications */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
          <h2 className="font-heading font-semibold text-base flex items-center gap-2">
            {notifPermission === "granted" ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            Notificações
          </h2>
          {notifPermission === "granted" ? (
            <p className="text-sm text-muted-foreground">
              ✅ Notificações ativadas. Você receberá lembretes de revisão e alarmes do timer.
            </p>
          ) : notifPermission === "denied" ? (
            <p className="text-sm text-muted-foreground">
              ❌ Notificações bloqueadas. Para ativar, acesse as configurações do navegador e permita notificações para este site.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ative notificações para receber lembretes de revisão, alarmes do timer e dicas da Flora.
              </p>
              <Button onClick={handleRequestNotifications} variant="outline" size="sm" className="gap-1.5">
                <Bell className="w-4 h-4" /> Ativar notificações
              </Button>
            </div>
          )}
        </section>


        {/* Personalizar Dashboard */}
        {user && (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <h2 className="font-heading font-semibold text-base flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-primary" /> Personalizar Dashboard
            </h2>
            <p className="text-xs text-muted-foreground">
              Escolha quais seções aparecem no seu dashboard.
            </p>
            <DashboardCustomizer />
          </section>
        )}

        {/* Integração com Calendário */}
        {user && (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-heading font-semibold text-base">Calendário</h2>
                  <p className="text-xs text-muted-foreground">Exportar cronograma como .ics</p>
                </div>
              </div>
              <Button onClick={handleExportCalendar} size="sm" variant="outline" className="gap-1.5">
                <Download className="w-4 h-4" />
                Exportar .ics
              </Button>
            </div>
          </section>
        )}

        {/* Admin */}
        {isAdmin && (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/admin")}>
              <Shield className="w-4 h-4" /> Painel Admin
            </Button>
          </section>
        )}

        {/* Logout */}
        {user && (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <Button variant="destructive" className="w-full gap-2" onClick={signOut}>
              <LogOut className="w-4 h-4" /> Sair da conta
            </Button>
          </section>
        )}

        {/* LGPD: Export & Delete */}
        {user && <LgpdSection />}
      </main>
    </div>
  );
}

function LgpdSection() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Faça login novamente."); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/account-data`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studyflow-dados-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dados exportados!");
    } catch (e: any) {
      toast.error("Erro ao exportar: " + (e?.message ?? ""));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    const txt = prompt('Esta ação é IRREVERSÍVEL. Todos os seus dados serão apagados.\n\nDigite "EXCLUIR" para confirmar:');
    if (txt !== "EXCLUIR") return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Faça login novamente."); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/account-data`,
        { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success("Conta excluída. Até logo.");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e?.message ?? ""));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
      <h2 className="font-heading font-semibold text-base flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" /> Privacidade (LGPD)
      </h2>
      <p className="text-xs text-muted-foreground">
        Você pode baixar todos os seus dados ou excluir sua conta a qualquer momento.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleExport} disabled={exporting} variant="outline" size="sm" className="gap-1.5">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Baixar meus dados (.json)
        </Button>
        <Button onClick={handleDelete} disabled={deleting} variant="destructive" size="sm" className="gap-1.5">
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Excluir minha conta
        </Button>
      </div>
    </section>
  );
}
