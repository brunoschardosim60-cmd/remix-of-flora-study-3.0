import { Suspense, useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
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
  basicTissues, cellOrganelles, histologySourceFor, histologySpecimens,
  type HistologyHotspot, type HistologySpecimen, type MicroscopeLevel,
} from "@/lib/histologyData";
import {
  sensoryStructureById, sensoryStructures, sensoryViews,
  type SensoryJourneyId, type SensoryStructure, type SensoryView,
} from "@/lib/sensoryOrgansData";
import { organRealismProfile } from "@/lib/organRealism";
import type { MedicineLevel } from "@/lib/medicineData";
import "./histology-microscope.css";

interface HistologyMicroscopeProps {
  level: MedicineLevel;
  onLearningEvent: (event: { id: string; label: string; correct: boolean }) => void;
  onOpenNotebook: (label: string) => void;
}

type ZoomStage = "macro" | "meso" | "micro";
type SelectedDetail = HistologyHotspot | SensoryStructure;

const objectives = ["4x", "10x", "40x", "100x"] as const;
const completedStorageKey = "flora-histology-completed";
const eyeModelPath = "/medicine/models/zanatomy-organ-eye-v1.glb";

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
  const [eyeMode, setEyeMode] = useState<"diagram" | "model">("diagram");
  const focusTimer = useRef<number>();

  const availableViews = useMemo(() => sensoryViews.filter((item) => item.journeyId === journey && item.stage === (stage === "macro" ? "macro" : "meso")), [journey, stage]);
  const activeView = useMemo(() => availableViews.find((item) => item.id === viewId) ?? availableViews[0] ?? null, [availableViews, viewId]);
  const specimen = histologySpecimens.find((item) => item.id === specimenId) ?? histologySpecimens[0];
  const journeySpecimens = histologySpecimens.filter((item) => journey === "eye" ? item.category === "sensorial" : journey === "oral" ? item.category === "oral" : item.category === "tecido básico");
  const microscopeLevel = specimen.levels.find((item) => item.objective === objective) ?? specimen.levels[0];
  const visibleObjectives = objectives.map((item) => ({ id: item, available: specimen.levels.some((level) => level.objective === item) }));
  const viewStructures = activeView?.structureIds.map(sensoryStructureById).filter(Boolean) as SensoryStructure[] | undefined;
  const activeTargets: SelectedDetail[] = stage === "micro" ? microscopeLevel.hotspots : journey === "cell" ? cellOrganelles : (viewStructures ?? []);
  const currentSource = selected ? histologySourceFor(selected.sourceId) : histologySourceFor(stage === "micro" ? microscopeLevel.sourceId : activeView?.sourceId ?? "openstax-tissues");

  useEffect(() => {
    if (journey === "eye") { setViewId(stage === "macro" ? "eye-external" : "eye-anatomy"); setSpecimenId("retina"); }
    else if (journey === "oral") { setViewId(stage === "macro" ? "oral-external" : "oral-cavity"); if (specimen.category !== "oral") setSpecimenId("salivary-gland"); }
    else if (specimen.category !== "tecido básico") setSpecimenId("nervous-tissue");
    setIdentifyMode(false); setTargetId(null); setAnswered(null); setSelected(null);
  }, [journey, specimen.category, stage]);

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
            {journey === "eye" && stage === "meso" && <button className={eyeMode === "model" ? "active" : ""} onClick={() => setEyeMode((value) => value === "diagram" ? "model" : "diagram")}><Rotate3D /> {eyeMode === "model" ? "Voltar ao diagrama" : "Globo ocular 3D"}</button>}
            <button className={identifyMode ? "active" : ""} onClick={beginIdentification}><Target /> Identifique</button>
          </div>
        </div>

        <div className={`hm-visual-stage hm-stage-${stage}`} onWheel={handleWheel}>
          {identifyMode && target && <div className={`hm-identify-banner ${answered ?? ""}`}><ScanSearch /><span>{answered === "correct" ? "Correto" : answered === "wrong" ? "Tente outra vez" : `Aponte: ${target.name}`}</span>{answered === "correct" && <button onClick={beginIdentification}>Próxima</button>}</div>}

          {stage !== "micro" && journey !== "cell" && activeView && !(journey === "eye" && stage === "meso" && eyeMode === "model") && <AnatomyImage view={activeView} structures={viewStructures ?? []} hiddenLabels={identifyMode} onChoose={chooseDetail} />}
          {stage === "meso" && journey === "eye" && eyeMode === "model" && <LicensedEyeScene />}
          {journey === "cell" && stage === "macro" && <CellCanvas hiddenLabels={identifyMode} onChoose={chooseDetail} />}
          {journey === "cell" && stage === "meso" && <TissueGallery selectedId={specimenId} onSelect={(id) => { setSpecimenId(id === "nervous" ? "nervous-tissue" : id); setSelected(null); changeDepth(84); }} />}
          {stage === "micro" && <MicroscopeCanvas specimen={specimen} level={microscopeLevel} focusing={focusChanging} hiddenLabels={identifyMode} onChoose={chooseDetail} />}
        </div>

        {stage === "micro" && <div className="hm-objectives">
          <div><Microscope /><span><strong>Objetiva didática</strong><small>Cada nível usa um asset distinto; não há ampliação digital simulada.</small></span></div>
          <div className="hm-objective-buttons">{visibleObjectives.map(({ id, available }) => <button key={id} disabled={!available} className={microscopeLevel.objective === id ? "active" : ""} onClick={() => changeObjective(id)}>{id}</button>)}</div>
        </div>}
      </div>

      <aside className="hm-detail-panel">
        <span className="hm-detail-stage">{stageLabel(stage)} · {stage === "micro" ? microscopeLevel.assetKind === "micrograph" ? "MICROGRAFIA REAL" : "ESQUEMA ROTULADO" : activeView?.eyebrow ?? "BASE CELULAR"}</span>
        {selected ? <>
          <h2>{selected.name}</h2>{"latin" in selected && selected.latin && <em>{selected.latin}</em>}
          <p>{selected.summary}</p>
          <div className="hm-detail-block"><b>FUNÇÃO</b><p>{selected.function}</p></div>
        </> : <><h2>{stage === "micro" ? specimen.name : activeView?.title ?? "Base celular"}</h2><p>{stage === "micro" ? specimen.summary : activeView?.description ?? "Selecione uma organela ou um tecido para aprofundar."}</p></>}
        {stage === "micro" && <div className="hm-detail-block"><b>FIDELIDADE DO ASSET</b><p>{microscopeLevel.note}</p></div>}
        {currentSource && <a className="hm-source-link" href={currentSource.url} target="_blank" rel="noreferrer"><BookOpen /><span><b>Conferir fonte científica</b><small>{currentSource.organization} · {currentSource.license}</small></span><ExternalLink /></a>}
        <button className="hm-notebook" onClick={() => onOpenNotebook(selected?.name ?? specimen.name)}><NotebookPen /> Enviar ao Caderno</button>
        <div className="hm-safety"><Sparkles /><p><b>Material educacional licenciado.</b> Micrografias reais e esquemas são identificados separadamente. Os valores de objetiva organizam a jornada didática e não substituem os metadados da fonte.</p></div>
      </aside>
    </section>
  </main>;
}

