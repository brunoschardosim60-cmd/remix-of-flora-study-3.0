import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ACESFilmicToneMapping, Box3, BufferAttribute, Color, DoubleSide, Mesh, MeshPhysicalMaterial, Object3D, PCFSoftShadowMap, Plane, SRGBColorSpace, Vector2, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Activity,
  Box,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Focus,
  FileHeart,
  HeartPulse,
  ListChecks,
  Maximize2,
  Microscope,
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
  Stethoscope,
  Volume2,
} from "lucide-react";
import {
  anatomy3DRegions,
  anatomy3DStructures,
  anatomy3DSystemMeta,
  detailedStructureForGuided,
  detailedStructuresFor3DSystem,
  isSupplemental3DOrganId,
  mergeGuidedAndDetailedStructures,
  raw3DNameMatchesBodyProfile,
  structureMatchesBodyProfile,
  structuresFor3D,
  type AnatomyBodyProfile,
  type Anatomy3DRegionId,
  type Anatomy3DStructure,
  type Anatomy3DSystemId,
} from "@/lib/anatomy3DModel";
import { medicalSources, type MedicineLevel } from "@/lib/medicineData";
import {
  anatomyMaterialProfiles,
  anatomyTissueForName,
  applyAnatomyTissueMaterial,
  clearAnatomyTissueMaps,
  type AnatomyTissue,
} from "@/lib/anatomyMaterialProfiles";
import { detectAnatomyRenderPolicy, type AnatomyRenderPolicy } from "@/lib/anatomyRenderQuality";
import {
  anatomyManifestLookupKeys,
  loadAnatomy3DManifest,
  type Anatomy3DManifestStructure,
} from "@/lib/anatomy3DManifest";
import {
  anatomy3DAssets,
  detailedOrganKindsForSelection,
  heartAnatomyForId,
  heartAnatomyForMeshName,
  heartInteriorMeshDefinitions,
  heartRepresentationForAvailability,
  isHeartInteriorStructureId,
  hraDetailedOrganAssets,
  type HraDetailedOrganKind,
  type HeartMeshDefinition,
} from "@/lib/anatomy3DAssetRegistry";
import {
  integratedJourneyForContext,
  resolveIntegratedJourneyStructure,
  type IntegratedMedicineContext,
  type IntegratedMedicineStep,
} from "@/lib/medicineIntegratedJourney";

type CameraView = "perspective" | "front" | "back" | "left" | "right";
type OrganViewMode = "context" | "isolated" | "section" | "transparent";
type SectionAxis = "x" | "y" | "z";
type AnatomyAppearance = "educational" | "realistic";

class ThreeModelErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("Falha ao carregar modelo anatômico 3D detalhado.", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Anatomy3DStudioProps {
  level: MedicineLevel;
  initialStructureId?: string | null;
  journeyContext?: IntegratedMedicineContext | null;
  journeyVisitedStepIds?: string[];
  onOpenJourneyStep?: (step: IntegratedMedicineStep, structure: Anatomy3DStructure) => void;
}

const layerOpacity: Record<Exclude<Anatomy3DSystemId, "all">, number> = {
  surface: 0.12,
  muscular: 0.44,
  skeletal: 0.58,
  vascular: 0.96,
  nervous: 0.98,
  organs: 0.92,
};

const REAL_MODEL_PATH = anatomy3DAssets.bodyBase.path;
const REAL_SKELETAL_PATH = anatomy3DAssets.skeletalBase.path;
const REAL_SKIN_PATH = anatomy3DAssets.skinBase.path;
const REAL_ORGANS_PATH = "/medicine/models/bodyparts3d-organs-v1.glb";
const DETAILED_CIRCULATORY_PATH = anatomy3DAssets.cardiovascular.path;
const DETAILED_NERVOUS_PATH = anatomy3DAssets.nervous.path;
const DETAILED_ORGANS_PATH = anatomy3DAssets.organs.path;
const SUPPLEMENTAL_ORGAN_PATHS = {
  heart: anatomy3DAssets.heartExterior.path,
  brain: "/medicine/models/zanatomy-organ-brain-v1.glb",
  spleen: "/medicine/models/zanatomy-organ-spleen-v1.glb",
  eye: "/medicine/models/zanatomy-organ-eye-v1.glb",
} as const;
const STANDARD_SKIN_TONE = "#ad7152";
const BODY_PARTS_SOURCE_BOUNDS = new Box3(new Vector3(-1.33905, -3.534865, -0.187946), new Vector3(1.33396, 3.18329, 0.971386));
// Todos os subconjuntos Z-Anatomy compartilham o mesmo sistema de coordenadas.
// Usar o limite de cada arquivo separadamente fazia o conjunto parcial de órgãos
// ser ampliado até a altura de um corpo inteiro, deformando a composição integrada.
const ZANATOMY_REFERENCE_BOUNDS = new Box3(new Vector3(-0.33375, 0.00346, -0.11269), new Vector3(0.33375, 1.70145, 0.13625));
const anatomyLevelOrder: MedicineLevel[] = ["Iniciante", "Ciclo básico", "Ciclo clínico", "Internato", "Residência"];
const anatomyLevelLimits: Record<MedicineLevel, number> = { Iniciante: 24, "Ciclo básico": 90, "Ciclo clínico": 240, Internato: 600, Residência: Number.POSITIVE_INFINITY };
const anatomyLevelGuidance: Record<MedicineLevel, string> = {
  Iniciante: "Estruturas essenciais, nomes em português e orientação espacial guiada.",
  "Ciclo básico": "Mais estruturas, termos anatômicos e relações fundamentais.",
  "Ciclo clínico": "Catálogo ampliado para conectar anatomia, função e localização clínica.",
  Internato: "Detalhamento regional extenso para revisão aplicada e correlação por sistemas.",
  Residência: "Catálogo tridimensional completo, incluindo as malhas anatômicas detalhadas disponíveis.",
};
export function Anatomy3DStudio({ level, initialStructureId, journeyContext, journeyVisitedStepIds = [], onOpenJourneyStep }: Anatomy3DStudioProps) {
  const contextRestoreId = journeyContext?.structure.restore3DStructureId;
  const initialStructure = anatomy3DStructures.find((item) => item.id === initialStructureId)
    ?? anatomy3DStructures.find((item) => item.id === contextRestoreId);
  const initialSystem: Anatomy3DSystemId = journeyContext ? "organs" : initialStructure?.layer ?? "surface";
  const startsWithOrgan = initialSystem === "organs";
  const [system, setSystem] = useState<Anatomy3DSystemId>(initialSystem);
  const [appearance, setAppearance] = useState<AnatomyAppearance>("educational");
  const [renderPolicy, setRenderPolicy] = useState<AnatomyRenderPolicy>(() => detectAnatomyRenderPolicy());
  // O pacote 3D disponível representa anatomia masculina. Mantemos um único
  // perfil verdadeiro em vez de oferecer um seletor que apenas trocaria rótulos.
  const bodyProfile: AnatomyBodyProfile = "male";
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
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [detailedCatalogs, setDetailedCatalogs] = useState<Partial<Record<Anatomy3DSystemId, Anatomy3DStructure[]>>>({});
  const [manifestStructures, setManifestStructures] = useState<Anatomy3DManifestStructure[]>([]);
  const rootRef = useRef<HTMLElement>(null);
  const restoredJourneyContextRef = useRef<string | null>(null);

  const regionMeta = anatomy3DRegions.find((item) => item.id === region) ?? anatomy3DRegions[0];
  useEffect(() => {
    const updatePolicy = () => setRenderPolicy(detectAnatomyRenderPolicy());
    window.addEventListener("resize", updatePolicy);
    return () => window.removeEventListener("resize", updatePolicy);
  }, []);
  useEffect(() => {
    let active = true;
    loadAnatomy3DManifest()
      .then((structures) => {
        if (active) setManifestStructures(structures);
      })
      .catch((error) => console.warn("Índice anatômico complementar indisponível.", error));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const updateFullscreen = () => setFullscreenActive(document.fullscreenElement === rootRef.current || fallbackFullscreen);
    const closeFallback = (event: KeyboardEvent) => {
      if (event.key === "Escape" && fallbackFullscreen) setFallbackFullscreen(false);
    };
    document.addEventListener("fullscreenchange", updateFullscreen);
    window.addEventListener("keydown", closeFallback);
    updateFullscreen();
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
      window.removeEventListener("keydown", closeFallback);
    };
  }, [fallbackFullscreen]);
  const registerDetailedCatalog = useCallback((catalogSystem: Anatomy3DSystemId, catalog: Anatomy3DStructure[]) => {
    setDetailedCatalogs((current) => {
      const existing = current[catalogSystem] ?? [];
      const mergedById = new Map(existing.map((item) => [item.id, item]));
      catalog.forEach((item) => mergedById.set(item.id, item));
      const merged = [...mergedById.values()];
      const unchanged = merged.length === existing.length && merged.every((item, index) => item === existing[index]);
      return unchanged ? current : { ...current, [catalogSystem]: merged };
    });
  }, []);
  const guidedStructures = useMemo(
    () => structuresFor3D(system, region).filter((structure) => structureMatchesBodyProfile(structure, bodyProfile)),
    [bodyProfile, region, system],
  );
  const visibleStructures = useMemo(() => {
    const detailed = detailedStructuresFor3DSystem(system, detailedCatalogs);
    if (!detailed.length) return guidedStructures;
    const detailedForRegion = detailed.filter((item) => structureMatchesBodyProfile(item, bodyProfile) && (region === "whole" || item.regionId === region || item.regionId === "whole"));
    return mergeGuidedAndDetailedStructures(guidedStructures, detailedForRegion);
  }, [bodyProfile, detailedCatalogs, guidedStructures, region, system]);
  const levelVisibleStructures = useMemo(() => {
    if (level === "Iniciante") return guidedStructures.slice(0, anatomyLevelLimits[level]);
    const limit = anatomyLevelLimits[level];
    if (!Number.isFinite(limit) || visibleStructures.length <= limit) return visibleStructures;
    const guidedIds = new Set(guidedStructures.map((item) => item.id));
    const additional = visibleStructures.filter((item) => !guidedIds.has(item.id));
    return [...guidedStructures, ...additional].slice(0, limit);
  }, [guidedStructures, level, visibleStructures]);
  const filteredStructures = useMemo(() => {
    const normalized = normalize(query);
    if (!normalized) return system === "all" ? guidedStructures.slice(0, anatomyLevelLimits[level]) : levelVisibleStructures;
    return levelVisibleStructures.filter((item) => normalize(`${item.name} ${item.latin ?? ""} ${item.region} ${item.system} ${item.function}`).includes(normalized));
  }, [guidedStructures, level, levelVisibleStructures, query, system]);
  const selected = anatomy3DStructures.find((item) => item.id === selectedId) ?? modelSelection;
  const manifestByName = useMemo(() => {
    const index = new Map<string, Anatomy3DManifestStructure>();
    manifestStructures.forEach((item) => {
      [...anatomyManifestLookupKeys(item.id), ...anatomyManifestLookupKeys(item.name)].forEach((key) => {
        if (key && !index.has(key)) index.set(key, item);
      });
    });
    return index;
  }, [manifestStructures]);
  const selectedManifestStructure = useMemo(() => {
    if (!selected) return undefined;
    const rawPart = selected.parts.find((part) => typeof part === "string");
    const candidates = [typeof rawPart === "string" ? rawPart : "", selected.name];
    for (const candidate of candidates) {
      for (const key of anatomyManifestLookupKeys(candidate)) {
        const match = manifestByName.get(key);
        if (match) return match;
      }
    }
    return undefined;
  }, [manifestByName, selected]);
  const selectedJourneyResolution = resolveIntegratedJourneyStructure({ id: selected?.id, name: selected?.name });
  const contextJourney = integratedJourneyForContext(journeyContext);
  const contextStructure = contextJourney?.structures.find((item) => item.id === journeyContext?.structure.id);
  const prefersSelectedStructure = selectedJourneyResolution?.structure.id !== "heart" || journeyContext?.structure.id === "heart";
  const integratedJourney = contextJourney ?? selectedJourneyResolution?.journey;
  const integratedStructure = prefersSelectedStructure ? selectedJourneyResolution?.structure : contextStructure;
  const selectedIsVisible = Boolean(selected && (
    modelSelection?.id === selected.id
    || levelVisibleStructures.some((item) => item.id === selected.id || normalize(item.name) === normalize(selected.name))
  ));
  const normalizedSelectedName = normalize(selected?.name ?? "");
  const detailedCameraKindsByName: HraDetailedOrganKind[] = normalizedSelectedName === "encefalo" || normalizedSelectedName === "cerebro"
    ? ["brain"]
    : normalizedSelectedName === "pulmoes"
      ? ["lungs"]
      : normalizedSelectedName === "figado"
        ? ["liver"]
        : normalizedSelectedName === "rins"
          ? ["kidney-left", "kidney-right"]
          : [];
  const directDetailedCameraKinds = selected && !selected.id.startsWith("model:hra:")
    ? detailedOrganKindsForSelection(selected.id)
    : [];
  const detailedCameraKinds = organView !== "context" && selected
    ? (directDetailedCameraKinds.length ? directDetailedCameraKinds : detailedCameraKindsByName)
    : [];
  const detailedCameraDefinitions = detailedCameraKinds.map((kind) => hraDetailedOrganAssets[kind]);
  const detailedCameraFocus: [number, number, number] | null = detailedCameraDefinitions.length
    ? [
      detailedCameraDefinitions.reduce((sum, item) => sum + item.target[0], 0) / detailedCameraDefinitions.length,
      detailedCameraDefinitions.reduce((sum, item) => sum + item.target[1], 0) / detailedCameraDefinitions.length,
      detailedCameraDefinitions.reduce((sum, item) => sum + item.target[2], 0) / detailedCameraDefinitions.length,
    ]
    : null;
  const detailedCameraDistance = detailedCameraDefinitions.length
    ? detailedCameraDefinitions.length > 1
      ? 3.15
      : Math.max(2.45, Math.max(...detailedCameraDefinitions.map((item) => item.size)) * 2.75 + .42)
    : null;
  const wholeBodySystemFocus: [number, number, number] = region === "whole" && system === "organs" ? [0, .65, 0] : regionMeta.focus;
  const baseCameraFocus = focusSelected && selected && selectedIsVisible ? selected.focus : wholeBodySystemFocus;
  const wholeBodySystemDistance = region === "whole" && system === "organs" ? 9.6 : regionMeta.distance;
  const baseCameraDistance = focusSelected && selected && selectedIsVisible ? selected.focusDistance : wholeBodySystemDistance;
  const cameraFocus = detailedCameraFocus ?? baseCameraFocus;
  const cameraDistance = detailedCameraDistance ?? baseCameraDistance;
  const realistic = appearance === "realistic";
  const regionAvailability = useMemo(() => Object.fromEntries(anatomy3DRegions.map((item) => {
    if (item.id === "whole" || system === "all") return [item.id, true];
    const guidedAvailable = structuresFor3D(system, item.id).length > 0;
    const detailedAvailable = detailedCatalogs[system]?.some((structure) => structure.regionId === item.id || structure.regionId === "whole") ?? false;
    return [item.id, guidedAvailable || detailedAvailable];
  })) as Record<Anatomy3DRegionId, boolean>, [detailedCatalogs, system]);

  useEffect(() => {
    if (levelVisibleStructures.some((item) => item.id === selectedId) || modelSelection?.id === selectedId) return;
    const next = levelVisibleStructures.find((item) => item.regionId !== "whole") ?? levelVisibleStructures[0];
    if (next) {
      setSelectedId(next.id);
      setModelSelection(next.id.startsWith("model:") ? next : null);
    }
  }, [levelVisibleStructures, modelSelection?.id, selectedId]);

  const changeSystem = (nextSystem: Anatomy3DSystemId) => {
    const nextRegion: Anatomy3DRegionId = "whole";
    setSystem(nextSystem);
    setRegion(nextRegion);
    setQuery("");
    const systemStructures = structuresFor3D(nextSystem, nextRegion);
    const next = systemStructures.find((structure) => structure.regionId === "whole") ?? systemStructures[0];
    if (next) setSelectedId(next.id);
    setModelSelection(null);
    setOrganView("context");
    setCameraView("perspective");
    setZoom(1);
    setFocusSelected(false);
    setFocusKey((value) => value + 1);
  };

  const activateRealisticLayer = () => {
    setAppearance((current) => current === "realistic" ? "educational" : "realistic");
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

  const selectStructure = useCallback((structure: Anatomy3DStructure) => {
    const resolved = detailedStructureForGuided(structure, detailedCatalogs, realistic);
    setSelectedId(resolved.id);
    setModelSelection(resolved.id.startsWith("model:") ? resolved : null);
    setCameraView("perspective");
    setFocusSelected(system !== "all");
    if (resolved.layer === "organs" && system === "organs") setOrganView("isolated");
    setFocusKey((value) => value + 1);
  }, [detailedCatalogs, realistic, system]);

  useEffect(() => {
    if (!journeyContext || system !== "organs") return;
    const contextKey = `${journeyContext.journeyId}:${journeyContext.structure.id}:${journeyContext.structure.source3DId}`;
    if (restoredJourneyContextRef.current === contextKey) return;
    const currentCanonicalId = resolveIntegratedJourneyStructure({ id: selected?.id, name: selected?.name })?.structure.id;
    if (currentCanonicalId === journeyContext.structure.id) {
      restoredJourneyContextRef.current = contextKey;
      return;
    }
    const matchingStructure = levelVisibleStructures.find((candidate) =>
      resolveIntegratedJourneyStructure({ id: candidate.id, name: candidate.name })?.structure.id === journeyContext.structure.id,
    );
    if (matchingStructure) {
      restoredJourneyContextRef.current = contextKey;
      selectStructure(matchingStructure);
    }
  }, [journeyContext, levelVisibleStructures, selectStructure, selected?.id, selected?.name, system]);

  useEffect(() => {
    const guided = anatomy3DStructures.find((item) => item.id === selectedId);
    if (!guided) return;
    const replacement = detailedStructureForGuided(guided, detailedCatalogs, realistic);
    if (replacement.id === guided.id) return;
    setSelectedId(replacement.id);
    setModelSelection(replacement);
    if (realistic && replacement.layer === "organs") setOrganView("isolated");
    setFocusKey((value) => value + 1);
  }, [detailedCatalogs, realistic, selectedId]);

  const selectedPosition = filteredStructures.findIndex((structure) => structure.id === selected?.id || normalize(structure.name) === normalize(selected?.name ?? ""));
  const navigateStructure = useCallback((direction: -1 | 1) => {
    if (!filteredStructures.length) return;
    const current = filteredStructures.findIndex((structure) => structure.id === selected?.id || normalize(structure.name) === normalize(selected?.name ?? ""));
    const nextIndex = current < 0
      ? 0
      : (current + direction + filteredStructures.length) % filteredStructures.length;
    selectStructure(filteredStructures[nextIndex]);
  }, [filteredStructures, selectStructure, selected?.id, selected?.name]);

  useEffect(() => {
    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateStructure(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateStructure(1);
      }
    };
    window.addEventListener("keydown", handleKeyboardNavigation);
    return () => window.removeEventListener("keydown", handleKeyboardNavigation);
  }, [navigateStructure]);

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
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (fallbackFullscreen) {
      setFallbackFullscreen(false);
      return;
    }
    if (document.fullscreenEnabled && root.requestFullscreen) {
      try {
        await root.requestFullscreen();
        if (document.fullscreenElement === root) return;
      } catch {
        // WebViews podem expor a API, mas bloquear a chamada. Mantemos a mesma
        // experiência com uma camada fixa e reversível nesses ambientes.
      }
    }
    setFallbackFullscreen(true);
  };

  const changeOrganView = (mode: OrganViewMode) => {
    setOrganView(mode);
    setSectionOffset(0);
    setFocusSelected(mode !== "context");
    if (mode !== "context") setZoom(1.35);
    setFocusKey((value) => value + 1);
  };

  const openJourneyStep = (step: IntegratedMedicineStep) => {
    if (!selected) return;
    if (step.kind === "action" && step.action === "open-interior") changeOrganView("transparent");
    const journeyStructure = journeyContext && integratedStructure?.id === journeyContext.structure.id
      ? { ...selected, id: journeyContext.structure.source3DId, name: journeyContext.structure.label }
      : selected;
    onOpenJourneyStep?.(step, journeyStructure);
  };

  return (
    <section ref={rootRef} className={`med-3d-studio${fallbackFullscreen ? " is-fullscreen-fallback" : ""}`} aria-label="Atlas anatômico tridimensional">
      <header className="med-3d-heading">
        <div>
          <span className="med-eyebrow"><Sparkles /> Atlas volumétrico · {level}</span>
          <h1>Corpo humano em <em>360°</em></h1>
          <p>Gire livremente, aproxime, isole sistemas e toque em uma estrutura para trazê-la ao centro.</p>
        </div>
        <div className="med-3d-heading-badges">
          <span><Rotate3D /> Rotação real</span>
          <span><MousePointer2 /> Estruturas clicáveis</span>
          <button aria-pressed={fullscreenActive} onClick={() => void toggleFullscreen()}><Maximize2 /> {fullscreenActive ? "Sair da tela cheia" : "Tela cheia"}</button>
        </div>
      </header>

      <div className="med-3d-system-strip" aria-label="Sistemas anatômicos">
        {anatomy3DSystemMeta.map((item) => (
          <button key={item.id} className={system === item.id ? "active" : ""} style={{ "--system-color": item.color } as React.CSSProperties} onClick={() => changeSystem(item.id)}>
            <span style={{ background: item.color }}>{system === item.id ? <Check /> : item.id === "nervous" ? <Brain /> : item.id === "all" ? <Box /> : <PersonStanding />}</span>
            <div><strong>{item.label}</strong><small>{item.description}</small></div>
          </button>
        ))}
          <button className={`med-3d-realistic-option ${realistic ? "active" : ""}`} style={{ "--system-color": "#772a35" } as React.CSSProperties} onClick={activateRealisticLayer}>
          <span><HeartPulse /></span><div><strong>Realista</strong><small>Materiais PBR por tecido</small></div>
        </button>
      </div>

      <div className="med-3d-region-strip" aria-label="Regiões do corpo">
        <span>FOCAR REGIÃO</span>
        {anatomy3DRegions.map((item) => <button key={item.id} className={region === item.id ? "active" : ""} disabled={!regionAvailability[item.id]} title={!regionAvailability[item.id] ? `Sem estruturas de ${anatomy3DSystemMeta.find((meta) => meta.id === system)?.label.toLocaleLowerCase("pt-BR")} nesta região` : undefined} onClick={() => changeRegion(item.id)}>{item.shortLabel}</button>)}
      </div>
      <div className="med-3d-level-scope"><Sparkles /><span><strong>{level}</strong>{anatomyLevelGuidance[level]}</span><b>{levelVisibleStructures.length} disponíveis neste nível</b></div>

      {integratedJourney && <section className="med-3d-integration" aria-label={integratedJourney.title}>
        <div className="med-3d-integration-copy">
          <span><HeartPulse /> CONTEÚDO CONECTADO</span>
          <strong>{integratedJourney.title}</strong>
          <b>{integratedStructure?.label ?? selected?.name} · {integratedJourney.systemLabel}</b>
          <p>{integratedJourney.description}</p>
        </div>
        <div className="med-3d-integration-steps">
          {integratedJourney.steps.map((step, index) => {
            const destination = step.kind === "destination" ? step.destination : undefined;
            const Icon = destination === "systems" ? Activity
              : destination === "histology" || destination === "pathology" ? Microscope
                : destination === "semiology" ? Stethoscope
                  : destination === "anamnesis" || destination === "clinic" ? FileHeart
                    : destination === "questions" || destination === "review" ? ListChecks
                      : Eye;
            const visited = journeyVisitedStepIds.includes(step.id);
            const active = journeyContext?.journeyId === integratedJourney.id && journeyContext.activeStepId === step.id;
            return <button key={step.id} className={`${visited ? "visited" : ""} ${active ? "active" : ""}`.trim()} onClick={() => openJourneyStep(step)} title={step.description} aria-current={active ? "step" : undefined}>
              <i>{visited ? <Check /> : <Icon />}</i>
              <span><small>{active ? `ETAPA ATUAL · ${step.eyebrow}` : `${index + 1}. ${step.eyebrow}`}</small><strong>{step.label}</strong></span>
              <ChevronRight />
            </button>;
          })}
        </div>
      </section>}

      <div className="med-3d-workspace">
        <aside className="med-3d-index">
          <div className="med-3d-index-title"><div><span>ÍNDICE 3D</span><strong>{filteredStructures.length} estruturas</strong></div><Eye /></div>
          <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar órgão, osso, nervo…" aria-label="Buscar estrutura 3D" /></label>
          <div className="med-3d-structure-list">
            {filteredStructures.map((structure) => (
              <button key={structure.id} className={selected?.id === structure.id || normalize(selected?.name ?? "") === normalize(structure.name) ? "active" : ""} style={{ "--part-color": structure.color } as React.CSSProperties} onClick={() => selectStructure(structure)}>
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
            <div className="med-3d-selection-nav" aria-label="Navegar entre estruturas" aria-live="polite">
              <button onClick={() => navigateStructure(-1)} disabled={!filteredStructures.length} aria-label="Estrutura anterior" title="Estrutura anterior (seta para esquerda)"><ChevronLeft /></button>
              <span><strong>{selected?.name ?? "Selecione uma estrutura"}</strong><small>{selectedPosition >= 0 ? `${selectedPosition + 1} de ${filteredStructures.length}` : `${filteredStructures.length} disponíveis`}</small></span>
              <button onClick={() => navigateStructure(1)} disabled={!filteredStructures.length} aria-label="Próxima estrutura" title="Próxima estrutura (seta para direita)"><ChevronRight /></button>
            </div>
            <div className="med-3d-zoom-controls">
              <button onClick={() => { setZoom((value) => Math.max(0.7, value - 0.15)); setFocusKey((value) => value + 1); }} aria-label="Afastar câmera"><Minus /></button>
              <strong>{Math.round(zoom * 100)}%</strong>
              <button onClick={() => { setZoom((value) => Math.min(2.6, value + 0.15)); setFocusKey((value) => value + 1); }} aria-label="Aproximar câmera"><Plus /></button>
              <button className={autoRotate ? "active" : ""} onClick={() => setAutoRotate((value) => !value)}>{autoRotate ? <Pause /> : <Play />}{autoRotate ? "Pausar" : "Girar"}</button>
              <button onClick={resetView}><Focus /> Recentrar</button>
            </div>
          </div>

          {system === "organs" && selected && <div className="med-3d-organ-stagebar" aria-label="Modo de visualização do órgão">
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

          {realistic && <div className="med-3d-realism-note"><Sparkles /><span><strong>Materiais biológicos ativos</strong>Albedo, microrelevo e rugosidade respondem ao tecido e à capacidade do dispositivo.</span></div>}

          <div className="med-3d-canvas" role="application" tabIndex={0} aria-label={`Modelo 3D interativo mostrando ${anatomy3DSystemMeta.find((item) => item.id === system)?.label} em ${regionMeta.label}. Use as setas esquerda e direita para trocar de estrutura.`}>
            <Suspense fallback={<div className="med-3d-loading"><Rotate3D /><strong>Preparando o modelo tridimensional…</strong></div>}>
              <Canvas shadows dpr={[1, renderPolicy.maxDpr]} camera={{ position: [4.2, 1.4, 9.5], fov: 36, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.localClippingEnabled = true; }}>
                <RendererAppearance realistic={realistic} />
                <color attach="background" args={[realistic ? "#17201f" : "#edf3f0"]} />
                <ambientLight intensity={realistic ? .38 : 1.1} />
                <hemisphereLight args={[realistic ? "#f4eee7" : "#f9fffc", realistic ? "#182321" : "#40554e", realistic ? .66 : 1.35]} />
                <directionalLight position={[5, 8, 7]} intensity={realistic ? 2.35 : 2.3} color={realistic ? "#fff7ef" : "#ffffff"} castShadow shadow-mapSize={[renderPolicy.shadowMapSize, renderPolicy.shadowMapSize]} shadow-bias={-.0002} />
                <directionalLight position={[-6, 3, 3]} intensity={realistic ? .82 : 1.1} color={realistic ? "#b8c9c4" : "#b9d7cd"} />
                <directionalLight position={[2, 2, -6]} intensity={realistic ? .68 : 0} color="#d8b6aa" />
                {realistic && <Environment resolution={renderPolicy.environmentResolution}>
                  <Lightformer form="rect" intensity={2.35} color="#fff8f2" position={[0, 6, 5]} rotation={[-Math.PI / 2, 0, 0]} scale={[9, 7, 1]} />
                  <Lightformer form="rect" intensity={1.05} color="#d5ddd8" position={[-5, 1, 3]} rotation={[0, Math.PI / 2, 0]} scale={[5, 7, 1]} />
                  <Lightformer form="rect" intensity={.82} color="#a9c1ba" position={[5, 0, -3]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 6, 1]} />
                </Environment>}
                <group>
                  {(system === "all" || system === "surface") && <RealBodyPartsModel system={system} realistic={realistic} quality={renderPolicy} selectedId={selected?.id ?? null} skinOpacity={skinOpacity} skinTone={STANDARD_SKIN_TONE} organView={organView} sectionAxis={sectionAxis} sectionOffset={sectionOffset} onSelect={selectStructure} />}
                  {(system === "all" || system === "muscular") && <DenseAnatomySystemModel integrated={system === "all"} realistic={realistic} quality={renderPolicy} path={REAL_MODEL_PATH} layer="muscular" selectedId={selected?.id ?? null} onSelect={selectStructure} onCatalogReady={registerDetailedCatalog} />}
                  {(system === "all" || system === "skeletal") && <DenseAnatomySystemModel integrated={system === "all"} realistic={realistic} quality={renderPolicy} path={REAL_SKELETAL_PATH} layer="skeletal" selectedId={selected?.id ?? null} onSelect={selectStructure} onCatalogReady={registerDetailedCatalog} />}
                  {(system === "all" || system === "vascular") && <DenseAnatomySystemModel integrated={system === "all"} realistic={realistic} quality={renderPolicy} path={DETAILED_CIRCULATORY_PATH} layer="vascular" selectedId={selected?.id ?? null} onSelect={selectStructure} onCatalogReady={registerDetailedCatalog} />}
                  {(system === "all" || system === "nervous") && <DenseAnatomySystemModel integrated={system === "all"} realistic={realistic} quality={renderPolicy} path={DETAILED_NERVOUS_PATH} layer="nervous" selectedId={selected?.id ?? null} onSelect={selectStructure} onCatalogReady={registerDetailedCatalog} />}
                  {(system === "all" || system === "organs") && <DetailedOrgansModel integrated={system === "all"} realistic={realistic} quality={renderPolicy} bodyProfile={bodyProfile} selectedId={selected?.id ?? null} organView={organView} sectionAxis={sectionAxis} sectionOffset={sectionOffset} onSelect={selectStructure} onCatalogReady={registerDetailedCatalog} />}
                </group>
                <ContactShadows position={[0, -4.46, 0]} opacity={realistic ? .46 : .34} scale={8} blur={realistic ? 2.1 : 2.6} far={5} frames={renderPolicy.contactShadowFrames} />
                <Grid position={[0, -4.45, 0]} args={[16, 16]} cellSize={0.5} cellThickness={0.45} cellColor={realistic ? "#4b3936" : "#a7bbb4"} sectionSize={2} sectionThickness={0.8} sectionColor={realistic ? "#725049" : "#7e9990"} fadeDistance={14} fadeStrength={1.2} infiniteGrid />
                <CameraRig focus={cameraFocus} distance={cameraDistance / zoom} focusKey={focusKey} view={cameraView} autoRotate={autoRotate} />
              </Canvas>
            </Suspense>
            <div className="med-3d-gesture-help"><Rotate3D /><span><b>Arraste</b> para girar</span><span><b>Roda ou pinça</b> para aproximar</span><span><b>Botão direito</b> para mover</span><span><b>← →</b> trocar estrutura</span></div>
            <div className="med-3d-axis"><span>D</span><i /><span>E</span></div>
            {system === "all" && <label className="med-3d-opacity"><span>TRANSPARÊNCIA DA SUPERFÍCIE</span><input type="range" min="0.04" max="0.32" step="0.02" value={skinOpacity} onChange={(event) => setSkinOpacity(Number(event.target.value))} /><strong>{Math.round(skinOpacity * 100)}%</strong></label>}
          </div>
        </div>

        <aside className="med-3d-detail">
          {selected ? <>
            <div className="med-3d-detail-orbit"><div className="med-3d-orbit-ring"><span style={{ background: selected.color }}><PersonStanding /></span></div><small>ESTRUTURA SELECIONADA</small></div>
            <span className="med-eyebrow">{selected.region}</span>
            <h2>{selected.name}</h2>
            {selected.latin && anatomyLevelOrder.indexOf(level) > 0 && <em>{selected.latin}</em>}
            <div className="med-3d-tags"><span style={{ borderColor: selected.color, color: selected.color }}>{anatomy3DSystemMeta.find((item) => item.id === selected.layer)?.label}</span><span>{selected.system}</span>{realistic && <span className="realistic">Realista</span>}</div>
            <p>{selected.summary}</p>
            <dl>
              <div><dt>Função</dt><dd>{selected.function}</dd></div>
              <div><dt>Localização espacial</dt><dd>Centro do modelo em {formatCoordinates(selected.focus)}. Use a rotação para conferir relações anteriores, posteriores e laterais.</dd></div>
              {selectedManifestStructure?.hierarchyPath?.length > 1 && <div className="med-3d-hierarchy">
                <dt>Hierarquia anatômica</dt>
                <dd>{selectedManifestStructure.hierarchyPath.map((item, index) => translateAnatomyName(item, selected.layer, index)).join(" → ")}</dd>
              </div>}
            </dl>
            <div className="med-3d-detail-actions">
              <button onClick={() => { setFocusSelected(true); setZoom(1.25); if (selected.layer === "organs") setOrganView("isolated"); setFocusKey((value) => value + 1); }}><Focus /> Isolar e aproximar</button>
              <button onClick={() => speak(selected.name)}><Volume2 /> Ouvir nome</button>
              <a href={medicalSources[selected.sourceId]?.url ?? medicalSources.openAnatomy.url} target="_blank" rel="noreferrer"><ExternalLink /> Conferir anatomia</a>
            </div>
            {selected.layer === "organs" && <div className="med-3d-organ-disclaimer"><Box /><span><strong>{organViewLabel(organView)}</strong>{organViewDescription(organView)}</span></div>}
            {realistic && <div className="med-3d-realistic-disclaimer"><HeartPulse /><span><strong>{anatomyMaterialProfiles[anatomyTissueForName(selected.name, tissueFallbackForLayer(selected.layer))].label}</strong>Material PBR educacional com microtextura não anatômica; não representa variações individuais, patologia ou peça de dissecação.</span></div>}
            <div className="med-3d-safety"><ShieldCheck /><span><strong>Modelo educacional</strong>As formas 3D ajudam a entender orientação e relações gerais; não substituem atlas anatômico validado, dissecação ou avaliação profissional.</span></div>
          </> : <div className="med-3d-no-selection"><MousePointer2 /><h3>Toque em uma estrutura</h3><p>Você pode selecionar direto no corpo ou usar o índice ao lado.</p></div>}
        </aside>
      </div>
    </section>
  );
}

function RealBodyPartsModel({ system, realistic, quality, selectedId, skinOpacity, skinTone, organView, sectionAxis, sectionOffset, onSelect }: {
  system: Anatomy3DSystemId;
  realistic: boolean;
  quality: AnatomyRenderPolicy;
  selectedId: string | null;
  skinOpacity: number;
  skinTone: string;
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
      const material = object.material as MeshPhysicalMaterial;
      const active = selectedId === "model:skin";
      const naturalTone = skinColorForMesh(skinTone, object.name);
      if (realistic) {
        applyAnatomyTissueMaterial(material, object.geometry, "skin", { active, baseColor: `#${naturalTone.getHexString()}`, quality });
      } else {
        clearAnatomyTissueMaps(material);
        material.vertexColors = false;
        material.color.copy(naturalTone);
        material.emissive.copy(naturalTone).multiplyScalar(active ? .16 : .018);
        material.emissiveIntensity = active ? .2 : .045;
        material.roughness = .48;
        material.clearcoat = .08;
        material.clearcoatRoughness = .72;
        material.sheen = .32;
        material.sheenColor.copy(naturalTone).offsetHSL(0, -.08, .1);
        material.transmission = 0;
      }
      material.opacity = system === "surface" || active ? 1 : skinOpacity;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > 0.5;
      material.ior = 1.4;
      material.needsUpdate = true;
    });
    // O modelo leve é reservado ao encéfalo contextual. A visão integrada e a
    // camada de órgãos usam a malha detalhada Z-Anatomy renderizada abaixo.
    organsModel.visible = system === "nervous";
    organsModel.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const semantic = organSemantic(object.name);
      const isolateOrgan = system === "organs" && organView !== "context" && Boolean(selectedSemantic);
      const supplementalSelected = isSupplemental3DOrganId(selectedId);
      object.visible = !supplementalSelected && (system !== "nervous" || semantic === "brain") && (!isolateOrgan || semantic === selectedSemantic);
      const material = object.material as MeshPhysicalMaterial;
      const guidedId = system === "nervous" && semantic === "brain" ? "nerve-brain" : `organ-${semantic}`;
      const active = selectedId === guidedId || selectedId === `model:${system === "nervous" ? "nerve" : "organ"}:${semantic}`;
      if (realistic) {
        applyAnatomyTissueMaterial(material, object.geometry, "brain", { active, quality });
      } else {
        clearAnatomyTissueMaps(material);
        material.emissive.copy(material.color);
        material.emissiveIntensity = active ? 0.34 : 0.12;
        material.roughness = .55;
        material.clearcoat = 0;
        material.transmission = 0;
      }
      const transparentInterior = system === "organs" && organView === "transparent" && semantic === selectedSemantic;
      material.opacity = transparentInterior ? .32 : system === "all" ? layerOpacity.organs : 1;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > .72;
      material.clippingPlanes = system === "organs" && organView === "section" && semantic === selectedSemantic && sectionPlane ? [sectionPlane] : [];
      material.clipShadows = Boolean(material.clippingPlanes.length);
      material.side = DoubleSide;
      material.needsUpdate = true;
    });
  }, [organView, organsModel, quality, realistic, sectionPlane, selectedId, selectedSemantic, skinModel, skinOpacity, skinTone, system]);

  const selectSkinModel = useCallback(() => {
    onSelect({
      id: "model:skin", name: "Superfície corporal", latin: "Integumentum commune", layer: "surface", regionId: "whole", region: "Corpo completo", system: "Tegumentar",
      summary: "Superfície corporal HD formada por 256 regiões anatômicas reais do atlas aberto Z-Anatomy.", function: "Oferece referência externa para orientação regional, proporções e relações entre a superfície e estruturas profundas.", sourceId: "zAnatomy3D", focus: [0, -0.15, 0], focusDistance: 15.2, color: "#d8a88c", parts: [],
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
  if (kind === "skin") {
    alignZAnatomyRoot(clone);
  } else {
    const sourceSize = BODY_PARTS_SOURCE_BOUNDS.getSize(new Vector3());
    const sourceCenter = BODY_PARTS_SOURCE_BOUNDS.getCenter(new Vector3());
    const scale = 8.55 / sourceSize.y;
    clone.scale.setScalar(scale);
    clone.position.set(-sourceCenter.x * scale, -sourceCenter.y * scale - 0.08, -sourceCenter.z * scale);
    clone.updateMatrixWorld(true);
  }

  if (kind === "skin") {
    const geometries: Mesh["geometry"][] = [];
    clone.traverse((object: unknown) => {
      if (!(object instanceof Mesh)) return;
      const geometry = object.geometry.clone();
      geometry.applyMatrix4(object.matrixWorld);
      for (const attribute of Object.keys(geometry.attributes)) {
        if (attribute !== "position" && attribute !== "normal") geometry.deleteAttribute(attribute);
      }
      if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
      geometries.push(geometry);
    });
    const combined = mergeGeometries(geometries, false);
    if (!combined) throw new Error("Não foi possível consolidar a superfície corporal.");
    const welded = mergeVertices(combined, .00045);
    welded.computeVertexNormals();
    welded.computeBoundingSphere();
    const material = new MeshPhysicalMaterial({
      color: "#ad7152",
      roughness: .48,
      metalness: 0,
      clearcoat: .08,
      clearcoatRoughness: .72,
      sheen: .32,
      sheenColor: "#dca98f",
      ior: 1.4,
      side: DoubleSide,
    });
    const skin = new Mesh(welded, material);
    skin.name = "superficie-corporal-continua";
    skin.castShadow = true;
    skin.receiveShadow = true;
    const root = new Object3D();
    root.name = "superficie-corporal-natural";
    root.add(skin);
    return root;
  }

  clone.traverse((object: unknown) => {
    if (!(object instanceof Mesh)) return;
    const semantic = organSemantic(object.name);
    if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
    const color = organColor(semantic);
    const material = new MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.12,
      roughness: 0.55,
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

function RealMusculoskeletalModel({ system, realistic, quality, selectedId, onSelect, onCatalogReady }: {
  system: Anatomy3DSystemId;
  realistic: boolean;
  quality: AnatomyRenderPolicy;
  selectedId: string | null;
  onSelect: (structure: Anatomy3DStructure) => void;
  onCatalogReady: (system: Anatomy3DSystemId, catalog: Anatomy3DStructure[]) => void;
}) {
  const gltf = useGLTF(REAL_MODEL_PATH, "/medicine/models/draco/");
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    alignZAnatomyRoot(clone);
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const material = new MeshPhysicalMaterial();
      const type = realMeshAnatomyType(object);
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

  const catalogs = useMemo(() => {
    const skeletal: Anatomy3DStructure[] = [];
    const muscular: Anatomy3DStructure[] = [];
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const structure = catalogStructureFromRealMesh(object);
      if (structure.layer === "skeletal") skeletal.push(structure);
      else muscular.push(structure);
    });
    return {
      skeletal: annotateBilateralStructures(skeletal),
      muscular: annotateBilateralStructures(muscular),
    };
  }, [model]);

  useEffect(() => {
    onCatalogReady("skeletal", catalogs.skeletal);
    onCatalogReady("muscular", catalogs.muscular);
  }, [catalogs, onCatalogReady]);

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const type = realMeshAnatomyType(object);
      object.visible = system === "all" || (system === "muscular" && type === "muscle") || (system === "skeletal" && type === "bone");
      const material = object.material as MeshPhysicalMaterial;
      const active = selectedId === `model:${object.uuid}`;
      const guidedActive = guidedModelMeshMatches(selectedId, object);
      const highlighted = active || guidedActive;
      const tissue = anatomyTissueForName(realMeshAnatomyName(object), type === "bone" ? "bone" : "muscle");
      if (realistic) {
        applyAnatomyTissueMaterial(material, object.geometry, tissue, { active: highlighted, quality });
      } else {
        clearAnatomyTissueMaps(material);
        material.vertexColors = false;
        material.color.set(type === "bone" ? "#e3d8bf" : "#a9343b");
        material.emissive.set(highlighted ? material.color : "#000000");
        material.emissiveIntensity = highlighted ? .34 : 0;
        material.roughness = type === "bone" ? .72 : .56;
        material.clearcoat = 0;
        material.sheen = 0;
        material.transmission = 0;
      }
      material.opacity = system === "all"
        ? (type === "bone" ? layerOpacity.skeletal : layerOpacity.muscular)
        : realistic && system === "muscular" && tissue === "tendon" ? .22 : 1;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > .52;
      material.needsUpdate = true;
    });
  }, [model, quality, realistic, selectedId, system]);

  const selectRealMesh = useCallback((mesh: Mesh) => {
    onSelect(catalogStructureFromRealMesh(mesh));
  }, [onSelect]);

  const selectIntegratedMesh = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!(event.object instanceof Mesh)) return;
    event.stopPropagation();
    selectRealMesh(event.object);
  }, [selectRealMesh]);

  if (system !== "all" && system !== "muscular" && system !== "skeletal") return null;

  return <group>
    <primitive object={model} onClick={system === "all" ? selectIntegratedMesh : undefined} />
    <NativeMeshPicker active={system === "muscular" || system === "skeletal"} root={model} onPick={selectRealMesh} />
  </group>;
}

