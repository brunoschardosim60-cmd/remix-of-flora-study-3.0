import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloraIcon } from "@/components/FloraIcon";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Target,
  Clock,
  BookOpen,
  Briefcase,
  GraduationCap,
  Trophy,
  Check,
  Crosshair,
  Building2,
  FileText,
  Lightbulb,
  Zap,
  Sun,
  Flame,
  Dumbbell,
  Rocket,
  Award,
  Scale,
  BookMarked,
  Moon,
  ShieldCheck,
  Calendar,
  Landmark,
} from "lucide-react";
import { toast } from "sonner";
import { CONCURSO_SUBJECTS, ENEM_SUBJECTS, type Subject } from "@/lib/studyData";
import { useTheme } from "next-themes";

/* ─── Data ─── */
const OBJECTIVES = [
  { value: "enem", label: "ENEM", icon: Crosshair, desc: "Vestibular nacional unificado" },
  { value: "vestibular", label: "Vestibular", icon: Building2, desc: "Universidade específica" },
  { value: "concurso", label: "Concurso", icon: FileText, desc: "Concurso público" },
  { value: "faculdade", label: "Faculdade", icon: GraduationCap, desc: "Graduação em andamento" },
  { value: "aprender", label: "Aprender", icon: Lightbulb, desc: "Estudo por curiosidade" },
];

const TIME_OPTIONS = [
  { value: 30, label: "30 min", icon: Zap, desc: "Sessões rápidas" },
  { value: 60, label: "1 hora", icon: Sun, desc: "Ritmo equilibrado" },
  { value: 120, label: "2 horas", icon: Flame, desc: "Estudo consistente" },
  { value: 180, label: "3 horas", icon: Dumbbell, desc: "Preparação forte" },
  { value: 240, label: "4 horas", icon: Rocket, desc: "Dedicação intensa" },
  { value: 360, label: "6h+", icon: Award, desc: "Imersão total" },
];

const ROUTINES = [
  { value: "flexivel", label: "Rotina flexível", icon: BookMarked, desc: "Estudo quando dá, sem horário fixo" },
  { value: "equilibrada", label: "Equilibrada", icon: Scale, desc: "Alguns horários fixos, outros livres" },
  { value: "fixa", label: "Rotina fixa", icon: Calendar, desc: "Estudo nos mesmos horários todo dia" },
];

