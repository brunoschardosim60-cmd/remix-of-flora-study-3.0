import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ExternalLink, Eye, HelpCircle, Maximize2, Minimize2, RotateCcw, Rotate3D, Search, Shuffle, X } from "lucide-react";
import { medicalSources } from "@/lib/medicineData";
import {
  cleanHraMeshName,
  hraAvailableSexes,
  hraModelTotals,
  hraOrganById,
  hraOrgans,
  hraPartsFor,
  hraResolveSex,
  hraSexLabel,
  hraSystemOrder,
  type HraSex,
} from "@/lib/hraOrganLibrary";
import "./hra-organ-library.css";

const HraOrganViewport = lazy(() => import("./HraOrganViewport"));

const numberFormat = new Intl.NumberFormat("pt-BR");

export function HraOrganLibrary() {
  const [organId, setOrganId] = useState("heart");
  const [preferredSex, setPreferredSex] = useState<HraSex>("female");
  const [meshNames, setMeshNames] = useState<string[]>([]);
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [query, setQuery] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState(false);
  const [score, setScore] = useState({ hits: 0, total: 0 });

  const organ = hraOrganById(organId) ?? hraOrgans[0];
  const sex = hraResolveSex(organ, preferredSex);
  const sexes = hraAvailableSexes(organ);
  const parts = useMemo(() => hraPartsFor(organ, sex), [organ, sex]);
  const totals = useMemo(() => hraModelTotals(parts), [parts]);
  const source = medicalSources[organ.sourceId];

  const filteredMeshes = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    const entries = meshNames.map((raw) => ({ raw, label: cleanHraMeshName(raw) }));
    return term ? entries.filter((entry) => entry.label.toLocaleLowerCase("pt-BR").includes(term)) : entries;
  }, [meshNames, query]);

  useEffect(() => {
    setRevealed(false);
    setRated(false);
  }, [selectedMesh]);

  const drawStructure = () => {
    if (!meshNames.length) return;
    const pool = meshNames.length > 1 ? meshNames.filter((name) => name !== selectedMesh) : meshNames;
    setIsolate(false);
    setAutoRotate(false);
    setSelectedMesh(pool[Math.floor(Math.random() * pool.length)]);
  };

  const rate = (hit: boolean) => {
    setScore((current) => ({ hits: current.hits + (hit ? 1 : 0), total: current.total + 1 }));
    setRated(true);
  };

  const toggleQuiz = () => {
    setQuizMode((value) => !value);
    setSelectedMesh(null);
    setScore({ hits: 0, total: 0 });
    setQuery("");
  };

  const handleMeshesReady = useCallback((names: string[]) => setMeshNames(names), []);

  const chooseOrgan = (id: string) => {
    setOrganId(id);
    setSelectedMesh(null);
    setMeshNames([]);
    setQuery("");
    setIsolate(false);
    setResetKey((value) => value + 1);
  };

  const chooseSex = (next: HraSex) => {
    setPreferredSex(next);
    setSelectedMesh(null);
    setMeshNames([]);
  };

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.requestFullscreen?.();
  };

  const selectedLabel = selectedMesh ? cleanHraMeshName(selectedMesh) : null;

  return (
    <section className="hra-library" aria-labelledby="hra-library-title">
      <header className="hra-library-head">
        <div>
          <span className="med-eyebrow">Anatomia · modelos de referência</span>
          <h2 id="hra-library-title">Órgãos 3D</h2>
          <p>Cada órgão aparece isolado, com as estruturas que o compõem. Gire, aproxime e toque em uma parte para destacá-la.</p>
        </div>
      </header>

      <div className="hra-library-grid">
        <nav className="hra-organ-list" aria-label="Órgãos disponíveis">
          {hraSystemOrder.map((system) => {
            const items = hraOrgans.filter((item) => item.system === system);
            if (!items.length) return null;
            return (
              <div key={system} className="hra-organ-group">
                <h3>{system}</h3>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === organ.id ? "active" : ""}
                    aria-pressed={item.id === organ.id}
                    onClick={() => chooseOrgan(item.id)}
                  >
                    <span>{item.name}</span>
                    <small>{item.latin}</small>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="hra-stage" ref={stageRef}>
          <div className="hra-stage-bar">
            <div className="hra-sex-toggle" role="group" aria-label="Modelo de referência">
              {(["female", "male"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={sex === option}
                  disabled={!sexes.includes(option)}
                  title={sexes.includes(option) ? undefined : "Este órgão só existe na versão " + hraSexLabel[sexes[0]].toLocaleLowerCase("pt-BR") + " do atlas"}
                  onClick={() => chooseSex(option)}
                >
                  {hraSexLabel[option]}
                </button>
              ))}
            </div>
            <div className="hra-stage-actions">
              <button type="button" aria-pressed={autoRotate} onClick={() => setAutoRotate((value) => !value)}>
                <Rotate3D aria-hidden="true" /> Girar
              </button>
              <button type="button" onClick={() => setResetKey((value) => value + 1)}>
                <RotateCcw aria-hidden="true" /> Centralizar
              </button>
              <button type="button" onClick={toggleFullscreen} aria-pressed={fullscreen}>
                {fullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                {fullscreen ? "Sair da tela cheia" : "Tela cheia"}
              </button>
            </div>
          </div>

          <div className="hra-canvas-wrap">
            <Suspense fallback={<div className="hra-viewport-state"><Rotate3D aria-hidden="true" /><strong>Carregando o modelo…</strong></div>}>
              <HraOrganViewport
                parts={parts}
                color={organ.color}
                autoRotate={autoRotate && !selectedMesh}
                selectedMesh={selectedMesh}
                isolateSelected={isolate}
                resetKey={resetKey}
                onMeshesReady={handleMeshesReady}
                onSelectMesh={setSelectedMesh}
              />
            </Suspense>
            <span className="hra-stage-hint">Arraste para girar · role para aproximar · toque em uma parte para destacá-la</span>
          </div>
        </div>

        <aside className="hra-detail" aria-label={`Detalhes de ${organ.name}`}>
          <span className="med-eyebrow">{organ.system} · modelo {hraSexLabel[sex].toLocaleLowerCase("pt-BR")}</span>
          <h3>{organ.name}</h3>
          <em lang="la">{organ.latin}</em>
          <p>{organ.summary}</p>
          <dl>
            <div><dt>Função</dt><dd>{organ.function}</dd></div>
            <div>
              <dt>Modelo</dt>
              <dd>{numberFormat.format(totals.meshCount)} estruturas · {numberFormat.format(totals.triangleCount)} triângulos</dd>
            </div>
          </dl>

          <button type="button" className="hra-quiz-toggle" aria-pressed={quizMode} onClick={toggleQuiz}>
            <HelpCircle aria-hidden="true" /> {quizMode ? "Voltar ao modo estudo" : "Testar-me"}
          </button>

          {quizMode ? (
            <div className="hra-quiz" aria-live="polite">
              <p className="hra-quiz-score">Acertos: <strong>{score.hits}</strong> de {score.total}</p>
              {!selectedMesh ? (
                <p>Sorteie uma estrutura: ela será destacada no modelo. Tente dizer o nome antes de conferir. Você também pode tocar em uma parte do modelo.</p>
              ) : revealed ? (
                <>
                  <p className="hra-quiz-answer">Era: <strong>{selectedLabel}</strong></p>
                  {!rated ? (
                    <div className="hra-quiz-rate">
                      <button type="button" onClick={() => rate(true)}><Check aria-hidden="true" /> Acertei</button>
                      <button type="button" onClick={() => rate(false)}><X aria-hidden="true" /> Errei</button>
                    </div>
                  ) : <p>Registrado. Sorteie a próxima.</p>}
                </>
              ) : (
                <>
                  <p>Que estrutura está destacada?</p>
                  <button type="button" onClick={() => setRevealed(true)}><Eye aria-hidden="true" /> Revelar nome</button>
                </>
              )}
              <button type="button" onClick={drawStructure} disabled={!meshNames.length}><Shuffle aria-hidden="true" /> Sortear estrutura</button>
            </div>
          ) : (<>
          <div className="hra-mesh-tools">
            <label className="hra-mesh-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar estrutura do modelo"
                aria-label="Buscar estrutura do modelo"
              />
            </label>
            <button type="button" aria-pressed={isolate} disabled={!selectedMesh} onClick={() => setIsolate((value) => !value)}>
              <Eye aria-hidden="true" /> {isolate ? "Mostrar tudo" : "Isolar selecionada"}
            </button>
          </div>

          <p className="hra-selected" aria-live="polite">
            {selectedLabel ? <>Selecionada: <strong>{selectedLabel}</strong></> : "Nenhuma estrutura selecionada."}
          </p>

          <ul className="hra-mesh-list" aria-label="Estruturas do modelo">
            {filteredMeshes.map((entry) => (
              <li key={entry.raw}>
                <button
                  type="button"
                  className={entry.raw === selectedMesh ? "active" : ""}
                  aria-pressed={entry.raw === selectedMesh}
                  onClick={() => setSelectedMesh(entry.raw === selectedMesh ? null : entry.raw)}
                >
                  {entry.label}
                </button>
              </li>
            ))}
            {meshNames.length > 0 && filteredMeshes.length === 0 && <li className="hra-mesh-empty">Nenhuma estrutura encontrada.</li>}
          </ul>
          <p className="hra-lang-note">Nomes das estruturas como constam no modelo de referência (em inglês).</p>
          </>)}

          {source && (
            <footer className="hra-source">
              <strong>Fonte e licença</strong>
              <span>{source.title} · {source.organization} · {source.license}</span>
              {source.attribution && <small>{source.attribution}</small>}
              <a href={source.url} target="_blank" rel="noreferrer">Ver fonte <ExternalLink aria-hidden="true" /></a>
              <small>Modelo didático de referência: não representa variações individuais nem substitui avaliação clínica.</small>
            </footer>
          )}
        </aside>
      </div>
    </section>
  );
}