type DenseAnatomyLayer = "muscular" | "skeletal" | "vascular" | "nervous";

function DenseAnatomySystemModel({ integrated = false, realistic, quality, path, layer, selectedId, onSelect, onCatalogReady }: {
  integrated?: boolean;
  realistic: boolean;
  quality: AnatomyRenderPolicy;
  path: string;
  layer: DenseAnatomyLayer;
  selectedId: string | null;
  onSelect: (structure: Anatomy3DStructure) => void;
  onCatalogReady: (system: Anatomy3DSystemId, catalog: Anatomy3DStructure[]) => void;
}) {
  const gltf = useGLTF(path, "/medicine/models/draco/");
  const prepared = useMemo(() => prepareDenseAnatomySystem(gltf.scene, layer), [gltf.scene, layer]);

  useEffect(() => {
    onCatalogReady(layer, prioritizeAnatomyCatalog(prepared.catalog, layer));
  }, [layer, onCatalogReady, prepared.catalog]);

  useEffect(() => {
    const guidedSelection = anatomy3DStructures.find((item) => item.id === selectedId);
    const resolvedSelection = guidedSelection
      ? detailedStructureForGuided(guidedSelection, { [layer]: prepared.catalog })
      : null;
    const selectedIndex = prepared.catalog.findIndex((item) => item.id === (resolvedSelection?.id ?? selectedId));
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
    const material = prepared.mesh.material as MeshPhysicalMaterial;
    if (realistic) {
      applyAnatomyTissueMaterial(material, prepared.mesh.geometry, tissueFallbackForLayer(layer), { quality, vertexColors: true });
    } else {
      clearAnatomyTissueMaps(material);
      material.color.set("#ffffff");
      material.vertexColors = true;
      material.roughness = layer === "vascular" ? .5 : layer === "skeletal" ? .72 : layer === "muscular" ? .56 : .63;
      material.clearcoat = 0;
      material.sheen = 0;
      material.transmission = 0;
    }
    material.opacity = integrated ? layerOpacity[layer] : 1;
    material.transparent = integrated;
    material.depthWrite = !integrated;
    material.needsUpdate = true;
  }, [integrated, layer, prepared, quality, realistic, selectedId]);

  const selectByIndex = useCallback((index: number) => {
    const structure = prepared.catalog[index];
    if (structure) onSelect(structure);
  }, [onSelect, prepared.catalog]);

  const selectIntegratedStructure = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!event.face) return;
    const ids = prepared.mesh.geometry.getAttribute("anatomyStructureId") as BufferAttribute;
    event.stopPropagation();
    selectByIndex(Math.round(ids.getX(event.face.a)));
  }, [prepared.mesh.geometry, selectByIndex]);

  return <group>
    <primitive object={prepared.mesh} onClick={integrated ? selectIntegratedStructure : undefined} />
    <DenseSystemPicker active={!integrated} mesh={prepared.mesh} onPick={selectByIndex} />
  </group>;
}

