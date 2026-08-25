import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Box3, BufferAttribute, CatmullRomCurve3, Color, DoubleSide, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Plane, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Box,
  Brain,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  Focus,
  HeartPulse,
  Maximize2,
  Minus,
  MousePointer2,
  Pause,
  PersonStanding,
  Play,
  Plus,
  Rotate3D,
  Search,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  anatomy3DRegions,
  anatomy3DStructures,
  anatomy3DSystemMeta,
  isSupplemental3DOrganId,
  proceduralStructuresFor3D,
  structuresFor3D,
  type Anatomy3DPart,
  type Anatomy3DRegionId,
  type Anatomy3DStructure,
  type Anatomy3DSystemId,
} from "@/lib/anatomy3DModel";
import { medicalSources, type MedicineLevel } from "@/lib/medicineData";
import { organRealismProfile } from "@/lib/organRealism";

type CameraView = "perspective" | "front" | "back" | "left" | "right";
type OrganViewMode = "context" | "isolated" | "section" | "transparent";
type SectionAxis = "x" | "y" | "z";
type AnatomyAppearance = "educational" | "realistic";

interface Anatomy3DStudioProps {
  level: MedicineLevel;
  initialStructureId?: string | null;
}

const layerOpacity: Record<Exclude<Anatomy3DSystemId, "all">, number> = {
  surface: 0.12,
  muscular: 0.44,
  skeletal: 0.58,
  vascular: 0.96,
  nervous: 0.98,
  organs: 0.92,
};