function AnatomyImage({ view, structures, hiddenLabels, onChoose }: { view: SensoryView; structures: SensoryStructure[]; hiddenLabels: boolean; onChoose: (item: SensoryStructure) => void }) {
  return <div className="hm-image-canvas">
    <img src={view.image} alt={view.alt} draggable={false} />
    {structures.map((structure, index) => <button key={structure.id} className="hm-hotspot" style={{ left: `${structure.x}%`, top: `${structure.y}%` }} onClick={() => onChoose(structure)} aria-label={`Selecionar ${structure.name}`}><i />{!hiddenLabels && index < 7 && <span>{structure.name}</span>}</button>)}
    <footer><span>{view.assetKind === "schematic" ? "Esquema anatômico licenciado" : "Ilustração anatômica licenciada"}</span><small>Rótulos interativos em português; a imagem-fonte é preservada sem alterações.</small></footer>
  </div>;
}

function CellCanvas({ hiddenLabels, onChoose }: { hiddenLabels: boolean; onChoose: (item: HistologyHotspot) => void }) {
  return <div className="hm-image-canvas hm-cell-canvas">
    <img src="/medicine/histology/openstax/animal-cell.jpg" alt="Diagrama esquemático de uma célula animal e suas organelas." draggable={false} />
    {cellOrganelles.map((item, index) => <button key={item.id} className="hm-hotspot" style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => onChoose(item)}><i />{!hiddenLabels && index < 7 && <span>{item.name}</span>}</button>)}
    <footer><span>Esquema celular rotulado</span><small>Não é uma micrografia.</small></footer>
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

function LicensedEyeScene() {
  return <div className="hm-eye-3d"><Suspense fallback={<div className="hm-model-loading"><Rotate3D />Preparando globo ocular licenciado…</div>}><Canvas camera={{ position: [0, .15, 3.4], fov: 34 }} dpr={[1, 2]}><color attach="background" args={["#edf5f2"]} /><ambientLight intensity={1.35} /><directionalLight position={[3, 4, 4]} intensity={3.2} castShadow /><directionalLight position={[-4, 1, -3]} intensity={1.1} color="#b7d8d2" /><EyeModel /><Environment preset="studio" /><OrbitControls makeDefault enablePan={false} minDistance={1.35} maxDistance={5} autoRotate autoRotateSpeed={.55} /></Canvas></Suspense><div className="hm-3d-hint"><Rotate3D />Arraste para girar · role para aproximar</div></div>;
}

function EyeModel() {
  const gltf = useGLTF(eyeModelPath, "/medicine/models/draco/");
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.rotation.x = -Math.PI / 2;
    clone.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(clone);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const scale = 2.2 / Math.max(size.x, size.y, size.z, .001);
    const group = new Group();
    clone.position.set(-center.x, -center.y, -center.z);
    clone.scale.setScalar(scale);
    const profile = organRealismProfile("eye");
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
      object.material = new MeshPhysicalMaterial({ color: profile.color, roughness: profile.roughness, metalness: 0, clearcoat: profile.clearcoat, clearcoatRoughness: profile.clearcoatRoughness, sheen: profile.sheen, sheenColor: profile.sheenColor, specularIntensity: profile.specularIntensity, transmission: profile.transmission, thickness: profile.thickness, side: DoubleSide });
      object.castShadow = true; object.receiveShadow = true;
    });
    group.add(clone);
    return group;
  }, [gltf.scene]);
  return <primitive object={model} />;
}

useGLTF.preload(eyeModelPath, "/medicine/models/draco/");