function DetailedOrgansModel({ integrated = false, realistic, quality, bodyProfile, selectedId, organView, sectionAxis, sectionOffset, onSelect, onCatalogReady }: {
  integrated?: boolean;
  realistic: boolean;
  quality: AnatomyRenderPolicy;
  bodyProfile: AnatomyBodyProfile;
  selectedId: string | null;
  organView: OrganViewMode;
  sectionAxis: SectionAxis;
  sectionOffset: number;
  onSelect: (structure: Anatomy3DStructure) => void;
  onCatalogReady: (system: Anatomy3DSystemId, catalog: Anatomy3DStructure[]) => void;
}) {
  const [heartDetailFailed, setHeartDetailFailed] = useState(false);
  const [failedHraKinds, setFailedHraKinds] = useState<HraDetailedOrganKind[]>([]);
  const gltf = useGLTF(DETAILED_ORGANS_PATH, "/medicine/models/draco/");
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
  const completeCatalog = useMemo(() => [...prepared.catalog, ...supplements.flatMap((item) => item.catalog)], [prepared.catalog, supplements]);

  useEffect(() => {
    onCatalogReady("organs", prioritizeAnatomyCatalog(completeCatalog, "organs"));
  }, [completeCatalog, onCatalogReady]);

  const selectedSupplement = useMemo(() => {
    const exact = supplements.find((item) => item.catalog.some((structure) => structure.id === selectedId));
    if (exact) return exact;
    const selectedJourneyStructure = resolveIntegratedJourneyStructure({ id: selectedId });
    return selectedJourneyStructure?.journey.organId === "heart"
      ? supplements.find((item) => item.structure.id === "model:organs:supplement:heart") ?? null
      : null;
  }, [selectedId, supplements]);
  const selectedHeartResolution = useMemo(() => resolveIntegratedJourneyStructure({ id: selectedId }), [selectedId]);
  const wantsDetailedHeart = selectedHeartResolution?.journey.organId === "heart"
    && (organView === "transparent" || organView === "section" || isHeartInteriorStructureId(selectedId));
  const showDetailedHeart = heartRepresentationForAvailability(wantsDetailedHeart, !heartDetailFailed) === "interior";
  const detailedHraKinds = useMemo(() => {
    const direct = detailedOrganKindsForSelection(selectedId);
    if (direct.length) return direct;
    const selectedIndex = prepared.catalog.findIndex((item) => item.id === selectedId);
    const rawName = selectedIndex >= 0 ? String(prepared.meshes[selectedIndex]?.userData.rawAnatomyName ?? "") : "";
    if (guidedOrganMeshMatches("organ-brain", rawName)) return ["brain"] as HraDetailedOrganKind[];
    if (guidedOrganMeshMatches("organ-lungs", rawName)) return ["lungs"] as HraDetailedOrganKind[];
    if (guidedOrganMeshMatches("organ-liver", rawName)) return ["liver"] as HraDetailedOrganKind[];
    if (guidedOrganMeshMatches("organ-kidneys", rawName)) return ["kidney-left", "kidney-right"] as HraDetailedOrganKind[];
    return [];
  }, [prepared.catalog, prepared.meshes, selectedId]);
  const availableHraKinds = useMemo(() => detailedHraKinds.filter((kind) => !failedHraKinds.includes(kind)), [detailedHraKinds, failedHraKinds]);
  const showDetailedHra = organView !== "context" && availableHraKinds.length > 0;

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
      const rawName = String(mesh.userData.rawAnatomyName ?? mesh.name);
      const visibleInOverview = !integrated || active || isIntegratedOverviewOrgan(rawName);
      const belongsToProfile = raw3DNameMatchesBodyProfile(rawName, bodyProfile);
      mesh.visible = !showDetailedHra && belongsToProfile && (!isolates || active) && visibleInOverview;
      const material = mesh.material as MeshPhysicalMaterial;
      applyOrganAppearance(mesh, rawName, realistic, active, String(mesh.userData.didacticColor ?? "#a86c79"), quality);
      material.opacity = organView === "transparent" && active ? .34 : integrated ? .8 : 1;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > .7;
      material.clippingPlanes = organView === "section" && active && sectionPlane ? [sectionPlane] : [];
      material.clipShadows = material.clippingPlanes.length > 0;
      material.needsUpdate = true;
    });
    supplements.forEach((supplement) => {
      const active = supplement === selectedSupplement && organView !== "context";
      const selectedSupplementMesh = supplement.catalog.some((structure) => structure.id === selectedId)
        && selectedId !== supplement.structure.id;
      const isHeartOverview = !integrated
        && organView === "context"
        && supplement.structure.id === "model:organs:supplement:heart";
      // Na composição integrada, complementos de alta definição selecionados
      // substituem a antiga geometria simplificada mesmo no modo contextual.
      // O arquivo principal de vísceras não contém uma malha cardíaca utilizável;
      // por isso o coração suplementar também compõe a visão geral entre os pulmões.
      supplement.root.visible = !showDetailedHeart && !showDetailedHra && (active || isHeartOverview || (integrated && supplement === selectedSupplement));
      supplement.root.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const material = object.material as MeshPhysicalMaterial;
        const meshStructure = supplement.catalog[Number(object.userData.supplementCatalogIndex)] ?? supplement.structure;
        const meshActive = meshStructure.id === selectedId || (active && supplement.structure.id === selectedId);
        applyOrganAppearance(object, meshStructure.name, realistic, meshActive, String(object.userData.didacticColor ?? meshStructure.color), quality);
        material.opacity = active && organView === "transparent"
          ? .36
          : selectedSupplementMesh && !meshActive ? .24 : 1;
        material.transparent = material.opacity < 1;
        material.depthWrite = material.opacity > .7;
        material.clippingPlanes = active && organView === "section" && sectionPlane ? [sectionPlane] : [];
        material.clipShadows = material.clippingPlanes.length > 0;
        material.needsUpdate = true;
      });
    });
  }, [bodyProfile, integrated, organView, prepared.meshes, quality, realistic, sectionPlane, selectedId, selectedIndexes, selectedSupplement, showDetailedHeart, showDetailedHra, supplements]);

  const selectOrgan = useCallback((mesh: Mesh) => {
    const structure = prepared.catalog[Number(mesh.userData.catalogIndex)];
    if (structure && structureMatchesBodyProfile(structure, bodyProfile)) onSelect(structure);
  }, [bodyProfile, onSelect, prepared.catalog]);

  const selectIntegratedOrgan = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!(event.object instanceof Mesh)) return;
    event.stopPropagation();
    selectOrgan(event.object);
  }, [selectOrgan]);

  const selectSupplementStructure = useCallback((supplement: ReturnType<typeof prepareSupplementalOrgan>, event: ThreeEvent<MouseEvent>) => {
    if (!(event.object instanceof Mesh)) return;
    const structure = supplement.catalog[Number(event.object.userData.supplementCatalogIndex)] ?? supplement.structure;
    event.stopPropagation();
    onSelect(structure);
  }, [onSelect]);

  return <group>
    <primitive object={prepared.root} onClick={integrated ? selectIntegratedOrgan : undefined} />
    {supplements.map((supplement) => <primitive
      key={supplement.structure.id}
      object={supplement.root}
      onClick={(event: ThreeEvent<MouseEvent>) => selectSupplementStructure(supplement, event)}
    />)}
    {showDetailedHeart && <ThreeModelErrorBoundary onError={() => setHeartDetailFailed(true)}>
      <DetailedHeartModel
        realistic={realistic}
        quality={quality}
        selectedId={selectedId}
        organView={organView}
        sectionAxis={sectionAxis}
        sectionOffset={sectionOffset}
        onSelect={onSelect}
        onCatalogReady={onCatalogReady}
      />
    </ThreeModelErrorBoundary>}
    {showDetailedHra && availableHraKinds.map((kind) => <ThreeModelErrorBoundary key={kind} onError={() => setFailedHraKinds((current) => current.includes(kind) ? current : [...current, kind])}>
      <DetailedHraOrganModel
        kind={kind}
        realistic={realistic}
        quality={quality}
        selectedId={selectedId}
        organView={organView}
        sectionAxis={sectionAxis}
        sectionOffset={sectionOffset}
        onSelect={onSelect}
        onCatalogReady={onCatalogReady}
      />
    </ThreeModelErrorBoundary>)}
    <NativeMeshPicker active={!integrated && !selectedSupplement} root={prepared.root} onPick={selectOrgan} />
  </group>;
}

function catalogStructureFromRealMesh(mesh: Mesh): Anatomy3DStructure {
  const type = realMeshAnatomyType(mesh);
  const bounds = new Box3().setFromObject(mesh);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const rawDetailName = realMeshAnatomyName(mesh) || (type === "bone" ? "Estrutura óssea" : "Estrutura muscular");
  const detailName = translateAnatomyName(rawDetailName, "organs", 0);
  const description = cleanModelDescription(String(mesh.userData.description || ""), detailName, type);
  return {
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
    parts: [rawDetailName],
  };
}

function annotateBilateralStructures(catalog: Anatomy3DStructure[]) {
  const groups = new Map<string, Anatomy3DStructure[]>();
  catalog.forEach((item) => {
    const key = normalize(item.name);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  return catalog.map((item) => {
    if (/\b(esquerd|direit)[oa]s?\b/i.test(item.name)) return item;
    const pair = groups.get(normalize(item.name));
    if (pair?.length !== 2) return item;
    const [first, second] = pair;
    if (Math.abs(first.focus[0]) < .02 || Math.abs(second.focus[0]) < .02 || first.focus[0] * second.focus[0] >= 0) return item;
    const feminine = /^(patela|escápula|clavícula|costela|falange|tíbia|fíbula|ulna|pelve|mandíbula|maxila|bainha|articulação)\b/i.test(item.name);
    const side = item.focus[0] < 0 ? (feminine ? "esquerda" : "esquerdo") : (feminine ? "direita" : "direito");
    return { ...item, name: `${item.name} ${side}` };
  });
}

function DetailedHeartModel({ realistic, quality, selectedId, organView, sectionAxis, sectionOffset, onSelect, onCatalogReady }: {
  realistic: boolean;
  quality: AnatomyRenderPolicy;
  selectedId: string | null;
  organView: OrganViewMode;
  sectionAxis: SectionAxis;
  sectionOffset: number;
  onSelect: (structure: Anatomy3DStructure) => void;
  onCatalogReady: (system: Anatomy3DSystemId, catalog: Anatomy3DStructure[]) => void;
}) {
  const gltf = useGLTF(anatomy3DAssets.heartInterior.path);
  const prepared = useMemo(() => prepareDetailedHeart(gltf.scene), [gltf.scene]);

  useEffect(() => {
    onCatalogReady("organs", prepared.catalog);
  }, [onCatalogReady, prepared.catalog]);

  const sectionPlane = useMemo(() => {
    if (organView !== "section") return null;
    const bounds = new Box3().setFromObject(prepared.root);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const normal = sectionAxis === "x" ? new Vector3(1, 0, 0) : sectionAxis === "y" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
    const axisSize = sectionAxis === "x" ? size.x : sectionAxis === "y" ? size.y : size.z;
    return new Plane().setFromNormalAndCoplanarPoint(normal, center.clone().addScaledVector(normal, sectionOffset * axisSize * .5));
  }, [organView, prepared.root, sectionAxis, sectionOffset]);

  useEffect(() => {
    const selectedDefinition = heartAnatomyForId(selectedId);
    prepared.meshes.forEach((mesh) => {
      const definition = mesh.userData.heartDefinition as HeartMeshDefinition;
      const active = definition.anatomicalId === selectedId;
      const material = mesh.material as MeshPhysicalMaterial;
      mesh.visible = true;
      applyOrganAppearance(mesh, definition.name, realistic, active, definition.color, quality);

      const chamberWall = definition.kind === "chamber";
      const contextOpacity = selectedDefinition
        ? active ? 1 : chamberWall ? .022 : .12
        : chamberWall ? .4 : 1;
      material.opacity = organView === "transparent" ? contextOpacity : active ? 1 : chamberWall ? .68 : 1;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > .72;
      material.clippingPlanes = organView === "section" && sectionPlane && (chamberWall || definition.kind === "septum") ? [sectionPlane] : [];
      material.clipShadows = material.clippingPlanes.length > 0;
      if (!realistic && active) {
        material.color.set("#ffd16a");
        material.emissive.set("#ffad3d");
        material.emissiveIntensity = .58;
      }
      material.needsUpdate = true;
    });
  }, [organView, prepared.meshes, quality, realistic, sectionPlane, selectedId]);

  const selectHeartStructure = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!(event.object instanceof Mesh)) return;
    const structure = prepared.catalog[Number(event.object.userData.catalogIndex)];
    if (!structure) return;
    event.stopPropagation();
    onSelect(structure);
  }, [onSelect, prepared.catalog]);

  return <primitive object={prepared.root} onClick={selectHeartStructure} />;
}

