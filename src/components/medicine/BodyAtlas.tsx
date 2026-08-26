import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, ChevronLeft, ChevronRight, ExternalLink, Info, Maximize2, Move, Rotate3D, RotateCcw, Search, Volume2, X, ZoomIn, ZoomOut } from "lucide-react";
import { organ3DStructureForAtlasId } from "@/lib/anatomy3DModel";
import { findAtlasSnapTarget } from "@/lib/anatomyAtlasNavigation";
import { preloadMedicalImages } from "@/lib/medicineMedia";
import {
  anatomyPositionFor,
  anatomyStructures,
  atlasImageFor,
  atlasCoverageByLayer,
  bodyLayers,
  medicineLevelProfiles,
  medicalSources,
  preferredAnatomyView,
  structureMatchesAtlasBodyProfile,
  type AnatomyStructure,
  type AtlasBodyProfile,
  type AtlasView,
  type BodyLayer,
  type MedicineLevel,
} from "@/lib/medicineData";

interface BodyAtlasProps {
  level: MedicineLevel;
  activeLayer: BodyLayer;
  onLayerChange: (layer: BodyLayer) => void;
  selected: AnatomyStructure | null;
  onSelect: (structure: AnatomyStructure) => void;
  onOpen3D?: (structureId: string) => void;
}

const levelOrder: MedicineLevel[] = ["Iniciante", "Ciclo básico", "Ciclo clínico", "Internato", "Residência"];

