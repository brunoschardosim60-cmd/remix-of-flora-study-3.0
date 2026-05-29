import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, BookOpen, Trophy, Target, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Objetivo = "enem" | "vestibular" | "concurso" | "faculdade" | "aprender";

const OBJECTIVES = [
  { value: "enem",       label: "ENEM",              emoji: "📝", desc: "Vestibular nacional" },
  { value: "vestibular", label: "Vestibular",         emoji: "🎓", desc: "FUVEST, UNICAMP..." },
  { value: "concurso",   label: "Concurso público",   emoji: "⚖️",  desc: "Federal, estadual, municipal" },
  { value: "faculdade",  label: "Faculdade",           emoji: "📚", desc: "Matérias do curso" },
  { value: "aprender",   label: "Aprender por conta", emoji: "🧠", desc: "Sem prova específica" },
] as const;

// Nova estrutura de perguntas
const QUESTIONS = [
  { id: "data_prova", label: "Data da prova", type: "date" },
  { id: "horas_disponiveis", label: "Horas por dia", type: "number" },
  { id: "nivel_atual", label: "Nível atual", type: "select", options: ["Iniciante", "Intermediário", "Avançado"] },
  { id: "conteudo_estudado", label: "Conteúdo já estudado", type: "text" },
  { id: "turno_preferido", label: "Turno preferido", type: "select", options: ["Manhã", "Tarde", "Noite", "Madrugada"] },
  { id: "objetivos_livre", label: "Objetivo detalhado", type: "textarea" },
] as const;

const ENEM_SUBJECTS = [
  "Matemática", "Português", "Redação", "Biologia", "Física",
  "Química", "História", "Geografia", "Filosofia", "Sociologia", "Inglês",
];
const CONCURSO_SUBJECTS = [
  "Direito Constitucional", "Direito Administrativo", "Português",
  "Raciocínio Lógico", "Matemática", "Informática", "Atualidades",
  "Direito Tributário", "Administração Pública", "Contabilidade",
];

const BANCAS = [
  { value: "cespe", label: "CESPE" },
  { value: "fcc",   label: "FCC" },
  { value: "fgv",   label: "FGV" },
  { value: "vunesp",label: "Vunesp" },
  { value: "outras",label: "Outra" },
];