function DetailedHraOrganModel({ kind, realistic, quality, selectedId, organView, sectionAxis, sectionOffset, onSelect, onCatalogReady }: {
  kind: HraDetailedOrganKind;
  realistic: boolean;
  quality: AnatomyRenderPolicy;
  selectedId: string | null;
  organView: OrganViewMode;
  sectionAxis: SectionAxis;
  sectionOffset: number;
  onSelect: (structure: Anatomy3DStructure) => void;
  onCatalogReady: (system: Anatomy3DSystemId, catalog: Anatomy3DStructure[]) => void;
}) {
  const definition = hraDetailedOrganAssets[kind];
  const gltf = useGLTF(definition.asset.path);
  const prepared = useMemo(() => prepareHraDetailedOrgan(gltf.scene, kind), [gltf.scene, kind]);

  useEffect(() => {
    onCatalogReady("organs", prepared.catalog);
  }, [onCatalogReady, prepared.catalog]);

  const sectionPlane = useMemo(() => {
    if (organView !== "section") return null;
    const bounds = new Box3().setFromObject(prepared.root);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const normal = sectionAxis === "x" ? new Vector3(1, 0, 0) : sectionAxis === "y" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
    const axisSize = sectionAxis === "x" ? size.x : sectionAxis === "y" ? size.y : size.z;
    return new Plane().setFromNormalAndCoplanarPoint(normal, center.clone().addScaledVector(normal, sectionOffset * axisSize * .5));
  }, [organView, prepared.root, sectionAxis, sectionOffset]);

  useEffect(() => {
    const selectingPart = Boolean(selectedId?.startsWith(`model:hra:${kind}:`));
    prepared.meshes.forEach((mesh) => {
      const structure = prepared.catalog[Number(mesh.userData.catalogIndex)];
      const active = structure?.id === selectedId;
      const material = mesh.material as MeshPhysicalMaterial;
      mesh.visible = true;
      applyOrganAppearance(mesh, `${definition.name} ${structure?.name ?? ""}`, realistic, active, String(mesh.userData.didacticColor ?? definition.color), quality);
      material.opacity = organView === "transparent"
        ? selectingPart ? active ? 1 : .1 : .42
        : selectingPart ? active ? 1 : .2 : 1;
      material.transparent = material.opacity < 1;
      material.depthWrite = material.opacity > .7;
      material.clippingPlanes = organView === "section" && sectionPlane ? [sectionPlane] : [];
      material.clipShadows = material.clippingPlanes.length > 0;
      if (!realistic && active) {
        material.color.set("#ffd16a");
        material.emissive.set("#ffad3d");
        material.emissiveIntensity = .52;
      }
      material.needsUpdate = true;
    });
  }, [definition.color, definition.name, kind, organView, prepared.catalog, prepared.meshes, quality, realistic, sectionPlane, selectedId]);

  const selectStructure = useCallback((mesh: Mesh) => {
    const structure = prepared.catalog[Number(mesh.userData.catalogIndex)];
    if (structure) onSelect(structure);
  }, [onSelect, prepared.catalog]);

  return <group>
    <primitive object={prepared.root} />
    <NativeMeshPicker active root={prepared.root} onPick={selectStructure} />
  </group>;
}

function DenseSystemPicker({ active, mesh, onPick }: { active: boolean; mesh: Mesh; onPick: (index: number) => void }) {
  const { camera, gl, raycaster } = useThree();
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!active) return;
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
  }, [active, camera, gl, mesh, onPick, raycaster]);
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
  const geometryGroups = new Map<string, Array<Mesh["geometry"]>>();

  clone.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const rawName = realMeshAnatomyName(object) || `Estrutura ${catalog.length + 1}`;
    if (!isUsableAnatomyMeshName(rawName)) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    for (const attribute of Object.keys(geometry.attributes)) {
      if (attribute !== "position" && attribute !== "normal") geometry.deleteAttribute(attribute);
    }
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    geometryGroups.set(rawName, [...(geometryGroups.get(rawName) ?? []), geometry]);
  });

  geometryGroups.forEach((structureGeometries, rawName) => {
    const structureIndex = catalog.length;
    const color = anatomyColorForRawName(layer, rawName);
    const rgb = new Color(color);
    const bounds = new Box3();
    structureGeometries.forEach((geometry) => {
      geometry.setAttribute("anatomyStructureId", new BufferAttribute(new Float32Array(geometry.getAttribute("position").count).fill(structureIndex), 1));
      const colorValues = new Float32Array(geometry.getAttribute("position").count * 3);
      for (let index = 0; index < colorValues.length; index += 3) {
        colorValues[index] = rgb.r;
        colorValues[index + 1] = rgb.g;
        colorValues[index + 2] = rgb.b;
      }
      geometry.setAttribute("color", new BufferAttribute(colorValues, 3));
      geometry.computeBoundingBox();
      if (geometry.boundingBox) bounds.union(geometry.boundingBox);
      geometries.push(geometry);
    });
    catalog.push(catalogStructureFromBounds(rawName, layer, structureIndex, bounds, color));
  });

  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error(`Não foi possível combinar as malhas do sistema ${layer}.`);
  merged.computeBoundingSphere();
  const material = new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: layer === "vascular" ? .5 : layer === "skeletal" ? .72 : layer === "muscular" ? .56 : .63,
    metalness: 0,
    side: DoubleSide,
  });
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
    const rawName = realMeshAnatomyName(object) || `Estrutura visceral ${catalog.length + 1}`;
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
    heart: { name: "Coração", latin: "Cor", target: [0.1, 2.06, 0.16] as [number, number, number], size: .46, color: "#b53c50", regionId: "thorax" as Anatomy3DRegionId, region: "Mediastino", system: "Cardiovascular", summary: "Modelo de alta definição do coração posicionado entre os pulmões e disponível para exploração isolada em rotação livre.", function: "Mantém o fluxo sanguíneo pelas circulações pulmonar e sistêmica por contrações coordenadas." },
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
  // center by the cardiac mass so its in-body view preserves adult proportions.
  const visualExtent = kind === "heart" ? Math.max(initialSize.x, initialSize.z) : Math.max(initialSize.x, initialSize.y, initialSize.z);
  const visualCenter = initialCenter.clone();
  if (kind === "heart") visualCenter.y += initialSize.y * .28;
  const scale = settings.size / Math.max(visualExtent, .001);
  root.scale.setScalar(scale);
  root.position.set(settings.target[0] - visualCenter.x * scale, settings.target[1] - visualCenter.y * scale, settings.target[2] - visualCenter.z * scale);
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
    object.material = new MeshPhysicalMaterial({ color: settings.color, emissive: settings.color, emissiveIntensity: .12, roughness: .5, metalness: 0, clearcoat: 0, sheen: 0, side: DoubleSide });
    object.userData.didacticColor = settings.color;
    object.castShadow = true;
    object.receiveShadow = true;
    meshes.push(object);
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
    focusDistance: kind === "eye" ? 1.25 : kind === "spleen" ? 1.65 : kind === "heart" ? 1.65 : 2.45,
    color: settings.color,
    parts: [],
  };
  const catalog = [structure];
  if (kind === "heart") {
    meshes.forEach((mesh) => {
      const definition = heartAnatomyForMeshName(mesh.name);
      if (!definition || definition.sourceId !== "zAnatomyOrgan3D") return;
      const bounds = new Box3().setFromObject(mesh);
      const center = bounds.getCenter(new Vector3());
      const size = bounds.getSize(new Vector3());
      const meshStructure: Anatomy3DStructure = {
        id: definition.anatomicalId,
        name: definition.name,
        latin: definition.latin,
        layer: "organs",
        regionId: "thorax",
        region: definition.region,
        system: "Cardiovascular",
        summary: definition.summary,
        function: definition.function,
        sourceId: definition.sourceId,
        focus: [center.x, center.y, center.z],
        focusDistance: Math.max(definition.kind === "vessel" ? 1.55 : 1.35, Math.max(size.x, size.y, size.z) * 3.4),
        color: definition.color,
        parts: [definition.kind],
      };
      mesh.userData.supplementCatalogIndex = catalog.length;
      mesh.userData.didacticColor = definition.color;
      catalog.push(meshStructure);
    });
  }
  return { root, structure, catalog, meshes };
}

function prepareHraDetailedOrgan(source: Object3D, kind: HraDetailedOrganKind) {
  const definition = hraDetailedOrganAssets[kind];
  const root = source.clone(true);
  root.updateMatrixWorld(true);
  const sourceBounds = new Box3().setFromObject(root);
  const sourceCenter = sourceBounds.getCenter(new Vector3());
  const sourceSize = sourceBounds.getSize(new Vector3());
  const scale = definition.size / Math.max(sourceSize.x, sourceSize.y, sourceSize.z, .001);
  root.scale.setScalar(scale);
  root.position.set(
    definition.target[0] - sourceCenter.x * scale,
    definition.target[1] - sourceCenter.y * scale,
    definition.target[2] - sourceCenter.z * scale,
  );
  root.updateMatrixWorld(true);

  const catalog: Anatomy3DStructure[] = [];
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const rawName = String(object.name || `estrutura-${catalog.length + 1}`);
    const cleanName = rawName.replace(/^VH_[FM]_/, "").replace(/^Allen_/, "");
    const color = hraOrganMeshColor(kind, cleanName, definition.color);
    object.geometry = object.geometry.clone();
    if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
    object.material = new MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: .035,
      roughness: kind === "lungs" ? .64 : kind.startsWith("kidney") ? .5 : .56,
      metalness: 0,
      clearcoat: realisticClearcoatForOrgan(kind),
      clearcoatRoughness: .72,
      side: DoubleSide,
    });
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.catalogIndex = catalog.length;
    object.userData.rawAnatomyName = rawName;
    object.userData.didacticColor = color;
    const bounds = new Box3().setFromObject(object);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const name = translateAnatomyName(cleanName, kind === "brain" ? "nervous" : "organs", catalog.length);
    catalog.push({
      id: `model:hra:${kind}:${stableMeshSlug(rawName)}`,
      name,
      latin: undefined,
      layer: "organs",
      regionId: definition.regionId,
      region: definition.region,
      system: definition.system,
      summary: `${name} segmentado como malha anatômica independente no modelo de referência HRA.`,
      function: `Permite estudar a posição e as relações tridimensionais de ${name.toLocaleLowerCase("pt-BR")} dentro de ${definition.name.toLocaleLowerCase("pt-BR")}.`,
      sourceId: definition.asset.sourceId,
      focus: [center.x, center.y, center.z],
      focusDistance: Math.max(.72, Math.max(size.x, size.y, size.z) * 4.1),
      color,
      parts: [rawName],
    });
    meshes.push(object);
  });

  if (catalog.length !== definition.asset.meshCount) {
    throw new Error(`${definition.name} carregou ${catalog.length} de ${definition.asset.meshCount} malhas esperadas.`);
  }
  root.name = `nih-hra-${kind}-detalhado`;
  return { root, catalog, meshes };
}

function stableMeshSlug(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function realisticClearcoatForOrgan(kind: HraDetailedOrganKind) {
  return kind === "liver" || kind.startsWith("kidney") ? .08 : .025;
}

function hraOrganMeshColor(kind: HraDetailedOrganKind, rawName: string, fallback: string) {
  const name = normalize(rawName);
  if (kind === "brain") {
    if (/ventricle|aqueduct|canal/.test(name)) return "#76a6b4";
    if (/white matter|corpus callosum|fornix|tract|radiation/.test(name)) return "#e4d6bd";
    if (/cerebell/.test(name)) return "#b97678";
    if (/brainstem|pons|medulla|midbrain|tegmentum/.test(name)) return "#b98966";
    return /cortex|gyrus|lobule|pole/.test(name) ? "#c9878e" : "#b27682";
  }
  if (kind === "lungs") return /bronch|cartilage/.test(name) ? "#d7bea0" : /hilum/.test(name) ? "#9b6f69" : "#9f6670";
  if (kind === "liver") return /ligament/.test(name) ? "#d2b59c" : /impression|porta/.test(name) ? "#9c6253" : "#7f4037";
  if (/pyramid/.test(name)) return "#9d5365";
  if (/cortex/.test(name)) return "#b96b75";
  if (/column/.test(name)) return "#c78385";
  if (/capsule/.test(name)) return "#d1a0a4";
  return fallback;
}

function prepareDetailedHeart(source: Object3D) {
  const root = source.clone(true);
  const target = new Vector3(.1, 2.06, .16);
  root.updateMatrixWorld(true);
  const sourceBounds = new Box3().setFromObject(root);
  const sourceCenter = sourceBounds.getCenter(new Vector3());
  const sourceSize = sourceBounds.getSize(new Vector3());
  const scale = .52 / Math.max(sourceSize.x, sourceSize.y, sourceSize.z, .001);
  root.scale.setScalar(scale);
  root.position.set(target.x - sourceCenter.x * scale, target.y - sourceCenter.y * scale, target.z - sourceCenter.z * scale);
  root.updateMatrixWorld(true);

  const catalog: Anatomy3DStructure[] = [];
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const definition = heartAnatomyForMeshName(object.name);
    if (!definition || definition.sourceId !== "nihHraHeart3D") {
      object.visible = false;
      return;
    }
    object.geometry = object.geometry.clone();
    if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
    object.material = new MeshPhysicalMaterial({
      color: definition.color,
      emissive: definition.color,
      emissiveIntensity: .06,
      roughness: definition.kind === "valve" ? .58 : .48,
      metalness: 0,
      clearcoat: definition.kind === "valve" ? .08 : .03,
      clearcoatRoughness: .6,
      side: DoubleSide,
    });
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.catalogIndex = catalog.length;
    object.userData.rawAnatomyName = definition.meshName;
    object.userData.didacticColor = definition.color;
    object.userData.heartDefinition = definition;
    const bounds = new Box3().setFromObject(object);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    catalog.push({
      id: definition.anatomicalId,
      name: definition.name,
      latin: definition.latin,
      layer: "organs",
      regionId: "thorax",
      region: definition.region,
      system: "Cardiovascular",
      summary: definition.summary,
      function: definition.function,
      sourceId: definition.sourceId,
      focus: [center.x, center.y, center.z],
      focusDistance: definition.kind === "valve" || definition.kind === "papillary-muscle"
        ? Math.max(1.55, Math.max(size.x, size.y, size.z) * 4.8)
        : Math.max(.9, Math.max(size.x, size.y, size.z) * 3.5),
      color: definition.color,
      parts: [definition.kind],
    });
    meshes.push(object);
  });

  if (catalog.length !== heartInteriorMeshDefinitions.length) {
    throw new Error(`O coração NIH carregou ${catalog.length} de ${heartInteriorMeshDefinitions.length} malhas anatômicas esperadas.`);
  }
  root.name = "nih-hra-heart-interior";
  root.updateMatrixWorld(true);
  return { root, catalog, meshes };
}

