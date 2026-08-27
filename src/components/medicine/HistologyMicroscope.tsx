import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type WheelEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, DoubleSide, Group, Mesh, MeshPhysicalMaterial, Vector3 } from "three";
import {
  BookOpen, Box, Check, ChevronLeft, ChevronRight, CircleDot, ExternalLink, Eye, Focus,
  Microscope, NotebookPen, Rotate3D, ScanSearch, Sparkles, Target, ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { registerQuiz, loadGamification, saveGamification } from "@/lib/gamification";
import {
  basicTissues, cellOrganelles, histologySourceFor, histologySpecimens, realCellFeatures, realCellImage,
  type HistologyHotspot, type HistologySpecimen, type MicroscopeLevel,
} from "@/lib/histologyData";
import {
  sensoryStructureById, sensoryStructures, sensoryViews,
  type SensoryJourneyId, type SensoryStructure, type SensoryView,
} from "@/lib/sensoryOrgansData";
import { histology3DModelById, histology3DModelsFor, type Histology3DModel } from "@/lib/histology3DModels";
import { organRealismProfile } from "@/lib/organRealism";
import type { MedicineLevel } from "@/lib/medicineData";
import "./histology-microscope.css";

interface HistologyMicroscopeProps {
  level: MedicineLevel;
  onLearningEvent: (event: { id: string; label: string; correct: boolean }) => void;
  onOpenNotebook: (context: { label: string; summary?: string; image?: string; imageAlt?: string; sourceId?: string }) => void;
}

type ZoomStage = "macro" | "meso" | "micro";
type SelectedDetail = HistologyHotspot | SensoryStructure;

const objectives = ["4x", "10x", "40x", "100x"] as const;
const completedStorageKey = "flora-histology-completed";

function stageForDepth(depth: number): ZoomStage {
  if (depth < 34) return "macro";
  if (depth < 67) return "meso";
  return "micro";
}

function stageLabel(stage: ZoomStage) {
  return stage === "macro" ? "Olho nu" : stage === "meso" ? "Anatômico" : "Microscópico";
}

function loadCompleted() {
  if (typeof window === "undefined") return [] as string[];
  try { return JSON.parse(localStorage.getItem(completedStorageKey) || "[]") as string[]; }
  catch { return [] as string[]; }
}

export function HistologyMicroscope({ level, onLearningEvent, onOpenNotebook }: HistologyMicroscopeProps) {
  const [journey, setJourney] = useState<SensoryJourneyId>("eye");
  const [depth, setDepth] = useState(8);
  const stage = stageForDepth(depth);
  const [viewId, setViewId] = useState("eye-external");
  const [specimenId, setSpecimenId] = useState("retina");
  const [objective, setObjective] = useState<(typeof objectives)[number]>("4x");
  const [selected, setSelected] = useState<SelectedDetail | null>(sensoryStructureById("eyelids") ?? null);
  const [focusChanging, setFocusChanging] = useState(false);
  const [identifyMode, setIdentifyMode] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [answered, setAnswered] = useState<"correct" | "wrong" | null>(null);
  const [completed, setCompleted] = useState<string[]>(loadCompleted);
  const [anatomyMode, setAnatomyMode] = useState<"image" | "model">("model");
  const [modelId, setModelId] = useState("eye-globe");
  const [cellMode, setCellMode] = useState<"micrograph" | "diagram">("micrograph");
  const focusTimer = useRef<number>();

  const availableViews = useMemo(() => sensoryViews.filter((item) => item.journeyId === journey && item.stage === (stage === "macro" ? "macro" : "meso")), [journey, stage]);
  const availableModels = useMemo(() => histology3DModelsFor(journey), [journey]);
  const activeModel = histology3DModelById(modelId) ?? availableModels[0] ?? null;
  const showing3D = stage === "meso" && journey !== "cell" && anatomyMode === "model" && Boolean(activeModel);
  const activeView = useMemo(() => availableViews.find((item) => item.id === viewId) ?? availableViews[0] ?? null, [availableViews, viewId]);
  const specimen = histologySpecimens.find((item) => item.id === specimenId) ?? histologySpecimens[0];
  const journeySpecimens = histologySpecimens.filter((item) => journey === "eye" ? item.category === "sensorial" : journey === "oral" ? item.category === "oral" : item.category === "tecido básico");
  const microscopeLevel = specimen.levels.find((item) => item.objective === objective) ?? specimen.levels[0];
  const visibleObjectives = objectives.map((item) => ({ id: item, available: specimen.levels.some((level) => level.objective === item) }));
  const viewStructures = activeView?.structureIds.map(sensoryStructureById).filter(Boolean) as SensoryStructure[] | undefined;
  const cellMacroTargets = cellMode === "micrograph" ? realCellFeatures : cellOrganelles;
  const activeTargets: SelectedDetail[] = stage === "micro" ? microscopeLevel.hotspots : journey === "cell" ? stage === "macro" ? cellMacroTargets : [] : (viewStructures ?? []);
  const cellMacroSourceId = cellMode === "micrograph" ? "nih-hela" : "openstax-cell";
  const currentSource = selected ? histologySourceFor(selected.sourceId) : histologySourceFor(showing3D ? activeModel?.sourceId ?? "zanatomy-models" : stage === "micro" ? microscopeLevel.sourceId : journey === "cell" && stage === "macro" ? cellMacroSourceId : activeView?.sourceId ?? "openstax-tissues");
  const notebookImage = stage === "micro" ? microscopeLevel.image : journey === "cell" && stage === "macro" ? cellMode === "micrograph" ? realCellImage : "/medicine/histology/openstax/animal-cell.jpg" : activeView?.image;
  const notebookImageAlt = stage === "micro" ? microscopeLevel.alt : journey === "cell" && stage === "macro" ? cellMode === "micrograph" ? "Microscopia multiphoton real de células HeLa." : "Mapa esquemático de uma célula animal." : activeView?.alt;
  const notebookSummary = selected?.summary ?? (stage === "micro" ? specimen.summary : journey === "cell" && stage === "macro" ? cellMode === "micrograph" ? "Microscopia multiphoton real: DNA em ciano, microtúbulos em verde e complexo de Golgi em laranja." : "Mapa didático de organelas celulares." : activeView?.description);
  const notebookSourceId = selected?.sourceId ?? (stage === "micro" ? microscopeLevel.sourceId : journey === "cell" && stage === "macro" ? cellMacroSourceId : activeView?.sourceId);

  useEffect(() => {
    if (journey === "eye") { setViewId(stage === "macro" ? "eye-external" : "eye-anatomy"); setSpecimenId("retina"); setModelId("eye-globe"); }
    else if (journey === "oral") { setViewId(stage === "macro" ? "oral-external" : "oral-cavity"); setModelId("oral-cavity-3d"); if (specimen.category !== "oral") setSpecimenId("salivary-gland"); }
    else if (specimen.category !== "tecido básico") setSpecimenId("nervous-tissue");
    if (stage === "meso" && journey !== "cell") setAnatomyMode("model");
    setIdentifyMode(false); setTargetId(null); setAnswered(null); setSelected(null);
  }, [journey, specimen.category, stage]);

  useEffect(() => {
    const paths = journey === "cell"
      ? [realCellImage]
      : sensoryViews.filter((view) => view.journeyId === journey && view.assetKind === "photograph").map((view) => view.image);
    paths.forEach((path) => { const image = new Image(); image.decoding = "async"; image.src = path; });
  }, [journey]);

  useEffect(() => {
    if (stage === "meso" && activeModel) useGLTF.preload(activeModel.path, "/medicine/models/draco/");
  }, [activeModel, stage]);

  useEffect(() => {
    const nextSpecimen = histologySpecimens.find((item) => item.id === specimenId);
    if (nextSpecimen && !nextSpecimen.levels.some((item) => item.objective === objective)) setObjective(nextSpecimen.levels[0].objective);
  }, [objective, specimenId]);

  useEffect(() => () => { if (focusTimer.current) window.clearTimeout(focusTimer.current); }, []);

  const changeDepth = (next: number) => setDepth(Math.max(0, Math.min(100, next)));
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    changeDepth(depth + event.deltaY * .035);
  };

  const changeObjective = (next: (typeof objectives)[number]) => {
    const target = specimen.levels.find((item) => item.objective === next);
    if (!target) { toast.info("Este espécime não possui um asset licenciado nesse aumento."); return; }
    setFocusChanging(true); setObjective(next); setSelected(null); setAnswered(null);
    if (focusTimer.current) window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => setFocusChanging(false), 360);
  };

  const beginIdentification = () => {
    if (!activeTargets.length) { toast.info("Não há estruturas clicáveis nesta vista."); return; }
    const next = activeTargets[Math.floor(Math.random() * activeTargets.length)];
    setIdentifyMode(true); setTargetId(next.id); setSelected(null); setAnswered(null);
  };

  const chooseDetail = (detail: SelectedDetail) => {
    setSelected(detail);
    if (!identifyMode || !targetId) return;
    const correct = detail.id === targetId;
    setAnswered(correct ? "correct" : "wrong");
    onLearningEvent({ id: `histologia:${journey}:${stage}:${targetId}`, label: detail.name, correct });
    if (correct && !completed.includes(targetId)) {
      const nextCompleted = [...completed, targetId];
      setCompleted(nextCompleted);
      localStorage.setItem(completedStorageKey, JSON.stringify(nextCompleted));
      saveGamification(registerQuiz(loadGamification(), { difficulty: "medio", score: 1, total: 1 }));
      toast.success("Estrutura identificada · XP registrado");
    }
  };

  const target = activeTargets.find((item) => item.id === targetId);
  const progress = Math.round((completed.length / Math.max(1, sensoryStructures.length + cellOrganelles.length)) * 100);

  return <main className="hm-shell">
    <header className="hm-hero">
      <div>
        <span className="hm-eyebrow"><Microscope /> LABORATÓRIO VISUAL · {level.toLocaleUpperCase("pt-BR")}</span>
        <h1>Histologia e <em>órgãos dos sentidos</em></h1>
        <p>Entre na estrutura sem trocar de página: olho nu, anatomia e lâmina microscópica em uma jornada contínua.</p>
      </div>
      <div className="hm-progress"><span>{progress}% explorado</span><div><i style={{ width: `${progress}%` }} /></div><small>{completed.length} identificações únicas</small></div>
    </header>

    <nav className="hm-journeys" aria-label="Jornadas de histologia">
      {([
        ["eye", Eye, "Olho e visão"], ["oral", CircleDot, "Boca e paladar"], ["cell", Box, "Célula e tecidos"],
      ] as const).map(([id, Icon, label]) => <button key={id} className={journey === id ? "active" : ""} onClick={() => { setJourney(id); setDepth(8); }}><Icon /><span>{label}</span></button>)}
    </nav>

    <section className="hm-depth-rail">
      <div className="hm-depth-copy"><ZoomIn /><div><strong>Profundidade {Math.round(depth)}%</strong><span>Role sobre o campo ou arraste o controle para “entrar” na estrutura.</span></div></div>
      <div className="hm-stage-labels">{(["macro", "meso", "micro"] as ZoomStage[]).map((item) => <button key={item} className={stage === item ? "active" : ""} onClick={() => changeDepth(item === "macro" ? 8 : item === "meso" ? 50 : 84)}><b>{item === "macro" ? "01" : item === "meso" ? "02" : "03"}</b><span>{stageLabel(item)}</span></button>)}</div>
      <input aria-label="Profundidade da visualização" type="range" min="0" max="100" value={depth} onChange={(event) => changeDepth(Number(event.target.value))} />
    </section>

    <section className="hm-lab">
      <div className="hm-canvas-column">
        <div className="hm-canvas-toolbar">
          <span><Focus /> {stageLabel(stage)}</span>
          <div>
            {stage === "micro" && journeySpecimens.map((item) => <button key={item.id} className={specimen.id === item.id ? "active" : ""} onClick={() => { setSpecimenId(item.id); setSelected(null); }}>{item.name}</button>)}
            {stage !== "micro" && activeView && availableViews.length > 1 && availableViews.map((view) => <button key={view.id} className={activeView.id === view.id ? "active" : ""} onClick={() => { setViewId(view.id); setSelected(null); }}>{view.title}</button>)}
            {stage === "meso" && journey !== "cell" && <button className={anatomyMode === "model" ? "active" : ""} onClick={() => { setAnatomyMode((value) => value === "image" ? "model" : "image"); setSelected(null); }}><Rotate3D /> {anatomyMode === "model" ? "Ver fotos e mapas" : "Explorar em 3D"}</button>}
            {journey === "cell" && stage === "macro" && <button className={cellMode === "micrograph" ? "active" : ""} onClick={() => { setCellMode((value) => value === "micrograph" ? "diagram" : "micrograph"); setSelected(null); setIdentifyMode(false); }}><Microscope /> {cellMode === "micrograph" ? "Ver mapa de organelas" : "Voltar à microscopia real"}</button>}
            <button className={identifyMode ? "active" : ""} onClick={beginIdentification}><Target /> Identifique</button>
          </div>
        </div>

        <div className={`hm-visual-stage hm-stage-${stage}`} onWheel={handleWheel}>
          {identifyMode && target && <div className={`hm-identify-banner ${answered ?? ""}`}><ScanSearch /><span>{answered === "correct" ? "Correto" : answered === "wrong" ? "Tente outra vez" : `Aponte: ${target.name}`}</span>{answered === "correct" && <button onClick={beginIdentification}>Próxima</button>}</div>}

          {stage !== "micro" && journey !== "cell" && activeView && !showing3D && <AnatomyImage view={activeView} structures={viewStructures ?? []} hiddenLabels={identifyMode} onChoose={chooseDetail} />}
          {showing3D && activeModel && <LicensedStructureScene model={activeModel} options={availableModels} onSelectModel={(id) => { setModelId(id); setSelected(null); }} />}
          {journey === "cell" && stage === "macro" && <CellCanvas mode={cellMode} hiddenLabels={identifyMode} onChoose={chooseDetail} />}
          {journey === "cell" && stage === "meso" && <TissueGallery selectedId={specimenId} onSelect={(id) => { setSpecimenId(id === "nervous" ? "nervous-tissue" : id); setSelected(null); changeDepth(84); }} />}
          {stage === "micro" && <MicroscopeCanvas specimen={specimen} level={microscopeLevel} focusing={focusChanging} hiddenLabels={identifyMode} onChoose={chooseDetail} />}
        </div>

        {stage === "micro" && <div className="hm-objectives">
          <div><Microscope /><span><strong>Objetiva didática</strong><small>Cada nível usa um asset distinto; não há ampliação digital simulada.</small></span></div>
          <div className="hm-objective-buttons">{visibleObjectives.map(({ id, available }) => <button key={id} disabled={!available} className={microscopeLevel.objective === id ? "active" : ""} onClick={() => changeObjective(id)}>{id}</button>)}</div>
        </div>}
      </div>

      <aside className="hm-detail-panel">
        <span className="hm-detail-stage">{stageLabel(stage)} · {showing3D ? activeModel?.eyebrow : stage === "micro" ? microscopeLevel.assetKind === "micrograph" ? "MICROGRAFIA REAL" : "ESQUEMA ROTULADO" : journey === "cell" && stage === "macro" ? cellMode === "micrograph" ? "MICROSCOPIA HUMANA REAL" : "MAPA ESQUEMÁTICO" : activeView?.eyebrow ?? "BASE CELULAR"}</span>
        {selected ? <>
          <h2>{selected.name}</h2>{"latin" in selected && selected.latin && <em>{selected.latin}</em>}
          <p>{selected.summary}</p>
          <div className="hm-detail-block"><b>FUNÇÃO</b><p>{selected.function}</p></div>
        </> : <><h2>{showing3D ? activeModel?.name : stage === "micro" ? specimen.name : journey === "cell" && stage === "macro" ? cellMode === "micrograph" ? "Células humanas em microscopia" : "Mapa de organelas" : activeView?.title ?? "Base celular"}</h2><p>{showing3D ? activeModel?.description : stage === "micro" ? specimen.summary : journey === "cell" && stage === "macro" ? notebookSummary : activeView?.description ?? "Selecione uma organela ou um tecido para aprofundar."}</p></>}
        {stage === "micro" && <div className="hm-detail-block"><b>FIDELIDADE DA IMAGEM</b><p>{microscopeLevel.note}</p></div>}
        {currentSource && <a className="hm-source-link" href={currentSource.url} target="_blank" rel="noreferrer"><BookOpen /><span><b>Conferir fonte científica</b><small>{currentSource.organization} · {currentSource.license}</small></span><ExternalLink /></a>}
        <button className="hm-notebook" onClick={() => onOpenNotebook({ label: selected?.name ?? (stage === "micro" ? specimen.name : activeView?.title ?? specimen.name), summary: notebookSummary, image: notebookImage, imageAlt: notebookImageAlt, sourceId: notebookSourceId })}><NotebookPen /> Enviar ao Caderno</button>
        <div className="hm-safety"><Sparkles /><p><b>Material educacional licenciado.</b> Micrografias reais e esquemas são identificados separadamente. Os valores de objetiva organizam a jornada didática e não substituem os metadados da fonte.</p></div>
      </aside>
    </section>
  </main>;
}