const REAL_MODEL_PATH = "/medicine/models/zanatomy-musculoskeletal-v1.glb";
const REAL_SKIN_PATH = "/medicine/models/bodyparts3d-skin-v1.glb";
const REAL_ORGANS_PATH = "/medicine/models/bodyparts3d-organs-v1.glb";
const DETAILED_CIRCULATORY_PATH = "/medicine/models/zanatomy-circulatory-v1.glb";
const DETAILED_NERVOUS_PATH = "/medicine/models/zanatomy-nervous-v1.glb";
const DETAILED_ORGANS_PATH = "/medicine/models/zanatomy-organs-v1.glb";
const SUPPLEMENTAL_ORGAN_PATHS = {
  heart: "/medicine/models/zanatomy-organ-heart-v1.glb",
  brain: "/medicine/models/zanatomy-organ-brain-v1.glb",
  spleen: "/medicine/models/zanatomy-organ-spleen-v1.glb",
  eye: "/medicine/models/zanatomy-organ-eye-v1.glb",
} as const;
const BODY_PARTS_SOURCE_BOUNDS = new Box3(new Vector3(-1.33905, -3.534865, -0.187946), new Vector3(1.33396, 3.18329, 0.971386));
export function Anatomy3DStudio({ level, initialStructureId }: Anatomy3DStudioProps) {
  const initialStructure = anatomy3DStructures.find((item) => item.id === initialStructureId);
  const startsWithOrgan = initialStructure?.layer === "organs";
  const [system, setSystem] = useState<Anatomy3DSystemId>(startsWithOrgan ? "organs" : "all");
  const [appearance, setAppearance] = useState<AnatomyAppearance>("educational");
  const [region, setRegion] = useState<Anatomy3DRegionId>(initialStructure?.regionId ?? "whole");
  const [selectedId, setSelectedId] = useState(initialStructure?.id ?? "organ-heart");
  const [query, setQuery] = useState("");
  const [autoRotate, setAutoRotate] = useState(false);
  const [cameraView, setCameraView] = useState<CameraView>("perspective");
  const [zoom, setZoom] = useState(startsWithOrgan ? 1.25 : 1);
  const [skinOpacity, setSkinOpacity] = useState(0.12);
  const [focusKey, setFocusKey] = useState(0);
  const [focusSelected, setFocusSelected] = useState(startsWithOrgan);
  const [modelSelection, setModelSelection] = useState<Anatomy3DStructure | null>(null);
  const [organView, setOrganView] = useState<OrganViewMode>(startsWithOrgan ? "isolated" : "context");
  const [sectionAxis, setSectionAxis] = useState<SectionAxis>("x");
  const [sectionOffset, setSectionOffset] = useState(0);
  const [detailedCatalogs, setDetailedCatalogs] = useState<Partial<Record<Anatomy3DSystemId, Anatomy3DStructure[]>>>({});
  const rootRef = useRef<HTMLElement>(null);

  const regionMeta = anatomy3DRegions.find((item) => item.id === region) ?? anatomy3DRegions[0];
  const registerDetailedCatalog = useCallback((catalogSystem: Anatomy3DSystemId, catalog: Anatomy3DStructure[]) => {
    setDetailedCatalogs((current) => current[catalogSystem]?.length === catalog.length ? current : { ...current, [catalogSystem]: catalog });
  }, []);
  const visibleStructures = useMemo(() => {
    const detailed = detailedCatalogs[system];
    if (!detailed?.length) return structuresFor3D(system, region);
    return detailed.filter((item) => region === "whole" || item.regionId === region || item.regionId === "whole");
  }, [detailedCatalogs, region, system]);
  const filteredStructures = useMemo(() => {
    const normalized = normalize(query);
    if (!normalized) return visibleStructures;
    return visibleStructures.filter((item) => normalize(`${item.name} ${item.latin ?? ""} ${item.region} ${item.system} ${item.function}`).includes(normalized));
  }, [query, visibleStructures]);
  const selected = anatomy3DStructures.find((item) => item.id === selectedId) ?? modelSelection;
  const selectedOrganSemantic = organSemanticFromSelection(selected?.id ?? null);
  const selectedIsVisible = Boolean(selected && (selected.id.startsWith("model:") || visibleStructures.some((item) => item.id === selected.id)));
  const cameraFocus = focusSelected && selected && selectedIsVisible ? selected.focus : regionMeta.focus;
  const cameraDistance = focusSelected && selected && selectedIsVisible ? selected.focusDistance : regionMeta.distance;
  const realistic = appearance === "realistic";

  useEffect(() => {
    if (visibleStructures.some((item) => item.id === selectedId)) return;
    const next = visibleStructures.find((item) => item.regionId !== "whole") ?? visibleStructures[0];
    if (next) {
      setSelectedId(next.id);
      setModelSelection(next.id.startsWith("model:") ? next : null);
    }
  }, [selectedId, visibleStructures]);

  const changeSystem = (nextSystem: Anatomy3DSystemId) => {
    setSystem(nextSystem);
    setAppearance("educational");
    setQuery("");
    const next = structuresFor3D(nextSystem, region)[0] ?? structuresFor3D(nextSystem, "whole")[0];
    if (next) setSelectedId(next.id);
    setModelSelection(null);
    setOrganView("context");
    setFocusSelected(false);
    setFocusKey((value) => value + 1);
  };

  const activateRealisticLayer = () => {
    setSystem("organs");
    setAppearance("realistic");
    setQuery("");
    const next = structuresFor3D("organs", region)[0] ?? structuresFor3D("organs", "whole")[0];
    if (next) setSelectedId(next.id);
    setModelSelection(null);
    setOrganView("context");
    setFocusSelected(false);
    setFocusKey((value) => value + 1);
  };

  const changeRegion = (nextRegion: Anatomy3DRegionId) => {
    setRegion(nextRegion);
    setQuery("");
    setCameraView("perspective");
    setZoom(1);
    const next = structuresFor3D(system, nextRegion).find((item) => item.regionId !== "whole") ?? structuresFor3D(system, nextRegion)[0];
    if (next) setSelectedId(next.id);
    setModelSelection(null);
    setFocusSelected(false);
    setFocusKey((value) => value + 1);
  };

  const selectStructure = (structure: Anatomy3DStructure) => {
    setSelectedId(structure.id);
    setModelSelection(structure.id.startsWith("model:") ? structure : null);
    setCameraView("perspective");
    setFocusSelected(true);
    if (structure.layer === "organs") setOrganView("isolated");
    setFocusKey((value) => value + 1);
  };

  const setPresetView = (view: CameraView) => {
    setCameraView(view);
    setFocusKey((value) => value + 1);
  };

  const resetView = () => {
    setRegion("whole");
    setSelectedId(system === "all" ? "organ-heart" : structuresFor3D(system, "whole")[0]?.id ?? "organ-heart");
    setModelSelection(null);
    setCameraView("perspective");
    setZoom(1);
    setFocusSelected(false);
    setOrganView("context");
    setSectionOffset(0);
    setFocusKey((value) => value + 1);
  };

  const toggleFullscreen = async () => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await root.requestFullscreen();
  };

  const changeOrganView = (mode: OrganViewMode) => {
    setOrganView(mode);
    setSectionOffset(0);
    setFocusSelected(mode !== "context");
    if (mode !== "context") setZoom(1.35);
    setFocusKey((value) => value + 1);
  };

  return (
    <section ref={rootRef} className="med-3d-studio" aria-label="Atlas anatômico tridimensional">
      <header className="med-3d-heading">
        <div>
          <span className="med-eyebrow"><Sparkles /> Atlas volumétrico · {level}</span>
          <h1>Corpo humano em <em>360°</em></h1>
          <p>Gire livremente, aproxime, isole sistemas e toque em uma estrutura para trazê-la ao centro.</p>
        </div>
        <div className="med-3d-heading-badges">
          <span><Rotate3D /> Rotação real</span>
          <span><MousePointer2 /> Estruturas clicáveis</span>
          <button onClick={() => void toggleFullscreen()}><Maximize2 /> Tela cheia</button>
        </div>
      </header>

      <div className="med-3d-system-strip" aria-label="Sistemas anatômicos">
        {anatomy3DSystemMeta.map((item) => (
          <button key={item.id} className={system === item.id && !realistic ? "active" : ""} style={{ "--system-color": item.color } as React.CSSProperties} onClick={() => changeSystem(item.id)}>
            <span style={{ background: item.color }}>{system === item.id && !realistic ? <Check /> : item.id === "nervous" ? <Brain /> : item.id === "all" ? <Box /> : <PersonStanding />}</span>
            <div><strong>{item.label}</strong><small>{item.description}</small></div>
          </button>
        ))}
        <button className={`med-3d-realistic-option ${realistic ? "active" : ""}`} style={{ "--system-color": "#772a35" } as React.CSSProperties} onClick={activateRealisticLayer}>
          <span><HeartPulse /></span><div><strong>Realista</strong><small>Cores e materiais naturais</small></div>
        </button>
      </div>

      <div className="med-3d-region-strip" aria-label="Regiões do corpo">
        <span>FOCAR REGIÃO</span>
        {anatomy3DRegions.map((item) => <button key={item.id} className={region === item.id ? "active" : ""} onClick={() => changeRegion(item.id)}>{item.shortLabel}</button>)}
      </div>

      <div className="med-3d-workspace">
        <aside className="med-3d-index">
          <div className="med-3d-index-title"><div><span>ÍNDICE 3D</span><strong>{filteredStructures.length} estruturas</strong></div><Eye /></div>
          <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar órgão, osso, nervo…" aria-label="Buscar estrutura 3D" /></label>
          <div className="med-3d-structure-list">
            {filteredStructures.map((structure) => (
              <button key={structure.id} className={selected?.id === structure.id ? "active" : ""} style={{ "--part-color": structure.color } as React.CSSProperties} onClick={() => selectStructure(structure)}>
                <i /><span><strong>{structure.name}</strong><small>{structure.region}</small></span><ChevronRight />
              </button>
            ))}
            {!filteredStructures.length && <div className="med-3d-empty"><Search /><strong>Nenhuma estrutura encontrada</strong><button onClick={() => setQuery("")}>Limpar busca</button></div>}
          </div>
        </aside>

        <div className="med-3d-canvas-shell">
          <div className="med-3d-canvas-toolbar">
            <div className="med-3d-view-presets">
              {(["front", "back", "left", "right"] as CameraView[]).map((view) => <button key={view} className={cameraView === view ? "active" : ""} onClick={() => setPresetView(view)}>{viewLabel(view)}</button>)}
            </div>
            <div className="med-3d-zoom-controls">
              <button onClick={() => { setZoom((value) => Math.max(0.7, value - 0.15)); setFocusKey((value) => value + 1); }} aria-label="Afastar câmera"><Minus /></button>
              <strong>{Math.round(zoom * 100)}%</strong>
              <button onClick={() => { setZoom((value) => Math.min(2.6, value + 0.15)); setFocusKey((value) => value + 1); }} aria-label="Aproximar câmera"><Plus /></button>
              <button className={autoRotate ? "active" : ""} onClick={() => setAutoRotate((value) => !value)}>{autoRotate ? <Pause /> : <Play />}{autoRotate ? "Pausar" : "Girar"}</button>
              <button onClick={resetView}><Focus /> Recentrar</button>
            </div>
          </div>

          {system === "organs" && selected && selectedOrganSemantic && <div className="med-3d-organ-stagebar" aria-label="Modo de visualização do órgão">
            <div className="med-3d-organ-stage-title"><span>ÓRGÃO SELECIONADO</span><strong>{selected.name}</strong></div>
            <div className="med-3d-organ-modes">
              {([
                ["context", "No corpo"],
                ["isolated", "Inteiro"],
                ["section", "Metade"],
                ["transparent", "Interior"],
              ] as Array<[OrganViewMode, string]>).map(([mode, label]) => <button key={mode} className={organView === mode ? "active" : ""} onClick={() => changeOrganView(mode)}>{mode === "section" ? <Box /> : mode === "transparent" ? <Eye /> : <PersonStanding />}{label}</button>)}
            </div>
            {organView === "section" && <div className="med-3d-section-controls">
              <span>PLANO DO CORTE</span>
              {(["x", "y", "z"] as SectionAxis[]).map((axis) => <button key={axis} className={sectionAxis === axis ? "active" : ""} onClick={() => setSectionAxis(axis)}>{axis === "x" ? "Sagital" : axis === "y" ? "Transversal" : "Coronal"}</button>)}
              <input aria-label="Posição do corte anatômico" type="range" min="-0.7" max="0.7" step="0.05" value={sectionOffset} onChange={(event) => setSectionOffset(Number(event.target.value))} />
            </div>}
          </div>}

          {realistic && <div className="med-3d-realism-note"><Sparkles /><span><strong>Camada realista ativa</strong>Materiais físicos e paleta macroscópica aproximam a aparência de tecidos reais.</span></div>}

          <div className="med-3d-canvas" role="img" aria-label={`Modelo 3D interativo mostrando ${anatomy3DSystemMeta.find((item) => item.id === system)?.label} em ${regionMeta.label}`}>
            <Suspense fallback={<div className="med-3d-loading"><Rotate3D /><strong>Preparando o modelo tridimensional…</strong></div>}>
              <Canvas shadows dpr={[1, 1.8]} camera={{ position: [4.2, 1.4, 9.5], fov: 36, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.localClippingEnabled = true; }}>
                <color attach="background" args={[realistic ? "#1b1a19" : "#edf3f0"]} />
                <fog attach="fog" args={[realistic ? "#1b1a19" : "#edf3f0", 13, 24]} />
                <ambientLight intensity={realistic ? .62 : 1.1} />
                <hemisphereLight args={[realistic ? "#ffe9db" : "#f9fffc", realistic ? "#221917" : "#40554e", realistic ? .9 : 1.35]} />
                <directionalLight position={[5, 9, 7]} intensity={realistic ? 3.1 : 2.3} color={realistic ? "#ffe4d2" : "#ffffff"} castShadow shadow-mapSize={[1024, 1024]} />
                <directionalLight position={[-6, 3, 2]} intensity={realistic ? 1.4 : 1.1} color={realistic ? "#c68b83" : "#b9d7cd"} />
                <pointLight position={[0, 2, -5]} intensity={realistic ? 1.6 : 1.2} color={realistic ? "#8c3e47" : "#9fc7bb"} />
                <RealBodyPartsModel system={system} selectedId={selected?.id ?? null} skinOpacity={skinOpacity} organView={organView} sectionAxis={sectionAxis} sectionOffset={sectionOffset} onSelect={selectStructure} />
                <RealMusculoskeletalModel system={system} selectedId={selected?.id ?? null} onSelect={selectStructure} />
                {system === "vascular" && <DenseAnatomySystemModel path={DETAILED_CIRCULATORY_PATH} layer="vascular" selectedId={selected?.id ?? null} onSelect={selectStructure} onCatalogReady={registerDetailedCatalog} />}
                {system === "nervous" && <DenseAnatomySystemModel path={DETAILED_NERVOUS_PATH} layer="nervous" selectedId={selected?.id ?? null} onSelect={selectStructure} onCatalogReady={registerDetailedCatalog} />}
                {system === "organs" && <DetailedOrgansModel realistic={realistic} selectedId={selected?.id ?? null} organView={organView} sectionAxis={sectionAxis} sectionOffset={sectionOffset} onSelect={selectStructure} onCatalogReady={registerDetailedCatalog} />}
                <AnatomyModel system={system} region={region} selectedId={selected?.id ?? null} skinOpacity={skinOpacity} onSelect={selectStructure} />
                <ContactShadows position={[0, -4.46, 0]} opacity={0.34} scale={8} blur={2.6} far={5} />
                <Grid position={[0, -4.45, 0]} args={[16, 16]} cellSize={0.5} cellThickness={0.45} cellColor={realistic ? "#4b3936" : "#a7bbb4"} sectionSize={2} sectionThickness={0.8} sectionColor={realistic ? "#725049" : "#7e9990"} fadeDistance={14} fadeStrength={1.2} infiniteGrid />
                <CameraRig focus={cameraFocus} distance={cameraDistance / zoom} focusKey={focusKey} view={cameraView} autoRotate={autoRotate} />
              </Canvas>
            </Suspense>
            <div className="med-3d-gesture-help"><Rotate3D /><span><b>Arraste</b> para girar</span><span><b>Roda ou pinça</b> para aproximar</span><span><b>Botão direito</b> para mover</span></div>
            <div className="med-3d-axis"><span>D</span><i /><span>E</span></div>
            {system === "all" && <label className="med-3d-opacity"><span>TRANSPARÊNCIA DA SUPERFÍCIE</span><input type="range" min="0.04" max="0.32" step="0.02" value={skinOpacity} onChange={(event) => setSkinOpacity(Number(event.target.value))} /><strong>{Math.round(skinOpacity * 100)}%</strong></label>}
          </div>
        </div>

        <aside className="med-3d-detail">
          {selected ? <>
            <div className="med-3d-detail-orbit"><div className="med-3d-orbit-ring"><span style={{ background: selected.color }}><PersonStanding /></span></div><small>ESTRUTURA SELECIONADA</small></div>
            <span className="med-eyebrow">{selected.region}</span>
            <h2>{selected.name}</h2>
            {selected.latin && <em>{selected.latin}</em>}
            <div className="med-3d-tags"><span style={{ borderColor: selected.color, color: selected.color }}>{anatomy3DSystemMeta.find((item) => item.id === selected.layer)?.label}</span><span>{selected.system}</span>{realistic && <span className="realistic">Realista</span>}</div>
            <p>{selected.summary}</p>
            <dl><div><dt>Função</dt><dd>{selected.function}</dd></div><div><dt>Localização espacial</dt><dd>Centro do modelo em {formatCoordinates(selected.focus)}. Use a rotação para conferir relações anteriores, posteriores e laterais.</dd></div></dl>
            <div className="med-3d-detail-actions">
              <button onClick={() => { setFocusSelected(true); setZoom(1.25); if (selected.layer === "organs") setOrganView("isolated"); setFocusKey((value) => value + 1); }}><Focus /> Isolar e aproximar</button>
              <button onClick={() => speak(selected.name)}><Volume2 /> Ouvir nome</button>
              <a href={medicalSources[selected.sourceId]?.url ?? medicalSources.openAnatomy.url} target="_blank" rel="noreferrer"><ExternalLink /> Conferir anatomia</a>
            </div>
            {selected.layer === "organs" && <div className="med-3d-organ-disclaimer"><Box /><span><strong>{organViewLabel(organView)}</strong>{organViewDescription(organView)}</span></div>}
            {realistic && <div className="med-3d-realistic-disclaimer"><HeartPulse /><span><strong>{organRealismProfile(selected.name).tissue}</strong>Aparência macroscópica educacional com cor e resposta à luz aproximadas; não representa variações individuais, patologia ou peça de dissecação.</span></div>}
            <div className="med-3d-safety"><ShieldCheck /><span><strong>Modelo educacional</strong>As formas 3D ajudam a entender orientação e relações gerais; não substituem atlas anatômico validado, dissecação ou avaliação profissional.</span></div>
          </> : <div className="med-3d-no-selection"><MousePointer2 /><h3>Toque em uma estrutura</h3><p>Você pode selecionar direto no corpo ou usar o índice ao lado.</p></div>}
        </aside>
      </div>
    </section>
  );
}

