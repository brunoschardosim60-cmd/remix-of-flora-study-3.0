import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Lightbulb, CheckCircle, AlertCircle, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "./EssayTutorMode.css";

interface FeedbackItem {
  type: "positive" | "improvement" | "tip";
  message: string;
}

interface LiveSuggestion {
  type: "coesao" | "argumento" | "estrutura" | "vocabulario";
  text: string;
}

interface EssayTutorModeProps {
  theme: string;
  essayType?: "enem" | "fuvest" | "ita" | "general";
  onComplete?: (essay: string) => void;
}

const DEBOUNCE_MS = 4000;       // 4s — não chama toda vez que pausa digitar
const MIN_WORDS_FOR_LIVE = 60;  // Mínimo 60 palavras para valer a pena
const MAX_LIVE_CALLS = 8;       // Máximo 8 sugestões por sessão de redação

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
  const [charCount, setCharCount] = useState(0);
  const [showStructureGuide, setShowStructureGuide] = useState(true);
  const [liveSuggestions, setLiveSuggestions] = useState<LiveSuggestion[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveSuggestionsCount = useRef(0);

  // Sugestões em tempo real (debounced)
  const fetchLiveSuggestions = useCallback(async (text: string) => {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < MIN_WORDS_FOR_LIVE) { setLiveSuggestions([]); return; }
    if (liveSuggestionsCount.current >= MAX_LIVE_CALLS) return; // limite atingido
    liveSuggestionsCount.current += 1;
    setLoadingLive(true);
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: {
          action: "live_essay_feedback",
          data: { text, theme, essayType, wordCount: words.length },
        },
      });
      if (!error && data?.suggestions?.length) {
        setLiveSuggestions(data.suggestions.slice(0, 3));
      }
    } catch {
      // silencioso — sugestões ao vivo nunca quebram o editor
    } finally {
      setLoadingLive(false);
    }
  }, [theme, essayType]);

  const handleEssayChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEssayText(text);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);

    // Debounce live suggestions
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchLiveSuggestions(text), DEBOUNCE_MS);
  };

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  const handleAnalyzeEssay = async () => {
    if (!essayText.trim() || wordCount < 50) return;
    setIsAnalyzing(true);
    try {
      // Cria um rascunho de essay para receber a correção
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login para corrigir a redação.");
      const { data: essayRow, error: essayErr } = await supabase
        .from("essays")
        .insert({
          user_id: user.id,
          tema: theme,
          texto: essayText,
          tipo_prova: essayType === "enem" ? "enem" : "geral",
          status: "rascunho",
          word_count: wordCount,
          line_count: essayText.split(/\n/).length,
        } as any)
        .select("id")
        .single();
      if (essayErr) throw essayErr;

      const { data, error } = await supabase.functions.invoke("essay-corrector", {
        body: { action: "correct", essayId: essayRow.id, tema: theme, texto: essayText },
      });
      if (error) throw error;
      const r = (data?.data ?? data) as any;

      const items: FeedbackItem[] = [];
      if (r?.nota_total != null) {
        items.push({ type: "positive", message: `Nota total: ${r.nota_total}/1000` });
        const comps = [
          ["Competência 1 — Norma culta", r.competencia_1, r.feedback_competencias?.competencia_1],
          ["Competência 2 — Compreensão do tema", r.competencia_2, r.feedback_competencias?.competencia_2],
          ["Competência 3 — Argumentação", r.competencia_3, r.feedback_competencias?.competencia_3],
          ["Competência 4 — Coesão", r.competencia_4, r.feedback_competencias?.competencia_4],
          ["Competência 5 — Proposta de intervenção", r.competencia_5, r.feedback_competencias?.competencia_5],
        ];
        comps.forEach(([label, nota, fb]) => {
          if (nota != null) items.push({
            type: (nota as number) >= 160 ? "positive" : (nota as number) >= 80 ? "tip" : "improvement",
            message: `${label}: ${nota}/200${fb ? ` — ${fb}` : ""}`,
          });
        });
      } else if (r?.nota != null) {
        items.push({ type: "positive", message: `Nota: ${r.nota}/${r.nota_maxima || 10}` });
      }
      if (r?.feedback_geral) items.push({ type: "tip", message: r.feedback_geral });
      const proxPassos: string[] = r?.plano_estudo?.curto_prazo || r?.proximos_passos || [];
      proxPassos.slice(0, 3).forEach((p: string) => items.push({ type: "improvement", message: `Próximo passo: ${p}` }));
      if (items.length === 0) items.push({ type: "tip", message: "Correção concluída, mas não veio detalhamento." });
      setFeedback(items);
      setCurrentStep("feedback");
    } catch (err) {
      console.error("Erro ao analisar redação:", err);
      setFeedback([
        { type: "improvement", message: (err as any)?.message || "Não consegui corrigir agora. Tente de novo." },
      ]);
      setCurrentStep("feedback");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setEssayText("");
    setFeedback([]);
    setWordCount(0);
    setCharCount(0);
    setLiveSuggestions([]);
    setCurrentStep("writing");
  };

  const wordWarning = essayType === "enem" && wordCount > 0 && (wordCount < 150 || wordCount > 400);

  return (
    <div className="essay-tutor-mode">
      <div className="essay-header">
        <h1 className="essay-title">Tutor de Redação</h1>
        <p className="essay-theme">Tema: <strong>{theme}</strong></p>
        {essayType === "enem" && <span className="essay-type-badge">Estilo ENEM</span>}
      </div>

      <div className="essay-container">
        {showStructureGuide && (
          <div className="structure-guide">
            <div className="guide-header">
              <h3>📋 Estrutura da Redação ENEM</h3>
              <button className="close-guide" onClick={() => setShowStructureGuide(false)}>✕</button>
            </div>
            <div className="guide-content">
              <div className="guide-section">
                <h4>1️⃣ Introdução (3–5 linhas)</h4>
                <p>Apresente o tema com contexto histórico ou dado estatístico. Finalize com a tese.</p>
              </div>
              <div className="guide-section">
                <h4>2️⃣ Desenvolvimento (2 parágrafos)</h4>
                <p>Argumento + exemplo concreto em cada parágrafo. Use conectivos de causa e consequência.</p>
              </div>
              <div className="guide-section">
                <h4>3️⃣ Conclusão (3–5 linhas)</h4>
                <p>Retome a tese e apresente proposta de intervenção: agente + ação + finalidade + meio.</p>
              </div>
              <div className="guide-section">
                <h4>📏 Tamanho ideal</h4>
                <p>Entre 25 e 30 linhas (aproximadamente 300–400 palavras). Mínimo 150 palavras.</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === "writing" && (
          <>
            <div className="essay-writing-area">
              <div className="writing-header">
                <h2>Sua Redação</h2>
                <div className="writing-stats">
                  <span className={`word-count ${wordWarning ? "word-warning" : ""}`}>
                    {wordCount} palavras · {charCount} caracteres
                    {essayType === "enem" && wordCount > 0 && ` · ${Math.round((wordCount / 350) * 100)}% do ideal`}
                  </span>
                </div>
              </div>
              <textarea
                className="essay-textarea"
                placeholder={`Escreva sua redação sobre "${theme}" aqui...\n\nComece pela introdução contextualizando o tema.`}
                value={essayText}
                onChange={handleEssayChange}
                spellCheck
              />
              {wordWarning && (
                <p className="word-warning-msg">
                  {wordCount < 150
                    ? `⚠️ Redação curta (mínimo 150 palavras para ENEM)`
                    : `⚠️ Redação longa — ENEM recomenda até 400 palavras`}
                </p>
              )}
              <div className="writing-actions">
                <button
                  className="analyze-button"
                  onClick={handleAnalyzeEssay}
                  disabled={isAnalyzing || wordCount < 50}
                >
                  {isAnalyzing ? (
                    <><Loader2 size={16} className="spinner" /> Analisando...</>
                  ) : (
                    <><Send size={16} /> Analisar Redação</>
                  )}
                </button>
                <button className="reset-button" onClick={handleReset}>
                  <RotateCcw size={16} /> Recomeçar
                </button>
              </div>
              {wordCount < 50 && wordCount > 0 && (
                <p className="word-warning-msg">Escreva pelo menos 50 palavras para analisar.</p>
              )}
            </div>

            {/* Sugestões ao vivo */}
            {(liveSuggestions.length > 0 || loadingLive) && (
              <div className="live-suggestions">
                <div className="live-suggestions-header">
                  <Sparkles size={14} />
                  <span>{loadingLive ? "Flora analisando..." : "Sugestões da Flora"}</span>
                  {loadingLive && <Loader2 size={12} className="spinner" />}
                </div>
                {liveSuggestions.map((s, i) => (
                  <div key={i} className={`live-suggestion-item live-suggestion-${s.type}`}>
                    <span className="live-suggestion-label">{
                      s.type === "coesao" ? "🔗 Coesão" :
                      s.type === "argumento" ? "💪 Argumento" :
                      s.type === "estrutura" ? "📐 Estrutura" : "📝 Vocabulário"
                    }</span>
                    <p>{s.text}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {currentStep === "feedback" && (
          <div className="feedback-section">
            <h2>Análise da Flora</h2>
            <div className="feedback-list">
              {feedback.map((item, i) => (
                <div key={i} className={`feedback-item ${item.type}`}>
                  <div className="feedback-icon">
                    {item.type === "positive" ? <CheckCircle size={18} /> :
                     item.type === "improvement" ? <AlertCircle size={18} /> :
                     <Lightbulb size={18} />}
                  </div>
                  <p className="feedback-message">{item.message}</p>
                </div>
              ))}
            </div>
            <div className="feedback-actions">
              <button className="submit-button" onClick={() => onComplete?.(essayText)}>
                ✅ Finalizar Redação
              </button>
              <button className="revise-button" onClick={handleReset}>
                ✏️ Reescrever
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
