import React, { useState, useEffect } from "react";
import { Play, BookOpen, Link as LinkIcon, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface Question {
  id: string;
  titulo: string;
  descricao: string;
  materia: string;
  tema: string;
  dificuldade: string;
  alternativas: string[];
  resposta_correta: number;
}

interface Video {
  id: string;
  titulo: string;
  url: string;
  fonte: string;
  duracao: string;
}

interface Resource {
  id: string;
  titulo: string;
  url: string;
  tipo: string;
  materia: string;
  tema: string;
}

interface AulaoContent {
  questions: Question[];
  videos: Video[];
  resources: Resource[];
  summary: {
    totalQuestions: number;
    totalVideos: number;
    totalResources: number;
  };
}

interface AulaoLessonViewProps {
  topic: string;
  materia: string;
  difficulty?: "facil" | "medio" | "dificil";
  onSelectQuestion?: (question: Question) => void;
}

export const AulaoLessonView: React.FC<AulaoLessonViewProps> = ({
  topic,
  materia,
  difficulty = "medio",
  onSelectQuestion,
}) => {
  const [content, setContent] = useState<AulaoContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    questions: true,
    videos: true,
    resources: true,
  });

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        const { data, error: err } = await supabase.functions.invoke("search-related-content", {
          body: {
            topic,
            materia,
            difficulty,
            limit: 10,
          },
        });

        if (err) {
          throw new Error(err.message || "Erro ao buscar conteúdo");
        }

        setContent(data.data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
        setContent(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [topic, materia, difficulty]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Erro ao carregar conteúdo</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
        <p>Nenhum conteúdo encontrado para este tópico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{content.summary.totalQuestions}</div>
          <div className="text-sm text-blue-600">Questões</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-700">{content.summary.totalVideos}</div>
          <div className="text-sm text-purple-600">Vídeos</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-700">{content.summary.totalResources}</div>
          <div className="text-sm text-green-600">Recursos</div>
        </div>
      </div>

      {/* Questões */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("questions")}
          className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" />
            <span className="font-semibold text-gray-800">Questões ({content.summary.totalQuestions})</span>
          </div>
          {expandedSections.questions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {expandedSections.questions && (
          <div className="p-4 space-y-3">
            {content.questions.length > 0 ? (
              content.questions.map((q) => (
                <div
                  key={q.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectQuestion?.(q)}
                >
                  <div className="font-medium text-gray-800">{q.titulo}</div>
                  <div className="text-sm text-gray-600 mt-1">{q.descricao}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {q.dificuldade}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma questão encontrada.</p>
            )}
          </div>
        )}
      </div>

      {/* Vídeos */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("videos")}
          className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Play size={20} className="text-purple-600" />
            <span className="font-semibold text-gray-800">Vídeos ({content.summary.totalVideos})</span>
          </div>
          {expandedSections.videos ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {expandedSections.videos && (
          <div className="p-4 space-y-3">
            {content.videos.length > 0 ? (
              content.videos.map((v) => (
                <a
                  key={v.id}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <Play size={18} className="text-purple-600 group-hover:text-purple-700 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 group-hover:text-purple-600">{v.titulo}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {v.fonte} • {v.duracao}
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhum vídeo encontrado.</p>
            )}
          </div>
        )}
      </div>

      {/* Recursos */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("resources")}
          className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <LinkIcon size={20} className="text-green-600" />
            <span className="font-semibold text-gray-800">Recursos ({content.summary.totalResources})</span>
          </div>
          {expandedSections.resources ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {expandedSections.resources && (
          <div className="p-4 space-y-3">
            {content.resources.length > 0 ? (
              content.resources.map((r) => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <LinkIcon size={18} className="text-green-600 group-hover:text-green-700 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 group-hover:text-green-600">{r.titulo}</div>
                    <div className="text-xs text-gray-500 mt-1">{r.tipo}</div>
                  </div>
                </a>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhum recurso encontrado.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