function PhotoFrame({ src, alt, aspectRatio, children }: { src: string; alt: string; aspectRatio: number; children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => {
      const bounds = host.getBoundingClientRect();
      const width = Math.min(bounds.width, bounds.height * aspectRatio);
      setSize({ width, height: width / aspectRatio });
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(host);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [aspectRatio]);

  return <div ref={hostRef} className="hm-photo-host"><div className="hm-photo-frame" style={size ? { width: size.width, height: size.height } : undefined}><img src={src} alt={alt} draggable={false} loading="eager" decoding="async" />{children}</div></div>;
}

function AnatomyImage({ view, structures, hiddenLabels, onChoose }: { view: SensoryView; structures: SensoryStructure[]; hiddenLabels: boolean; onChoose: (item: SensoryStructure) => void }) {
  const markers = structures.map((structure, index) => <button key={structure.id} className="hm-hotspot" style={{ left: `${structure.x}%`, top: `${structure.y}%` }} onClick={() => onChoose(structure)} aria-label={`Selecionar ${structure.name}`}><i />{!hiddenLabels && index < 7 && <span>{structure.name}</span>}</button>);
  return <div className={`hm-image-canvas ${view.assetKind === "photograph" ? "hm-photo-canvas" : ""}`}>
    {view.assetKind === "photograph" ? <PhotoFrame src={view.image} alt={view.alt} aspectRatio={view.aspectRatio ?? 1}>{markers}</PhotoFrame> : <><img src={view.image} alt={view.alt} draggable={false} loading="eager" decoding="async" />{markers}</>}
    <footer><span>{view.assetKind === "photograph" ? "Fotografia clínica licenciada" : view.assetKind === "schematic" ? "Esquema anatômico licenciado" : "Ilustração anatômica licenciada"}</span><small>Arquivo original em resolução integral; marcadores interativos em português.</small></footer>
  </div>;
}

function CellCanvas({ mode, hiddenLabels, onChoose }: { mode: "micrograph" | "diagram"; hiddenLabels: boolean; onChoose: (item: HistologyHotspot) => void }) {
  const real = mode === "micrograph";
  const targets = real ? realCellFeatures : cellOrganelles;
  return <div className={`hm-image-canvas hm-cell-canvas ${real ? "hm-photo-canvas" : ""}`}>
    {real ? <PhotoFrame src={realCellImage} alt="Microscopia multiphoton real de células HeLa com DNA, Golgi e microtúbulos marcados por fluorescência." aspectRatio={2400 / 1999}>{targets.map((item, index) => <button key={item.id} className="hm-hotspot" style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => onChoose(item)}><i />{!hiddenLabels && index < 7 && <span>{item.name}</span>}</button>)}</PhotoFrame> : <><img src="/medicine/histology/openstax/animal-cell.jpg" alt="Diagrama esquemático de uma célula animal e suas organelas." draggable={false} loading="eager" decoding="async" />{targets.map((item, index) => <button key={item.id} className="hm-hotspot" style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => onChoose(item)}><i />{!hiddenLabels && index < 7 && <span>{item.name}</span>}</button>)}</>}
    <footer><span>{real ? "Microscopia multiphoton real" : "Mapa celular esquemático"}</span><small>{real ? "Células HeLa: DNA em ciano, microtúbulos em verde e Golgi em laranja; cores de fluorescência." : "Mapa opcional para organelas que não aparecem juntas em uma única micrografia."}</small></footer>
  </div>;
}