function AnatomyModel({ system, region, selectedId, skinOpacity, onSelect }: { system: Anatomy3DSystemId; region: Anatomy3DRegionId; selectedId: string | null; skinOpacity: number; onSelect: (structure: Anatomy3DStructure) => void }) {
  const structures = useMemo(() => proceduralStructuresFor3D(system, region, selectedId), [system, region, selectedId]);
  if (system === "vascular" || system === "nervous" || system === "organs") return null;
  return <group position={[0, 0.05, 0]}>{structures.map((structure) => (
    <StructureMesh key={structure.id} structure={structure} selected={selectedId === structure.id} opacity={system === "all" ? (structure.layer === "surface" ? skinOpacity : layerOpacity[structure.layer]) : 1} onSelect={onSelect} />
  ))}</group>;
}

function RealBodyPartsModel({ system, selectedId, skinOpacity, organView, sectionAxis, sectionOffset, onSelect }: {
  system: Anatomy3DSystemId;
  selectedId: string | null;
  skinOpacity: number;
  organView: OrganViewMode;
  sectionAxis: SectionAxis;
  sectionOffset: number;
  onSelect: (structure: Anatomy3DStructure) => void;
}) {
  const skinGltf = useGLTF(REAL_SKIN_PATH, "/medicine/models/draco/");
  const organsGltf = useGLTF(REAL_ORGANS_PATH, "/medicine/models/draco/");
  const skinModel = useMemo(() => prepareBodyPartsRoot(skinGltf.scene, "skin"), [skinGltf.scene]);
  const organsModel = useMemo(() => prepareBodyPartsRoot(organsGltf.scene, "organs"), [organsGltf.scene]);
  const selectedSemantic = organSemanticFromSelection(selectedId);
  const sectionPlane = useMemo(() => {
    if (!selectedSemantic) return null;
    const bounds = new Box3();
    organsModel.traverse((object) => {
      if (object instanceof Mesh && organSemantic(object.name) === selectedSemantic) bounds.expandByObject(object);
    });
    if (bounds.isEmpty()) return null;
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const normal = sectionAxis === "x" ? new Vector3(1, 0, 0) : sectionAxis === "y" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
    const axisSize = sectionAxis === "x" ? size.x : sectionAxis === "y" ? size.y : size.z;
    const point = center.clone().addScaledVector(normal, sectionOffset * axisSize * .5);
    return new Plane().setFromNormalAndCoplanarPoint(normal, point);
  }, [organsModel, sectionAxis, sectionOffset, selectedSemantic]);

  useEffect(() => {
    skinModel.visible = system === "all" || system === "surface";
    skinModel.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const material = object.material as MeshStandardMaterial;
      const active = selectedId === "model:skin";
      material.opacity = system === "surface" || active ? 0.94 : skinOpacity;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > 0.5;
      material.emissive.set(active ? "#d59b82" : "#000000");
      material.emissiveIntensity = active ? 0.2 : 0;
    });
    // The lightweight BodyParts3D layer remains as context in the combined view.
    // Dedicated system views use the complete Z-Anatomy meshes below.
    organsModel.visible = system === "all";
    organsModel.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const semantic = organSemantic(object.name);
      const isolateOrgan = system === "organs" && organView !== "context" && Boolean(selectedSemantic);
      const supplementalSelected = isSupplemental3DOrganId(selectedId);
      object.visible = !supplementalSelected && (system !== "nervous" || semantic === "brain") && (!isolateOrgan || semantic === selectedSemantic);
      const material = object.material as MeshStandardMaterial;
      const guidedId = system === "nervous" && semantic === "brain" ? "nerve-brain" : `organ-${semantic}`;
      const active = selectedId === guidedId || selectedId === `model:${system === "nervous" ? "nerve" : "organ"}:${semantic}`;
      material.emissive.copy(material.color);
      material.emissiveIntensity = active ? 0.34 : 0.12;
      const transparentInterior = system === "organs" && organView === "transparent" && semantic === selectedSemantic;
      material.opacity = transparentInterior ? .32 : system === "all" ? layerOpacity.organs : 1;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > .72;
      material.clippingPlanes = system === "organs" && organView === "section" && semantic === selectedSemantic && sectionPlane ? [sectionPlane] : [];
      material.clipShadows = Boolean(material.clippingPlanes.length);
      material.side = DoubleSide;
      material.needsUpdate = true;
    });
  }, [organView, organsModel, sectionPlane, selectedId, selectedSemantic, skinModel, skinOpacity, system]);

  const selectSkinModel = useCallback(() => {
    onSelect({
      id: "model:skin", name: "Superfície corporal", latin: "Integumentum commune", layer: "surface", regionId: "whole", region: "Corpo completo", system: "Tegumentar",
      summary: "Malha tridimensional contínua da superfície corporal, derivada do conjunto anatômico aberto BodyParts3D.", function: "Oferece referência externa para orientação regional, proporções e relações entre a superfície e estruturas profundas.", sourceId: "bodyParts3D", focus: [0, -0.15, 0], focusDistance: 15.2, color: "#d8a88c", parts: [],
    });
  }, [onSelect]);

  const selectOrganMesh = useCallback((hit: Mesh) => {
    const semantic = organSemantic(hit.name);
    const templateId = system === "nervous" && semantic === "brain" ? "nerve-brain" : `organ-${semantic}`;
    const template = anatomy3DStructures.find((item) => item.id === templateId) ?? anatomy3DStructures.find((item) => item.id === "organ-brain")!;
    const bounds = new Box3();
    organsModel.traverse((object) => {
      if (object instanceof Mesh && organSemantic(object.name) === semantic) bounds.expandByObject(object);
    });
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    onSelect({ ...template, id: `model:${system === "nervous" ? "nerve" : "organ"}:${semantic}`, focus: [center.x, center.y, center.z], focusDistance: Math.min(4.5, Math.max(1.35, Math.max(size.x, size.y, size.z) * 3.1)), parts: [] });
  }, [onSelect, organsModel, system]);

  if (system !== "all" && system !== "surface" && system !== "organs" && system !== "nervous") return null;

  return <group>
    <primitive object={skinModel} />
    <primitive object={organsModel} />
    <NativeMeshPicker active={system === "surface"} root={skinModel} onPick={selectSkinModel} />
    <NativeMeshPicker active={false} root={organsModel} onPick={selectOrganMesh} />
  </group>;
}

