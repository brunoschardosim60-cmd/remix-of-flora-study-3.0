import { useMemo, useState } from "react";
import { Box, ExternalLink, RotateCcw, Search, Volume2, ZoomIn, ZoomOut } from "lucide-react";
import {
  anatomyPositionFor,
  anatomyStructures,
  bodyLayers,
  medicineLevelProfiles,
  medicalSources,
  type AnatomyStructure,
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
}

const levelOrder: MedicineLevel[] = ["Iniciante", "Ciclo básico", "Ciclo clínico", "Internato", "Residência"];

export function BodyAtlas({ level, activeLayer, onLayerChange, selected, onSelect }: BodyAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<AtlasView>("anterior");
  const [query, setQuery] = useState("");
  const structuresInLayer = useMemo(() => anatomyStructures.filter((item) => item.layer === activeLayer), [activeLayer]);
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
  const atlasImage = `/medicine/atlas/${activeLayer}-${view}-v2.png`;
  const levelProfile = medicineLevelProfiles[level];
  const levelRank = levelOrder.indexOf(level);

  const selectLayer = (layer: BodyLayer) => {
    onLayerChange(layer);
    setQuery("");
    const structures = anatomyStructures.filter((item) => item.layer === layer);
    const firstStructure = structures.find((item) => anatomyPositionFor(item, view)) ?? structures[0];
    if (firstStructure) onSelect(firstStructure);
  };

  const changeView = () => {
    const nextView: AtlasView = view === "anterior" ? "posterior" : "anterior";
    setView(nextView);
    const selectedIsVisible = selected?.layer === activeLayer && anatomyPositionFor(selected, nextView);
    if (!selectedIsVisible) {
      const firstVisible = structuresInLayer.find((item) => anatomyPositionFor(item, nextView));
      if (firstVisible) onSelect(firstVisible);
    }
  };

  return (
    <section className="med-atlas-shell" aria-label="Atlas anatômico visual interativo">
      <div className="med-atlas-topbar">
        <div>
          <span className="med-eyebrow">Atlas imersivo 2D</span>
          <h2>Explore por camadas</h2>
          <p>Ilustrações anatômicas em alta definição. Conteúdo educacional — confirme detalhes nas fontes vinculadas.</p>
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

      <div className="med-atlas-body">
        <nav className="med-layer-rail" aria-label="Camadas do corpo">
          <div className="med-layer-list">
            {bodyLayers.map((layer) => {
              const total = anatomyStructures.filter((structure) => structure.layer === layer.id).length;
              return <button key={layer.id} className={activeLayer === layer.id ? "active" : ""} onClick={() => selectLayer(layer.id)}>
                <span className="dot" style={{ background: layer.color }} />
                <span><strong>{layer.label}</strong><small>{layer.description}</small></span>
                <b>{total}</b>
              </button>;
            })}
          </div>
          <div className="med-atlas-index">
            <label>
              <Search />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar estrutura" aria-label="Buscar estrutura nesta camada" />
            </label>
            <div className="med-atlas-index-meta"><strong>{filteredStructures.length}</strong><span>na vista {view}</span></div>
            <div className="med-atlas-structure-list">
              {filteredStructures.map((structure) => (
                <button key={structure.id} className={selected?.id === structure.id ? "active" : ""} onClick={() => onSelect(structure)}>
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
              alt={`Ilustração educacional do corpo humano, vista ${view}, camada ${activeLayer}`}
              draggable={false}
            />
            {filteredStructures.map((structure) => {
              const position = anatomyPositionFor(structure, view);
              if (!position) return null;
              return <button
                key={structure.id}
                className={`med-anatomy-pin ${selected?.id === structure.id ? "active" : ""}`}
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
                onClick={() => onSelect(structure)}
                aria-label={`Selecionar ${structure.name}`}
                data-label={structure.name}
              ><span /></button>;
            })}
          </div>
          <span className="med-atlas-image-note">Ilustração educacional gerada · não diagnóstica</span>
          <div className="med-orientation"><span>D</span><strong>{view === "anterior" ? "ANTERIOR" : "POSTERIOR"}</strong><span>E</span></div>
        </div>

        <aside className="med-structure-panel">
          {selected ? <>
            <span className="med-eyebrow">{selected.region}</span>
            <h3>{selected.name}</h3>
            {selected.latin && levelRank >= 1 && <em>{selected.latin}</em>}
            <p>{selected.summary}</p>
            <dl>
              <div><dt>Função</dt><dd>{selected.function}</dd></div>
              {levelRank >= 1 && <div><dt>Relações</dt><dd>{selected.relations}</dd></div>}
              {levelRank >= 2 && <div><dt>Estruturas próximas</dt><dd>{selected.nearby.length ? selected.nearby.join(" · ") : "Consulte a fonte e as vistas regionais para relações de proximidade."}</dd></div>}
            </dl>
            <div className="med-structure-actions"><button onClick={() => speakStructure(selected.name)}><Volume2 /> Ouvir nome</button><a href={medicalSourceUrl(selected.sourceId)} target="_blank" rel="noreferrer">Ver fonte anatômica <ExternalLink /></a></div>
          </> : <div className="med-empty-selection"><Search /><h3>Selecione uma estrutura</h3><p>Os pontos ativos mudam conforme a camada escolhida.</p></div>}
        </aside>
      </div>
    </section>
  );
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
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