// ─── Componente ──────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Dados
  const [objetivo, setObjetivo] = useState<Objetivo | "">("");
  const [banca, setBanca] = useState("");
  const [cargo, setCargo] = useState("");
  const [materiasDificeis, setMateriasDificeis] = useState<string[]>([]);
  const [metaResultado, setMetaResultado] = useState("");
  const [dataProva, setDataProva] = useState("");
  const [horasDisponiveis, setHorasDisponiveis] = useState("4");
  const [nivelAtual, setNivelAtual] = useState("Iniciante");
  const [conteudoEstudado, setConteudoEstudado] = useState("");
  const [turnoPreferido, setTurnoPreferido] = useState("Manhã");
  const [objetivosLivre, setObjetivosLivre] = useState("");

  const isConcurso = objetivo === "concurso";
  const subjects = isConcurso ? CONCURSO_SUBJECTS : ENEM_SUBJECTS;

  // Redirect if already completed
  useEffect(() => {
    if (!user) return;
    supabase.from("student_onboarding").select("completed").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.completed) navigate("/"); });
  }, [user, navigate]);

  const toggleMateria = (m: string) => {
    setMateriasDificeis((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const canNext = () => {
    if (step === 0) return !!objetivo && (!isConcurso || !!banca);
    if (step === 1) return materiasDificeis.length > 0;
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        objetivo: objetivo || "aprender",
        banca: isConcurso ? banca : "",
        cargo: isConcurso ? cargo.trim() : "",
        orgao: "",
        tempo_disponivel_min: (parseInt(horasDisponiveis) || 4) * 60,
        data_prova: dataProva || null,
        horas_disponiveis: parseInt(horasDisponiveis) || 4,
        nivel_atual: nivelAtual || "Iniciante",
        conteudo_estudado: (conteudoEstudado || "").trim(),
        turno_preferido: turnoPreferido || "Manhã",
        objetivos_livre: (objetivosLivre || "").trim(),
        materias_dificeis: materiasDificeis && materiasDificeis.length > 0 ? materiasDificeis : [],
        rotina: (turnoPreferido || "Manhã").toLowerCase(),
        meta_resultado: (metaResultado || objetivosLivre || `Passar em ${objetivo === "enem" ? "ENEM" : objetivo}`).trim() || "Estudar",
        completed: true,
      };
      
      console.log("Onboarding payload:", payload);
      const { error } = await supabase.from("student_onboarding").upsert(payload as any);
      if (error) throw error;

      // Gera plano em background
      supabase.functions.invoke("flora-engine", {
        body: { action: "generate_initial_plan", userId: user.id },
      }).catch(() => {});

      setDone(true);
      setTimeout(() => navigate("/"), 2200);
    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error(err?.message || "Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Tela de conclusão ───────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Tudo pronto!</h1>
          <p className="text-muted-foreground">A Flora está montando seu plano de estudos...</p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-4" />
        </motion.div>
      </div>
    );
  }

  const TOTAL = 5;
  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-muted w-full">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ─── Step 0: Objetivo ────────────────────────────────────── */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Target className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Qual é seu objetivo?</h1>
                <p className="text-muted-foreground text-sm">A Flora vai personalizar tudo pra você</p>
              </div>

              <div className="space-y-2">
                {OBJECTIVES.map((obj) => (
                  <button
                    key={obj.value}
                    onClick={() => setObjetivo(obj.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      objetivo === obj.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-2xl">{obj.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{obj.label}</p>
                      <p className="text-xs text-muted-foreground">{obj.desc}</p>
                    </div>
                    {objetivo === obj.value && (
                      <Check className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {isConcurso && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  <p className="text-sm font-medium">Qual banca?</p>
                  <div className="flex flex-wrap gap-2">
                    {BANCAS.map((b) => (
                      <button
                        key={b.value}
                        onClick={() => setBanca(b.value)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                          banca === b.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Cargo (ex: Analista Tributário)"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="mt-1"
                  />
                </motion.div>
              )}

              <Button
                className="w-full h-12 text-base font-bold gap-2"
                disabled={!canNext()}
                onClick={() => setStep(1)}
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* ─── Step 1: Matérias difíceis ───────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto">
                  <BookOpen className="w-7 h-7 text-orange-500" />
                </div>
                <h1 className="text-2xl font-bold">Onde você trava?</h1>
                <p className="text-muted-foreground text-sm">Selecione suas matérias mais difíceis</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {subjects.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMateria(m)}
                    className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      materiasDificeis.includes(m)
                        ? "border-orange-500 bg-orange-500/10 text-orange-600"
                        : "border-border hover:border-orange-400/50 text-muted-foreground"
                    }`}
                  >
                    {materiasDificeis.includes(m) && "✓ "}{m}
                  </button>
                ))}
              </div>

              {materiasDificeis.length > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {materiasDificeis.length} matéria{materiasDificeis.length > 1 ? "s" : ""} selecionada{materiasDificeis.length > 1 ? "s" : ""}
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(0)}>
                  Voltar
                </Button>
                <Button
                  className="flex-1 h-12 font-bold gap-2"
                  disabled={!canNext()}
                  onClick={() => setStep(2)}
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Rotina e Detalhes ────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7 text-blue-500" />
                </div>
                <h1 className="text-2xl font-bold">Sua rotina</h1>
                <p className="text-muted-foreground text-sm">Organize seu tempo de estudo</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data da prova (se houver)</label>
                  <Input type="date" value={dataProva} onChange={(e) => setDataProva(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horas disponíveis por dia</label>
                  <Input type="number" min="1" max="24" value={horasDisponiveis} onChange={(e) => setHorasDisponiveis(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turno preferido</label>
                  <div className="flex flex-wrap gap-2">
                    {["Manhã", "Tarde", "Noite", "Madrugada"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTurnoPreferido(t)}
                        className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                          turnoPreferido === t
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button className="flex-1 h-12 font-bold gap-2" onClick={() => setStep(3)}>
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Experiência ─────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
                  <Target className="w-7 h-7 text-purple-500" />
                </div>
                <h1 className="text-2xl font-bold">Sua experiência</h1>
                <p className="text-muted-foreground text-sm">Onde você está hoje?</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nível atual</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Iniciante", "Intermediário", "Avançado"].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNivelAtual(n)}
                        className={`px-2 py-2 rounded-xl border text-xs font-medium transition-all ${
                          nivelAtual === n
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Conteúdo já estudado</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Ex: Já vi toda a base de matemática..."
                    value={conteudoEstudado}
                    onChange={(e) => setConteudoEstudado(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button className="flex-1 h-12 font-bold gap-2" onClick={() => setStep(4)}>
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 4: Meta Final ──────────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto">
                  <Trophy className="w-7 h-7 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-bold">Seu Objetivo</h1>
                <p className="text-muted-foreground text-sm">A Flora vai focar nisso</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sua meta principal</label>
                  <Input
                    placeholder="Ex: Passar em Medicina na USP"
                    value={metaResultado}
                    onChange={(e) => setMetaResultado(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Objetivos adicionais (livre)</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Algo mais que a Flora deve saber?"
                    value={objetivosLivre}
                    onChange={(e) => setObjetivosLivre(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(3)}>
                  Voltar
                </Button>
                <Button
                  className="flex-1 h-12 font-bold gap-2"
                  onClick={handleFinish}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Finalizar</>}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Step indicators */}
      <div className="pb-8 flex justify-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/50" : "w-3 bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
