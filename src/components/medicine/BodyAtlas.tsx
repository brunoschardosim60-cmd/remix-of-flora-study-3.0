import { useMemo, useState } from "react";
import { Box, ExternalLink, RotateCcw, Search, Volume2, ZoomIn, ZoomOut } from "lucide-react";
import { anatomyStructures, bodyLayers, medicalSources, type AnatomyStructure, type BodyLayer } from "@/lib/medicineData";

interface BodyAtlasProps {
  activeLayer: BodyLayer;
  onLayerChange: (layer: BodyLayer) => void;
  selected: AnatomyStructure | null;
  onSelect: (structure: AnatomyStructure) => void;
}

export function BodyAtlas({ activeLayer, onLayerChange, selected, onSelect }: BodyAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<"anterior" | "posterior">("anterior");
  const visibleStructures = useMemo(() => anatomyStructures.filter((item) => item.layer === activeLayer), [activeLayer]);
  const atlasImage = `/medicine/atlas/${activeLayer}-${view}-v2.png`;

  const selectLayer = (layer: BodyLayer) => {
    onLayerChange(layer);
    const firstStructure = anatomyStructures.find((item) => item.layer === layer);
    if (firstStructure) onSelect(firstStructure);
  };

  return (
    <section className="med-atlas-shell" aria-label="Atlas anatômico visual interativo">
      <div className="med-atlas-topbar">
        <div>
          <span className="med-eyebrow">Atlas imersivo 2D</span>
          <h2>Explore por camadas</h2>
          <p>Ilustrações anatômicas em alta definição. Conteúdo educacional — confirme detalhes nas fontes vinculadas.</p>
        </div>
        <div className="med-atlas-controls">
          <button onClick={() => setZoom((value) => Math.max(0.8, value - 0.1))} aria-label="Diminuir zoom"><ZoomOut /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))} aria-label="Aumentar zoom"><ZoomIn /></button>
          <button className="wide" onClick={() => setView((value) => value === "anterior" ? "posterior" : "anterior")}><RotateCcw /> {view === "anterior" ? "Anterior" : "Posterior"}</button>
          <a className="wide" href="https://www.openanatomy.org/atlas-pages/" target="_blank" rel="noreferrer"><Box /> Atlas validado <ExternalLink /></a>
        </div>
      </div>

      <div className="med-atlas-body">
        <nav className="med-layer-rail" aria-label="Camadas do corpo">
          {bodyLayers.map((layer) => (
            <button key={layer.id} className={activeLayer === layer.id ? "active" : ""} onClick={() => selectLayer(layer.id)}>
              <span className="dot" style={{ background: layer.color }} />
              <span><strong>{layer.label}</strong><small>{layer.description}</small></span>
            </button>
          ))}
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
            {visibleStructures.map((structure) => (
              <button key={structure.id} className={`med-anatomy-pin ${selected?.id === structure.id ? "active" : ""}`} style={{ left: `${view === "posterior" ? 100 - structure.x : structure.x}%`, top: `${view === "posterior" && structure.id === "brain" ? 10 : structure.y}%` }} onClick={() => onSelect(structure)} aria-label={`Selecionar ${structure.name}`}>
                <span />
              </button>
            ))}
          </div>
          <span className="med-atlas-image-note">Ilustração educacional gerada · não diagnóstica</span>
          <div className="med-orientation"><span>D</span><strong>{view === "anterior" ? "ANTERIOR" : "POSTERIOR"}</strong><span>E</span></div>
        </div>

        <aside className="med-structure-panel">
          {selected ? <>
            <span className="med-eyebrow">{selected.region}</span>
            <h3>{selected.name}</h3>
            {selected.latin && <em>{selected.latin}</em>}
            <p>{selected.summary}</p>
            <dl><div><dt>Função</dt><dd>{selected.function}</dd></div><div><dt>Relações</dt><dd>{selected.relations}</dd></div><div><dt>Estruturas próximas</dt><dd>{selected.nearby.join(" · ")}</dd></div></dl>
            <div className="med-structure-actions"><button onClick={() => speakStructure(selected.name)}><Volume2 /> Ouvir nome</button><a href={medicalSourceUrl(selected.sourceId)} target="_blank" rel="noreferrer">Ver fonte anatômica <ExternalLink /></a></div>
          </> : <div className="med-empty-selection"><Search /><h3>Selecione uma estrutura</h3><p>Os pontos ativos mudam conforme a camada escolhida.</p></div>}
        </aside>
      </div>
    </section>
  );
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