export function BodyAtlas({ level, activeLayer, onLayerChange, selected, onSelect, onOpen3D }: BodyAtlasProps) {
  const [bodyProfile, setBodyProfile] = useState<AtlasBodyProfile>("male");
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<AtlasView>("anterior");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState<{ structure: AnatomyStructure; view: AtlasView } | null>(null);
  const [detailZoom, setDetailZoom] = useState(3);
  const [detailPan, setDetailPan] = useState({ x: 0, y: 0 });
  const [isDetailPanning, setIsDetailPanning] = useState(false);
  const [snapCandidate, setSnapCandidate] = useState<AnatomyStructure | null>(null);
  const detailDragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const detailPanRef = useRef({ x: 0, y: 0 });
  const detailImageRef = useRef<HTMLImageElement | null>(null);
  const structuresInLayer = useMemo(
    () => anatomyStructures.filter((item) => item.layer === activeLayer && structureMatchesBodyProfile(item, bodyProfile)),
    [activeLayer, bodyProfile],
  );
  const selectedInProfile = selected && structureMatchesBodyProfile(selected, bodyProfile) ? selected : null;
  const visibleStructures = useMemo(
    () => structuresInLayer.filter((item) => anatomyPositionFor(item, view)),
    [structuresInLayer, view],
  );
  const filteredStructures = useMemo(() => {
    const term = normalizeSearch(query);
    if (!term) return visibleStructures;
    return visibleStructures.filter((structure) => normalizeSearch([
      structure.name,
      structure.latin ?? "",
      structure.region,
      ...structure.synonyms,
    ].join(" ")).includes(term));
  }, [query, visibleStructures]);
  const atlasImage = atlasImageFor(activeLayer, view, bodyProfile);
  const levelProfile = medicineLevelProfiles[level];
  const levelRank = levelOrder.indexOf(level);
  const activeCoverage = atlasCoverageByLayer[activeLayer];
  const canvasPinLimit = [28, 36, 46, 58, 72][Math.max(levelRank, 0)];
  const canvasStructures = useMemo(() => {
    if (query.trim() || zoom >= 1.25 || filteredStructures.length <= canvasPinLimit) return filteredStructures;
    const selectedStructure = selectedInProfile && filteredStructures.some((item) => item.id === selectedInProfile.id)
      ? selectedInProfile
      : filteredStructures[0];
    if (!selectedStructure) return [];
    const remaining = filteredStructures.filter((item) => item.id !== selectedStructure.id);
    const slots = Math.max(canvasPinLimit - 1, 1);
    const sampled = Array.from({ length: Math.min(slots, remaining.length) }, (_, index) => (
      remaining[Math.min(Math.floor(index * remaining.length / slots), remaining.length - 1)]
    ));
    return [selectedStructure, ...Array.from(new Map(sampled.map((item) => [item.id, item])).values())];
  }, [canvasPinLimit, filteredStructures, query, selectedInProfile, zoom]);

  useEffect(() => {
    const selectedIsAvailable = selectedInProfile?.layer === activeLayer && anatomyPositionFor(selectedInProfile, view);
    if (!selectedIsAvailable) {
      const next = structuresInLayer.find((structure) => anatomyPositionFor(structure, view)) ?? structuresInLayer[0];
      if (next) onSelect(next);
    }
  }, [activeLayer, onSelect, selectedInProfile, structuresInLayer, view]);

  useEffect(() => {
    const otherView: AtlasView = view === "anterior" ? "posterior" : "anterior";
    void preloadMedicalImages([
      atlasImage,
      atlasImageFor(activeLayer, otherView, bodyProfile),
      activeLayer === "organs" ? atlasImageFor(activeLayer, view, bodyProfile === "male" ? "female" : "male") : null,
    ], "high");
  }, [activeLayer, atlasImage, bodyProfile, view]);

  useEffect(() => {
    if (!focused) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocused(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [focused]);

  const selectLayer = (layer: BodyLayer) => {
    setFocused(null);
    onLayerChange(layer);
    setQuery("");
    const structures = anatomyStructures.filter((item) => item.layer === layer && structureMatchesBodyProfile(item, bodyProfile));
    const firstStructure = structures.find((item) => anatomyPositionFor(item, view)) ?? structures[0];
    if (firstStructure) onSelect(firstStructure);
  };

  const changeView = () => {
    setFocused(null);
    const nextView: AtlasView = view === "anterior" ? "posterior" : "anterior";
    setView(nextView);
    const selectedIsVisible = selectedInProfile?.layer === activeLayer && anatomyPositionFor(selectedInProfile, nextView);
    if (!selectedIsVisible) {
      const firstVisible = structuresInLayer.find((item) => anatomyPositionFor(item, nextView));
      if (firstVisible) onSelect(firstVisible);
    }
  };

  const changeBodyProfile = (profile: AtlasBodyProfile) => {
    setBodyProfile(profile);
    setQuery("");
    setFocused(null);
    const next = anatomyStructures.find((structure) => structure.layer === activeLayer && structureMatchesBodyProfile(structure, profile) && anatomyPositionFor(structure, view));
    if (next) onSelect(next);
  };

  const openDetail = (structure: AnatomyStructure, requestedView: AtlasView = view) => {
    const detailView = anatomyPositionFor(structure, requestedView) ? requestedView : preferredAnatomyView(structure);
    onSelect(structure);
    setDetailZoom(3);
    detailPanRef.current = { x: 0, y: 0 };
    setDetailPan({ x: 0, y: 0 });
    setSnapCandidate(structure);
    setFocused({ structure, view: detailView });
  };

  const navigateDetail = useCallback((direction: -1 | 1) => {
    if (!focused) return;
    const structures = anatomyStructures.filter((structure) => structure.layer === focused.structure.layer && structureMatchesBodyProfile(structure, bodyProfile) && anatomyPositionFor(structure, focused.view));
    const currentIndex = structures.findIndex((structure) => structure.id === focused.structure.id);
    const nextIndex = (Math.max(currentIndex, 0) + direction + structures.length) % structures.length;
    const nextStructure = structures[nextIndex];
    onSelect(nextStructure);
    setDetailZoom(3);
    detailPanRef.current = { x: 0, y: 0 };
    setDetailPan({ x: 0, y: 0 });
    setSnapCandidate(nextStructure);
    setFocused({ structure: nextStructure, view: focused.view });
  }, [bodyProfile, focused, onSelect]);

  useEffect(() => {
    if (!focused) return;
    const navigateWithKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        navigateDetail(event.key === "ArrowLeft" ? -1 : 1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        detailPanRef.current = { x: 0, y: 0 };
        setDetailPan({ x: 0, y: 0 });
        setDetailZoom(3);
        setSnapCandidate(focused.structure);
      }
    };
    window.addEventListener("keydown", navigateWithKeyboard);
    return () => window.removeEventListener("keydown", navigateWithKeyboard);
  }, [focused, navigateDetail]);

  const changeDetailView = () => {
    if (!focused) return;
    const nextView: AtlasView = focused.view === "anterior" ? "posterior" : "anterior";
    if (!anatomyPositionFor(focused.structure, nextView)) return;
    setDetailZoom(3);
    detailPanRef.current = { x: 0, y: 0 };
    setDetailPan({ x: 0, y: 0 });
    setSnapCandidate(focused.structure);
    setFocused({ ...focused, view: nextView });
  };

  const resetDetailViewport = () => {
    setDetailZoom(3);
    detailPanRef.current = { x: 0, y: 0 };
    setDetailPan({ x: 0, y: 0 });
    setSnapCandidate(focused?.structure ?? null);
  };

  const focusedPosition = focused ? anatomyPositionFor(focused.structure, focused.view) : null;
  const focusedLayer = focused ? bodyLayers.find((layer) => layer.id === focused.structure.layer) : null;
  const otherDetailView: AtlasView | null = focused ? (focused.view === "anterior" ? "posterior" : "anterior") : null;
  const canChangeDetailView = Boolean(focused && otherDetailView && anatomyPositionFor(focused.structure, otherDetailView));
  const focused3DStructureId = focused ? organ3DStructureForAtlasId(focused.structure.id) : null;

  const findDetailSnapCandidate = (pan: { x: number; y: number }) => {
    if (!focused || !focusedPosition || !detailImageRef.current) return null;
    const points = anatomyStructures.flatMap((structure) => {
      if (structure.layer !== focused.structure.layer || !structureMatchesBodyProfile(structure, bodyProfile)) return [];
      const position = anatomyPositionFor(structure, focused.view);
      return position ? [{ ...position, id: structure.id, structure }] : [];
    });
    return findAtlasSnapTarget({
      points,
      focusedPoint: { id: focused.structure.id, ...focusedPosition },
      pan,
      imageSize: { width: detailImageRef.current.offsetWidth, height: detailImageRef.current.offsetHeight },
      threshold: 68,
    })?.structure ?? null;
  };

  const snapDetailToClosest = () => {
    if (!focused) return;
    const target = findDetailSnapCandidate(detailPanRef.current);
    setSnapCandidate(target);
    if (!target) return;
    onSelect(target);
    detailPanRef.current = { x: 0, y: 0 };
    setDetailPan({ x: 0, y: 0 });
    setFocused({ structure: target, view: focused.view });
  };

  return <>
    <section className="med-atlas-shell" aria-label="Atlas anatômico visual interativo">
      <div className="med-atlas-topbar">
        <div>
          <span className="med-eyebrow">Atlas imersivo 2D</span>
          <h2>Explore por camadas</h2>
          <p>Ilustrações anatômicas em alta definição. Toque em um marcador ou nome para selecionar; a ampliação abre somente pelo botão “Abrir em detalhe”.</p>
          <div className="med-atlas-level-context" aria-live="polite"><span>{level}</span><strong>{levelProfile.title}</strong><small>{levelProfile.atlasDescription}</small></div>
        </div>
        <div className="med-atlas-controls">
          <button onClick={() => setZoom((value) => Math.max(0.8, value - 0.1))} aria-label="Diminuir zoom"><ZoomOut /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))} aria-label="Aumentar zoom"><ZoomIn /></button>
          <button className="wide" onClick={changeView}><RotateCcw /> {view === "anterior" ? "Anterior" : "Posterior"}</button>
          <a className="wide" href="https://www.openanatomy.org/atlas-pages/" target="_blank" rel="noreferrer"><Box /> Atlas validado <ExternalLink /></a>
        </div>
      </div>

      <div className="med-atlas-profile-strip" aria-label="Perfil anatômico do atlas">
        <div className="med-atlas-profile-options" role="group" aria-label="Escolher anatomia masculina ou feminina">
          <button className={bodyProfile === "male" ? "active" : ""} onClick={() => changeBodyProfile("male")} aria-label="Homem" title="Homem" aria-pressed={bodyProfile === "male"}><span aria-hidden="true">♂</span></button>
          <button className={bodyProfile === "female" ? "active" : ""} onClick={() => changeBodyProfile("female")} aria-label="Mulher" title="Mulher" aria-pressed={bodyProfile === "female"}><span aria-hidden="true">♀</span></button>
        </div>
      </div>

      <div className="med-atlas-body">
        <nav className="med-layer-rail" aria-label="Camadas do corpo">
          <div className="med-layer-list">
            {bodyLayers.map((layer) => {
              const total = anatomyStructures.filter((structure) => structure.layer === layer.id && structureMatchesBodyProfile(structure, bodyProfile)).length;
              return <button key={layer.id} className={activeLayer === layer.id ? "active" : ""} onClick={() => selectLayer(layer.id)}>
                <span className="dot" style={{ background: layer.color }} />
                <span><strong>{layer.label}</strong><small>{layer.description}</small></span>
                <b title={`${total} itens cadastrados nesta camada do atlas`}><strong>{total}</strong><small>no atlas</small></b>
              </button>;
            })}
          </div>
          <div className="med-atlas-coverage-note" aria-live="polite">
            <Info />
            <div>
              <strong>{structuresInLayer.length} itens catalogados — não é o total do corpo</strong>
              <span>{activeCoverage.humanReference} {activeCoverage.catalogNote}</span>
              <div>{activeCoverage.sourceIds.map((sourceId, index) => <a key={sourceId} href={medicalSources[sourceId].url} target="_blank" rel="noreferrer">{index === 0 ? "Referência" : `Fonte ${index + 1}`} <ExternalLink /></a>)}</div>
            </div>
          </div>
          <div className="med-atlas-index">
            <label>
              <Search />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar estrutura" aria-label="Buscar estrutura nesta camada" />
            </label>
            <div className="med-atlas-index-meta"><strong>{filteredStructures.length}</strong><span>na vista {view}</span></div>
            <div className="med-atlas-structure-list">
              {filteredStructures.map((structure) => (
                <button key={structure.id} className={selectedInProfile?.id === structure.id ? "active" : ""} onClick={() => onSelect(structure)}>
                  <span>{structure.name}</span><small>{structure.region}</small>
                </button>
              ))}
              {!filteredStructures.length && <p>Nenhuma estrutura encontrada nesta vista.</p>}
            </div>
          </div>
        </nav>

        <div className="med-body-stage">
          <div className="med-scan-grid" />
          <div className="med-body-viewport" style={{ transform: `scale(${zoom})` }}>
            <img
              key={atlasImage}
              className="med-body-image"
              src={atlasImage}
              alt={`Ilustração educacional do corpo humano ${bodyProfile === "female" ? "feminino" : "masculino"}, vista ${view}, camada ${activeLayer}`}
              decoding="async"
              draggable={false}
            />
            {canvasStructures.map((structure) => {
              const position = anatomyPositionFor(structure, view);
              if (!position) return null;
              return <button
                key={structure.id}
                className={`med-anatomy-pin ${selectedInProfile?.id === structure.id ? "active" : ""}`}
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
                onClick={() => onSelect(structure)}
                aria-label={`Selecionar ${structure.name}`}
                data-label={structure.name}
              ><span /></button>;
            })}
          </div>
          {canvasStructures.length < filteredStructures.length && <span className="med-atlas-density-note">
            {canvasStructures.length} de {filteredStructures.length} pontos visíveis · aproxime para revelar todos
          </span>}
          <span className="med-atlas-image-note">Ilustração educacional gerada · não diagnóstica</span>
          <div className="med-orientation"><span>D</span><strong>{view === "anterior" ? "ANTERIOR" : "POSTERIOR"}</strong><span>E</span></div>
        </div>

        <aside className="med-structure-panel">
          {selectedInProfile ? <>
            <span className="med-eyebrow">{selectedInProfile.region}</span>
            <h3>{selectedInProfile.name}</h3>
            {selectedInProfile.latin && levelRank >= 1 && <em>{selectedInProfile.latin}</em>}
            <p>{selectedInProfile.summary}</p>
            <dl>
              <div><dt>Função</dt><dd>{selectedInProfile.function}</dd></div>
              {levelRank >= 1 && <div><dt>Relações</dt><dd>{selectedInProfile.relations}</dd></div>}
              {levelRank >= 2 && <div><dt>Estruturas próximas</dt><dd>{selectedInProfile.nearby.length ? selectedInProfile.nearby.join(" · ") : "Consulte a fonte e as vistas regionais para relações de proximidade."}</dd></div>}
            </dl>
            <div className="med-structure-actions"><button className="detail" onClick={() => openDetail(selectedInProfile)}><Maximize2 /> Abrir em detalhe</button><button onClick={() => speakStructure(selectedInProfile.name)}><Volume2 /> Ouvir nome</button><a href={medicalSourceUrl(selectedInProfile.sourceId)} target="_blank" rel="noreferrer">Ver fonte anatômica <ExternalLink /></a></div>
          </> : <div className="med-empty-selection"><Search /><h3>Selecione uma estrutura</h3><p>Os pontos ativos mudam conforme a camada escolhida.</p></div>}
        </aside>
      </div>
    </section>
    {focused && focusedPosition && createPortal(
      <div className="med-anatomy-focus-root">
        <button className="med-anatomy-focus-backdrop" onClick={() => setFocused(null)} aria-label="Fechar detalhe anatômico" />
        <section className="med-anatomy-focus-dialog" role="dialog" aria-modal="true" aria-labelledby="med-anatomy-focus-title">
          <header>
            <div>
              <span className="med-eyebrow">{focusedLayer?.label} · vista {focused.view}</span>
              <h2 id="med-anatomy-focus-title">{focused.structure.name}</h2>
              {focused.structure.latin && <em>{focused.structure.latin}</em>}
            </div>
            <button className="med-anatomy-focus-close" onClick={() => setFocused(null)} aria-label="Fechar detalhe"><X /></button>
          </header>

          <div className="med-anatomy-focus-body">
            <div className="med-anatomy-focus-visual">
              <div className="med-anatomy-focus-toolbar">
                <button onClick={() => setDetailZoom((value) => Math.max(2.2, value - 0.4))} aria-label="Diminuir ampliação"><ZoomOut /></button>
                <strong>{Math.round(detailZoom * 100)}%</strong>
                <button onClick={() => setDetailZoom((value) => Math.min(5.4, value + 0.4))} aria-label="Aumentar ampliação"><ZoomIn /></button>
                <button className="wide" onClick={resetDetailViewport}><RotateCcw /> Centralizar</button>
                <button className="wide" onClick={changeDetailView} disabled={!canChangeDetailView}><Maximize2 /> {otherDetailView === "anterior" ? "Ver anterior" : "Ver posterior"}</button>
              </div>

              <div
                className={`med-anatomy-focus-canvas ${isDetailPanning ? "is-panning" : ""}`}
                onWheel={(event) => setDetailZoom((value) => Math.min(5.4, Math.max(2.2, value + (event.deltaY < 0 ? 0.25 : -0.25))))}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  detailDragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
                  setIsDetailPanning(true);
                }}
                onPointerMove={(event) => {
                  const drag = detailDragRef.current;
                  if (!drag || drag.pointerId !== event.pointerId) return;
                  const deltaX = event.clientX - drag.x;
                  const deltaY = event.clientY - drag.y;
                  drag.x = event.clientX;
                  drag.y = event.clientY;
                  const maxX = Math.max(100, event.currentTarget.clientWidth * (detailZoom - 1) * .25);
                  const maxY = Math.max(140, event.currentTarget.clientHeight * (detailZoom - 1) * .5);
                  const nextPan = {
                    x: Math.min(maxX, Math.max(-maxX, detailPanRef.current.x + deltaX)),
                    y: Math.min(maxY, Math.max(-maxY, detailPanRef.current.y + deltaY)),
                  };
                  detailPanRef.current = nextPan;
                  setDetailPan(nextPan);
                  setSnapCandidate(findDetailSnapCandidate(nextPan));
                }}
                onPointerUp={(event) => {
                  if (detailDragRef.current?.pointerId !== event.pointerId) return;
                  detailDragRef.current = null;
                  setIsDetailPanning(false);
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                  snapDetailToClosest();
                }}
                onPointerCancel={() => {
                  detailDragRef.current = null;
                  setIsDetailPanning(false);
                }}
                onLostPointerCapture={() => {
                  detailDragRef.current = null;
                  setIsDetailPanning(false);
                }}
                onDoubleClick={resetDetailViewport}
                onKeyDown={(event) => {
                  const directions: Record<string, { x: number; y: number }> = {
                    ArrowUp: { x: 0, y: 40 }, ArrowDown: { x: 0, y: -40 },
                  };
                  const direction = directions[event.key];
                  if (!direction) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const nextPan = { x: detailPanRef.current.x + direction.x, y: detailPanRef.current.y + direction.y };
                  detailPanRef.current = nextPan;
                  setDetailPan(nextPan);
                  setSnapCandidate(findDetailSnapCandidate(nextPan));
                }}
                tabIndex={0}
                aria-label={`Ampliação de ${focused.structure.name} na vista ${focused.view}`}
                aria-describedby="med-anatomy-drag-help"
              >
                <div className="med-anatomy-focus-grid" />
                <img
                  ref={detailImageRef}
                  key={`${focused.structure.layer}-${focused.view}`}
                  src={atlasImageFor(focused.structure.layer, focused.view, bodyProfile)}
                  alt={`Ampliação anatômica educacional de ${focused.structure.name}`}
                  decoding="async"
                  style={{
                    height: `${detailZoom * 100}%`,
                    left: `calc(50% + ${detailPan.x}px)`,
                    top: `calc(50% + ${detailPan.y}px)`,
                    transform: `translate(-${focusedPosition.x}%, -${focusedPosition.y}%)`,
                  }}
                  draggable={false}
                />
                <div className={`med-anatomy-focus-reticle ${snapCandidate ? "is-locked" : ""}`} aria-hidden="true"><span /><i /><strong>{snapCandidate?.name ?? "Procure uma estrutura"}</strong></div>
                <div id="med-anatomy-drag-help" className={`med-anatomy-focus-drag-help ${snapCandidate ? "is-locked" : ""}`} aria-live="polite"><Move /> {isDetailPanning ? (snapCandidate ? `Solte para abrir ${snapCandidate.name}` : "Aproxime o alvo de uma estrutura") : "Arraste; o alvo gruda na estrutura mais próxima"}</div>
                <div className="med-anatomy-focus-caption"><strong>{focused.structure.name}</strong><span>{focused.structure.region}</span></div>
              </div>

              <footer>
                <button onClick={() => navigateDetail(-1)} title="Também disponível na seta esquerda"><ChevronLeft /> Estrutura anterior</button>
                <span>← anterior · arraste e solte para identificar · próxima →</span>
                <button onClick={() => navigateDetail(1)} title="Também disponível na seta direita">Próxima estrutura <ChevronRight /></button>
              </footer>
            </div>

            <aside className="med-anatomy-focus-info">
              <span className="med-eyebrow">{focused.structure.region}</span>
              <h3>{focused.structure.name}</h3>
              <p>{focused.structure.summary}</p>
              <dl>
                <div><dt>Função</dt><dd>{focused.structure.function}</dd></div>
                <div><dt>Relações</dt><dd>{focused.structure.relations}</dd></div>
                <div><dt>Estruturas próximas</dt><dd>{focused.structure.nearby.length ? focused.structure.nearby.join(" · ") : "Aprofunde as relações na fonte anatômica vinculada."}</dd></div>
              </dl>
              <div className="med-anatomy-focus-actions">
                {focused3DStructureId && onOpen3D && <button className="med-anatomy-open-3d" onClick={() => {
                  setFocused(null);
                  onOpen3D(focused3DStructureId);
                }}><Rotate3D /> Isolar órgão em 3D</button>}
                <button onClick={() => speakStructure(focused.structure.name)}><Volume2 /> Ouvir nome</button>
                <a href={medicalSourceUrl(focused.structure.sourceId)} target="_blank" rel="noreferrer">Conferir fonte <ExternalLink /></a>
              </div>
              <small>Ampliação do modelo anatômico educacional padrão.</small>
            </aside>
          </div>
        </section>
      </div>,
      document.body,
    )}
  </>;
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function structureMatchesBodyProfile(structure: AnatomyStructure, profile: AtlasBodyProfile) {
  return structureMatchesAtlasBodyProfile(structure, profile);
}

function medicalSourceUrl(sourceId: string) {
  return medicalSources[sourceId]?.url ?? medicalSources.openAnatomy.url;
}

function speakStructure(name: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(name);
  utterance.lang = "pt-BR";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}
