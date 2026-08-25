import { useEffect, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  Clipboard,
  ExternalLink,
  Focus,
  Microscope,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  medicalPathologies,
  type MedicalPathology,
  type PathologyHotspot,
} from "@/lib/medicalPathology";

interface MedicalPathologyLabProps {
  onOpenNotebook: () => void;
}

type DetailTab = "changes" | "progression" | "practice";

export function MedicalPathologyLab({
  onOpenNotebook,
}: MedicalPathologyLabProps) {
  const [activeId, setActiveId] = useState(medicalPathologies[0].id);
  const [split, setSplit] = useState(50);
  const [stage, setStage] = useState(0);
  const [tab, setTab] = useState<DetailTab>("changes");
  const [hotspotId, setHotspotId] = useState(
    medicalPathologies[0].hotspots[0].id,
  );
  const [answer, setAnswer] = useState<number | null>(null);
  const pathology =
    medicalPathologies.find((item) => item.id === activeId) ??
    medicalPathologies[0];
  const hotspot =
    pathology.hotspots.find((item) => item.id === hotspotId) ??
    pathology.hotspots[0];

  useEffect(() => {
    setSplit(50);
    setStage(0);
    setTab("changes");
    setHotspotId(pathology.hotspots[0].id);
    setAnswer(null);
  }, [pathology.id]);

  const copyTransparentImage = async () => {
    try {
      const response = await fetch(pathology.image);
      if (!response.ok) throw new Error("Falha ao carregar a imagem");
      const blob = await response.blob();
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast.success("Imagem sem fundo copiada", {
          description:
            "Cole no Caderno Flora, Samsung Notes ou outro aplicativo compatível.",
        });
        return;
      }
      downloadImage(blob, pathology);
    } catch {
      const response = await fetch(pathology.image);
      const blob = await response.blob();
      downloadImage(blob, pathology);
    }
  };

  return (
    <div
      className="pathology-page"
      style={{ "--path-accent": pathology.accent } as CSSProperties}
    >
      <header className="pathology-heading">
        <div>
          <span>
            <Microscope /> Anatomia comparada · Patologia
          </span>
          <h1>Do tecido saudável à alteração.</h1>
          <p>
            Compare padrões morfológicos, acompanhe a evolução e conecte a
            imagem ao raciocínio — sem transformar uma ilustração em
            diagnóstico.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <div>
            <strong>Ambiente educacional protegido</strong>
            <span>
              Ilustrações sintéticas revisáveis, fontes abertas e limites
              explícitos.
            </span>
          </div>
        </aside>
      </header>

      <nav className="pathology-organ-nav" aria-label="Órgãos disponíveis">
        {medicalPathologies.map((item) => (
          <button
            key={item.id}
            className={item.id === pathology.id ? "active" : ""}
            onClick={() => setActiveId(item.id)}
            style={{ "--organ-accent": item.accent } as CSSProperties}
          >
            <span>{item.organ.slice(0, 2).toLocaleUpperCase("pt-BR")}</span>
            <div>
              <small>{item.system}</small>
              <strong>{item.organ}</strong>
              <em>{item.condition}</em>
            </div>
            <ArrowRight />
          </button>
        ))}
      </nav>

      <section className="pathology-studio">
        <div className="pathology-visual-column">
          <header>
            <div>
              <small>PRANCHA COMPARATIVA</small>
              <strong>
                {pathology.organ} · {pathology.condition}
              </strong>
            </div>
            <button onClick={() => setSplit(50)}>
              <RotateCcw /> Centralizar
            </button>
          </header>

          <div
            className="pathology-compare"
            role="img"
            aria-label={pathology.imageAlt}
          >
            <div
              className="pathology-image healthy"
              style={{ backgroundImage: `url(${pathology.image})` }}
            />
            <div
              className="pathology-image affected"
              style={{
                backgroundImage: `url(${pathology.image})`,
                clipPath: `inset(0 0 0 ${split}%)`,
              }}
            />
            <div className="pathology-image-shade" />
            <div className="pathology-side-label healthy">
              <i />
              <span>
                <small>REFERÊNCIA</small>
                <strong>Saudável</strong>
              </span>
            </div>
            <div className="pathology-side-label affected">
              <span>
                <small>ALTERAÇÃO</small>
                <strong>{pathology.condition}</strong>
              </span>
              <i />
            </div>
            {pathology.hotspots.map((item, index) => (
              <HotspotButton
                key={item.id}
                hotspot={item}
                index={index}
                active={item.id === hotspot.id}
                visible={item.x >= split - 4}
                onClick={() => {
                  setHotspotId(item.id);
                  setTab("changes");
                }}
              />
            ))}
            <div className="pathology-divider" style={{ left: `${split}%` }}>
              <span>
                <Focus />
              </span>
            </div>
            <input
              aria-label="Controlar comparação entre saudável e patológico"
              type="range"
              min="8"
              max="92"
              value={split}
              onInput={(event) =>
                setSplit(Number((event.target as HTMLInputElement).value))
              }
              onChange={(event) => setSplit(Number(event.target.value))}
            />
          </div>

          <div className="pathology-comparison-copy">
            <article>
              <span>SAUDÁVEL</span>
              <p>{pathology.healthy}</p>
            </article>
            <article>
              <span>ALTERAÇÃO PATOLÓGICA</span>
              <p>{pathology.pathological}</p>
            </article>
          </div>

          <section className="pathology-stage-track">
            <header>
              <div>
                <small>EVOLUÇÃO CONCEITUAL</small>
                <strong>{pathology.stages[stage].title}</strong>
              </div>
              <span>
                Etapa {stage + 1} de {pathology.stages.length}
              </span>
            </header>
            <div>
              {pathology.stages.map((item, index) => (
                <button
                  key={item.title}
                  className={
                    index === stage ? "active" : index < stage ? "done" : ""
                  }
                  onClick={() => {
                    setStage(index);
                    setTab("progression");
                  }}
                >
                  <span>{index < stage ? <Check /> : item.label}</span>
                  <strong>{item.title}</strong>
                </button>
              ))}
            </div>
            <p>{pathology.stages[stage].description}</p>
          </section>
        </div>

        <aside className="pathology-inspector">
          <header>
            <span>ESTRUTURA EM ESTUDO</span>
            <h2>{pathology.organ}</h2>
            <p>{pathology.condition}</p>
          </header>
          <div className="pathology-tabs">
            <button
              className={tab === "changes" ? "active" : ""}
              onClick={() => setTab("changes")}
            >
              Alterações
            </button>
            <button
              className={tab === "progression" ? "active" : ""}
              onClick={() => setTab("progression")}
            >
              Evolução
            </button>
            <button
              className={tab === "practice" ? "active" : ""}
              onClick={() => setTab("practice")}
            >
              Pergunta
            </button>
          </div>

          {tab === "changes" && (
            <div className="pathology-tab-panel">
              <div className="pathology-hotspot-card">
                <span>
                  {String(pathology.hotspots.indexOf(hotspot) + 1).padStart(
                    2,
                    "0",
                  )}
                </span>
                <div>
                  <small>PONTO INTERATIVO</small>
                  <strong>{hotspot.label}</strong>
                  <p>{hotspot.description}</p>
                </div>
              </div>
              <div className="pathology-hotspot-list">
                {pathology.hotspots.map((item, index) => (
                  <button
                    key={item.id}
                    className={item.id === hotspot.id ? "active" : ""}
                    onClick={() => setHotspotId(item.id)}
                  >
                    <b>{index + 1}</b>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <InfoGroup
                title="Fatores e mecanismos"
                items={pathology.causes}
              />
              <InfoGroup
                title="Achados que podem se relacionar"
                items={pathology.findings}
              />
              <InfoGroup title="Como se investiga" items={pathology.tests} />
            </div>
          )}

          {tab === "progression" && (
            <div className="pathology-tab-panel progression">
              {pathology.stages.map((item, index) => (
                <button
                  key={item.title}
                  className={index === stage ? "active" : ""}
                  onClick={() => setStage(index)}
                >
                  <span>{item.label}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </button>
              ))}
              <aside>
                <AlertTriangle />
                <p>
                  <strong>Não é uma linha inevitável.</strong> Pessoas podem ter
                  causas, ritmos, gravidades e respostas diferentes. Os estágios
                  organizam o estudo, não preveem um indivíduo.
                </p>
              </aside>
            </div>
          )}

          {tab === "practice" && (
            <div className="pathology-tab-panel practice">
              <span>
                <Sparkles /> IDENTIFICAÇÃO ATIVA
              </span>
              <h3>{pathology.question.prompt}</h3>
              <div>
                {pathology.question.options.map((option, index) => {
                  const state =
                    answer === null
                      ? ""
                      : index === pathology.question.answer
                        ? "correct"
                        : index === answer
                          ? "wrong"
                          : "muted";
                  return (
                    <button
                      key={option}
                      className={state}
                      onClick={() => answer === null && setAnswer(index)}
                    >
                      <b>{String.fromCharCode(65 + index)}</b>
                      <span>{option}</span>
                      {state === "correct" && <Check />}
                      {state === "wrong" && <X />}
                    </button>
                  );
                })}
              </div>
              {answer !== null && (
                <aside
                  className={
                    answer === pathology.question.answer ? "correct" : "review"
                  }
                >
                  <Sparkles />
                  <p>
                    <strong>
                      {answer === pathology.question.answer
                        ? "Correto"
                        : "Revise o mecanismo"}
                    </strong>
                    {pathology.question.explanation}
                  </p>
                </aside>
              )}
            </div>
          )}

          <section className="pathology-limit">
            <ShieldCheck />
            <p>
              <strong>Limite visual</strong>
              {pathology.visualLimit}
            </p>
          </section>
          <a
            className="pathology-source"
            href={pathology.source.url}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen />
            <span>
              <small>FONTE PRINCIPAL</small>
              <strong>{pathology.source.organization}</strong>
            </span>
            <ExternalLink />
          </a>
          <div className="pathology-actions">
            <button onClick={copyTransparentImage}>
              <Clipboard /> Copiar sem fundo
            </button>
            <button onClick={onOpenNotebook}>
              <BookOpen /> Abrir Caderno
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}

function HotspotButton({
  hotspot,
  index,
  active,
  visible,
  onClick,
}: {
  hotspot: PathologyHotspot;
  index: number;
  active: boolean;
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`pathology-hotspot ${active ? "active" : ""}`}
      style={{
        left: `${hotspot.x}%`,
        top: `${hotspot.y}%`,
        opacity: visible ? 1 : 0.18,
      }}
      onClick={onClick}
      aria-label={`Examinar ${hotspot.label}`}
    >
      <span>{index + 1}</span>
    </button>
  );
}

function InfoGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="pathology-info-group">
      <h4>{title}</h4>
      {items.map((item) => (
        <div key={item}>
          <Check />
          <span>{item}</span>
        </div>
      ))}
    </section>
  );
}

function downloadImage(blob: Blob, pathology: MedicalPathology) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `flora-${pathology.id}-${pathology.condition.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-")}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success("PNG sem fundo baixado", {
    description:
      "O navegador não permitiu copiar; o arquivo foi salvo para você inserir onde quiser.",
  });
}