function TissueGallery({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return <div className="hm-tissue-gallery"><header><span>OS QUATRO TECIDOS BÁSICOS</span><h2>Do padrão ao detalhe</h2></header><div>{basicTissues.map((tissue) => <button key={tissue.id} className={selectedId.includes(tissue.id) ? "active" : ""} onClick={() => onSelect(tissue.id)}><img src={tissue.image} alt={`Referência de ${tissue.name}`} /><span><b>{tissue.name}</b><small>{tissue.subtypes.join(" · ")}</small></span><ChevronRight /></button>)}</div></div>;
}

function MicroscopeCanvas({ specimen, level, focusing, hiddenLabels, onChoose }: { specimen: HistologySpecimen; level: MicroscopeLevel; focusing: boolean; hiddenLabels: boolean; onChoose: (item: HistologyHotspot) => void }) {
  return <div className="hm-microscope-canvas">
    <div className="hm-lens-ring"><div className={focusing ? "focusing" : ""}><img key={level.image} src={level.image} alt={level.alt} draggable={false} />{level.hotspots.map((item) => <button key={item.id} className="hm-hotspot" style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => onChoose(item)}><i />{!hiddenLabels && <span>{item.name}</span>}</button>)}</div></div>
    <div className="hm-slide-label"><b>{specimen.name}</b><span>{level.objective} · {level.label}</span><small>{level.assetKind === "micrograph" ? "Micrografia real licenciada" : "Esquema didático rotulado"}</small></div>
  </div>;
}

