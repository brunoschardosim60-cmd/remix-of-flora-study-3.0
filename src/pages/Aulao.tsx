import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Lightbulb, PenTool, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { floraGenerateLesson } from "@/lib/floraClient";
import { Lesson } from "@/lib/types";
import { InteractiveLessonPlayer } from "@/components/InteractiveLessonPlayer";
import { EssayTutorMode } from "@/components/EssayTutorMode";
import { supabase } from "@/integrations/supabase/client";
import "./Aulao.css";

type AulaoMode = "selection" | "lesson" | "essay" | "search";

interface AulaoTopic {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  mode: "lesson" | "essay" | "search";
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
];

export default function Aulao() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AulaoMode>("selection");
  const [selectedTopic, setSelectedTopic] = useState<AulaoTopic | null>(null);

  // Lesson
  const [lessonTopicInput, setLessonTopicInput] = useState("");
  const [lessonSubjectInput, setLessonSubjectInput] = useState("");
  const [lessonMode, setLessonMode] = useState<"rapida" | "completa" | "masterclass">("completa");
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<Lesson | null>(null);

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
    try {
      const result = await floraGenerateLesson(
        customTopic.trim(), lessonSubjectInput.trim() || "Geral",
        topic.defaultLevel || "enem",
        topic.defaultDidacticStyle || "normal",
        `Aula sobre ${customTopic.trim()}`,
        lessonMode
      );
      if (result?.lesson) {
        setGeneratedLesson(result.lesson);
      } else {
        toast.error("Não consegui gerar a aula agora. Tente novamente!");
      }
    } catch (err: any) {
      console.error("Error generating lesson:", err);
      toast.error(err?.message || "Erro ao conectar com a Flora.");
    } finally {
      setLoadingLesson(false);
    }
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

      <main className="aulao-main">
        {mode === "selection" && (
          <div className="aulao-selection">
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
            {loadingLesson && (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="text-center">
                  <h2 className="text-xl font-bold">Flora está preparando sua aula...</h2>
                  <p className="text-muted-foreground text-sm mt-1">Isso pode levar alguns segundos.</p>
                </div>
              </div>
            )}
            {generatedLesson && !loadingLesson && (
              <InteractiveLessonPlayer
                lesson={generatedLesson}
                enableVoice={false}
                personality="amiga"
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
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            r.tipo === "questao" ? "bg-blue-500/10 text-blue-600"
                            : r.tipo === "flashcard" ? "bg-purple-500/10 text-purple-600"
                            : "bg-green-500/10 text-green-600"
                          }`}>{r.tipo}</span>
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