const BANCAS = [
  { value: "cespe", label: "CESPE/Cebraspe", desc: "Estilo certo/errado, foco em literalidade" },
  { value: "fcc", label: "FCC", desc: "Múltipla escolha, questões diretas" },
  { value: "vunesp", label: "Vunesp", desc: "Equilíbrio entre teoria e interpretação" },
  { value: "fgv", label: "FGV", desc: "Questões analíticas e contextualizadas" },
  { value: "outras", label: "Outras", desc: "IBFC, Quadrix, IBADE e outras" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showWelcome, setShowWelcome] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [planReady, setPlanReady] = useState<null | {
    materias: string[];
    slots: number;
    primeiroTopico?: string;
  }>(null);
  const [contentVisible, setContentVisible] = useState(false);

  const [objetivo, setObjetivo] = useState("");
  const [banca, setBanca] = useState("");
  const [bancaOutra, setBancaOutra] = useState("");
  const [tempoDisponivel, setTempoDisponivel] = useState(0);
  const [materiasDificeis, setMateriasDificeis] = useState<Subject[]>([]);
  const [rotina, setRotina] = useState("");
  const [metaResultado, setMetaResultado] = useState("");
  const [cargo, setCargo] = useState("");
  const [orgao, setOrgao] = useState("");

  // Steps dinâmicos: insere "Banca" quando objetivo === concurso
  const isConcurso = objetivo === "concurso";
  const stepKeys = isConcurso
    ? ["objetivo", "banca", "cargo", "tempo", "materias", "rotina", "meta", "resumo"] as const
    : ["objetivo", "tempo", "materias", "rotina", "meta", "resumo"] as const;
  type StepKey = typeof stepKeys[number];
  const currentKey: StepKey = stepKeys[Math.min(step, stepKeys.length - 1)];
  const TOTAL_STEPS = stepKeys.length;
  const stepIconMap: Record<StepKey, typeof Crosshair> = {
    objetivo: Crosshair,
    banca: Landmark,
    cargo: Briefcase,
    tempo: Clock,
    materias: BookOpen,
    rotina: Calendar,
    meta: Trophy,
    resumo: Rocket,
  };

  // Lista de matérias mostrada no step "matérias" — depende do objetivo
  const subjectsForStep: Subject[] = isConcurso ? CONCURSO_SUBJECTS : ENEM_SUBJECTS;

  // Quando troca o objetivo, limpa matérias que não pertencem ao novo conjunto
  useEffect(() => {
    setMateriasDificeis((prev) => prev.filter((m) => subjectsForStep.includes(m)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConcurso]);

  useEffect(() => {
    setContentVisible(false);
    const t = setTimeout(() => setContentVisible(true), 200);
    return () => clearTimeout(t);
  }, [step]);

  const toggleMateria = (m: Subject) => {
    setMateriasDificeis((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const canNext = useCallback(() => {
    if (currentKey === "objetivo") return !!objetivo;
    if (currentKey === "banca") return !!banca && (banca !== "outras" || bancaOutra.trim().length > 1);
    if (currentKey === "cargo") return cargo.trim().length > 1; // órgão é opcional
    if (currentKey === "tempo") return tempoDisponivel > 0;
    if (currentKey === "materias") return materiasDificeis.length > 0;
    if (currentKey === "rotina") return !!rotina;
    if (currentKey === "meta") return !!metaResultado;
    return true;
  }, [currentKey, objetivo, banca, bancaOutra, cargo, tempoDisponivel, materiasDificeis, rotina, metaResultado]);

  const goNext = () => {
    if (!canNext()) return;
    setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  const handleFinish = async () => {
    if (!user) {
      toast.error("Você precisa estar logado.");
      return;
    }
    setLoading(true);
    setFinishing(true);

    try {
      const bancaFinal = isConcurso
        ? (banca === "outras" ? bancaOutra.trim() : banca)
        : "";
      const { error } = await supabase.from("student_onboarding").upsert({
        user_id: user.id,
        objetivo,
        banca: bancaFinal,
        cargo: isConcurso ? cargo.trim() : "",
        orgao: isConcurso ? orgao.trim() : "",
        tempo_disponivel_min: tempoDisponivel,
        materias_dificeis: materiasDificeis,
        rotina,
        meta_resultado: metaResultado,
        completed: true,
      } as any);

      if (error) throw error;

      try {
        const { data: planData } = await supabase.functions.invoke("flora-engine", {
          body: { action: "generate_initial_plan", userId: user.id },
        });
        // Extrai resumo do plano para a tela final.
        const plan = (planData as any)?.plan ?? planData;
        const slots = Array.isArray(plan?.slots) ? plan.slots : [];
        const materias = Array.from(new Set(slots.map((s: any) => s?.materia).filter(Boolean))) as string[];
        const primeiroTopico = slots[0]?.tema || slots[0]?.topico || undefined;
        setPlanReady({ materias, slots: slots.length, primeiroTopico });
        return; // não redireciona; mostra resumo
      } catch {
        // Non-critical
      }

      setTimeout(() => navigate("/"), 3500);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar dados. Tente novamente.");
      setFinishing(false);
      setLoading(false);
    }
  };

  const isDark = theme === "dark" || theme === "black";

  /* ─── Theme toggle (discrete) ─── */
  const ThemeToggle = () => (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="absolute top-4 right-4 z-20 p-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
      title={isDark ? "Modo claro" : "Modo escuro premium"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );

  /* ─── Finishing screen ─── */
  if (finishing) {
    if (planReady) {
      const _objetivoLabel = OBJECTIVES.find((o) => o.value === objetivo)?.label;
      const _bancaLabel = banca === "outras" ? bancaOutra : BANCAS.find((b) => b.value === banca)?.label;
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[hsl(var(--background))] px-6">
          <ThemeToggle />
          <div className="w-full max-w-md flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary))] flex items-center justify-center shadow-lg">
              <FloraIcon className="w-8 h-8 text-[hsl(var(--primary-foreground))]" />
            </div>
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] font-['Space_Grotesk']">
                Seu plano está pronto
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                A Flora montou um cronograma calibrado pra {_objetivoLabel || "você"}{isConcurso && _bancaLabel ? ` (${_bancaLabel})` : ""}.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Sessões na semana</span>
                <span className="font-semibold text-[hsl(var(--foreground))]">{planReady.slots}</span>
              </div>
              {planReady.materias.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Matérias priorizadas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {planReady.materias.slice(0, 8).map((m) => (
                      <span key={m} className="text-[11px] px-2 py-1 rounded-md bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {planReady.primeiroTopico && (
                <div className="text-xs text-[hsl(var(--muted-foreground))] pt-2 border-t border-[hsl(var(--border))]">
                  Primeiro tópico: <span className="font-medium text-[hsl(var(--foreground))]">{planReady.primeiroTopico}</span>
                </div>
              )}
            </div>
            <Button
              onClick={() => navigate("/")}
              className="w-full h-12 rounded-xl text-base font-semibold"
            >
              Começar a estudar
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[hsl(var(--background))]">
        <ThemeToggle />
        <div className="flex flex-col items-center gap-8">
          <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--primary))] flex items-center justify-center onboarding-float shadow-lg">
            <FloraIcon className="w-10 h-10 text-[hsl(var(--primary-foreground))]" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] font-['Space_Grotesk']">
              Montando seu plano
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xs">
              A Flora está analisando seu perfil e criando um cronograma personalizado
            </p>
          </div>
          <div className="w-56 space-y-2">
            <div className="h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
              <div className="h-full bg-[hsl(var(--primary))] rounded-full onboarding-progress-bar" />
            </div>
            <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))] font-medium tracking-wider uppercase">
              <span>Analisando</span>
              <span>Gerando plano</span>
            </div>
          </div>
        </div>
      </div>
    );
  }


  /* ─── Step content ─── */
  const StepIcon = stepIconMap[currentKey];
  const objetivoLabel = OBJECTIVES.find((o) => o.value === objetivo)?.label;
  const bancaLabel = banca === "outras" ? bancaOutra : BANCAS.find((b) => b.value === banca)?.label;
  const tempoLabel = TIME_OPTIONS.find((t) => t.value === tempoDisponivel)?.label;
  const rotinaLabel = ROUTINES.find((r) => r.value === rotina)?.label;

  return (
    <div className="fixed inset-0 flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      <ThemeToggle />

      {/* Progress bar */}
      <div className="shrink-0 px-6 pt-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-1.5 mb-2">
            {stepKeys.map((_, i) => (
              <div key={i} className="flex-1 flex items-center">
                <div
                  className={`h-1 w-full rounded-full transition-all duration-500 ${
                    i < step
                      ? "bg-[hsl(var(--primary))]"
                      : i === step
                      ? "bg-[hsl(var(--primary)/0.5)]"
                      : "bg-[hsl(var(--muted))]"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-6 py-6">
        <div className="w-full max-w-lg space-y-6">
          {/* Step header */}
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
              <StepIcon className="w-6 h-6 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] font-['Space_Grotesk'] leading-tight">
              {currentKey === "objetivo" && "Vamos montar seu plano de estudos."}
              {currentKey === "banca" && "Qual banca você quer focar?"}
              {currentKey === "cargo" && "Qual cargo e órgão você quer conquistar?"}
              {currentKey === "tempo" && "Quanto tempo por dia você consegue dedicar?"}
              {currentKey === "materias" && "Quais matérias precisam de mais atenção no momento?"}
              {currentKey === "rotina" && "Como é sua rotina atual?"}
              {currentKey === "meta" && "Defina sua meta de resultado."}
              {currentKey === "resumo" && "Tudo pronto para você alcançar seus objetivos!"}
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {currentKey === "objetivo" && "Qual é o seu objetivo principal?"}
              {currentKey === "banca" && "Cada banca tem um estilo. A Flora ajusta as questões e o plano de acordo."}
              {currentKey === "cargo" && "Isso ajuda a Flora a priorizar disciplinas, temas e o estilo de prova."}
              {currentKey === "tempo" && "Seja realista. Você pode ajustar depois."}
              {currentKey === "materias" && (isConcurso
                ? "Selecione as matérias do seu edital que você sente mais dificuldade."
                : "Selecione quantas quiser.")}
              {currentKey === "rotina" && "Isso nos ajuda a montar um plano que funcione pra você."}
              {currentKey === "meta" && (isConcurso
                ? "Ex: passar entre os 50 primeiros, gabaritar Direito Constitucional…"
                : "Quanto mais específica, melhor o plano da Flora.")}
              {currentKey === "resumo" && "Com base nas suas respostas, vamos criar um plano personalizado e inteligente."}
            </p>
          </div>

          {/* Step content */}
          <div
            className={`transition-all duration-400 ease-out ${
              contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {/* Step 0 — Objective */}
            {currentKey === "objetivo" && (
              <div className="space-y-2.5">
                {OBJECTIVES.map((obj) => {
                  const Icon = obj.icon;
                  const selected = objetivo === obj.value;
                  return (
                    <button
                      key={obj.value}
                      onClick={() => {
                        setObjetivo(obj.value);
                        if (obj.value !== "concurso") { setBanca(""); setBancaOutra(""); }
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left ${
                        selected
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] shadow-sm"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.3)]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        selected
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${selected ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                          {obj.label}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{obj.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]"
                          : "border-[hsl(var(--border))]"
                      }`}>
                        {selected && <Check className="w-3 h-3 text-[hsl(var(--primary-foreground))]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step Banca — só p/ concurso */}
            {currentKey === "banca" && (
              <div className="space-y-2.5">
                {BANCAS.map((b) => {
                  const selected = banca === b.value;
                  return (
                    <button
                      key={b.value}
                      onClick={() => setBanca(b.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left ${
                        selected
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] shadow-sm"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.3)]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selected
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}>
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{b.label}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{b.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selected ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]" : "border-[hsl(var(--border))]"
                      }`}>
                        {selected && <Check className="w-3 h-3 text-[hsl(var(--primary-foreground))]" />}
                      </div>
                    </button>
                  );
                })}
                {banca === "outras" && (
                  <Input
                    placeholder="Digite o nome da banca (ex: IBFC, Quadrix...)"
                    value={bancaOutra}
                    onChange={(e) => setBancaOutra(e.target.value)}
                    className="h-12 rounded-2xl"
                    autoFocus
                  />
                )}
              </div>
            )}

            {/* Step Cargo/Órgão — só p/ concurso */}
            {currentKey === "cargo" && (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <Input
                    placeholder='Cargo (ex: "Auditor Fiscal", "Analista Judiciário")'
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="h-14 pl-[72px] text-sm rounded-2xl"
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <Input
                    placeholder='Órgão / opcional (ex: "Receita Federal", "TRT 3ª Região")'
                    value={orgao}
                    onChange={(e) => setOrgao(e.target.value)}
                    className="h-14 pl-[72px] text-sm rounded-2xl"
                  />
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
                  Apenas o cargo é obrigatório. Você pode editar depois.
                </p>
              </div>
            )}

            {/* Step 1 — Time */}
            {currentKey === "tempo" && (
              <div className="grid grid-cols-3 gap-3">
                {TIME_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = tempoDisponivel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTempoDisponivel(opt.value)}
                      className={`relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-200 ${
                        selected
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] shadow-sm"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.3)]"
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[hsl(var(--primary-foreground))]" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${
                        selected
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-sm font-bold ${selected ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 2 — Subjects */}
            {currentKey === "materias" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2.5">
                  {subjectsForStep.map((m) => {
                    const selected = materiasDificeis.includes(m);
                    return (
                      <button
                        key={m}
                        onClick={() => toggleMateria(m)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 border ${
                          selected
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--foreground))] font-semibold"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.3)]"
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />}
                        {m}
                      </button>
                    );
                  })}
                </div>
                {materiasDificeis.length > 0 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {materiasDificeis.length} matéria{materiasDificeis.length > 1 ? "s" : ""} selecionada{materiasDificeis.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}

            {/* Step 3 — Routine */}
            {currentKey === "rotina" && (
              <div className="grid grid-cols-3 gap-3">
                {ROUTINES.map((r) => {
                  const Icon = r.icon;
                  const selected = rotina === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => setRotina(r.value)}
                      className={`relative flex flex-col items-center p-5 rounded-2xl border transition-all duration-200 text-center ${
                        selected
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] shadow-sm"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.3)]"
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[hsl(var(--primary-foreground))]" />
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                        selected
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-sm font-semibold ${selected ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                        {r.label}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 leading-tight">{r.desc}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 4 — Goal */}
            {currentKey === "meta" && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <Input
                    placeholder={isConcurso
                      ? `Ex: "Passar no concurso d${orgao ? "o " + orgao : "a Receita"}", "Top 50 na lista"`
                      : 'Ex: "Medicina na USP", "Nota 900 no ENEM"'}
                    value={metaResultado}
                    onChange={(e) => setMetaResultado(e.target.value)}
                    className="h-14 pl-[72px] text-sm rounded-2xl"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
                  Quanto mais específica a meta, melhor o plano da Flora
                </p>
              </div>
            )}

            {/* Step 5 — Summary */}
            {currentKey === "resumo" && (
              <div className="space-y-5">
                {/* Summary card */}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
                  {[
                    { icon: Target, label: "Objetivo", value: objetivoLabel },
                    ...(isConcurso ? [{ icon: Landmark, label: "Banca", value: bancaLabel }] : []),
                    ...(isConcurso && cargo ? [{ icon: Briefcase, label: "Cargo", value: cargo }] : []),
                    ...(isConcurso && orgao ? [{ icon: Building2, label: "Órgão", value: orgao }] : []),
                    { icon: Clock, label: "Tempo por dia", value: tempoLabel },
                    { icon: BookOpen, label: "Matérias selecionadas", value: `${materiasDificeis.length} matérias` },
                    { icon: Scale, label: "Rotina", value: rotinaLabel },
                    { icon: Trophy, label: "Meta", value: metaResultado || "—" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-0"
                    >
                      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </div>
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.value}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
                  Você pode ajustar tudo depois.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="shrink-0 px-6 pb-6 pt-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors h-11 px-4 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          ) : <div />}
          <div className="flex-1" />
          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={goNext}
              disabled={!canNext()}
              className="h-12 px-8 rounded-2xl text-sm font-semibold gap-2 shadow-md"
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={loading}
              className="h-12 px-8 rounded-2xl text-sm font-semibold gap-2 shadow-md"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Gerar meu plano
            </Button>
          )}
        </div>
      </div>

      {/* Security badge on last step */}
      {currentKey === "resumo" && (
        <div className="shrink-0 pb-4 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Seus dados estão protegidos com segurança.</span>
        </div>
      )}
    </div>
  );
}
