import React, { useState, lazy, Suspense } from "react";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Loader2, Send, Image as ImageIcon, ChevronLeft, ChevronRight, Lightbulb, AlertTriangle, MessageCircleQuestion, CheckCircle2, XCircle, Sparkles, Brain, HelpCircle } from "lucide-react";
import { generateDidacticImage } from "@/lib/floraImages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import "./InteractiveLessonPlayer.css";

const ReactMarkdown = lazy(() => import("react-markdown"));

interface LessonBlock {
  titulo: string;
  conteudo: string;
  checkpoint?: string;
  macete?: string;
  pegadinha?: string;
  analogia?: string;
  exemplo_resolvido?: string;
  flora_comment?: string;
  mini_interacao?: string;
  duvida_simulada?: { pergunta: string; resposta: string };
}

interface Exercise {
  pergunta: string;
  alternativas?: string[];
  opcoes?: string[];
  correta: number;
  explicacao: string;
}

interface Lesson {
  titulo: string;
  introducao: string;
  blocos: LessonBlock[];
  resumo: string | string[];
  exercicios?: Exercise[];
  exercicio_final: Exercise;
}

interface Props {
  lesson: Lesson;
  onComplete?: () => void;
  enableVoice?: boolean;
  personality?: "rigorosa" | "amiga" | "engraçada";
}

function MD({ children }: { children: string }) {
  return (
    <Suspense fallback={<p style={{ whiteSpace: "pre-wrap" }}>{children}</p>}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{children}</ReactMarkdown>
    </Suspense>
  );
}