function applyOrganAppearance(mesh: Mesh, name: string, realistic: boolean, active: boolean, didacticColor: string, quality: AnatomyRenderPolicy) {
  const material = mesh.material as MeshPhysicalMaterial;
  if (!realistic) {
    clearAnatomyTissueMaps(material);
    material.color.set(didacticColor);
    material.vertexColors = false;
    material.emissive.set(didacticColor);
    material.emissiveIntensity = active ? .3 : .08;
    material.roughness = .54;
    material.clearcoat = 0;
    material.clearcoatRoughness = .5;
    material.sheen = 0;
    material.metalness = 0;
    material.transmission = 0;
    material.thickness = 0;
    material.specularIntensity = 1;
    material.envMapIntensity = 1;
    return;
  }
  const tissue = anatomyTissueForName(name, "visceral");
  const profile = anatomyMaterialProfiles[tissue];
  const source = new Color(didacticColor);
  const biological = new Color(profile.baseColor);
  biological.lerp(source, tissue === "brain" || tissue === "kidney" || tissue === "tendon" ? .34 : .16);
  applyAnatomyTissueMaterial(material, mesh.geometry, tissue, {
    active,
    baseColor: `#${biological.getHexString()}`,
    quality,
  });
}

function RendererAppearance({ realistic }: { realistic: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = realistic ? 1.02 : 1;
    gl.shadowMap.type = PCFSoftShadowMap;
  }, [gl, realistic]);
  return null;
}

function skinColorForMesh(baseTone: string, meshName: string) {
  const hash = Array.from(meshName).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 17);
  const lightnessVariation = ((hash % 7) - 3) * .006;
  return new Color(baseTone).offsetHSL(0, -.015, lightnessVariation);
}

function normalizeAnatomyRoot(source: Object3D) {
  const clone = source.clone(true);
  alignZAnatomyRoot(clone);
  return clone;
}

function tissueFallbackForLayer(layer: Anatomy3DSystemId): AnatomyTissue {
  if (layer === "surface") return "skin";
  if (layer === "muscular") return "muscle";
  if (layer === "skeletal") return "bone";
  if (layer === "vascular") return "artery";
  if (layer === "nervous") return "nerve";
  return "visceral";
}

function alignZAnatomyRoot(root: Object3D) {
  const size = ZANATOMY_REFERENCE_BOUNDS.getSize(new Vector3());
  const center = ZANATOMY_REFERENCE_BOUNDS.getCenter(new Vector3());
  const scale = 8.55 / Math.max(size.y, .001);
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -center.y * scale - .08, -center.z * scale);
  root.updateMatrixWorld(true);
}

function catalogStructureFromBounds(rawName: string, layer: DenseAnatomyLayer | "organs", index: number, bounds: Box3, color: string): Anatomy3DStructure {
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const name = /^\?+$/.test(rawName.trim()) ? `Estrutura sem nomenclatura ${index + 1}` : translateAnatomyName(rawName, layer, index);
  const normalizedRawName = normalize(rawName);
  const regionId = /\b(rib|costal cartilage|sternum)\b/.test(normalizedRawName) ? "thorax" : regionFromPoint(center);
  const layerName = layer === "muscular"
    ? "Muscular"
    : layer === "skeletal"
      ? "Esquelético e articular"
      : layer === "vascular"
        ? "Cardiovascular"
        : layer === "nervous"
          ? "Nervoso e sensorial"
          : anatomyOrganSystem(rawName);
  const summary = layer === "muscular"
    ? `${name} é uma estrutura individual do sistema muscular representada na malha anatômica. Nomenclatura da fonte: ${rawName}.`
    : layer === "skeletal"
      ? `${name} integra o esqueleto, as articulações ou seus tecidos de suporte. Nomenclatura da fonte: ${rawName}.`
      : layer === "vascular"
    ? `${name} é uma estrutura individual da circulação representada na malha anatômica. Nomenclatura da fonte: ${rawName}.`
    : layer === "nervous"
      ? `${name} é uma estrutura individual do sistema nervoso representada na malha anatômica. Nomenclatura da fonte: ${rawName}.`
      : `${name} integra o conjunto de órgãos internos e estruturas associadas do atlas. Nomenclatura da fonte: ${rawName}.`;
  const functionText = layer === "muscular"
    ? "Contribui para movimento, estabilização ou controle postural conforme suas origens, inserções e inervação."
    : layer === "skeletal"
      ? "Participa do suporte, proteção, movimento ou estabilidade articular conforme sua localização e relações anatômicas."
      : layer === "vascular"
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
    sourceId: "vayuAnatomy3D",
    focus: [center.x, center.y, center.z],
    focusDistance: Math.min(4.8, Math.max(.82, Math.max(size.x, size.y, size.z) * 3.2)),
    color,
    parts: [rawName],
  };
}

