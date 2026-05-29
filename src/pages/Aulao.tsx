import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Lightbulb, PenTool, Search, Loader2, Leaf, Clock, GraduationCap, FileText } from "lucide-react";

import { FloraThinkingLoader } from "@/components/FloraThinkingLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { floraGenerateLessonSkeleton, floraGenerateLessonBlock, type FloraPersonality } from "@/lib/floraClient";
import { Lesson } from "@/lib/types";
import { InteractiveLessonPlayer } from "@/components/InteractiveLessonPlayer";
import { EssayTutorMode } from "@/components/EssayTutorMode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { loadGamificationForUser, saveGamificationForUser } from "@/lib/gamificationStore";
import { ensureDailyReset, registerStudySession } from "@/lib/gamification";
import "./Aulao.css";
import { saveLesson, loadLesson, listCachedLessons, removeLesson, type LessonCacheEntry } from "@/lib/lessonCache";

type AulaoMode = "selection" | "lesson" | "essay" | "search" | "templates";

interface AulaoTopic {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  mode: "lesson" | "essay" | "search" | "templates";
  defaultLevel?: "enem" | "concurso" | "basico";
  defaultDidacticStyle?: "macetes" | "aprofundado" | "normal";
}

interface SearchResult {
  id: string;
  titulo: string;
  materia: string;
  descricao: string;
  tipo: "questao" | "resumo" | "flashcard";
}

const AULAO_TOPICS: AulaoTopic[] = [
  {
    id: "lesson-enem",
    title: "Aula Dinâmica ENEM",
    description: "Aprenda com a Flora explicando como uma professora particular. Inclui macetes e dicas de prova.",
    icon: <BookOpen size={24} />,
    mode: "lesson",
    defaultLevel: "enem",
    defaultDidacticStyle: "macetes",
  },
  {
    id: "cursos-prontos",
    title: "Aulas prontas (Cursos)",
    description: "Catálogo de aulas já preparadas pela Flora — abre na hora, sem esperar gerar.",
    icon: <GraduationCap size={24} />,
    mode: "lesson",
  },
  {
    id: "essay-enem",
    title: "Tutor de Redação ENEM",
    description: "Escreva sua redação e receba feedback em tempo real da Flora sobre estrutura, argumentação e pontuação.",
    icon: <PenTool size={24} />,
    mode: "essay",
  },
  {
    id: "search-content",
    title: "Buscar por Assunto",
    description: "Digite um tema ou matéria e a Flora vai buscar questões, resumos e recursos relacionados.",
    icon: <Search size={24} />,
    mode: "search",
  },
  {
    id: "redacao-templates",
    title: "Templates Nota 1000",
    description: "Esqueletos prontos e estruturas nota 1000 para você copiar e adaptar a qualquer tema.",
    icon: <FileText size={24} />,
    mode: "templates",
  },
];