function prepareBodyPartsRoot(source: Object3D, kind: "skin" | "organs") {
  const clone = source.clone(true);
  const sourceSize = BODY_PARTS_SOURCE_BOUNDS.getSize(new Vector3());
  const sourceCenter = BODY_PARTS_SOURCE_BOUNDS.getCenter(new Vector3());
  const scale = 8.55 / sourceSize.y;
  clone.scale.setScalar(scale);
  clone.position.set(-sourceCenter.x * scale, -sourceCenter.y * scale - 0.08, -sourceCenter.z * scale);
  clone.traverse((object: unknown) => {
    if (!(object instanceof Mesh)) return;
    const semantic = organSemantic(object.name);
    if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
    const color = kind === "skin" ? "#d6a187" : organColor(semantic);
    const material = new MeshStandardMaterial({
      color,
      emissive: kind === "organs" ? color : "#000000",
      emissiveIntensity: kind === "organs" ? 0.12 : 0,
      roughness: kind === "skin" ? 0.62 : 0.55,
      metalness: 0,
      side: DoubleSide,
    });
    object.material = material;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  clone.updateMatrixWorld(true);
  return clone;
}

function RealMusculoskeletalModel({ system, selectedId, onSelect }: { system: Anatomy3DSystemId; selectedId: string | null; onSelect: (structure: Anatomy3DStructure) => void }) {
  const gltf = useGLTF(REAL_MODEL_PATH, "/medicine/models/draco/");
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(clone);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = 8.55 / Math.max(size.y, 0.001);
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -center.y * scale - 0.08, -center.z * scale);
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const original = Array.isArray(object.material) ? object.material[0] : object.material;
      const material = original instanceof MeshStandardMaterial ? original.clone() : new MeshStandardMaterial();
      const type = object.userData.type === "bone" ? "bone" : "muscle";
      material.color.set(type === "bone" ? "#e3d8bf" : "#a9343b");
      material.roughness = type === "bone" ? 0.72 : 0.56;
      material.metalness = 0;
      object.material = material;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    clone.updateMatrixWorld(true);
    return clone;
  }, [gltf.scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const type = object.userData.type;
      object.visible = system === "all" || (system === "muscular" && type === "muscle") || (system === "skeletal" && type === "bone");
      const material = object.material as MeshStandardMaterial;
      const active = selectedId === `model:${object.uuid}`;
      const guidedActive = guidedModelMeshMatches(selectedId, object);
      material.emissive.set(active || guidedActive ? material.color : "#000000");
      material.emissiveIntensity = active || guidedActive ? 0.34 : 0;
      material.opacity = system === "all" ? (type === "bone" ? layerOpacity.skeletal : layerOpacity.muscular) : 1;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > .52;
      material.needsUpdate = true;
    });
  }, [model, selectedId, system]);

  const selectRealMesh = useCallback((mesh: Mesh) => {
    const type = mesh.userData.type === "bone" ? "bone" : "muscle";
    const bounds = new Box3().setFromObject(mesh);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const detailName = String(mesh.userData.nameDetail || mesh.userData.name || mesh.name || (type === "bone" ? "Estrutura óssea" : "Estrutura muscular"));
    const description = cleanModelDescription(String(mesh.userData.description || ""), detailName, type);
    onSelect({
      id: `model:${mesh.uuid}`,
      name: detailName,
      layer: type === "bone" ? "skeletal" : "muscular",
      regionId: regionFromPoint(center),
      region: "Malha anatômica detalhada",
      system: type === "bone" ? "Esquelético" : "Muscular",
      summary: description,
      function: type === "bone" ? "Integra o esqueleto, oferecendo suporte, proteção ou alavanca conforme sua posição e articulações." : "Contribui para movimento, estabilização ou controle postural conforme suas origens, inserções e inervação.",
      sourceId: "zAnatomy3D",
      focus: [center.x, center.y, center.z],
      focusDistance: Math.min(4.4, Math.max(1.15, Math.max(size.x, size.y, size.z) * 3.2)),
      color: type === "bone" ? "#d8c9aa" : "#b94d4f",
      parts: [],
    });
  }, [onSelect]);

  if (system !== "all" && system !== "muscular" && system !== "skeletal") return null;

  return <group><primitive object={model} /><NativeMeshPicker active={system === "muscular" || system === "skeletal"} root={model} onPick={selectRealMesh} /></group>;
}

type DenseAnatomyLayer = "vascular" | "nervous";

function DenseAnatomySystemModel({ path, layer, selectedId, onSelect, onCatalogReady }: {
  path: string;
  layer: DenseAnatomyLayer;
  selectedId: string | null;
  onSelect: (structure: Anatomy3DStructure) => void;
  onCatalogReady: (system: Anatomy3DSystemId, catalog: Anatomy3DStructure[]) => void;
}) {
  const gltf = useGLTF(path);
  const prepared = useMemo(() => prepareDenseAnatomySystem(gltf.scene, layer), [gltf.scene, layer]);

  useEffect(() => {
    onCatalogReady(layer, prioritizeAnatomyCatalog(prepared.catalog, layer));
  }, [layer, onCatalogReady, prepared.catalog]);

  useEffect(() => {
    const selectedIndex = prepared.catalog.findIndex((item) => item.id === selectedId);
    const attribute = prepared.mesh.geometry.getAttribute("color") as BufferAttribute;
    const colors = attribute.array as Float32Array;
    const ids = prepared.mesh.geometry.getAttribute("anatomyStructureId") as BufferAttribute;
    for (let index = 0; index < ids.count; index += 1) {
      const offset = index * 3;
      const active = ids.getX(index) === selectedIndex;
      colors[offset] = active ? Math.min(1, prepared.baseColors[offset] * 1.15 + .24) : prepared.baseColors[offset];
      colors[offset + 1] = active ? Math.min(1, prepared.baseColors[offset + 1] * 1.15 + .18) : prepared.baseColors[offset + 1];
      colors[offset + 2] = active ? Math.min(1, prepared.baseColors[offset + 2] * .72 + .06) : prepared.baseColors[offset + 2];
    }
    attribute.needsUpdate = true;
  }, [prepared, selectedId]);

  const selectByIndex = useCallback((index: number) => {
    const structure = prepared.catalog[index];
    if (structure) onSelect(structure);
  }, [onSelect, prepared.catalog]);

  return <group><primitive object={prepared.mesh} /><DenseSystemPicker mesh={prepared.mesh} onPick={selectByIndex} /></group>;
}