function LicensedStructureScene({ model, options, onSelectModel }: { model: Histology3DModel; options: Histology3DModel[]; onSelectModel: (id: string) => void }) {
  return <div className="hm-eye-3d hm-structure-3d">
    <div className="hm-3d-model-picker" role="tablist" aria-label="Modelos tridimensionais desta jornada">
      {options.map((option) => <button key={option.id} role="tab" aria-selected={option.id === model.id} className={option.id === model.id ? "active" : ""} onClick={() => onSelectModel(option.id)}>{option.name}</button>)}
    </div>
    <Suspense fallback={<div className="hm-model-loading"><Rotate3D />Preparando {model.name.toLocaleLowerCase("pt-BR")}…</div>}>
      <Canvas key={model.id} camera={{ position: [0, .15, 3.4], fov: 34 }} dpr={[1, 2]}>
        <color attach="background" args={["#edf5f2"]} />
        <ambientLight intensity={1.35} />
        <directionalLight position={[3, 4, 4]} intensity={3.2} castShadow />
        <directionalLight position={[-4, 1, -3]} intensity={1.1} color="#b7d8d2" />
        <StructureModel definition={model} />
        <Environment preset="studio" />
        <OrbitControls makeDefault enablePan={false} minDistance={1.25} maxDistance={5} autoRotate autoRotateSpeed={.45} />
      </Canvas>
    </Suspense>
    <div className="hm-3d-hint"><Rotate3D />Arraste para girar · role para aproximar</div>
  </div>;
}

