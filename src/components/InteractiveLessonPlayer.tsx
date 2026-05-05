import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, MessageCircle, SkipForward, SkipBack, Loader2, Send } from "lucide-react";
import "./InteractiveLessonPlayer.css";

interface LessonBlock {
  titulo: string;
  conteudo: string;
  checkpoint: string;
}

interface Lesson {
  titulo: string;
  introducao: string;
  blocos: LessonBlock[];
  resumo: string[];
  exercicio_final: {
    pergunta: string;
    alternativas: string[];
    correta: number;
    explicacao: string;
  };
}

interface InteractiveLessonPlayerProps {
  lesson: Lesson;
  onComplete?: () => void;
  enableVoice?: boolean;
  personality?: "rigorosa" | "amiga" | "engraçada";
}

export const InteractiveLessonPlayer: React.FC<InteractiveLessonPlayerProps> = ({
  lesson,
  onComplete,
  enableVoice = true,
  personality = "amiga",
}) => {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDuvidaPanel, setShowDuvidaPanel] = useState(false);
  const [duvidaText, setDuvidaText] = useState("");
  const [duvidaResponse, setDuvidaResponse] = useState("");
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentBlock = lesson.blocos[currentBlockIndex];
  const isLastBlock = currentBlockIndex === lesson.blocos.length - 1;

  // Simular fala com TTS
  const handleSpeak = async (text: string) => {
    if (!enableVoice) return;

    setIsSpeaking(true);
    try {
      // Aqui você chamaria a API de TTS (flora-tts)
      // Por enquanto, apenas simulamos
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Erro ao falar:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Processar dúvida do aluno
  const handleDuvidaSubmit = async () => {
    if (!duvidaText.trim()) return;

    setIsLoadingResponse(true);
    try {
      // Aqui você chamaria a API para processar a dúvida
      // Por enquanto, apenas simulamos uma resposta
      const mockResponse = `Ótima pergunta! Deixa eu esclarecer isso para você...
      
      [A Flora responderia aqui de forma personalizada baseada na dúvida]
      
      Ficou claro? Podemos continuar de onde paramos?`;

      setDuvidaResponse(mockResponse);
      
      // Falar a resposta se voz estiver ativada
      if (enableVoice) {
        await handleSpeak(mockResponse);
      }
    } catch (error) {
      console.error("Erro ao processar dúvida:", error);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Avançar para próximo bloco
  const handleNextBlock = () => {
    if (!isLastBlock) {
      setCurrentBlockIndex(currentBlockIndex + 1);
      setShowCheckpoint(false);
      setDuvidaText("");
      setDuvidaResponse("");
    }
  };

  // Voltar para bloco anterior
  const handlePrevBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
      setShowCheckpoint(false);
      setDuvidaText("");
      setDuvidaResponse("");
    }
  };

  return (
    <div className="interactive-lesson-player">
      {/* Cabeçalho */}
      <div className="lesson-header">
        <h1 className="lesson-title">{lesson.titulo}</h1>
        <div className="lesson-progress">
          <span>Bloco {currentBlockIndex + 1} de {lesson.blocos.length}</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((currentBlockIndex + 1) / lesson.blocos.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="lesson-content">
        {currentBlockIndex === 0 ? (
          <div className="introduction-section">
            <h2>Introdução</h2>
            <p className="introduction-text">{lesson.introducao}</p>
            <button
              className="start-button"
              onClick={() => {
                setCurrentBlockIndex(0);
                handleSpeak(lesson.introducao);
              }}
            >
              {enableVoice && isSpeaking ? (
                <>
                  <Loader2 size={18} className="spinner" /> Ouvindo...
                </>
              ) : (
                <>
                  <Play size={18} /> Começar Aula
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="block-section">
            <h2 className="block-title">{currentBlock.titulo}</h2>
            <div
              className="block-content"
              dangerouslySetInnerHTML={{ __html: currentBlock.conteudo }}
            />

            {/* Checkpoint */}
            {!showCheckpoint ? (
              <button
                className="checkpoint-button"
                onClick={() => setShowCheckpoint(true)}
              >
                📝 Responder Checkpoint
              </button>
            ) : (
              <div className="checkpoint-panel">
                <p className="checkpoint-question">{currentBlock.checkpoint}</p>
                <textarea
                  className="checkpoint-input"
                  placeholder="Digite sua resposta aqui..."
                  rows={3}
                />
                <button className="submit-checkpoint">Enviar Resposta</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controles de Reprodução */}
      <div className="lesson-controls">
        <button
          className="control-btn prev"
          onClick={handlePrevBlock}
          disabled={currentBlockIndex === 0}
          title="Bloco Anterior"
        >\n          <SkipBack size={20} />\n        </button>\n\n        <button\n          className="control-btn play"\n          onClick={() => {\n            setIsPlaying(!isPlaying);\n            if (!isPlaying && currentBlock) {\n              handleSpeak(currentBlock.conteudo);\n            }\n          }}\n          title={isPlaying ? \"Pausar\" : \"Reproduzir\"}\n        >\n          {isSpeaking ? (\n            <Pause size={20} />\n          ) : (\n            <Play size={20} />\n          )}\n        </button>\n\n        <button\n          className=\"control-btn voice\"\n          onClick={() => setShowDuvidaPanel(!showDuvidaPanel)}\n          title=\"Fazer Dúvida\"\n        >\n          <MessageCircle size={20} />\n        </button>\n\n        <button\n          className=\"control-btn next\"\n          onClick={handleNextBlock}\n          disabled={isLastBlock}\n          title=\"Próximo Bloco\"\n        >\n          <SkipForward size={20} />\n        </button>\n      </div>\n\n      {/* Painel de Dúvida Rápida */}\n      {showDuvidaPanel && (\n        <div className=\"duvida-panel\">\n          <div className=\"duvida-header\">\n            <h3>Dúvida Rápida</h3>\n            <button\n              className=\"close-btn\"\n              onClick={() => setShowDuvidaPanel(false)}\n            >\n              ✕\n            </button>\n          </div>\n\n          {duvidaResponse ? (\n            <div className=\"duvida-response\">\n              <p className=\"response-text\">{duvidaResponse}</p>\n              <button\n                className=\"continue-button\"\n                onClick={() => {\n                  setDuvidaResponse(\"\");\n                  setDuvidaText(\"\");\n                  handleNextBlock();\n                }}\n              >\n                Continuar Aula\n              </button>\n            </div>\n          ) : (\n            <div className=\"duvida-input-area\">\n              <textarea\n                className=\"duvida-input\"\n                placeholder=\"Qual é sua dúvida? A Flora vai responder...\"\n                value={duvidaText}\n                onChange={(e) => setDuvidaText(e.target.value)}\n                rows={3}\n              />\n              <button\n                className=\"send-duvida-btn\"\n                onClick={handleDuvidaSubmit}\n                disabled={isLoadingResponse || !duvidaText.trim()}\n              >\n                {isLoadingResponse ? (\n                  <>\n                    <Loader2 size={16} className=\"spinner\" /> Respondendo...\n                  </>\n                ) : (\n                  <>\n                    <Send size={16} /> Enviar\n                  </>\n                )}\n              </button>\n            </div>\n          )}\n        </div>\n      )}\n    </div>\n  );\n};\n
