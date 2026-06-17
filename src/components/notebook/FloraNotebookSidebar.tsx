import { useState } from "react";
import { Sparkles, X, FileText, Brain, Zap, BookOpen, Loader2, ImagePlus } from "lucide-react";
import type { AIActivityItem } from "@/lib/aiActivityStore";
import "./notebook-premium.css";

interface FloraNotebookSidebarProps {
  open: boolean;
  onClose: () => void;
  linkedTopicTitle?: string;
  summary: string;
  activities: AIActivityItem[];
  generatingStudy: "none" | "flashcards" | "quiz" | "summary" | "image";
  onGenerateSummary: () => void;
  onGenerateFlashcards: () => void;
  onGenerateQuiz: () => void;
  onCreateTopic: () => void;
  onSyncSummary: () => void;
  onGenerateImage?: () => void;
}

export function FloraNotebookSidebar({
  open,
  onClose,
  linkedTopicTitle,
  summary,
  activities,
  generatingStudy,
  onGenerateSummary,
  onGenerateFlashcards,
  onGenerateQuiz,
  onCreateTopic,
  onSyncSummary,
  onGenerateImage,
}: FloraNotebookSidebarProps) {
  const isGenerating = generatingStudy !== "none";

  return (
    <aside className={`nb-flora-sidebar ${open ? "open" : ""}`}>
      {/* Header */}
      <div className="nb-flora-sidebar-header">
        <div className="nb-flora-sidebar-title">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span>Flora IA</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="nb-toolbar-btn"
          style={{ width: 28, height: 28 }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Connection status */}
      <div className="px-4 py-2 border-b" style={{ borderColor: "var(--nb-toolbar-border)" }}>
        <p className="text-xs text-muted-foreground">
          {linkedTopicTitle
            ? <>Conectado a <span className="font-medium text-foreground">{linkedTopicTitle}</span></>
            : "Página sem tópico vinculado"
          }
        </p>
      </div>

      {/* Quick actions */}
      <div className="nb-flora-actions">
        <button
          type="button"
          onClick={onGenerateSummary}
          disabled={isGenerating}
          className={`nb-flora-action-btn ${generatingStudy === "summary" ? "loading" : ""}`}
        >
          {generatingStudy === "summary" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          Resumo
        </button>
        <button
          type="button"
          onClick={onGenerateFlashcards}
          disabled={isGenerating}
          className={`nb-flora-action-btn ${generatingStudy === "flashcards" ? "loading" : ""}`}
        >
          {generatingStudy === "flashcards" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          Flashcards
        </button>
        <button
          type="button"
          onClick={onGenerateQuiz}
          disabled={isGenerating}
          className={`nb-flora-action-btn ${generatingStudy === "quiz" ? "loading" : ""}`}
        >
          {generatingStudy === "quiz" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Brain className="w-3.5 h-3.5" />
          )}
          Quiz
        </button>
        <button
          type="button"
          onClick={onCreateTopic}
          disabled={isGenerating}
          className="nb-flora-action-btn"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Criar Tópico
        </button>
        {onGenerateImage && (
          <button
            type="button"
            onClick={onGenerateImage}
            disabled={isGenerating}
            className={`nb-flora-action-btn ${generatingStudy === "image" ? "loading" : ""}`}
          >
            {generatingStudy === "image" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
            Imagem IA
          </button>
        )}
        {summary && (
          <button
            type="button"
            onClick={onSyncSummary}
            disabled={isGenerating}
            className="nb-flora-action-btn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Enviar ao Tópico
          </button>
        )}
      </div>

      {/* Summary preview */}
      {summary && (
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--nb-toolbar-border)" }}>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Resumo IA</p>
          <p className="text-xs text-foreground/80 leading-relaxed max-h-24 overflow-y-auto">
            {summary}
          </p>
        </div>
      )}

      {/* Activity feed */}
      <div className="nb-flora-chat-area">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Histórico</p>
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="nb-flora-activity-item">
              <p className="nb-flora-activity-title">{activity.title}</p>
              <p className="nb-flora-activity-detail">{activity.detail}</p>
              <p className="nb-flora-activity-time">
                {new Date(activity.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground/70">Flora pronta</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Use os botões acima para gerar resumo, flashcards ou quiz a partir do conteúdo desta página.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
