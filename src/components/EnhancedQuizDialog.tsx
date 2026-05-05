import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Brain, Zap, Award } from "lucide-react";

interface QuizQuestion {
  pergunta: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
  tema?: string;
}

interface EnhancedQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
  topic?: string;
}

export function EnhancedQuizDialog({
  open,
  onOpenChange,
  questions,
  onComplete,
  topic,
}: EnhancedQuizDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [combo, setCombo] = useState(0);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isCorrect = selectedAnswer === currentQuestion?.correta;

  const handleSelectAnswer = (index: number) => {
    if (selectedAnswer !== null) return; // Já respondeu
    setSelectedAnswer(index);
    setShowExplanation(true);

    if (index === currentQuestion.correta) {
      setScore(score + 1);
      setCombo(combo + 1);
    } else {
      setCombo(0);
    }

    setAnsweredQuestions(new Set([...answeredQuestions, currentIndex]));
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setFinished(true);
      onComplete?.(score + (isCorrect ? 1 : 0), questions.length);
    }
  };

  const handleClose = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setFinished(false);
    setShowExplanation(false);
    setAnsweredQuestions(new Set());
    setCombo(0);
    onOpenChange(false);
  };

  const getDifficultyColor = (index: number) => {
    if (index < questions.length * 0.33) return "text-blue-500";
    if (index < questions.length * 0.66) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent" />
              <DialogTitle>{topic ? `Quiz: ${topic}` : "Quiz"}</DialogTitle>
            </div>
            {combo > 1 && (
              <Badge variant="secondary" className="gap-1">
                <Zap className="w-3 h-3" />
                Combo x{combo}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {!finished ? (
          <div className="space-y-6">
            {/* Progresso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Questão {currentIndex + 1} de {questions.length}
                </span>
                <span className="font-semibold text-accent">
                  {score} acerto{score !== 1 ? "s" : ""}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Pergunta */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold leading-relaxed">
                {currentQuestion?.pergunta}
              </h3>

              {/* Alternativas */}
              <div className="space-y-2">
                {currentQuestion?.alternativas.map((alt, idx) => {
                  let style =
                    "border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer";
                  let disabled = false;

                  if (selectedAnswer !== null) {
                    disabled = true;
                    if (idx === currentQuestion.correta) {
                      style = "border-secondary bg-secondary/10 cursor-default";
                    } else if (idx === selectedAnswer) {
                      style = "border-destructive bg-destructive/10 cursor-default";
                    } else {
                      style = "border-border opacity-50 cursor-default";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={disabled}
                      className={`w-full text-left p-4 rounded-lg border-2 text-sm transition-all ${style}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-semibold text-muted-foreground min-w-fit">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span className="flex-1">{alt}</span>
                        {selectedAnswer !== null && idx === currentQuestion.correta && (
                          <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0" />
                        )}
                        {selectedAnswer !== null && idx === selectedAnswer && idx !== currentQuestion.correta && (
                          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Feedback e Explicação */}
              {showExplanation && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  {/* Status */}
                  <div
                    className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${
                      isCorrect
                        ? "bg-secondary/10 text-secondary"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Resposta Correta!
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        Resposta Incorreta
                      </>
                    )}
                  </div>

                  {/* Explicação Detalhada */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Explicação
                    </p>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {currentQuestion?.explicacao}
                    </p>
                  </div>

                  {/* Dica de Melhoria */}
                  {!isCorrect && (
                    <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-400">
                      <p className="font-medium mb-1">Dica:</p>
                      <p>
                        Revise este conteúdo no seu caderno e tente novamente em 3 dias para
                        reforçar o aprendizado.
                      </p>
                    </div>
                  )}

                  {/* Botão Próxima */}
                  <Button onClick={handleNext} className="w-full">
                    {currentIndex + 1 >= questions.length ? "Ver Resultado" : "Próxima Questão"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tela de Resultado */
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <Award className="w-12 h-12 text-accent" />
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-accent">
                  {Math.round((score / questions.length) * 100)}%
                </p>
                <p className="text-lg font-semibold">
                  {score} de {questions.length} acertos
                </p>
              </div>
            </div>

            {/* Análise de Desempenho */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/10 p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Taxa de Acerto</p>
                <p className="text-2xl font-bold text-secondary">
                  {Math.round((score / questions.length) * 100)}%
                </p>
              </div>
              <div className="bg-accent/10 p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Questões Erradas</p>
                <p className="text-2xl font-bold text-accent">
                  {questions.length - score}
                </p>
              </div>
            </div>

            {/* Sugestões de Próximos Passos */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Próximos Passos:</p>
              {score / questions.length >= 0.8 ? (
                <p className="text-sm text-foreground/90">
                  Excelente desempenho! Você domina bem este tópico. Tente um quiz mais desafiador
                  ou passe para o próximo assunto.
                </p>
              ) : score / questions.length >= 0.6 ? (
                <p className="text-sm text-foreground/90">
                  Bom trabalho! Revise os pontos onde errou e tente novamente em 2-3 dias.
                </p>
              ) : (
                <p className="text-sm text-foreground/90">
                  Recomendamos revisar o material do caderno antes de tentar novamente.
                </p>
              )}
            </div>

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
