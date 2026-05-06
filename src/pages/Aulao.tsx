import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Lightbulb, PenTool, Volume2, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { floraGenerateLesson, floraExtractPdfText } from "@/lib/floraClient";
import { Lesson } from "@/lib/types"; // Assuming Lesson type is defined here or needs to be created
import { InteractiveLessonPlayer } from "@/components/InteractiveLessonPlayer";
import { EssayTutorMode } from "@/components/EssayTutorMode";
import "./Aulao.css";

type AulaoMode = "selection" | "lesson" | "essay" | "search" | "import";

interface AulaoTopic {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  mode: "lesson" | "essay" | "search" | "import";
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
  {
    id: "import-pdf",
    title: "Importar PDF/Artigo",
    description: "Faça upload de um PDF ou cole o link de um artigo para a Flora criar uma aula baseada nele.",
    icon: <FileText size={24} />,
    mode: "import",
  },
];

export default function Aulao() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AulaoMode>("selection");
  const [selectedTopic, setSelectedTopic] = useState<AulaoTopic | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [essayTheme, setEssayTheme] = useState("");
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<Lesson | null>(null);

  const handleTopicSelect = async (topic: AulaoTopic) => {
    setSelectedTopic(topic);
    setMode(topic.mode);

    if (topic.mode === "lesson") {
      setLoadingLesson(true);
      setGeneratedLesson(null);
      try {
        // TODO: Get actual content, materia, level, didacticStyle from user input or context
        const dummyContent = "Conteúdo base para a aula. Pode ser uma transcrição de vídeo, um texto de artigo, etc.";
        const dummyMateria = "História";
        const dummyLevel = "enem";
        const dummyDidacticStyle = "normal";

        const result = await floraGenerateLesson(
          topic.title,
          dummyMateria,
          dummyLevel,
          dummyDidacticStyle,
          dummyContent
        );
        if (result?.lesson) {
          setGeneratedLesson(result.lesson);
        } else {
          console.error("Failed to generate lesson:", result);
          // Handle error, maybe show a message to the user
        }
      } catch (error) {
        console.error("Error generating lesson:", error);
        // Handle error
      } finally {
        setLoadingLesson(false);
      }
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
          <>
            {loadingLesson && <p>Gerando sua aula com a Flora...</p>}
            {!loadingLesson && generatedLesson && (
              <InteractiveLessonPlayer
                lesson={generatedLesson}
                enableVoice={selectedTopic.id === "lesson-voice"}
              />
            )}
          </>
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

        {mode === "import" && selectedTopic && (
          <div className="import-container p-6 bg-card rounded-xl border border-border shadow-sm max-w-2xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <FileText className="text-primary" /> Importar Documento
            </h2>
            <p className="text-muted-foreground mb-6">Cole o link de um PDF público para a Flora extrair o conteúdo e gerar uma aula.</p>
            
            <div className="flex flex-col gap-4">
              <Input
                placeholder="https://exemplo.com/documento.pdf"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                disabled={isExtractingPdf || loadingLesson}
              />
              
              <Button 
                onClick={async () => {
                  if (!pdfUrl) return;
                  setIsExtractingPdf(true);
                  try {
                    const extractedText = await floraExtractPdfText(pdfUrl);
                    if (extractedText) {
                      setLoadingLesson(true);
                      setMode("lesson");
                      const result = await floraGenerateLesson(
                        "Aula baseada em Documento",
                        "Geral",
                        "enem",
                        "normal",
                        extractedText
                      );
                      if (result?.lesson) {
                        setGeneratedLesson(result.lesson);
                      }
                    } else {
                      alert("Não foi possível extrair o texto do PDF.");
                    }
                  } catch (error) {
                    console.error("Erro ao processar PDF:", error);
                    alert("Erro ao processar o PDF.");
                  } finally {
                    setIsExtractingPdf(false);
                    setLoadingLesson(false);
                  }
                }}
                disabled={!pdfUrl || isExtractingPdf || loadingLesson}
                className="w-full"
              >
                {isExtractingPdf ? "Extraindo texto..." : loadingLesson ? "Gerando aula..." : "Processar e Gerar Aula"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