const RECENT_LESSONS_KEY = "studyflow.aulao.recent";
interface RecentLesson { topic: string; subject: string; at: number; }
function loadRecentLessons(): RecentLesson[] {
  try {
    const raw = localStorage.getItem(RECENT_LESSONS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, 5) : [];
  } catch { return []; }
}
function pushRecentLesson(item: RecentLesson) {
  try {
    const cur = loadRecentLessons().filter(
      (r) => r.topic.toLowerCase() !== item.topic.toLowerCase()
    );
    const next = [item, ...cur].slice(0, 5);
    localStorage.setItem(RECENT_LESSONS_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export default function Aulao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<AulaoMode>("selection");
  const [selectedTopic, setSelectedTopic] = useState<AulaoTopic | null>(null);
  const [recent, setRecent] = useState<RecentLesson[]>([]);
  const [cachedLessons, setCachedLessons] = useState<LessonCacheEntry[]>([]);
  const [resumeEntry, setResumeEntry] = useState<LessonCacheEntry | null>(null);
  const lessonStartRef = useRef<number | null>(null);

  useEffect(() => {
    setRecent(loadRecentLessons());
    setCachedLessons(listCachedLessons());
  }, [mode]);

  // Lesson
  const [lessonTopicInput, setLessonTopicInput] = useState("");
  const [lessonSubjectInput, setLessonSubjectInput] = useState("");
  const [lessonMode, setLessonMode] = useState<"rapida" | "completa" | "masterclass">("completa");
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<Lesson | null>(null);
  // Streaming: índices dos blocos ainda em geração
  const [pendingBlocks, setPendingBlocks] = useState<number[]>([]);

  // Essay — input separado do tema confirmado para não pular ao digitar
  const [essayThemeInput, setEssayThemeInput] = useState("");
  const [confirmedTheme, setConfirmedTheme] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const startLesson = async (topic: AulaoTopic, customTopic: string) => {
    if (!customTopic.trim()) { toast.error("Digite um tema para gerar a aula."); return; }
    setLoadingLesson(true);
    setGeneratedLesson(null);
    setPendingBlocks([]);
    lessonStartRef.current = Date.now();
    try {
      const tema = customTopic.trim();
      const materia = lessonSubjectInput.trim() || "Geral";
      const level = topic.defaultLevel || "enem";
      const didacticStyle = topic.defaultDidacticStyle || "normal";
      const personality: FloraPersonality = "amiga_motivadora";

      // FASE 1 — Esqueleto rápido (~2-3s). Aluno já vê a aula.
      const skel = await floraGenerateLessonSkeleton(tema, materia, level, lessonMode, personality);
      const titulos: string[] = Array.isArray(skel?.blocos_titulos) ? skel.blocos_titulos : [];
      if (!titulos.length) throw new Error("Esqueleto inválido.");

      const placeholderBlocks: any[] = titulos.map((t) => ({
        titulo: t, conteudo: "", checkpoint: "",
      }));
      const initialLesson: Lesson = {
        titulo: skel.titulo || tema,
        introducao: skel.introducao || "",
        blocos: placeholderBlocks,
        resumo: [],
        exercicio_final: skel.exercicio_final,
      };
      setGeneratedLesson(initialLesson);
      setPendingBlocks(titulos.map((_, i) => i));
      setLoadingLesson(false);
      pushRecentLesson({ topic: tema, subject: materia, at: Date.now() });
      saveLesson(tema, materia, initialLesson);

      // FASE 2 — Gera blocos em paralelo (limite 3 por vez pra não estourar quota).
      const total = titulos.length;
      const concurrency = 3;
      let cursor = 0;
      const worker = async () => {
        while (cursor < total) {
          const i = cursor++;
          try {
            const block = await floraGenerateLessonBlock({
              topic: tema, materia,
              blocoTitulo: titulos[i],
              blocoIndex: i, totalBlocos: total,
              mode: lessonMode, didacticStyle,
              personality,
            });
            setGeneratedLesson((prev) => {
              if (!prev) return prev;
              const blocos = [...prev.blocos];
              blocos[i] = { ...blocos[i], ...block };
              const updated = { ...prev, blocos };
              saveLesson(tema, materia, updated);
              return updated;
            });
          } catch (e) {
            console.warn(`[lesson stream] bloco ${i} falhou:`, e);
          } finally {
            setPendingBlocks((p) => p.filter((x) => x !== i));
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
    } catch (err: any) {
      console.error("Error generating lesson:", err);
      toast.error(err?.message || "Erro ao conectar com a Flora.");
      setLoadingLesson(false);
    }
  };

  const handleLessonComplete = async () => {
    // Concede XP/streak via gamificação ao concluir uma aula.
    try {
      const elapsed = lessonStartRef.current ? Date.now() - lessonStartRef.current : 0;
      // Mínimo de 10 minutos creditados, mesmo que o aluno corra os slides.
      const ms = Math.max(elapsed, 10 * 60 * 1000);
      if (user?.id) {
        const cur = ensureDailyReset(await loadGamificationForUser(user.id));
        const next = registerStudySession(cur, ms);
        await saveGamificationForUser(user.id, next);
        const gained = next.xp - cur.xp;
        if (gained > 0) toast.success(`+${gained} XP · aula concluída!`);

        // Loop fechado: registra a conclusão como user_action para a Flora
        // ler no contexto do chat (recommend) e em decide_next_topic.
        try {
          await supabase.from("user_actions").insert({
            user_id: user.id,
            action: "lesson_completed",
            metadata: {
              titulo: generatedLesson?.titulo ?? "",
              blocks: generatedLesson?.blocos?.length ?? 0,
              duration_ms: ms,
              xp_gained: Math.max(0, gained),
            },
          });
        } catch (e) {
          console.warn("[aulao] log lesson_completed failed", e);
        }
      }
    } catch (e) {
      console.warn("[aulao] gamification register failed", e);
    } finally {
      setMode("selection");
      setGeneratedLesson(null);
      setResumeEntry(null);
      lessonStartRef.current = null;
      setCachedLessons(listCachedLessons());
    }
  };

  const handleResumeLesson = (entry: LessonCacheEntry) => {
    const lessonTopic = AULAO_TOPICS.find((t) => t.mode === "lesson");
    if (!lessonTopic) return;
    setSelectedTopic(lessonTopic);
    setMode("lesson");
    setLessonTopicInput(entry.tema);
    setLessonSubjectInput(entry.materia);
    setGeneratedLesson(entry.lesson);
    setResumeEntry(entry);
    setPendingBlocks([]);
    setLoadingLesson(false);
    lessonStartRef.current = Date.now();
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) { toast.error("Digite um assunto para buscar."); return; }
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: { action: "semantic_search", data: { query: q, limit: 10 } },
      });
      if (error) throw error;
      if (data?.results?.length) {
        setSearchResults(data.results);
      } else {
        toast.info(`Nenhum resultado encontrado para "${q}".`);
      }
    } catch (err: any) {
      toast.error("Erro ao buscar conteúdo. Tente novamente.");
    } finally {
      setSearchLoading(false);
    }
  };

  const confirmEssayTheme = () => {
    setConfirmedTheme(essayThemeInput.trim() || "Tema livre — escolha à sua preferência");
  };

  const handleTopicSelect = (topic: AulaoTopic) => {
    if (topic.id === "cursos-prontos") {
      navigate("/cursos");
      return;
    }
    if (topic.id === "redacao-templates") {
      navigate("/redacao/templates");
      return;
    }

    setSelectedTopic(topic);
    setMode(topic.mode);
    setGeneratedLesson(null);
    setLessonTopicInput("");
    setLessonSubjectInput("");
    setEssayThemeInput("");
    setConfirmedTheme("");
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleBack = () => {
    if (mode !== "selection") {
      setMode("selection");
      setSelectedTopic(null);
      setGeneratedLesson(null);
      setConfirmedTheme("");
      setEssayThemeInput("");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="aulao-page">
      <header className="aulao-header">
        <div className="aulao-header-content">
          <Button variant="ghost" size="icon" onClick={handleBack} className="aulao-back-btn">
            <ArrowLeft size={20} />
          </Button>
          <h1 className="aulao-title">Aulão com a Flora</h1>
          <div className="aulao-header-spacer" />
        </div>
      </header>

      <main className={`aulao-main aulao-main--${mode}`}>
        {mode === "selection" && (
          <div className="aulao-selection">
            <div className="aulao-flora-card">
              <div className="flora-avatar"><Leaf size={18} /></div>
              <p>
                <strong>Oi, sou a Flora.</strong> Posso preparar uma aula completa,
                te guiar numa redação ou achar conteúdo sobre qualquer tema. Por onde a gente começa hoje?
              </p>
            </div>

            {recent.length > 0 && (
              <div className="aulao-recent">
                <p className="aulao-recent-title">Continue de onde parou</p>
                <div className="aulao-recent-row">
                  {recent.map((r) => (
                    <button
                      key={r.topic + r.at}
                      className="aulao-recent-chip"
                      onClick={() => {
                        const lessonTopic = AULAO_TOPICS.find((t) => t.mode === "lesson");
                        if (!lessonTopic) return;
                        setSelectedTopic(lessonTopic);
                        setMode("lesson");
                        setGeneratedLesson(null);
                        setLessonSubjectInput(r.subject || "");
                        setLessonTopicInput(r.topic);
                      }}
                    >
                      <Clock size={14} /> {r.topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cachedLessons.length > 0 && (
              <div className="aulao-cached">
                <p className="aulao-recent-title">Aulas salvas — continue de onde parou</p>
                <div className="aulao-cached-list">
                  {cachedLessons.map((entry) => {
                    const blocosOk = entry.lesson.blocos.filter((b) => b.conteudo).length;
                    const total = entry.lesson.blocos.length;
                    const pct = total > 0 ? Math.round((blocosOk / total) * 100) : 0;
                    return (
                      <div key={entry.tema + entry.materia} className="aulao-cached-card">
                        <div className="aulao-cached-info" onClick={() => handleResumeLesson(entry)}>
                          <span className="aulao-cached-topic">{entry.lesson.titulo || entry.tema}</span>
                          <span className="aulao-cached-meta">{entry.materia} · {blocosOk}/{total} blocos</span>
                          <div className="aulao-cached-bar">
                            <div className="aulao-cached-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <button className="aulao-cached-remove" onClick={() => {
                          removeLesson(entry.tema, entry.materia);
                          setCachedLessons(listCachedLessons());
                        }} aria-label="Remover do cache" title="Remover">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="selection-intro">
              <Lightbulb size={32} className="intro-icon" />
              <h2>Como você quer estudar hoje?</h2>
              <p>Escolha uma opção abaixo para começar sua aula com a Flora.</p>
            </div>
            <div className="topics-grid">
              {AULAO_TOPICS.map((topic) => (
                <button key={topic.id} className="topic-card" onClick={() => handleTopicSelect(topic)}>
                  <div className="topic-icon">{topic.icon}</div>
                  <h3 className="topic-title">{topic.title}</h3>
                  <p className="topic-description">{topic.description}</p>
                  <div className="topic-cta">Começar →</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "lesson" && selectedTopic && (
          <div className="lesson-container">
            {!generatedLesson && !loadingLesson && (
              <div className="lesson-setup rounded-2xl border bg-card p-6 shadow-sm max-w-xl mx-auto space-y-4">
                <div className="flex items-center gap-3 text-primary mb-2">
                  <BookOpen size={28} />
                  <h2 className="text-xl font-bold">Sobre o que vamos aprender?</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  A Flora vai preparar uma aula com explicações, resumo e exercícios.
                </p>
                <Input
                  placeholder="Ex: Primeira Guerra Mundial, Fotossíntese, Logaritmos..."
                  value={lessonTopicInput}
                  onChange={(e) => setLessonTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startLesson(selectedTopic, lessonTopicInput)}
                  className="text-base py-5"
                  autoFocus
                />
                <Input
                  placeholder="Matéria (opcional) — Ex: História, Biologia, Matemática"
                  value={lessonSubjectInput}
                  onChange={(e) => setLessonSubjectInput(e.target.value)}
                  className="text-base py-4"
                />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">PROFUNDIDADE DA AULA</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "rapida", label: "Rápida", hint: "5-10 min" },
                      { id: "completa", label: "Completa", hint: "15-25 min" },
                      { id: "masterclass", label: "Masterclass", hint: "30-50 min" },
                    ] as const).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setLessonMode(m.id)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${lessonMode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/40"}`}
                      >
                        <div>{m.label}</div>
                        <div className="text-[10px] font-normal text-muted-foreground">{m.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full py-5 text-base font-bold gap-2"
                  onClick={() => startLesson(selectedTopic, lessonTopicInput)}
                  disabled={!lessonTopicInput.trim()}
                >
                  <BookOpen size={18} /> Gerar Aula Completa
                </Button>
              </div>
            )}
            {loadingLesson && <FloraThinkingLoader />}
            {generatedLesson && !loadingLesson && (
              <InteractiveLessonPlayer
                lesson={generatedLesson}
                enableVoice={true}
                personality="amiga_motivadora"
                loadingBlockIndices={pendingBlocks}
                onComplete={handleLessonComplete}
                onExit={() => {
                  setGeneratedLesson(null);
                  setLessonTopicInput("");
                }}
                materia={lessonSubjectInput || "Geral"}
              />
            )}
          </div>
        )}

        {mode === "essay" && selectedTopic && (
          <div className="essay-container">
            {!confirmedTheme ? (
              <div className="lesson-setup rounded-2xl border bg-card p-6 shadow-sm max-w-xl mx-auto space-y-4">
                <div className="flex items-center gap-3 text-primary mb-2">
                  <PenTool size={28} />
                  <h2 className="text-xl font-bold">Tema da Redação</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  Digite o tema ou clique em "Começar" para escrever com tema livre.
                </p>
                <Input
                  placeholder="Ex: Impacto das redes sociais na educação"
                  value={essayThemeInput}
                  onChange={(e) => setEssayThemeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmEssayTheme()}
                  className="text-base py-5"
                  autoFocus
                />
                <Button className="w-full py-5 text-base font-bold gap-2" onClick={confirmEssayTheme}>
                  <PenTool size={18} />
                  {essayThemeInput.trim() ? "Começar com esse tema" : "Começar com tema livre"}
                </Button>
              </div>
            ) : (
              <EssayTutorMode
                theme={confirmedTheme}
                essayType="enem"
                onComplete={() => {
                  toast.success("Redação enviada com sucesso!");
                  setConfirmedTheme("");
                  setEssayThemeInput("");
                  setMode("selection");
                }}
              />
            )}
          </div>
        )}

        {mode === "search" && selectedTopic && (
          <div className="search-container space-y-4">
            <div className="rounded-2xl border bg-card p-6 shadow-sm max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Search size={24} />
                <h2 className="text-xl font-bold">Buscar por Assunto</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Digite um tema ou matéria para encontrar questões, resumos e recursos.
              </p>
              <div className="flex gap-2">
                <Input
                  ref={searchInputRef}
                  placeholder="Ex: Fotossíntese, Revolução Francesa, Funções Quadráticas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="text-base py-5 flex-1"
                  autoFocus
                />
                <Button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()} className="px-6 gap-2">
                  {searchLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  Buscar
                </Button>
              </div>
            </div>

            {searchLoading && (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Buscando conteúdo...</span>
              </div>
            )}

            {!searchLoading && searchResults.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-3">
                <p className="text-sm text-muted-foreground px-1">
                  {searchResults.length} resultado{searchResults.length > 1 ? "s" : ""} encontrado{searchResults.length > 1 ? "s" : ""}
                </p>
                {searchResults.map((r) => (
                  <div key={r.id} className="rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`search-result-type search-result-type--${r.tipo}`}>{r.tipo}</span>
                          <span className="text-xs text-muted-foreground">{r.materia}</span>
                        </div>
                        <p className="font-medium text-sm">{r.titulo}</p>
                        {r.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{r.descricao}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