function DetailedOrgansModel({ realistic, selectedId, organView, sectionAxis, sectionOffset, onSelect, onCatalogReady }: {
  realistic: boolean;
  selectedId: string | null;
  organView: OrganViewMode;
  sectionAxis: SectionAxis;
  sectionOffset: number;
  onSelect: (structure: Anatomy3DStructure) => void;
  onCatalogReady: (system: Anatomy3DSystemId, catalog: Anatomy3DStructure[]) => void;
}) {
  const gltf = useGLTF(DETAILED_ORGANS_PATH);
  const heartGltf = useGLTF(SUPPLEMENTAL_ORGAN_PATHS.heart, "/medicine/models/draco/");
  const brainGltf = useGLTF(SUPPLEMENTAL_ORGAN_PATHS.brain, "/medicine/models/draco/");
  const spleenGltf = useGLTF(SUPPLEMENTAL_ORGAN_PATHS.spleen, "/medicine/models/draco/");
  const eyeGltf = useGLTF(SUPPLEMENTAL_ORGAN_PATHS.eye, "/medicine/models/draco/");
  const prepared = useMemo(() => prepareDetailedOrgans(gltf.scene), [gltf.scene]);
  const supplements = useMemo(() => [
    prepareSupplementalOrgan(heartGltf.scene, "heart"),
    prepareSupplementalOrgan(brainGltf.scene, "brain"),
    prepareSupplementalOrgan(spleenGltf.scene, "spleen"),
    prepareSupplementalOrgan(eyeGltf.scene, "eye"),
  ], [brainGltf.scene, eyeGltf.scene, heartGltf.scene, spleenGltf.scene]);
  const completeCatalog = useMemo(() => [...prepared.catalog, ...supplements.map((item) => item.structure)], [prepared.catalog, supplements]);

  useEffect(() => {
    onCatalogReady("organs", prioritizeAnatomyCatalog(completeCatalog, "organs"));
  }, [completeCatalog, onCatalogReady]);

  const selectedSupplement = supplements.find((item) => item.structure.id === selectedId) ?? null;

  const selectedIndexes = useMemo(() => {
    const exact = prepared.catalog.findIndex((item) => item.id === selectedId);
    if (exact >= 0) return [exact];
    return prepared.meshes
      .map((mesh, index) => guidedOrganMeshMatches(selectedId, String(mesh.userData.rawAnatomyName ?? mesh.name)) ? index : -1)
      .filter((index) => index >= 0);
  }, [prepared, selectedId]);

  const sectionPlane = useMemo(() => {
    if ((!selectedIndexes.length && !selectedSupplement) || organView !== "section") return null;
    const bounds = new Box3();
    if (selectedSupplement) bounds.expandByObject(selectedSupplement.root);
    else selectedIndexes.forEach((index) => bounds.expandByObject(prepared.meshes[index]));
    if (bounds.isEmpty()) return null;
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const normal = sectionAxis === "x" ? new Vector3(1, 0, 0) : sectionAxis === "y" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
    const axisSize = sectionAxis === "x" ? size.x : sectionAxis === "y" ? size.y : size.z;
    return new Plane().setFromNormalAndCoplanarPoint(normal, center.clone().addScaledVector(normal, sectionOffset * axisSize * .5));
  }, [organView, prepared.meshes, sectionAxis, sectionOffset, selectedIndexes, selectedSupplement]);

  useEffect(() => {
    const isolates = organView !== "context" && (selectedIndexes.length > 0 || Boolean(selectedSupplement));
    prepared.meshes.forEach((mesh, index) => {
      const active = selectedIndexes.includes(index);
      mesh.visible = !isolates || active;
      const material = mesh.material as MeshPhysicalMaterial;
      const rawName = String(mesh.userData.rawAnatomyName ?? mesh.name);
      applyOrganAppearance(material, rawName, realistic, active, String(mesh.userData.didacticColor ?? "#a86c79"));
      material.opacity = organView === "transparent" && active ? .34 : 1;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > .7;
      material.clippingPlanes = organView === "section" && active && sectionPlane ? [sectionPlane] : [];
      material.clipShadows = material.clippingPlanes.length > 0;
      material.needsUpdate = true;
    });
    supplements.forEach((supplement) => {
      const active = supplement === selectedSupplement && organView !== "context";
      supplement.root.visible = active;
      supplement.root.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const material = object.material as MeshPhysicalMaterial;
        applyOrganAppearance(material, supplement.structure.name, realistic, active, String(object.userData.didacticColor ?? supplement.structure.color));
        material.opacity = active && organView === "transparent" ? .36 : 1;
        material.transparent = material.opacity < 1;
        material.depthWrite = material.opacity > .7;
        material.clippingPlanes = active && organView === "section" && sectionPlane ? [sectionPlane] : [];
        material.clipShadows = material.clippingPlanes.length > 0;
        material.needsUpdate = true;
      });
    });
  }, [organView, prepared.meshes, realistic, sectionPlane, selectedIndexes, selectedSupplement, supplements]);

  const selectOrgan = useCallback((mesh: Mesh) => {
    const structure = prepared.catalog[Number(mesh.userData.catalogIndex)];
    if (structure) onSelect(structure);
  }, [onSelect, prepared.catalog]);

  return <group>
    <primitive object={prepared.root} />
    {supplements.map((supplement) => <primitive key={supplement.structure.id} object={supplement.root} />)}
    <NativeMeshPicker active={!selectedSupplement} root={prepared.root} onPick={selectOrgan} />
  </group>;
}

function DenseSystemPicker({ mesh, onPick }: { mesh: Mesh; onPick: (index: number) => void }) {
  const { camera, gl, raycaster } = useThree();
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = gl.domElement;
    const pointer = new Vector2();
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === 0) pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const handlePointerUp = (event: PointerEvent) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
      const bounds = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(mesh, false)[0];
      if (!hit?.face) return;
      const ids = mesh.geometry.getAttribute("anatomyStructureId") as BufferAttribute;
      onPick(Math.round(ids.getX(hit.face.a)));
    };
    const cancelPointer = () => { pointerStart.current = null; };
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", cancelPointer);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", cancelPointer);
    };
  }, [camera, gl, mesh, onPick, raycaster]);
  return null;
}

function NativeMeshPicker({ active, root, onPick }: { active: boolean; root: Object3D; onPick: (mesh: Mesh) => void }) {
  const { camera, gl, raycaster } = useThree();
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!active) return;
    const canvas = gl.domElement;
    const pointer = new Vector2();
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const handlePointerUp = (event: PointerEvent) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
      const bounds = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(root, true).find((intersection) => intersection.object instanceof Mesh && meshIsEffectivelyVisible(intersection.object, root));
      if (hit?.object instanceof Mesh) onPick(hit.object);
    };
    const cancelPointer = () => { pointerStart.current = null; };
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", cancelPointer);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", cancelPointer);
    };
  }, [active, camera, gl, onPick, raycaster, root]);
  return null;
}

function StructureMesh({ structure, selected, opacity, onSelect }: { structure: Anatomy3DStructure; selected: boolean; opacity: number; onSelect: (structure: Anatomy3DStructure) => void }) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);
  const interaction = {
    onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect(structure); },
    onPointerOver: (event: { stopPropagation: () => void }) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; },
    onPointerOut: () => { setHovered(false); document.body.style.cursor = ""; },
  };
  return <group {...interaction}>{structure.parts.map((part, index) => <PartMesh key={`${structure.id}-${index}`} part={part} baseColor={structure.color} opacity={opacity} active={selected || hovered} />)}</group>;
}

function PartMesh({ part, baseColor, opacity, active }: { part: Anatomy3DPart; baseColor: string; opacity: number; active: boolean }) {
  const color = part.color ?? baseColor;
  const material = <meshStandardMaterial color={color} roughness={0.58} metalness={0.02} transparent={opacity < 1} opacity={active ? Math.max(opacity, 0.96) : opacity} depthWrite={opacity > 0.55} emissive={active ? new Color(color) : new Color("#000000")} emissiveIntensity={active ? 0.24 : 0} />;
  if (part.kind === "tube") return <TubePart part={part} material={material} />;
  if (part.kind === "sphere") return <mesh position={part.position} scale={part.scale} rotation={part.rotation} castShadow receiveShadow><sphereGeometry args={[1, 34, 26]} />{material}</mesh>;
  if (part.kind === "capsule") return <mesh position={part.position} scale={part.scale} rotation={part.rotation} castShadow receiveShadow><capsuleGeometry args={[0.55, 1, 10, 20]} />{material}</mesh>;
  if (part.kind === "cylinder") return <mesh position={part.position} scale={part.scale} rotation={part.rotation} castShadow receiveShadow><cylinderGeometry args={[0.5, 0.5, 1, 22]} />{material}</mesh>;
  if (part.kind === "box") return <mesh position={part.position} scale={part.scale} rotation={part.rotation} castShadow receiveShadow><boxGeometry args={[1, 1, 1, 2, 2, 2]} />{material}</mesh>;
  return <mesh position={part.position} scale={part.scale} rotation={part.rotation} castShadow receiveShadow><torusGeometry args={[0.5, 0.075, 16, 48]} />{material}</mesh>;
}