function StructureModel({ definition }: { definition: Histology3DModel }) {
  const gltf = useGLTF(definition.path, "/medicine/models/draco/");
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    if (definition.rotateX) clone.rotation.x = definition.rotateX;
    const visibleMeshes: Mesh[] = [];
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const included = !definition.includeNames?.length || definition.includeNames.some((name) => object.name === name || object.name.startsWith(`${name}.`));
      object.visible = included;
      if (!included) return;
      visibleMeshes.push(object);
      if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
      const profileName = definition.material === "teeth" ? "teeth" : definition.material === "oral" ? object.name : definition.material === "salivary" ? object.name : definition.material;
      const profile = organRealismProfile(profileName);
      const tooth = definition.material === "teeth";
      object.material = new MeshPhysicalMaterial({
        color: tooth ? "#e7d8ba" : profile.color,
        roughness: tooth ? .48 : profile.roughness,
        metalness: 0,
        clearcoat: tooth ? .22 : profile.clearcoat,
        clearcoatRoughness: tooth ? .32 : profile.clearcoatRoughness,
        sheen: tooth ? .08 : profile.sheen,
        sheenColor: tooth ? "#fff8e8" : profile.sheenColor,
        specularIntensity: tooth ? .72 : profile.specularIntensity,
        transmission: tooth ? .025 : profile.transmission,
        thickness: tooth ? .12 : profile.thickness,
        side: DoubleSide,
      });
      object.castShadow = true;
      object.receiveShadow = true;
    });
    clone.updateMatrixWorld(true);
    const bounds = new Box3();
    visibleMeshes.forEach((mesh) => bounds.expandByObject(mesh, true));
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const scale = 2.25 / Math.max(size.x, size.y, size.z, .001);
    const group = new Group();
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    clone.scale.setScalar(scale);
    group.add(clone);
    return group;
  }, [definition, gltf.scene]);
  return <primitive object={model} />;
}