function ExerciseCard({ ex, label }: { ex: Exercise; label?: string }) {
  const opts = ex.alternativas || ex.opcoes || [];
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked !== null && picked === ex.correta;
  return (
    <div className="exercise-card">
      {label && <span className="exercise-label">{label}</span>}
      <div className="exercise-q"><MD>{ex.pergunta}</MD></div>
      <div className="exercise-opts">
        {opts.map((o, i) => {
          const cls =
            picked === null ? "" :
            i === ex.correta ? "correct" :
            i === picked ? "wrong" : "muted";
          return (
            <button key={i} className={`exercise-opt ${cls}`} onClick={() => picked === null && setPicked(i)} disabled={picked !== null}>
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={`exercise-feedback ${correct ? "ok" : "err"}`}>
          {correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <div><MD>{ex.explicacao}</MD></div>
        </div>
      )}
    </div>
  );
}

export const InteractiveLessonPlayer: React.FC<Props> = ({ lesson, onComplete }) => {
  const { user } = useAuth();
  const [stage, setStage] = useState<"intro" | "block" | "exercises" | "final" | "done">("intro");
  const [idx, setIdx] = useState(0);

  const [duvidaOpen, setDuvidaOpen] = useState(false);
  const [duvidaText, setDuvidaText] = useState("");
  const [duvidaLoading, setDuvidaLoading] = useState(false);
  const [duvidaResp, setDuvidaResp] = useState("");

  const [blockImage, setBlockImage] = useState<Record<number, string>>({});
  const [imgLoading, setImgLoading] = useState(false);

  const blocos = lesson.blocos || [];
  const cur = blocos[idx];
  const isLast = idx === blocos.length - 1;

  const askDuvida = async () => {
    if (!duvidaText.trim() || duvidaLoading) return;
    setDuvidaLoading(true); setDuvidaResp("");
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: { action: "lesson_doubt", data: { tema: lesson.titulo, blocoTitulo: cur?.titulo, blocoConteudo: cur?.conteudo, duvida: duvidaText.trim() } },
      });
      if (error) throw error;
      setDuvidaResp(data?.resposta || "Não consegui responder agora.");
    } catch (e: any) {
      toast.error("Erro ao pedir ajuda à Flora.");
    } finally { setDuvidaLoading(false); }
  };

  const generateImg = async () => {
    if (!cur || imgLoading || blockImage[idx]) return;
    const cacheKey = `flora-img:${lesson.titulo}:${cur.titulo}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setBlockImage((p) => ({ ...p, [idx]: cached })); return; }
    setImgLoading(true);
    try {
      const r = await generateDidacticImage({ concept: cur.titulo, context: cur.conteudo, style: "educational", userId: user?.id || "anon" });
      if (r.success && r.imageUrl) {
        setBlockImage((p) => ({ ...p, [idx]: r.imageUrl }));
        try { localStorage.setItem(cacheKey, r.imageUrl); } catch {}
      } else toast.error("Não consegui gerar a imagem agora.");
    } finally { setImgLoading(false); }
  };

  const next = () => {
    setDuvidaOpen(false); setDuvidaResp(""); setDuvidaText("");
    if (stage === "intro") { setStage("block"); return; }
    if (stage === "block") {
      if (!isLast) setIdx((i) => i + 1);
      else if (lesson.exercicios && lesson.exercicios.length) setStage("exercises");
      else setStage("final");
      return;
    }
    if (stage === "exercises") { setStage("final"); return; }
    if (stage === "final") { setStage("done"); onComplete?.(); }
  };
  const prev = () => {
    setDuvidaOpen(false); setDuvidaResp(""); setDuvidaText("");
    if (stage === "block" && idx > 0) setIdx((i) => i - 1);
    else if (stage === "exercises") { setStage("block"); setIdx(blocos.length - 1); }
    else if (stage === "final") { setStage(lesson.exercicios?.length ? "exercises" : "block"); }
    else if (stage === "block" && idx === 0) setStage("intro");
  };

  const totalSteps = 1 + blocos.length + (lesson.exercicios?.length ? 1 : 0) + 1;
  const stepIdx =
    stage === "intro" ? 1 :
    stage === "block" ? 1 + idx + 1 :
    stage === "exercises" ? 1 + blocos.length + 1 :
    totalSteps;

  const resumo = Array.isArray(lesson.resumo) ? lesson.resumo : (typeof lesson.resumo === "string" ? [lesson.resumo] : []);

  return (
    <div className="ilp-root">
      <div className="ilp-header">
        <h1 className="ilp-title">{lesson.titulo}</h1>
        <div className="ilp-progress">
          <span>Etapa {stepIdx} de {totalSteps}</span>
          <div className="ilp-bar"><div className="ilp-fill" style={{ width: `${(stepIdx / totalSteps) * 100}%` }} /></div>
        </div>
      </div>

      <div className="ilp-body">
        {stage === "intro" && (
          <div className="ilp-card">
            <div className="ilp-stage-label">Introdução</div>
            <div className="ilp-md"><MD>{lesson.introducao}</MD></div>
          </div>
        )}

        {stage === "block" && cur && (
          <div className="ilp-card">
            <div className="ilp-stage-label">Bloco {idx + 1} / {blocos.length}</div>
            <h2 className="ilp-block-title">{cur.titulo}</h2>

            {cur.flora_comment && (
              <div className="ilp-flora-bubble">
                <Sparkles size={16} />
                <div><MD>{cur.flora_comment}</MD></div>
              </div>
            )}

            {cur.analogia && (
              <div className="ilp-callout ilp-analogia">
                <Brain size={16} />
                <div><strong>Pensa assim:</strong> <MD>{cur.analogia}</MD></div>
              </div>
            )}

            <div className="ilp-md"><MD>{cur.conteudo}</MD></div>

            {cur.exemplo_resolvido && (
              <div className="ilp-exemplo">
                <div className="ilp-exemplo-head"><Lightbulb size={14} /> Exemplo resolvido</div>
                <div className="ilp-md"><MD>{cur.exemplo_resolvido}</MD></div>
              </div>
            )}

            {blockImage[idx] && (
              <div className="ilp-img-wrap"><img src={blockImage[idx]} alt={cur.titulo} /></div>
            )}
            {!blockImage[idx] && (
              <button className="ilp-secondary" onClick={generateImg} disabled={imgLoading}>
                {imgLoading ? <><Loader2 size={14} className="ilp-spin" /> Gerando ilustração...</> : <><ImageIcon size={14} /> Gerar ilustração</>}
              </button>
            )}

            {cur.macete && (
              <div className="ilp-callout ilp-macete">
                <Lightbulb size={16} /> <div><strong>Macete:</strong> <MD>{cur.macete}</MD></div>
              </div>
            )}
            {cur.pegadinha && (
              <div className="ilp-callout ilp-pegadinha">
                <AlertTriangle size={16} /> <div><strong>Pegadinha:</strong> <MD>{cur.pegadinha}</MD></div>
              </div>
            )}
            {cur.duvida_simulada?.pergunta && (
              <div className="ilp-callout ilp-duvida">
                <MessageCircleQuestion size={16} />
                <div>
                  <strong>{cur.duvida_simulada.pergunta}</strong>
                  <div className="ilp-md"><MD>{cur.duvida_simulada.resposta}</MD></div>
                </div>
              </div>
            )}

            {cur.mini_interacao && (
              <div className="ilp-mini-interacao">
                <HelpCircle size={14} />
                <span>{cur.mini_interacao}</span>
              </div>
            )}

            {cur.checkpoint && (
              <div className="ilp-checkpoint">
                <strong>Pra fixar:</strong> {cur.checkpoint}
              </div>
            )}
          </div>
        )}

        {stage === "exercises" && lesson.exercicios && (
          <div className="ilp-card">
            <div className="ilp-stage-label">Exercícios progressivos</div>
            {lesson.exercicios.map((ex, i) => <ExerciseCard key={i} ex={ex} label={`Exercício ${i + 1}`} />)}
          </div>
        )}

        {stage === "final" && (
          <div className="ilp-card">
            <div className="ilp-stage-label">Revisão final</div>
            {resumo.length > 0 && (
              <ul className="ilp-resumo">
                {resumo.map((r, i) => <li key={i}><MD>{r}</MD></li>)}
              </ul>
            )}
            {lesson.exercicio_final && <ExerciseCard ex={lesson.exercicio_final} label="Questão final" />}
            <button className="ilp-primary" onClick={() => { setStage("done"); onComplete?.(); }}>Concluir aula</button>
          </div>
        )}

        {stage === "done" && (
          <div className="ilp-card ilp-done">
            <h2>Aula concluída 🎯</h2>
            <p>Boa! Você terminou a aula sobre <strong>{lesson.titulo}</strong>.</p>
          </div>
        )}
      </div>

      <div className="ilp-controls">
        <button className="ilp-nav" onClick={prev} disabled={stage === "intro"}><ChevronLeft size={18} /> Voltar</button>
        <button className="ilp-nav ask" onClick={() => setDuvidaOpen((v) => !v)}>
          <MessageCircleQuestion size={18} /> Tirar dúvida
        </button>
        <button className="ilp-nav primary" onClick={next} disabled={stage === "done"}>
          {stage === "intro" ? "Começar" : stage === "final" ? "Concluir" : "Próximo"} <ChevronRight size={18} />
        </button>
      </div>

      {duvidaOpen && (
        <div className="ilp-duvida-panel">
          <div className="ilp-duvida-head">
            <strong>Pergunta para Flora</strong>
            <button onClick={() => setDuvidaOpen(false)}>✕</button>
          </div>
          {duvidaResp ? (
            <div className="ilp-duvida-resp">
              <div className="ilp-md"><MD>{duvidaResp}</MD></div>
              <button className="ilp-primary" onClick={() => { setDuvidaResp(""); setDuvidaText(""); }}>Outra pergunta</button>
            </div>
          ) : (
            <div className="ilp-duvida-form">
              <textarea
                rows={3}
                placeholder="Não entendi essa parte... explica de outra forma?"
                value={duvidaText}
                onChange={(e) => setDuvidaText(e.target.value)}
              />
              <button className="ilp-primary" onClick={askDuvida} disabled={duvidaLoading || !duvidaText.trim()}>
                {duvidaLoading ? <><Loader2 size={14} className="ilp-spin" /> Pensando...</> : <><Send size={14} /> Perguntar</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