function TubePart({ part, material }: { part: Extract<Anatomy3DPart, { kind: "tube" }>; material: React.ReactElement }) {
  const curve = useMemo(() => new CatmullRomCurve3(part.points.map((point) => new Vector3(...point))), [part.points]);
  return <mesh castShadow receiveShadow><tubeGeometry args={[curve, Math.max(24, part.points.length * 12), part.radius, 12, false]} />{material}</mesh>;
}

function CameraRig({ focus, distance, focusKey, view, autoRotate }: { focus: [number, number, number]; distance: number; focusKey: number; view: CameraView; autoRotate: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const desiredTarget = useRef(new Vector3(...focus));
  const desiredPosition = useRef(new Vector3(4, 1, 9));
  const progress = useRef(1);

  useEffect(() => {
    desiredTarget.current.set(...focus);
    desiredPosition.current.copy(cameraPositionFor(focus, distance, view));
    progress.current = 1;
  }, [camera, distance, focus, focusKey, view]);

  useFrame((_, delta) => {
    if (progress.current <= 0.001 || !controls.current) return;
    const factor = 1 - Math.exp(-delta * 6.5);
    camera.position.lerp(desiredPosition.current, factor);
    controls.current.target.lerp(desiredTarget.current, factor);
    controls.current.update();
    progress.current *= 1 - factor;
  });

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.075} rotateSpeed={0.72} zoomSpeed={0.9} panSpeed={0.62} minDistance={0.72} maxDistance={19} minPolarAngle={0.08} maxPolarAngle={Math.PI - 0.08} autoRotate={autoRotate} autoRotateSpeed={0.72} onStart={() => { progress.current = 0; }} />;
}

function cameraPositionFor(focus: [number, number, number], distance: number, view: CameraView) {
  const target = new Vector3(...focus);
  if (view === "front") return target.clone().add(new Vector3(0, distance * 0.06, distance));
  if (view === "back") return target.clone().add(new Vector3(0, distance * 0.06, -distance));
  if (view === "left") return target.clone().add(new Vector3(-distance, distance * 0.06, 0));
  if (view === "right") return target.clone().add(new Vector3(distance, distance * 0.06, 0));
  return target.clone().add(new Vector3(distance * 0.38, distance * 0.12, distance * 0.92));
}

function prepareDenseAnatomySystem(source: Object3D, layer: DenseAnatomyLayer) {
  const clone = normalizeAnatomyRoot(source);
  const geometries: Array<Mesh["geometry"]> = [];
  const catalog: Anatomy3DStructure[] = [];

  clone.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const rawName = String(object.name || `Estrutura ${catalog.length + 1}`);
    if (!isUsableAnatomyMeshName(rawName)) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    for (const attribute of Object.keys(geometry.attributes)) {
      if (attribute !== "position" && attribute !== "normal") geometry.deleteAttribute(attribute);
    }
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const structureIndex = catalog.length;
    geometry.setAttribute("anatomyStructureId", new BufferAttribute(new Float32Array(geometry.getAttribute("position").count).fill(structureIndex), 1));
    const color = anatomyColorForRawName(layer, rawName);
    const rgb = new Color(color);
    const colorValues = new Float32Array(geometry.getAttribute("position").count * 3);
    for (let index = 0; index < colorValues.length; index += 3) {
      colorValues[index] = rgb.r;
      colorValues[index + 1] = rgb.g;
      colorValues[index + 2] = rgb.b;
    }
    geometry.setAttribute("color", new BufferAttribute(colorValues, 3));
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox ?? new Box3();
    catalog.push(catalogStructureFromBounds(rawName, layer, structureIndex, bounds, color));
    geometries.push(geometry);
  });

  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error(`Não foi possível combinar as malhas do sistema ${layer}.`);
  merged.computeBoundingSphere();
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: layer === "vascular" ? .5 : .63, metalness: 0, side: DoubleSide });
  const mesh = new Mesh(merged, material);
  mesh.name = `sistema-${layer}-detalhado`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const colorAttribute = merged.getAttribute("color") as BufferAttribute;
  return { mesh, catalog, baseColors: new Float32Array(colorAttribute.array as ArrayLike<number>) };
}

function prepareDetailedOrgans(source: Object3D) {
  const root = normalizeAnatomyRoot(source);
  const catalog: Anatomy3DStructure[] = [];
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const rawName = String(object.name || `Estrutura visceral ${catalog.length + 1}`);
    if (!isUsableAnatomyMeshName(rawName)) return;
    if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
    const color = anatomyColorForRawName("organs", rawName);
    object.material = new MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: .08, roughness: .54, metalness: 0, clearcoat: 0, sheen: 0, side: DoubleSide });
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.catalogIndex = catalog.length;
    object.userData.rawAnatomyName = rawName;
    object.userData.didacticColor = color;
    const bounds = new Box3().setFromObject(object);
    catalog.push(catalogStructureFromBounds(rawName, "organs", catalog.length, bounds, color));
    meshes.push(object);
  });
  return { root, catalog, meshes };
}

function prepareSupplementalOrgan(source: Object3D, kind: keyof typeof SUPPLEMENTAL_ORGAN_PATHS) {
  const settings = {
    heart: { name: "Coração", latin: "Cor", target: [0.1, 1.45, 0] as [number, number, number], size: 1.25, color: "#b53c50", regionId: "thorax" as Anatomy3DRegionId, region: "Mediastino", system: "Cardiovascular", summary: "Modelo isolado de alta definição do coração, indicado para observar toda a superfície externa em rotação livre.", function: "Mantém o fluxo sanguíneo pelas circulações pulmonar e sistêmica por contrações coordenadas." },
    brain: { name: "Encéfalo", latin: "Encephalon", target: [0, 3.35, 0] as [number, number, number], size: 1.22, color: "#cf8e94", regionId: "head" as Anatomy3DRegionId, region: "Cavidade craniana", system: "Nervoso", summary: "Modelo isolado de alta definição do encéfalo para exploração externa em múltiplos ângulos.", function: "Integra informação sensorial, movimento, cognição, memória e regulação autonômica." },
    spleen: { name: "Baço", latin: "Lien", target: [-0.48, .42, .02] as [number, number, number], size: .62, color: "#7e4058", regionId: "abdomen" as Anatomy3DRegionId, region: "Hipocôndrio esquerdo", system: "Linfático e imune", summary: "Modelo isolado de alta definição do baço para estudo de forma, polos, faces e relações gerais.", function: "Filtra o sangue, participa da resposta imune e remove células sanguíneas envelhecidas." },
    eye: { name: "Olho", latin: "Oculus", target: [0, 3.42, .18] as [number, number, number], size: .42, color: "#7198a4", regionId: "head" as Anatomy3DRegionId, region: "Órbita", system: "Órgãos dos sentidos", summary: "Modelo isolado de alta definição do globo ocular para estudo tridimensional de sua forma externa.", function: "Recebe a luz e a converte em sinais neurais que seguem pelas vias visuais." },
  }[kind];
  const root = source.clone(true);
  root.rotation.x = -Math.PI / 2;
  root.updateMatrixWorld(true);
  const initialBounds = new Box3().setFromObject(root);
  const initialCenter = initialBounds.getCenter(new Vector3());
  const initialSize = initialBounds.getSize(new Vector3());
  // The high-resolution heart contains long attached vessel stumps. Scale and
  // center by the cardiac mass instead of letting those stumps make it tiny.
  const visualExtent = kind === "heart" ? Math.max(initialSize.x, initialSize.z) : Math.max(initialSize.x, initialSize.y, initialSize.z);
  const visualCenter = initialCenter.clone();
  if (kind === "heart") visualCenter.y += initialSize.y * .28;
  const scale = settings.size / Math.max(visualExtent, .001);
  root.scale.setScalar(scale);
  root.position.set(settings.target[0] - visualCenter.x * scale, settings.target[1] - visualCenter.y * scale, settings.target[2] - visualCenter.z * scale);
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
    object.material = new MeshPhysicalMaterial({ color: settings.color, emissive: settings.color, emissiveIntensity: .12, roughness: .5, metalness: 0, clearcoat: 0, sheen: 0, side: DoubleSide });
    object.userData.didacticColor = settings.color;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  root.visible = false;
  root.updateMatrixWorld(true);
  const structure: Anatomy3DStructure = {
    id: `model:organs:supplement:${kind}`,
    name: settings.name,
    latin: settings.latin,
    layer: "organs",
    regionId: settings.regionId,
    region: settings.region,
    system: settings.system,
    summary: settings.summary,
    function: settings.function,
    sourceId: "zAnatomyOrgan3D",
    focus: settings.target,
    focusDistance: kind === "eye" ? 1.25 : kind === "spleen" ? 1.65 : kind === "heart" ? 3.35 : 2.45,
    color: settings.color,
    parts: [],
  };
  return { root, structure };
}