function anatomyColorForRawName(layer: DenseAnatomyLayer | "organs", rawName: string) {
  const name = normalize(rawName);
  if (layer === "muscular") {
    if (/tendon|aponeuros|fascia|retinaculum/.test(name)) return "#d7b7a1";
    return "#b33f46";
  }
  if (layer === "skeletal") {
    if (/cartilage|disc|meniscus|labrum/.test(name)) return "#c7b7a6";
    if (/ligament|capsule/.test(name)) return "#d8c7a8";
    if (/tooth|teeth|dentine/.test(name)) return "#eee5d1";
    return "#dfd4ba";
  }
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

function isIntegratedOverviewOrgan(rawName: string) {
  const name = normalize(rawName);
  return !/(omentum|mesocolon|taenia|mucosa|segment|pleura|peritone|fascia|capsule|ligament|duct|corpus)/.test(name);
}

const anatomyNameDictionary: Record<string, string> = {
  "thoracic skeleton": "Esqueleto torácico",
  "bones of thorax": "Ossos do tórax",
  "true ribs": "Costelas verdadeiras",
  "false ribs": "Costelas falsas",
  "floating ribs": "Costelas flutuantes",
  ribs: "Costelas",
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
  "corpus cavernosum of penis": "Corpo cavernoso do pênis",
  "corpus spongiosum of penis": "Corpo esponjoso do pênis",
  "glans penis": "Glande do pênis",
  "central canal": "Canal central",
  "soft palate": "Palato mole",
  "uvula of palate": "Úvula palatina",
  "greater omentum": "Omento maior",
  "lesser omentum": "Omento menor",
  "vermiform appendix": "Apêndice vermiforme",
  "mucosa of stomach": "Mucosa do estômago",
  "mucosa of nasal cavity": "Mucosa da cavidade nasal",
  "inferior vena cava abdominal part": "Parte abdominal da veia cava inferior",
  "inferior vena cava thoracic part": "Parte torácica da veia cava inferior",
  "superior vena cava": "Veia cava superior",
  "inferior vena cava": "Veia cava inferior",
  "brachiocephalic trunk": "Tronco braquiocefálico",
  "portal vein": "Veia porta",
  "basilar artery": "Artéria basilar",
  "sciatic nerve": "Nervo isquiático",
  "medulla oblongata": "Bulbo",
  midbrain: "Mesencéfalo",
  pons: "Ponte",
  thalamus: "Tálamo",
  hypothalamus: "Hipotálamo",
  hippocampus: "Hipocampo",
  putamen: "Putâmen",
  cochlea: "Cóclea",
  vestibule: "Vestíbulo",
  nasopharynx: "Nasofaringe",
  oropharynx: "Orofaringe",
  laryngopharynx: "Laringofaringe",
  adenohypophysis: "Adeno-hipófise",
  neurohypophysis: "Neuro-hipófise",
  "ductus deferens": "Ducto deferente",
  epididymis: "Epidídimo",
  "renal pelvis": "Pelve renal",
  "meso appendix": "Mesoapêndice",
  "cingulate gyrus posteroventral part": "Parte posteroventral do giro do cíngulo",
  "olfactory bulb": "Bulbo olfatório",
  "piriform region": "Região piriforme",
  "porta hepatis": "Porta do fígado",
  "ligamentum venosum": "Ligamento venoso",
  "superomedial segment 1": "Segmento I superomedial",
  "inferior nasal concha bone": "Osso da concha nasal inferior",
  "tendon sheath": "Bainha tendínea",
  "common tendon sheath": "Bainha tendínea comum",
  "plantar tendon sheath": "Bainha tendínea plantar",
  "fibrous sheath": "Bainha fibrosa",
};

const anatomyWordDictionary: Record<string, string> = {
  bifurcation: "bifurcação", artery: "artéria", arteries: "artérias", vein: "veia", veins: "veias",
  bone: "osso", bones: "ossos", tendon: "tendão", tendons: "tendões", sheath: "bainha", sheaths: "bainhas", muscles: "músculos",
  rib: "costela", ribs: "costelas", sternum: "esterno", vertebra: "vértebra", vertebrae: "vértebras", skeleton: "esqueleto", thorax: "tórax",
  true: "verdadeiro", false: "falso", floating: "flutuante", system: "sistema", systems: "sistemas", organ: "órgão", organs: "órgãos",
  scapula: "escápula", clavicle: "clavícula", humerus: "úmero", radius: "rádio", ulna: "ulna",
  femur: "fêmur", tibia: "tíbia", fibula: "fíbula", patella: "patela",
  fibrous: "fibroso", digit: "dedo", digits: "dedos", extensor: "extensor", flexor: "flexor",
  tibialis: "tibial", fibularis: "fibular", hallucis: "do hálux", digitorum: "dos dedos", longus: "longo",
  brevis: "curto", carpi: "do carpo", ulnaris: "ulnar", radialis: "radial", cruciform: "cruciforme",
  deltoid: "deltoide", pectoralis: "peitoral", biceps: "bíceps", triceps: "tríceps", abdominis: "abdominal",
  gluteus: "glúteo", maximus: "máximo", medius: "médio", quadriceps: "quadríceps",
  gastrocnemius: "gastrocnêmio", soleus: "sóleo", trapezius: "trapézio", latissimus: "latíssimo", dorsi: "do dorso",
  nerve: "nervo", nerves: "nervos", branch: "ramo", branches: "ramos", trunk: "tronco", root: "raiz", roots: "raízes",
  plexus: "plexo", ganglion: "gânglio", division: "divisão", part: "parte", segment: "segmento", leaflet: "folheto",
  valve: "valva", arch: "arco", sinus: "seio", canal: "canal", tract: "trato", nucleus: "núcleo", nuclei: "núcleos",
  gyrus: "giro", gyri: "giros", sulcus: "sulco", sulci: "sulcos", lobe: "lobo", lobule: "lóbulo", peduncle: "pedúnculo",
  gland: "glândula", glands: "glândulas", duct: "ducto", bronchus: "brônquio", lung: "pulmão", kidney: "rim",
  liver: "fígado", heart: "coração", muscle: "músculo", body: "corpo", cord: "cordão", eyeball: "bulbo ocular",
  ventricle: "ventrículo", foot: "pé", hand: "mão", palate: "palato", tongue: "língua", gingiva: "gengiva",
  superior: "superior", inferior: "inferior", upper: "superior", lower: "inferior",
  anterior: "anterior", posterior: "posterior", medial: "medial", lateral: "lateral",
  internal: "interno", external: "externo", common: "comum", deep: "profundo", superficial: "superficial", middle: "médio",
  central: "central", proper: "próprio", long: "longo", free: "livre", accessory: "acessório", ascending: "ascendente",
  descending: "descendente", communicating: "comunicante", perforating: "perfurante", circumflex: "circunflexo",
  segmental: "segmentar", lobar: "lobar", basal: "basal", apical: "apical", lingular: "lingular", septal: "septal",
  pulmonary: "pulmonar", coronary: "coronário", cardiac: "cardíaco", cerebral: "cerebral", cerebellar: "cerebelar",
  spinal: "espinal", brachial: "braquial", femoral: "femoral", ulnar: "ulnar", radial: "radial", tibial: "tibial",
  fibular: "fibular", axillary: "axilar", iliac: "ilíaco", renal: "renal", hepatic: "hepático", mesenteric: "mesentérico",
  carotid: "carótido", subclavian: "subclávio", intercostal: "intercostal", thoracic: "torácico", lumbar: "lombar",
  phrenic: "frênico", suprarenal: "suprarrenal", epigastric: "epigástrico", gluteal: "glúteo", pudendal: "pudendo",
  plantar: "plantar", dorsal: "dorsal", palmar: "palmar", digital: "digital", cutaneous: "cutâneo", collateral: "colateral",
  genicular: "genicular", interosseous: "interósseo", metatarsal: "metatarsal", saphenous: "safeno", venous: "venoso",
  facial: "facial", mental: "mentoniano", mandibular: "mandibular", maxillary: "maxilar", ophthalmic: "oftálmico",
  meningeal: "meníngeo", lacrimal: "lacrimal", optic: "óptico", oculomotor: "oculomotor", trigeminal: "trigêmeo",
  vestibular: "vestibular", cochlear: "coclear", vagus: "vago", hypoglossal: "hipoglosso", abducens: "abducente",
  trochlear: "troclear", olfactory: "olfatório", lingual: "lingual", cervical: "cervical", temporal: "temporal",
  frontal: "frontal", parietal: "parietal", occipital: "occipital", orbital: "orbitário", cingulate: "cingulado",
  precentral: "pré-central", postcentral: "pós-central", transverse: "transverso", colic: "cólico", ileocolic: "ileocólico",
  testicular: "testicular", muscular: "muscular", parotid: "parótido", sublingual: "sublingual", submandibular: "submandibular",
  pancreatic: "pancreático", bile: "biliar", urinary: "urinário", pineal: "pineal", thyroid: "tireóideo",
  parathyroid: "paratireóideo", seminal: "seminal", nasal: "nasal", cavity: "cavidade", right: "direito", left: "esquerdo",
  iliolumbar: "iliolombar", labial: "labial", alveolar: "alveolar", ethmoidal: "etmoidal", humeral: "umeral",
  penis: "pênis", angular: "angular", basilar: "basilar", carpal: "carpal", retromandibular: "retromandibular",
  jugular: "jugular", median: "mediano", subcostal: "subcostal", intrarenal: "intrarrenal", sigmoid: "sigmoide",
  submental: "submentoniano", sphenopalatine: "esfenopalatino", ciliary: "ciliar", callosomarginal: "calosomarginal",
  striate: "estriado", pontine: "pontino", vertebral: "vertebral", musculophrenic: "musculofrênico",
  suprascapular: "supraescapular", acromial: "acromial", thoracodorsal: "toracodorsal", metacarpal: "metacarpal",
  anastomosis: "anastomose", recurrent: "recorrente", calcaneal: "calcâneo", popliteal: "poplíteo",
  petrosal: "petroso", scapular: "escapular", subscapular: "subescapular", palatine: "palatino",
  papillary: "papilar", great: "magno", brachiocephalic: "braquiocefálico", aorta: "aorta", sacral: "sacral",
  azygos: "ázigos", vena: "veia", cava: "cava", atrioventricular: "atrioventricular", semilunar: "semilunar",
  interventricular: "interventricular", splenic: "esplênico", pancreaticoduodenal: "pancreatoduodenal",
  abdominal: "abdominal", pharyngeal: "faríngeo", mylohyoid: "milo-hióideo", pterygoid: "pterigóideo",
  retinal: "retiniano", supratrochlear: "supratroclear", pericallosal: "pericaloso", orbitofrontal: "orbitofrontal",
  proximal: "proximal", distal: "distal", insular: "insular", prefrontal: "pré-frontal", frontobasal: "frontobasal",
  arterial: "arterial", thyrocervical: "tireocervical", first: "primeiro", second: "segundo", third: "terceiro",
  fourth: "quarto", fifth: "quinto", sixth: "sexto", seventh: "sétimo", eighth: "oitavo", ninth: "nono",
  tenth: "décimo", eleventh: "décimo primeiro", twelfth: "décimo segundo",
  costocervical: "costocervical", pectoral: "peitoral", arcuate: "arqueado", dorsalis: "dorsal", pedis: "do pé",
  tarsal: "tarsal", patellar: "patelar", auricular: "auricular", sagittal: "sagital", network: "rede",
  cephalic: "cefálico", cubital: "cubital", antebrachial: "antebraquial", basilic: "basílico",
  intercapitular: "intercapitular", small: "pequeno", gastro: "gástrico", omental: "omental",
  supreme: "supremo", intercavernous: "intercavernoso", buccal: "bucal", infra: "infra", greater: "maior",
  obturator: "obturatório", atrium: "átrio", cavernous: "cavernoso", coeliac: "celíaco", gastric: "gástrico",
  gastroduodenal: "gastroduodenal", portal: "porta", anorectal: "anorretal", sural: "sural",
  genitofemoral: "genitofemoral", sympathetic: "simpático", vermis: "vérmis", occipitotemporal: "occipitotemporal",
  fasciculus: "fascículo", forearm: "antebraço", medulla: "bulbo", oblongata: "oblongo", salivatory: "salivatório",
  motor: "motor", quadrangular: "quadrangular", flocculus: "flóculo", stria: "estria", paracentral: "paracentral",
  insula: "ínsula", proprius: "próprio", intermediate: "intermediário", midbrain: "mesencéfalo", gracile: "grácil",
  geniculate: "geniculado", commissure: "comissura", pole: "polo", white: "branca", matter: "substância",
  chorda: "corda", tympani: "do tímpano", vestibulocochlear: "vestibulococlear", glossopharyngeal: "glossofaríngeo",
  musculocutaneous: "musculocutâneo", iliohypogastric: "ílio-hipogástrico", inguinal: "inguinal",
  infrapatellar: "infrapatelar", crural: "crural", genital: "genital", sciatic: "isquiático", piriformis: "piriforme",
  quadratus: "quadrado", femoris: "femoral", olive: "oliva", pyramid: "pirâmide", ambiguus: "ambíguo",
  solitary: "solitário", colliculus: "colículo", pons: "ponte", biventral: "biventral", tonsil: "tonsila",
  chiasm: "quiasma", thalamus: "tálamo", caudate: "caudado", putamen: "putâmen", globus: "globo",
  pallidus: "pálido", lentiform: "lentiforme", opercular: "opercular", subcentral: "subcentral",
  circular: "circular", hippocampus: "hipocampo", calcarine: "calcarino", cuneus: "cúneo", precuneus: "pré-cúneo",
  intraparietal: "intraparietal", supramarginal: "supramarginal", parahippocampal: "para-hipocampal",
  terminalis: "terminal", fornix: "fórnix", telencephalon: "telencéfalo", tentorium: "tentório", cerebelli: "do cerebelo",
  choroid: "coroide", horn: "corno", corticospinal: "corticoespinal", vestibulospinal: "vestibuloespinal",
  reticulospinal: "reticuloespinal", spinothalamic: "espinotalâmico", spinocerebellar: "espinocerebelar",
  ganglia: "gânglios", sensory: "sensitivo", tympanic: "timpânico", membrane: "membrana", cochlea: "cóclea",
  vestibule: "vestíbulo", auditory: "auditivo", tube: "tuba", canaliculus: "canalículo", suspensory: "suspensor",
  ligament: "ligamento", chamber: "câmara", zonular: "zonular", colon: "cólon", taenia: "tênia",
  ureter: "ureter", ductus: "ducto", deferens: "deferente", ejaculatory: "ejaculatório", omentum: "omento",
  appendix: "apêndice", corpus: "corpo", testis: "testículo", pelvis: "pelve", oesophagus: "esôfago",
  jejunum: "jejuno", urethra: "uretra", anteromedial: "anteromedial", lesser: "menor", mesocolon: "mesocolo",
  mesocolic: "mesocólico", vermiform: "vermiforme", duodenum: "duodeno", circle: "círculo", stomach: "estômago",
  gallbladder: "vesícula biliar", laryngopharynx: "laringofaringe", nasopharynx: "nasofaringe", oropharynx: "orofaringe",
  pharynx: "faringe", uvula: "úvula", pancreas: "pâncreas", adenohypophysis: "adeno-hipófise",
  neurohypophysis: "neuro-hipófise", cavernosum: "cavernoso", spongiosum: "esponjoso", glans: "glande",
  prostate: "próstata", epiglottis: "epiglote", mucosa: "mucosa", trachea: "traqueia", pleura: "pleura",
  bladder: "bexiga", main: "principal", appendicular: "apendicular", amygdaloid: "amigdaloide",
  aqueduct: "aqueduto", cornea: "córnea", callosum: "caloso", cuneate: "cuneiforme", dura: "dura-máter",
  process: "processo", hippocampal: "hipocampal", straight: "reto", frontomarginal: "frontomarginal",
  frontopolar: "frontopolar", posteroventral: "posteroventral", rectus: "reto",
  amygdala: "amígdala", ampulla: "ampola",
  bulb: "bulbo", region: "região", area: "área", cortex: "córtex", complex: "complexo", group: "grupo",
  head: "cabeça", tail: "cauda", accumbens: "accumbens", forebrain: "prosencéfalo", hindbrain: "rombencéfalo",
  claustrum: "claustro", habenular: "habenular",
  zona: "zona", incerta: "incerta", supraoptic: "supraóptica", preoptic: "pré-óptica", tuberal: "tuberal",
  mammillothalamic: "mamilotalâmico", ventricular: "ventricular",
  agranular: "agranular", operculum: "opérculo", planum: "plano", polare: "polar",
  fusiform: "fusiforme", subcallosal: "subcaloso",
  ambiens: "ambiente", perirhinal: "perirrinal", pretectal: "pré-tectal", substantia: "substância", nigra: "negra",
  tegmentum: "tegmento", pyramidal: "piramidal", radiation: "radiação",
  subthalamic: "subtalâmico", mammillary: "mamilar", bronchopulmonary: "broncopulmonar", hilum: "hilo",
  cartilage: "cartilagem", tertiary: "terciário", lingula: "língula", impression: "impressão", capsule: "cápsula",
  bare: "nua", diaphragmatic: "diafragmática", surface: "superfície", quadrate: "quadrado",
  falciform: "falciforme", round: "redondo", outer: "externo", column: "coluna",
  esophageal: "esofágico", hepataduodenal: "hepatoduodenal",
  thoraco: "toraco", iliacus: "ilíaco", short: "curto", supra: "supra", temporo: "temporo", parieto: "parieto",
  hemi: "hemi", apicoposterior: "apicoposterior", inferolateral: "inferolateral", aortic: "aórtico", ileal: "ileal",
  marginal: "marginal", non: "não", ant: "anterior", lat: "lateral", fis: "fissura", post: "posterior",
  cerebellum: "cerebelo", base: "base", red: "vermelho", wing: "asa", medullaris: "medular", thalami: "do tálamo",
  shaped: "formato", fibres: "fibras", iris: "íris", lens: "cristalino", vitreous: "vítreo", retina: "retina",
  sclera: "esclera", cauda: "cauda", equina: "equina", interpeduncular: "interpeduncular",
  fossa: "fossa", culmen: "cúlmen", declive: "declive", folium: "fólio", nodule: "nódulo",
  pyramis: "pirâmide", tuber: "túber", habenula: "habênula", mamillary: "mamilar",
  horizont: "horizontal", vertical: "vertical", subparietal: "subparietal",
  interm: "intermediário", prim: "primário", lunate: "semilunar", plane: "plano", septum: "septo",
  pellucidum: "pelúcido", falx: "foice", cerebri: "do cérebro", intermediolateral: "intermediolateral",
  intermediomedial: "intermediomedial", substance: "substância", reticular: "reticular", tectospinal: "tectoespinal",
  spinotectal: "espinotectal", rubrospinal: "rubroespinal", posterolateral: "posterolateral", sac: "saco",
  nasolacrimal: "nasolacrimal", soft: "mole",
  to: "para", and: "e", the: "o",
};

const anatomyHeadNouns: Record<string, { translated: string; gender: "m" | "f"; plural?: boolean }> = {
  artery: { translated: "artéria", gender: "f" }, arteries: { translated: "artérias", gender: "f", plural: true },
  vein: { translated: "veia", gender: "f" }, veins: { translated: "veias", gender: "f", plural: true },
  nerve: { translated: "nervo", gender: "m" }, nerves: { translated: "nervos", gender: "m", plural: true },
  branch: { translated: "ramo", gender: "m" }, branches: { translated: "ramos", gender: "m", plural: true },
  trunk: { translated: "tronco", gender: "m" }, root: { translated: "raiz", gender: "f" }, roots: { translated: "raízes", gender: "f", plural: true },
  plexus: { translated: "plexo", gender: "m" }, ganglion: { translated: "gânglio", gender: "m" }, division: { translated: "divisão", gender: "f" },
  gland: { translated: "glândula", gender: "f" }, glands: { translated: "glândulas", gender: "f", plural: true },
  duct: { translated: "ducto", gender: "m" }, bronchus: { translated: "brônquio", gender: "m" }, lung: { translated: "pulmão", gender: "m" },
  kidney: { translated: "rim", gender: "m" }, ventricle: { translated: "ventrículo", gender: "m" }, lobe: { translated: "lobo", gender: "m" },
  lobule: { translated: "lóbulo", gender: "m" }, segment: { translated: "segmento", gender: "m" }, canal: { translated: "canal", gender: "m" },
  sinus: { translated: "seio", gender: "m" }, gyrus: { translated: "giro", gender: "m" }, gyri: { translated: "giros", gender: "m", plural: true },
  sulcus: { translated: "sulco", gender: "m" }, sulci: { translated: "sulcos", gender: "m", plural: true }, nucleus: { translated: "núcleo", gender: "m" },
  tract: { translated: "trato", gender: "m" }, muscle: { translated: "músculo", gender: "m" }, body: { translated: "corpo", gender: "m" },
  aorta: { translated: "aorta", gender: "f" }, colon: { translated: "cólon", gender: "m" }, penis: { translated: "pênis", gender: "m" },
  atrium: { translated: "átrio", gender: "m" }, valve: { translated: "valva", gender: "f" }, network: { translated: "rede", gender: "f" },
  commissure: { translated: "comissura", gender: "f" }, matter: { translated: "substância", gender: "f" }, membrane: { translated: "membrana", gender: "f" },
  fasciculus: { translated: "fascículo", gender: "m" }, ganglia: { translated: "gânglios", gender: "m", plural: true },
  taenia: { translated: "tênia", gender: "f" }, pelvis: { translated: "pelve", gender: "f" },
  leaflet: { translated: "folheto", gender: "m" }, canaliculus: { translated: "canalículo", gender: "m" },
  chamber: { translated: "câmara", gender: "f" }, eyeball: { translated: "bulbo ocular", gender: "m" },
  horn: { translated: "corno", gender: "m" }, corpus: { translated: "corpo", gender: "m" }, dura: { translated: "dura-máter", gender: "f" },
  fibres: { translated: "fibras", gender: "f", plural: true }, iris: { translated: "íris", gender: "f" }, lens: { translated: "cristalino", gender: "m" },
  retina: { translated: "retina", gender: "f" }, sclera: { translated: "esclera", gender: "f" }, fossa: { translated: "fossa", gender: "f" },
  nodule: { translated: "nódulo", gender: "m" }, septum: { translated: "septo", gender: "m" }, substance: { translated: "substância", gender: "f" },
  sac: { translated: "saco", gender: "m" },
  arch: { translated: "arco", gender: "m" }, cord: { translated: "cordão", gender: "m" },
  part: { translated: "parte", gender: "f" }, nuclei: { translated: "núcleos", gender: "m", plural: true },
  tube: { translated: "tuba", gender: "f" }, peduncle: { translated: "pedúnculo", gender: "m" },
  chorda: { translated: "corda", gender: "f" }, cornea: { translated: "córnea", gender: "f" },
  cuneus: { translated: "cúneo", gender: "m" }, stria: { translated: "estria", gender: "f" },
  flocculus: { translated: "flóculo", gender: "m" }, fornix: { translated: "fórnix", gender: "m" },
  globus: { translated: "globo", gender: "m" }, colliculus: { translated: "colículo", gender: "m" },
  fis: { translated: "fissura", gender: "f" }, pole: { translated: "polo", gender: "m" },
  olive: { translated: "oliva", gender: "f" }, chiasm: { translated: "quiasma", gender: "m" },
  pyramid: { translated: "pirâmide", gender: "f" }, precuneus: { translated: "pré-cúneo", gender: "m" },
  telencephalon: { translated: "telencéfalo", gender: "m" },
  bulb: { translated: "bulbo", gender: "m" }, region: { translated: "região", gender: "f" },
  area: { translated: "área", gender: "f" }, cortex: { translated: "córtex", gender: "m" },
  complex: { translated: "complexo", gender: "m" }, group: { translated: "grupo", gender: "m" },
  surface: { translated: "superfície", gender: "f" }, impression: { translated: "impressão", gender: "f" },
  capsule: { translated: "cápsula", gender: "f" }, column: { translated: "coluna", gender: "f" },
  cartilage: { translated: "cartilagem", gender: "f" }, hilum: { translated: "hilo", gender: "m" },
  liver: { translated: "fígado", gender: "m" }, ligament: { translated: "ligamento", gender: "m" },
  bone: { translated: "osso", gender: "m" }, bones: { translated: "ossos", gender: "m", plural: true },
  skeleton: { translated: "esqueleto", gender: "m" }, system: { translated: "sistema", gender: "m" }, systems: { translated: "sistemas", gender: "m", plural: true },
  organ: { translated: "órgão", gender: "m" }, organs: { translated: "órgãos", gender: "m", plural: true }, thorax: { translated: "tórax", gender: "m" },
  rib: { translated: "costela", gender: "f" }, ribs: { translated: "costelas", gender: "f", plural: true },
  sternum: { translated: "esterno", gender: "m" }, vertebra: { translated: "vértebra", gender: "f" }, vertebrae: { translated: "vértebras", gender: "f", plural: true },
  scapula: { translated: "escápula", gender: "f" }, clavicle: { translated: "clavícula", gender: "f" }, humerus: { translated: "úmero", gender: "m" },
  radius: { translated: "rádio", gender: "m" }, ulna: { translated: "ulna", gender: "f" }, femur: { translated: "fêmur", gender: "m" },
  tibia: { translated: "tíbia", gender: "f" }, fibula: { translated: "fíbula", gender: "f" }, patella: { translated: "patela", gender: "f" },
  tendon: { translated: "tendão", gender: "m" }, tendons: { translated: "tendões", gender: "m", plural: true },
  sheath: { translated: "bainha", gender: "f" }, sheaths: { translated: "bainhas", gender: "f", plural: true },
  digit: { translated: "dedo", gender: "m" }, digits: { translated: "dedos", gender: "m", plural: true },
  muscles: { translated: "músculos", gender: "m", plural: true },
};

const anatomyAdjectiveKeys = new Set([
  "superior", "inferior", "upper", "lower", "anterior", "posterior", "medial", "lateral", "internal", "external", "common", "deep", "superficial", "middle",
  "central", "proper", "long", "free", "accessory", "ascending", "descending", "communicating", "perforating", "circumflex", "segmental", "lobar",
  "basal", "apical", "lingular", "septal", "pulmonary", "coronary", "cardiac", "cerebral", "cerebellar", "spinal", "brachial", "femoral", "ulnar",
  "radial", "tibial", "fibular", "axillary", "iliac", "renal", "hepatic", "mesenteric", "carotid", "subclavian", "intercostal", "thoracic",
  "lumbar", "phrenic", "suprarenal", "epigastric", "gluteal", "pudendal", "plantar", "dorsal", "palmar", "digital", "cutaneous", "collateral",
  "genicular", "interosseous", "metatarsal", "saphenous", "venous", "facial", "mental", "mandibular", "maxillary", "ophthalmic", "meningeal",
  "lacrimal", "optic", "oculomotor", "trigeminal", "vestibular", "cochlear", "lingual", "cervical", "temporal", "frontal", "parietal", "occipital",
  "orbital", "cingulate", "precentral", "postcentral", "transverse", "colic", "ileocolic", "testicular", "muscular", "parotid", "sublingual",
  "submandibular", "pancreatic", "urinary", "thyroid", "parathyroid", "seminal", "nasal", "iliolumbar", "labial", "alveolar", "ethmoidal",
  "humeral", "angular", "basilar", "carpal", "retromandibular", "jugular", "median", "subcostal", "intrarenal", "sigmoid", "submental",
  "sphenopalatine", "ciliary", "callosomarginal", "striate", "pontine", "vertebral", "musculophrenic", "suprascapular", "acromial",
  "thoracodorsal", "metacarpal", "recurrent", "calcaneal", "popliteal", "petrosal", "scapular", "subscapular", "palatine", "papillary",
  "brachiocephalic", "sacral", "atrioventricular", "semilunar", "interventricular", "splenic", "pancreaticoduodenal", "abdominal", "pharyngeal",
  "retinal", "proximal", "distal", "insular", "prefrontal", "frontobasal", "arterial", "pectoral", "arcuate", "tarsal", "patellar", "auricular",
  "sagittal", "cephalic", "cubital", "antebrachial", "basilic", "buccal", "obturator", "cavernous", "coeliac", "gastric", "gastroduodenal",
  "anorectal", "sural", "genitofemoral", "sympathetic", "occipitotemporal", "salivatory", "motor", "quadrangular", "paracentral", "intermediate",
  "gracile", "geniculate", "vestibulocochlear", "glossopharyngeal", "musculocutaneous", "iliohypogastric", "inguinal", "infrapatellar", "crural",
  "genital", "sciatic", "biventral", "opercular", "subcentral", "circular", "calcarine", "intraparietal", "supramarginal", "parahippocampal",
  "terminalis", "corticospinal", "vestibulospinal", "reticulospinal", "spinothalamic", "spinocerebellar", "sensory", "tympanic", "auditory",
  "suspensory", "zonular", "ejaculatory", "mesocolic", "omental", "vermiform", "anteromedial",
  "olfactory", "piriform", "bronchopulmonary", "diaphragmatic", "falciform", "outer", "bare", "round",
  "esophageal", "hepataduodenal", "tibialis", "fibularis",
  "deltoid", "pectoralis", "gluteus", "maximus", "medius",
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth",
  "true", "false", "floating",
]);

function agreeAnatomyAdjective(rawWord: string, translated: string, head: { gender: "m" | "f"; plural?: boolean } | undefined) {
  if (!head || !anatomyAdjectiveKeys.has(rawWord)) return translated;
  const feminine = head.gender === "f";
  const plural = Boolean(head.plural);
  if (/o$/i.test(translated)) return translated.replace(/o$/i, feminine ? (plural ? "as" : "a") : (plural ? "os" : "o"));
  if (/a$/i.test(translated)) return plural ? `${translated}s` : translated;
  if (!plural) return translated;
  if (/al$/i.test(translated)) return translated.replace(/al$/i, "ais");
  if (/el$/i.test(translated)) return translated.replace(/el$/i, "éis");
  if (/il$/i.test(translated)) return translated.replace(/il$/i, "is");
  if (/r$/i.test(translated)) return `${translated}es`;
  if (/m$/i.test(translated)) return translated.replace(/m$/i, "ns");
  if (/z$/i.test(translated)) return `${translated}es`;
  return `${translated}s`;
}

function translatedArticle(head: { gender: "m" | "f"; plural?: boolean } | undefined) {
  if (!head) return "de";
  if (head.plural) return head.gender === "f" ? "das" : "dos";
  return head.gender === "f" ? "da" : "do";
}

function translateSimpleAnatomyPhrase(value: string) {
  const words = value.replace(/[()'"]/g, "").trim().split(/\s+/).filter((word) => Boolean(word) && !/^(the|a|an)$/i.test(word));
  const sideIndex = words.findIndex((word) => /^(left|right)$/i.test(word));
  const side = sideIndex >= 0 ? words.splice(sideIndex, 1)[0].toLocaleLowerCase("en-US") : null;
  let headIndex = -1;
  for (let wordIndex = words.length - 1; wordIndex >= 0; wordIndex -= 1) {
    if (anatomyHeadNouns[words[wordIndex].toLocaleLowerCase("en-US")]) { headIndex = wordIndex; break; }
  }
  const rawHead = headIndex >= 0 ? words[headIndex].toLocaleLowerCase("en-US") : null;
  const head = rawHead ? anatomyHeadNouns[rawHead] : undefined;
  const exact = anatomyNameDictionary[words.join(" ").toLocaleLowerCase("en-US")];
  if (exact && !side) return exact;
  const ordered = headIndex >= 0 ? [words[headIndex], ...words.slice(0, headIndex).reverse(), ...words.slice(headIndex + 1)] : words;
  const translated = ordered.map((word) => {
    const normalizedWord = word.toLocaleLowerCase("en-US");
    return agreeAnatomyAdjective(normalizedWord, anatomyWordDictionary[normalizedWord] ?? word, head);
  }).join(" ");
  if (!side) return translated;
  const feminine = head?.gender === "f";
  const plural = Boolean(head?.plural);
  const ending = side === "left" ? (feminine ? (plural ? "esquerdas" : "esquerda") : (plural ? "esquerdos" : "esquerdo")) : (feminine ? (plural ? "direitas" : "direita") : (plural ? "direitos" : "direito"));
  return `${translated} ${ending}`;
}

function translateCompoundAnatomyPhrase(value: string) {
  const toParts = value.split(/\s+to\s+/i);
  if (toParts.length === 2) return `${translateSimpleAnatomyPhrase(toParts[0])} para o ${translateSimpleAnatomyPhrase(toParts[1]).toLocaleLowerCase("pt-BR")}`;
  const parts = value.split(/\s+of\s+/i);
  let translated = translateSimpleAnatomyPhrase(parts[0]);
  for (const relation of parts.slice(1)) {
    const relationWords = relation.replace(/[()'"]/g, "").trim().split(/\s+/);
    const relationHead = [...relationWords].reverse().map((word) => anatomyHeadNouns[word.toLocaleLowerCase("en-US")]).find(Boolean);
    const relationTranslation = translateSimpleAnatomyPhrase(relation);
    translated += ` ${translatedArticle(relationHead)} ${relationTranslation.charAt(0).toLocaleLowerCase("pt-BR")}${relationTranslation.slice(1)}`;
  }
  return translated;
}

// Exportada para os testes de nomenclatura; não é um componente React.
// eslint-disable-next-line react-refresh/only-export-components
export function translateAnatomyName(rawName: string, layer: DenseAnatomyLayer | "organs", index: number) {
  const normalizedSourceName = rawName.replace(/^VH_[FM]_/i, "").replace(/^Allen_/i, "");
  const rawSide = normalizedSourceName.match(/(?:[._*\s)]([lr]))[.\s]*$/i)?.[1];
  const cleaned = normalizedSourceName
    .replace(/(?:[._*\s)]([lr]))[.\s]*$/i, "")
    .replace(/\*/g, "")
    .replace(/[.]+$/g, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\buppe\b/gi, "upper")
    .replace(/\blowe\b/gi, "lower")
    .replace(/\bsegmennt\b|\bsegm\b/gi, "segment")
    .replace(/\bsegment(\d+)\b/gi, "segment $1")
    .replace(/\bbronchi\b/gi, "bronchus")
    .replace(/^\((.*)\)$/, "$1")
    .trim();
  const explicitSide = rawSide;
  const compactCandidate = explicitSide ? null : cleaned.match(/([lr])$/i);
  const compactCandidateBase = compactCandidate ? cleaned.slice(0, -1).trim() : "";
  const compactCandidateWords = compactCandidateBase.replace(/[()'"-]/g, " ").trim().split(/\s+/).map((word) => word.toLocaleLowerCase("en-US"));
  const compactCandidateLastWord = compactCandidateWords.at(-1) ?? "";
  const compactSide = compactCandidate && (anatomyHeadNouns[compactCandidateLastWord] || anatomyNameDictionary[compactCandidateBase.toLocaleLowerCase("en-US")]) ? compactCandidate[1] : undefined;
  const sideCode = explicitSide ?? compactSide;
  const withoutSide = compactSide ? cleaned.slice(0, -1) : cleaned;
  const indexedRenalPyramid = withoutSide.match(/^renal pyramid ([lr])(?: ([a-z]))?$/i);
  if (indexedRenalPyramid) {
    const sideName = indexedRenalPyramid[1].toLocaleLowerCase("en-US") === "l" ? "esquerda" : "direita";
    const suffix = indexedRenalPyramid[2] ? ` ${indexedRenalPyramid[2].toLocaleUpperCase("pt-BR")}` : "";
    return `Pirâmide renal ${sideName}${suffix}`;
  }
  const sideWords = withoutSide.replace(/[()'"-]/g, " ").trim().split(/\s+/);
  const sideHead = [...sideWords].reverse().map((word) => anatomyHeadNouns[word.toLocaleLowerCase("en-US")]).find(Boolean);
  const feminineSide = sideHead?.gender === "f";
  const pluralSide = Boolean(sideHead?.plural);
  const side = sideCode?.toLocaleLowerCase() === "l"
    ? ` ${feminineSide ? (pluralSide ? "esquerdas" : "esquerda") : (pluralSide ? "esquerdos" : "esquerdo")}`
    : sideCode?.toLocaleLowerCase() === "r"
      ? ` ${feminineSide ? (pluralSide ? "direitas" : "direita") : (pluralSide ? "direitos" : "direito")}`
      : "";
  const exactKey = withoutSide.replace(/[()'"]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
  const exact = anatomyNameDictionary[exactKey];
  if (exact) return `${exact}${side}`;
  const segment = withoutSide.replace(/[()'"]/g, "").match(/^(.*?)\s+([a-z]+\d+)-segment$/i);
  if (segment) {
    const translatedBase = translateCompoundAnatomyPhrase(segment[1]);
    const capitalizedBase = `${translatedBase.charAt(0).toLocaleUpperCase("pt-BR")}${translatedBase.slice(1)}`;
    return `${capitalizedBase} — segmento ${segment[2].toLocaleUpperCase("pt-BR")}${side}`;
  }
  if (/^mesh(?:\.\d+)?$/i.test(withoutSide)) return layer === "organs" ? `Estrutura visceral ${index + 1}` : `Estrutura anatômica ${index + 1}`;
  const translated = translateCompoundAnatomyPhrase(withoutSide);
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
  const modelName = normalize(`${mesh.userData.nameDetail ?? ""} ${mesh.userData.name ?? ""} ${realMeshAnatomyName(mesh)}`);
  return patterns.some((pattern) => modelName.includes(pattern));
}

function realMeshAnatomyName(mesh: Mesh) {
  let current: Object3D | null = mesh;
  while (current) {
    const structureId = current.userData.structureId;
    if (typeof structureId === "string" && structureId.trim()) return structureId;
    current = current.parent;
  }
  return String(mesh.userData.anatomyName || mesh.userData.nameDetail || mesh.userData.name || mesh.name || "");
}

function realMeshAnatomyType(mesh: Mesh): "bone" | "muscle" {
  return (mesh.userData.anatomyType || mesh.userData.type) === "bone" ? "bone" : "muscle";
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
  return "Anatomia interna segmentada";
}

function organViewDescription(mode: OrganViewMode) {
  if (mode === "context") return "Mantém os demais órgãos para estudar relações espaciais.";
  if (mode === "isolated") return "Remove o entorno e permite rotação livre de toda a superfície da malha.";
  if (mode === "section") return "Recorta a malha pelo plano escolhido. Só revela volumes realmente presentes no arquivo 3D.";
  return "No coração, troca a superfície pelo modelo NIH segmentado em câmaras, septo, valvas e músculos papilares reais.";
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
  const sourceIsEnglish = /\b(the|is|are|of|and|which|bone|muscle)\b/i.test(cleaned);
  if (cleaned.length > 80 && !sourceIsEnglish) return `${cleaned.slice(0, 360).trim()}${cleaned.length > 360 ? "…" : ""}`;
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
