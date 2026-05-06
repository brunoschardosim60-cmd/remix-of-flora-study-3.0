import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, MessageCircle, SkipForward, SkipBack, Loader2, Send, Image as ImageIcon } from "lucide-react";
import { generateDidacticImage } from "@/lib/floraImages";
import { floraTTS } from "@/lib/floraTTS";
import { toast } from "sonner";
import "./InteractiveLessonPlayer.css";

interface LessonBlock {
  titulo: string;
  conteudo: string;
  checkpoint: string;
  imagemConceitoChave?: string;
  imagemDescricao?: string;
}

interface Lesson {
  titulo: string;
  introducao: string;
  blocos: LessonBlock[];
  resumo: string | string[];
  exercicio_final: {
    pergunta: string;
    opcoes?: string[];
    alternativas?: string[];
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDuvidaPanel, setShowDuvidaPanel] = useState(false);
  const [duvidaText, setDuvidaText] = useState("");
  const [duvidaResponse, setDuvidaResponse] = useState("");
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [blockImage, setBlockImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const currentBlock = lesson.blocos[currentBlockIndex];
  const isLastBlock = currentBlockIndex === lesson.blocos.length - 1;

  const handleSpeak = async (text: string) => {
    if (!enableVoice || !text) return;
    
    // Se já estiver falando, para.
    const state = floraTTS.getPlayerState();
    if (state.isPlaying) {
      floraTTS.stopAudio();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    try {
      const audioBlob = await floraTTS.generateAudio({
        text,
        personality: personality as any,
        voice: personality === "rigorosa" ? "shimmer" : personality === "engraçada" ? "echo" : "alloy"
      });
      
      floraTTS.playAudio(audioBlob, () => {
        setIsSpeaking(false);
      });
    } catch (error: any) {
      console.error("Erro ao falar:", error);
      toast.error("Erro na voz da Flora: " + error.message);
      setIsSpeaking(false);
    }
  };

  const handleDuvidaSubmit = async () => {
    if (!duvidaText.trim()) return;
    setIsLoadingResponse(true);
    try {
      setTimeout(() => {
        const mockResponse = `Ótima pergunta! Sobre sua dúvida, o ponto principal é que a Flora está aqui para simplificar. No contexto desta aula, lembre-se que o mais importante é focar na base do conceito. Podemos continuar?`;
        setDuvidaResponse(mockResponse);
        setIsLoadingResponse(false);
      }, 1500);
    } catch (error) {
      console.error("Erro ao processar dúvida:", error);
      setIsLoadingResponse(false);
    }
  };

  const handleNextBlock = () => {
    if (!isLastBlock) {
      setCurrentBlockIndex(currentBlockIndex + 1);
      setShowCheckpoint(false);
      setDuvidaText("");
      setDuvidaResponse("");
    } else if (onComplete) {
      onComplete();
    }
  };

  const handlePrevBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
      setShowCheckpoint(false);
      setDuvidaText("");
      setDuvidaResponse("");
      setBlockImage(null);
    }
  };

  const handleGenerateImage = async () => {
    if (!currentBlock || isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const result = await generateDidacticImage({
        concept: currentBlock.titulo,
        context: currentBlock.conteudo,
        style: "educational",
        userId: "user-123", // Substituir com ID real do usuário
      });
      if (result.success) {
        setBlockImage(result.imageUrl);
      }
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="interactive-lesson-player">
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

      <div className="lesson-content">
        <div className="block-section">
          <h2 className="block-title">{currentBlock.titulo}</h2>
          <div className="block-content">
            {currentBlock.conteudo}
          </div>
          {blockImage && (
            <div className="block-image-container">
              <img src={blockImage} alt={currentBlock.titulo} className="block-image" />
            </div>
          )}
          {!blockImage && (
            <button
              className="generate-image-btn"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
            >
              {isGeneratingImage ? "Gerando imagem..." : <><ImageIcon size={16} /> Gerar Ilustração</> }
            </button>
          )}

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
              <button className="submit-checkpoint" onClick={() => setShowCheckpoint(false)}>Enviar Resposta</button>
            </div>
          )}
        </div>
      </div>

      <div className="lesson-controls">
        <button
          className="control-btn prev"
          onClick={handlePrevBlock}
          disabled={currentBlockIndex === 0}
        >
          <SkipBack size={20} />
        </button>

        <button
          className="control-btn play"
          onClick={() => handleSpeak(currentBlock.conteudo)}
        >
          {isSpeaking ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          className="control-btn voice"
          onClick={() => setShowDuvidaPanel(!showDuvidaPanel)}
        >
          <MessageCircle size={20} />
        </button>

        <button
          className="control-btn next"
          onClick={handleNextBlock}
        >
          <SkipForward size={20} />
        </button>
      </div>

      {showDuvidaPanel && (
        <div className="duvida-panel">
          <div className="duvida-header">
            <h3>Dúvida Rápida</h3>
            <button className="close-btn" onClick={() => setShowDuvidaPanel(false)}>✕</button>
          </div>

          {duvidaResponse ? (
            <div className="duvida-response">
              <p className="response-text">{duvidaResponse}</p>
              <button
                className="continue-button"
                onClick={() => {
                  setDuvidaResponse("");
                  setDuvidaText("");
                  setShowDuvidaPanel(false);
                }}
              >
                Entendi, continuar!
              </button>
            </div>
          ) : (
            <div className="duvida-input-area">
              <textarea
                className="duvida-input"
                placeholder="Qual é sua dúvida?"
                value={duvidaText}
                onChange={(e) => setDuvidaText(e.target.value)}
                rows={3}
              />
              <button
                className="send-duvida-btn"
                onClick={handleDuvidaSubmit}
                disabled={isLoadingResponse || !duvidaText.trim()}
              >
                {isLoadingResponse ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