function applyOrganAppearance(material: MeshPhysicalMaterial, name: string, realistic: boolean, active: boolean, didacticColor: string) {
  if (!realistic) {
    material.color.set(didacticColor);
    material.emissive.set(didacticColor);
    material.emissiveIntensity = active ? .3 : .08;
    material.roughness = .54;
    material.clearcoat = 0;
    material.clearcoatRoughness = .5;
    material.sheen = 0;
    material.metalness = 0;
    return;
  }
  const profile = organRealismProfile(name);
  material.color.set(profile.color);
  material.emissive.set(profile.highlight);
  material.emissiveIntensity = active ? .095 : .012;
  material.roughness = profile.roughness;
  material.metalness = 0;
  material.clearcoat = profile.clearcoat;
  material.clearcoatRoughness = profile.clearcoatRoughness;
  material.sheen = profile.sheen;
  material.sheenColor.set(profile.sheenColor);
  material.ior = 1.38;
}

function normalizeAnatomyRoot(source: Object3D) {
  const clone = source.clone(true);
  clone.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(clone);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = 8.55 / Math.max(size.y, .001);
  clone.scale.setScalar(scale);
  clone.position.set(-center.x * scale, -center.y * scale - .08, -center.z * scale);
  clone.updateMatrixWorld(true);
  return clone;
}

function catalogStructureFromBounds(rawName: string, layer: Exclude<Anatomy3DSystemId, "all" | "surface" | "muscular" | "skeletal">, index: number, bounds: Box3, color: string): Anatomy3DStructure {
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const name = translateAnatomyName(rawName, layer, index);
  const regionId = regionFromPoint(center);
  const layerName = layer === "vascular" ? "Cardiovascular" : layer === "nervous" ? "Nervoso" : anatomyOrganSystem(rawName);
  const summary = layer === "vascular"
    ? `${name} é uma estrutura individual da circulação representada na malha anatômica. Nomenclatura da fonte: ${rawName}.`
    : layer === "nervous"
      ? `${name} é uma estrutura individual do sistema nervoso representada na malha anatômica. Nomenclatura da fonte: ${rawName}.`
      : `${name} integra o conjunto de órgãos internos e estruturas associadas do atlas. Nomenclatura da fonte: ${rawName}.`;
  const functionText = layer === "vascular"
    ? "Participa do transporte de sangue ou da organização do sistema cardiovascular; confirme ramificações e territórios em uma fonte anatômica validada."
    : layer === "nervous"
      ? "Participa da condução, integração ou processamento de sinais nervosos conforme sua localização e conexões."
      : "Sua função depende do órgão ou segmento selecionado e deve ser estudada em conjunto com suas relações anatômicas e sistema funcional.";
  return {
    id: `model:${layer}:${index}`,
    name,
    layer,
    regionId,
    region: anatomy3DRegions.find((item) => item.id === regionId)?.label ?? "Corpo humano",
    system: layerName,
    summary,
    function: functionText,
    sourceId: "zAnatomySystems3D",
    focus: [center.x, center.y, center.z],
    focusDistance: Math.min(4.8, Math.max(.82, Math.max(size.x, size.y, size.z) * 3.2)),
    color,
    parts: [],
  };
}

function anatomyColorForRawName(layer: DenseAnatomyLayer | "organs", rawName: string) {
  const name = normalize(rawName);
  if (layer === "vascular") {
    if (/vein|venous|sinus/.test(name)) return "#397ca5";
    if (/heart|atri|ventric|coronary/.test(name)) return "#b9344b";
    return "#d94e5f";
  }
  if (layer === "nervous") {
    if (/brain|cerebr|cortex|gyrus|cerebell/.test(name)) return "#d49a76";
    if (/spinal cord|medulla/.test(name)) return "#edc16b";
    if (/ganglion|plexus/.test(name)) return "#e6a43d";
    return "#f1b64d";
  }
  if (/heart|atrium|ventricle/.test(name)) return "#b43d50";
  if (/lung|bronch/.test(name)) return "#6f9faa";
  if (/liver|gallbladder/.test(name)) return "#895246";
  if (/kidney|renal|ureter|bladder/.test(name)) return "#80556b";
  if (/brain|cerebr|pituitary/.test(name)) return "#cf8e94";
  if (/stomach|esophagus|intestin|colon|rectum|duodenum|jejunum|ileum/.test(name)) return "#c78372";
  if (/pancreas/.test(name)) return "#d8a45f";
  if (/spleen/.test(name)) return "#7e4058";
  if (/thyroid|adrenal|gland/.test(name)) return "#d48e55";
  if (/testis|prostate|seminal|uterus|ovary|vagina/.test(name)) return "#a96b88";
  if (/pleura|peritone|fascia|capsule/.test(name)) return "#b9a3ad";
  return "#a86c79";
}

const anatomyNameDictionary: Record<string, string> = {
  heart: "Coração",
  brain: "Encéfalo",
  cerebrum: "Cérebro",
  cerebellum: "Cerebelo",
  "spinal cord": "Medula espinal",
  stomach: "Estômago",
  liver: "Fígado",
  pancreas: "Pâncreas",
  spleen: "Baço",
  "urinary bladder": "Bexiga urinária",
  prostate: "Próstata",
  testis: "Testículo",
  uterus: "Útero",
  ovary: "Ovário",
  trachea: "Traqueia",
  epiglottis: "Epiglote",
  pleura: "Pleura",
  esophagus: "Esôfago",
  gallbladder: "Vesícula biliar",
  duodenum: "Duodeno",
  jejunum: "Jejuno",
  ileum: "Íleo",
  rectum: "Reto",
  "pituitary gland": "Hipófise",
  "pineal gland": "Glândula pineal",
  "thyroid gland": "Glândula tireoide",
  "seminal gland": "Vesícula seminal",
  "abdominal aorta": "Aorta abdominal",
  "ascending aorta": "Aorta ascendente",
  "thoracic aorta": "Aorta torácica",
  "aortic arch": "Arco da aorta",
};

function translateAnatomyName(rawName: string, layer: DenseAnatomyLayer | "organs", index: number) {
  const cleaned = rawName.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  const explicitSide = cleaned.match(/\.([lr])$/i)?.[1];
  const compactSide = cleaned.match(/(?:artery|arteries|vein|veins|nerve|nerves|branch|trunk|sinus|plexus|ganglion|kidney|lung|gland|lobe)([lr])$/i)?.[1];
  const sideCode = explicitSide ?? compactSide;
  const side = sideCode?.toLocaleLowerCase() === "l" ? " esquerdo" : sideCode?.toLocaleLowerCase() === "r" ? " direito" : "";
  const withoutSide = explicitSide ? cleaned.slice(0, -2) : compactSide ? cleaned.slice(0, -1) : cleaned;
  const exact = anatomyNameDictionary[withoutSide.toLocaleLowerCase("en-US")];
  if (exact) return `${exact}${side}`;
  if (/^mesh(?:\.\d+)?$/i.test(withoutSide)) return layer === "organs" ? `Estrutura visceral ${index + 1}` : `Estrutura anatômica ${index + 1}`;
  const replacements: Array<[RegExp, string]> = [
    [/\bleft\b/gi, "esquerdo"], [/\bright\b/gi, "direito"], [/\bsuperior\b/gi, "superior"], [/\binferior\b/gi, "inferior"],
    [/\banterior\b/gi, "anterior"], [/\bposterior\b/gi, "posterior"], [/\binternal\b/gi, "interno"], [/\bexternal\b/gi, "externo"],
    [/\bcommon\b/gi, "comum"], [/\bdeep\b/gi, "profundo"], [/\bsuperficial\b/gi, "superficial"], [/\bmedial\b/gi, "medial"], [/\blateral\b/gi, "lateral"],
    [/\bartery\b/gi, "artéria"], [/\barteries\b/gi, "artérias"], [/\bvein\b/gi, "veia"], [/\bveins\b/gi, "veias"], [/\bnerve\b/gi, "nervo"], [/\bnerves\b/gi, "nervos"],
    [/\bbranch\b/gi, "ramo"], [/\btrunk\b/gi, "tronco"], [/\broot\b/gi, "raiz"], [/\bplexus\b/gi, "plexo"], [/\bganglion\b/gi, "gânglio"],
    [/\blobe\b/gi, "lobo"], [/\bgland\b/gi, "glândula"], [/\bduct\b/gi, "ducto"], [/\blung\b/gi, "pulmão"], [/\bkidney\b/gi, "rim"],
    [/\bcolon\b/gi, "cólon"], [/\bintestine\b/gi, "intestino"], [/\bof\b/gi, "do"],
  ];
  let translated = withoutSide;
  replacements.forEach(([pattern, value]) => { translated = translated.replace(pattern, value); });
  return `${translated.charAt(0).toLocaleUpperCase("pt-BR")}${translated.slice(1)}${side}`;
}

