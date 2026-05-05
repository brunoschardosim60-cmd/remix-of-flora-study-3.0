import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Lightbulb, PenTool, Volume2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

const AULAO_TOPICS: AulaoTopic[] = [
  {
    id: "lesson-enem",
    title: "Aula Dinâmica ENEM",
    description: "Aprenda com a Flora explicando como se fosse uma professora particular. Inclui macetes e dicas de prova.",
    icon: <BookOpen size={24} />,
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
    id: "lesson-voice",
    title: "Aula com Voz (Modo Áudio)",
    description: "A Flora lê a aula para você enquanto estuda. Perfeito para estudar em movimento ou com as mãos ocupadas.",
    icon: <Volume2 size={24} />,
    mode: "lesson",
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

  const handleTopicSelect = (topic: AulaoTopic) => {
    setSelectedTopic(topic);
    setMode(topic.mode);
  };

  const handleBack = () => {
    if (mode !== "selection") {
      setMode("selection");
      setSelectedTopic(null);
      setSearchQuery("");
      setEssayTheme("");
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
          <InteractiveLessonPlayer
            lesson={{
              titulo: selectedTopic.title,
              introducao: `Bem-vindo ao Aulão de ${selectedTopic.title}. Vamos começar explorando os conceitos fundamentais.`,
              blocos: [
                {
                  titulo: "Conceitos Iniciais",
                  conteudo: "Aqui a Flora vai carregar o conteúdo baseado no seu material ou tema escolhido.",
                  checkpoint: "O que você entendeu sobre esse início?"
                }
              ],
              resumo: "Resumo dos pontos principais da aula.",
              exercicio_final: {
                pergunta: "Pergunta final para testar seu conhecimento.",
                opcoes: ["Opção A", "Opção B", "Opção C", "Opção D"],
                correta: 0,
                explicacao: "Explicação detalhada da resposta."
              }
            }}
            enableVoice={selectedTopic.id === "lesson-voice"}
          />
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
