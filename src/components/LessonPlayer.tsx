import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, BookOpen, CheckCircle2, GraduationCap, PlayCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface LessonBlock {
  titulo: string;
  conteudo: string;
  checkpoint: string;
}

interface LessonData {
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

interface LessonPlayerProps {
  lesson: LessonData;
  onComplete: () => void;
}

export function LessonPlayer({ lesson, onComplete }: LessonPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0: Intro, 1-N: Blocos, N+1: Resumo, N+2: Exercicio
  const totalSteps = lesson.blocos.length + 3;
  const progress = Math.round((currentStep / (totalSteps - 1)) * 100);

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 text-primary">
            <PlayCircle className="w-6 h-6" />
            <h3 className="text-xl font-bold">Introdução</h3>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {lesson.introducao}
          </p>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-sm font-medium text-primary">
              O que vamos aprender hoje:
            </p>
            <ul className="mt-2 space-y-1">
              {lesson.blocos.map((b, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {b.titulo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    if (currentStep <= lesson.blocos.length) {
      const bloco = lesson.blocos[currentStep - 1];
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-6 h-6" />
            <h3 className="text-xl font-bold">{bloco.titulo}</h3>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{bloco.conteudo}</ReactMarkdown>
          </div>
          <div className="mt-6 p-4 rounded-xl bg-secondary/30 border border-border">
            <p className="text-sm font-bold flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Checkpoint de Reflexão
            </p>
            <p className="mt-2 text-sm italic text-muted-foreground">
              "{bloco.checkpoint}"
            </p>
          </div>
        </div>
      );
    }

    if (currentStep === lesson.blocos.length + 1) {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="w-6 h-6" />
            <h3 className="text-xl font-bold">Resumo Executivo</h3>
          </div>
          <div className="grid gap-3">
            {lesson.resumo.map((item, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-card flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <p className="text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-2 text-primary">
          <GraduationCap className="w-6 h-6" />
          <h3 className="text-xl font-bold">Desafio Final</h3>
        </div>
        <p className="text-lg font-medium">{lesson.exercicio_final.pergunta}</p>
        <div className="grid gap-2">
          {lesson.exercicio_final.alternativas.map((alt, i) => (
            <Button
              key={i}
              variant="outline"
              className="justify-start h-auto py-3 px-4 text-left whitespace-normal"
              onClick={() => {
                if (i === lesson.exercicio_final.correta) {
                  toast.success("Correto! Excelente trabalho.");
                } else {
                  toast.error("Não foi dessa vez. Veja a explicação!");
                }
              }}
            >
              {alt}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border-2 border-primary/20 shadow-xl overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="bg-background">
            Aula Dinâmica
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            Passo {currentStep + 1} de {totalSteps}
          </span>
        </div>
        <CardTitle className="text-2xl font-heading">{lesson.titulo}</CardTitle>
        <Progress value={progress} className="h-2 mt-4" />
      </CardHeader>
      <CardContent className="p-6 min-h-[400px]">
        {renderStep()}
      </CardContent>
      <CardFooter className="flex justify-between p-6 bg-muted/30 border-t border-border">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </Button>
        <Button onClick={nextStep} className="gap-2 px-8">
          {currentStep === totalSteps - 1 ? "Concluir Aula" : "Próximo"} <ChevronRight className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