function isUsableAnatomyMeshName(rawName: string) {
  const compact = rawName.replace(/[\s_.-]/g, "");
  if (compact.length < 3) return false;
  if (/^[?\d x]+$/i.test(compact)) return false;
  return /[a-z]{3}/i.test(compact);
}

function anatomyOrganSystem(rawName: string) {
  const name = normalize(rawName);
  if (/lung|trachea|bronch|pleura|nasal/.test(name)) return "Respiratório";
  if (/heart/.test(name)) return "Cardiovascular";
  if (/brain|pituitary|pineal/.test(name)) return "Nervoso e endócrino";
  if (/kidney|renal|ureter|bladder/.test(name)) return "Urinário";
  if (/testis|prostate|seminal|uterus|ovary|vagina/.test(name)) return "Reprodutor";
  if (/thyroid|adrenal|gland/.test(name)) return "Endócrino";
  return "Órgãos internos";
}

function prioritizeAnatomyCatalog(catalog: Anatomy3DStructure[], layer: DenseAnatomyLayer | "organs") {
  const priorities = layer === "vascular" ? ["coração", "aorta", "veia cava", "carótida"] : layer === "nervous" ? ["encéfalo", "cérebro", "cerebelo", "medula espinal"] : ["coração", "encéfalo", "pulmão", "fígado", "estômago", "rim"];
  const score = (item: Anatomy3DStructure) => {
    const name = normalize(item.name);
    const found = priorities.findIndex((priority) => name.includes(priority));
    return found < 0 ? priorities.length : found;
  };
  return [...catalog].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, "pt-BR"));
}

function guidedOrganMeshMatches(selectedId: string | null, rawName: string) {
  if (!selectedId || selectedId.startsWith("model:")) return false;
  const patterns: Record<string, RegExp> = {
    "organ-brain": /brain|cerebr|cerebell|encephal/i,
    "organ-heart": /heart/i,
    "organ-lungs": /lung/i,
    "organ-liver": /liver/i,
    "organ-stomach": /stomach/i,
    "organ-kidneys": /kidney|renal pelvis/i,
    "organ-intestines": /intestin|colon|duodenum|jejunum|ileum/i,
    "organ-bladder": /urinary bladder/i,
    "organ-pancreas": /pancreas/i,
    "organ-thyroid": /thyroid/i,
    "organ-prostate": /prostate/i,
    "organ-testes": /testis/i,
    "organ-uterus": /uterus/i,
    "organ-ovaries": /ovary/i,
  };
  return patterns[selectedId]?.test(rawName) ?? false;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

const guidedModelPatterns: Record<string, string[]> = {
  "muscle-deltoid": ["deltoid"],
  "muscle-pectoralis": ["pectoralis major"],
  "muscle-biceps": ["biceps brachii"],
  "muscle-rectus": ["rectus abdominis"],
  "muscle-quadriceps": ["rectus femoris", "vastus lateralis", "vastus medialis", "vastus intermedius"],
  "muscle-calf": ["gastrocnemius"],
  "muscle-trapezius": ["trapezius"],
  "muscle-gluteus": ["gluteus maximus"],
  "bone-skull": ["parietal bone", "frontal bone", "occipital bone", "sphenoid bone", "temporal bone", "ethmoid bone", "mandible", "maxilla", "zygomatic bone"],
  "bone-spine": ["vertebra", "atlas (c1)", "axis (c2)", "sacrum", "coccyx"],
  "bone-ribs": [" rib", "sternum"],
  "bone-pelvis": ["hip bone", "sacrum"],
  "bone-humerus": ["humerus"],
  "bone-forearm": ["radius", "ulna"],
  "bone-femur": ["femur"],
  "bone-lower-leg": ["tibia", "fibula"],
};

function guidedModelMeshMatches(selectedId: string | null, mesh: Mesh) {
  if (!selectedId || selectedId.startsWith("model:")) return false;
  const patterns = guidedModelPatterns[selectedId];
  if (!patterns) return false;
  const modelName = normalize(`${mesh.userData.nameDetail ?? ""} ${mesh.userData.name ?? ""} ${mesh.name}`);
  return patterns.some((pattern) => modelName.includes(pattern));
}

function meshIsEffectivelyVisible(mesh: Mesh, root: Object3D) {
  let current: Object3D | null = mesh;
  while (current) {
    if (!current.visible) return false;
    if (current === root) break;
    current = current.parent;
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some((material) => material.visible && material.opacity > .025);
}

function viewLabel(view: CameraView) {
  if (view === "front") return "Frente";
  if (view === "back") return "Costas";
  if (view === "left") return "Lado E";
  return "Lado D";
}

function formatCoordinates(position: [number, number, number]) {
  return `X ${position[0].toFixed(2)} · Y ${position[1].toFixed(2)} · Z ${position[2].toFixed(2)}`;
}

function regionFromPoint(point: Vector3): Anatomy3DRegionId {
  if (Math.abs(point.x) > 1.05 && point.y > -1) return "upper-limb";
  if (point.y > 2.65) return "head";
  if (point.y > 0.7) return "thorax";
  if (point.y > -0.25) return "abdomen";
  if (point.y > -1.05) return "pelvis";
  return "lower-limb";
}

function organSemantic(name: string) {
  return name.split("__")[0]?.replace(/\.\d+$/, "") || "brain";
}

function organSemanticFromSelection(id: string | null) {
  if (!id) return null;
  if (id === "nerve-brain" || id === "model:nerve:brain") return "brain";
  const semantic = id.startsWith("model:organ:") ? id.slice("model:organ:".length) : id.startsWith("organ-") ? id.slice("organ-".length) : "";
  return ["brain", "heart", "intestines", "kidneys", "liver", "lungs", "stomach"].includes(semantic) ? semantic : null;
}

function organViewLabel(mode: OrganViewMode) {
  if (mode === "context") return "Órgão em contexto";
  if (mode === "isolated") return "Exterior isolado";
  if (mode === "section") return "Corte geométrico ajustável";
  return "Exploração translúcida";
}

function organViewDescription(mode: OrganViewMode) {
  if (mode === "context") return "Mantém os demais órgãos para estudar relações espaciais.";
  if (mode === "isolated") return "Remove o entorno e permite rotação livre de toda a superfície da malha.";
  if (mode === "section") return "Recorta a malha pelo plano escolhido. Só revela volumes realmente presentes no arquivo 3D.";
  return "Reduz a opacidade para comparar superfícies sobrepostas; não cria câmaras ausentes do modelo.";
}

function organColor(semantic: string) {
  const colors: Record<string, string> = {
    brain: "#d59092",
    heart: "#b53c50",
    intestines: "#c98f7b",
    kidneys: "#815363",
    liver: "#875044",
    lungs: "#6d98a2",
    stomach: "#b56a74",
  };
  return colors[semantic] ?? "#95627d";
}

function cleanModelDescription(value: string, name: string, type: "bone" | "muscle") {
  const cleaned = value
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[=]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(new RegExp(`^${escapeRegExp(name)}\\s*`, "i"), "");
  if (cleaned.length > 80) return `${cleaned.slice(0, 360).trim()}${cleaned.length > 360 ? "…" : ""}`;
  return type === "bone" ? "Malha óssea individual do modelo anatômico aberto Z-Anatomy/BodyParts3D." : "Malha muscular individual do modelo anatômico aberto Z-Anatomy/BodyParts3D.";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function speak(name: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(name);
  utterance.lang = "pt-BR";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

useGLTF.preload(REAL_MODEL_PATH, "/medicine/models/draco/");
useGLTF.preload(REAL_SKIN_PATH, "/medicine/models/draco/");
useGLTF.preload(REAL_ORGANS_PATH, "/medicine/models/draco/");
