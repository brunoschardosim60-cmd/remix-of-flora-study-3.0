import React, { useState } from "react";
import { Send, Lightbulb, CheckCircle, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import "./EssayTutorMode.css";

interface FeedbackItem {
  type: "positive" | "improvement" | "tip";
  message: string;
}

interface EssayTutorModeProps {
  theme: string;
  essayType?: "enem" | "fuvest" | "ita" | "general";
  onComplete?: (essay: string) => void;
}

export const EssayTutorMode: React.FC<EssayTutorModeProps> = ({
  theme,
  essayType = "enem",
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<"writing" | "feedback">("writing");
  const [essayText, setEssayText] = useState("");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showStructureGuide, setShowStructureGuide] = useState(true);

  const handleEssayChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEssayText(text);
    setWordCount(text.split(/\s+/).filter((word) => word.length > 0).length);
  };

  const handleAnalyzeEssay = async () => {
    if (!essayText.trim()) return;

    setIsAnalyzing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockFeedback: FeedbackItem[] = [
        {
          type: "positive",
          message: "✅ Sua introdução está clara e bem estruturada!",
        },
        {
          type: "improvement",
          message: "⚠️ Tente usar mais conectivos entre os parágrafos para melhorar a coesão.",
        },
        {
          type: "tip",
          message: "💡 Macete ENEM: Sempre cite dados/exemplos concretos para fortalecer seus argumentos.",
        },
        {
          type: "positive",
          message: "✅ Conclusão bem amarrada com proposta de intervenção!",
        },
      ];

      setFeedback(mockFeedback);
      setCurrentStep("feedback");
    } catch (error) {
      console.error("Erro ao analisar redação:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setEssayText("");
    setFeedback([]);
    setWordCount(0);
    setCurrentStep("writing");
  };

  return (
    <div className="essay-tutor-mode">
      <div className="essay-header">
        <h1 className="essay-title">Tutor de Redação</h1>
        <p className="essay-theme">Tema: <strong>{theme}</strong></p>
        {essayType === "enem" && (
          <span className="essay-type-badge">Estilo ENEM</span>
        )}
      </div>

      <div className="essay-container">
        {showStructureGuide && (
          <div className="structure-guide">
            <div className="guide-header">
              <h3>📋 Estrutura da Redação ENEM</h3>
              <button
                className="close-guide"
                onClick={() => setShowStructureGuide(false)}
              >
                ✕
              </button>
            </div>
            <div className="guide-content">
              <div className="guide-section">
                <h4>1️⃣ Introdução (3-5 linhas)</h4>
                <p>Apresente o tema, o recorte e sua tese. Seja claro e direto.</p>
              </div>
              <div className="guide-section">
                <h4>2️⃣ Desenvolvimento (12-15 linhas)</h4>
                <p>Dois ou três parágrafos com argumentos, exemplos e dados concretos.</p>
              </div>
              <div className="guide-section">
                <h4>3️⃣ Conclusão (3-5 linhas)</h4>
                <p>Retome a tese e proponha uma solução/intervenção prática.</p>
              </div>
            </div>
          </div>
        )}

        <div className="essay-writing-area">
          <div className="writing-header">
            <h2>Sua Redação</h2>
            <div className="word-count">Palavras: {wordCount}</div>
          </div>
          <textarea
            className="essay-textarea"
            placeholder="Comece a escrever sua redação aqui... Mínimo 250 palavras para análise."
            value={essayText}
            onChange={handleEssayChange}
            rows={15}
          />
          <div className="writing-actions">
            <button
              className="analyze-button"
              onClick={handleAnalyzeEssay}
              disabled={isAnalyzing || wordCount < 250}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={18} className="spinner" /> Analisando...
                </>
              ) : (
                <>
                  <Send size={18} /> Analisar Redação
                </>
              )}
            </button>
            {essayText && (
              <button className="reset-button" onClick={handleReset}>
                <RotateCcw size={18} /> Começar Novamente
              </button>
            )}
          </div>
          {wordCount < 250 && essayText && (
            <p className="word-warning">Mínimo 250 palavras para análise. Faltam {250 - wordCount} palavras.</p>
          )}
        </div>

        {currentStep === "feedback" && feedback.length > 0 && (
          <div className="feedback-section">
            <h2>📊 Análise da Flora</h2>
            <div className="feedback-list">
              {feedback.map((item, index) => (
                <div key={index} className={`feedback-item ${item.type}`}>
                  <div className="feedback-icon">
                    {item.type === "positive" && <CheckCircle size={20} />}
                    {item.type === "improvement" && <AlertCircle size={20} />}
                    {item.type === "tip" && <Lightbulb size={20} />}
                  </div>
                  <p className="feedback-message">{item.message}</p>
                </div>
              ))}
            </div>
            <div className="feedback-actions">
              <button className="submit-button" onClick={() => onComplete?.(essayText)}>
                ✅ Enviar Redação
              </button>
              <button className="revise-button" onClick={() => setCurrentStep("writing")}>
                ✏️ Revisar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
