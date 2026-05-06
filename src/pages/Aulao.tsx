import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Lightbulb, PenTool, Volume2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { floraGenerateLesson } from "@/lib/floraClient";
import { Lesson } from "@/lib/types"; // Assuming Lesson type is defined here or needs to be created
import { InteractiveLessonPlayer } from "@/components/InteractiveLessonPlayer";
import { EssayTutorMode } from "@/components/EssayTutorMode";
import "./Aulao.css";

type AulaoMode = "selection" | "lesson" | "essay" | "search";

interface AulaoTopic {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  mode: "lesson" | "essay" | "search";
  defaultLevel?: 'enem' | 'concurso' | 'basico';
  defaultDidacticStyle?: 'macetes' | 'aprofundado' | 'normal';
}

const AULAO_TOPICS: AulaoTopic[] = [
  {
    id: "lesson-enem",
    title: "Aula Dinâmica ENEM",
    description: "Aprenda com a Flora explicando como se fosse uma professora particular. Inclui macetes e dicas de prova.",
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
    id: "lesson-voice",
    title: "Aula com Voz (Modo Áudio)",
    description: "A Flora lê a aula para você enquanto estuda. Perfeito para estudar em movimento ou com as mãos ocupadas.",
    icon: <Volume2 size={24} />,
    mode: "lesson",
    defaultLevel: "enem",
    defaultDidacticStyle: "normal",
  },
  {
    id: "search-content",
    title: "Buscar por Assunto",
    description: "Digite um tema ou matéria e a Flora vai buscar questões, vídeos e recursos relacionados.",
    icon: <Search size={24} />,
    mode: "search",
  },
];

export default function Aulao() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AulaoMode>("selection");
  const [selectedTopic, setSelectedTopic] = useState<AulaoTopic | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [essayTheme, setEssayTheme] = useState("");
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<Lesson | null>(null);
  const [lessonTopicInput, setLessonTopicInput] = useState("");

  const startLesson = async (topic: AulaoTopic, customTopic?: string) => {
    setLoadingLesson(true);
    setGeneratedLesson(null);
    try {
      const result = await floraGenerateLesson(
        customTopic || topic.title,
        "Geral",
        topic.defaultLevel || "enem",
        topic.defaultDidacticStyle || "normal",
        customTopic ? `Aula sobre ${customTopic}` : topic.description
      );
      if (result?.lesson) {
        setGeneratedLesson(result.lesson);
      } else {
        toast.error("Não consegui gerar a aula agora. Tente novamente!");
      }
    } catch (error) {
      console.error("Error generating lesson:", error);
      toast.error("Erro ao conectar com a Flora.");
    } finally {
      setLoadingLesson(false);
    }
  };

  const handleTopicSelect = (topic: AulaoTopic) => {
    setSelectedTopic(topic);
    setMode(topic.mode);
    
    // Se for aula mas não for busca, começa direto ou pede tema
    if (topic.mode === "lesson" && topic.id !== "search-content") {
      // Se não for o de busca, mas o usuário ainda não digitou nada, podemos pedir o tema
      // Para simplificar, vamos abrir um pequeno input se for "Aula Dinâmica"
    }
  };

  const handleBack = () => {
    if (mode !== "selection") {
      setMode("selection");
      setSelectedTopic(null);
      setSearchQuery("");
      setEssayTheme("");
      setGeneratedLesson(null);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="aulao-page">
      <header className="aulao-header">
        <div className="aulao-header-content">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="aulao-back-btn"
          >
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
                <button
                  key={topic.id}
                  className="topic-card"
                  onClick={() => handleTopicSelect(topic)}
                >
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
            {!generatedLesson && !loadingLesson ? (
              <div className="lesson-setup rounded-2xl border bg-card p-6 shadow-sm max-w-xl mx-auto space-y-4">
                <div className="flex items-center gap-3 text-primary mb-2">
                  <BookOpen size={28} />
                  <h2 className="text-xl font-bold">Sobre o que vamos aprender?</h2>
                </div>
                <p className="text-muted-foreground">
                  Digite o assunto que você quer dominar hoje. A Flora vai preparar uma aula personalizada com explicações, resumos e exercícios.
                </p>
                <div className="space-y-3">
                  <Input
                    placeholder="Ex: Primeira Guerra Mundial, Fotossíntese, Logaritmos..."
                    value={lessonTopicInput}
                    onChange={(e) => setLessonTopicInput(e.target.value)}
                    className="text-lg py-6"
                  />
                  <Button 
                    className="w-full py-6 text-lg font-bold"
                    onClick={() => startLesson(selectedTopic, lessonTopicInput)}
                    disabled={!lessonTopicInput.trim()}
                  >
                    Gerar Aula Completa
                  </Button>
                </div>
              </div>
            ) : loadingLesson ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="text-center">
                  <h2 className="text-xl font-bold">Flora está preparando sua aula...</h2>
                  <p className="text-muted-foreground text-sm">Isso pode levar alguns segundos.</p>
                </div>
              </div>
            ) : (
              <InteractiveLessonPlayer
                lesson={generatedLesson}
                enableVoice={selectedTopic.id === "lesson-voice" || true}
                personality="amiga"
              />
            )}
          </div>
        )}

        {mode === "essay" && selectedTopic && (
          <div className="essay-container">
            {!essayTheme ? (
              <div className="essay-theme-selection">
                <h2>Escolha um tema para sua redação</h2>
                <p>Digite o tema ou deixe a Flora sugerir um aleatório.</p>
                <div className="theme-input-group">
                  <Input
                    placeholder="Ex: Impacto das redes sociais na educação"
                    value={essayTheme}
                    onChange={(e) => setEssayTheme(e.target.value)}
                    className="theme-input"
                  />
                  <Button
                    onClick={() => {
                      if (!essayTheme.trim()) {
                        setEssayTheme("Tema sugerido pela Flora");
                      }
                    }}
                    className="theme-submit-btn"
                  >
                    Começar
                  </Button>
                </div>
              </div>
            ) : (
              <EssayTutorMode
                theme={essayTheme}
                essayType="enem"
                onComplete={() => {
                  alert("Redação enviada com sucesso!");
                  setEssayTheme("");
                  setMode("selection");
                }}
              />
            )}
          </div>
        )}

        {mode === "search" && selectedTopic && (
          <div className="search-container">
            <h2>Buscar por Assunto</h2>
            <p>Digite o tema ou matéria que você quer estudar.</p>
            <div className="search-input-group">
              <Input
                placeholder="Ex: Fotossíntese, Revolução Francesa, Funções Quadráticas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <Button className="search-submit-btn">
                <Search size={18} /> Buscar
              </Button>
            </div>
            {searchQuery && (
              <div className="search-results">
                <p>Buscando conteúdo sobre "{searchQuery}"...</p>
                <div className="results-placeholder">
                  <p>Questões, vídeos e recursos aparecerão aqui.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
