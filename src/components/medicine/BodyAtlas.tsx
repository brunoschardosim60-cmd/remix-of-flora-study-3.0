import { useMemo, useState } from "react";
import { Box, ExternalLink, RotateCcw, Search, Volume2, ZoomIn, ZoomOut } from "lucide-react";
import { anatomyStructures, bodyLayers, medicalSources, type AnatomyStructure, type BodyLayer } from "@/lib/medicineData";

interface BodyAtlasProps {
  activeLayer: BodyLayer;
  onLayerChange: (layer: BodyLayer) => void;
  selected: AnatomyStructure | null;
  onSelect: (structure: AnatomyStructure) => void;
}

const layerOpacity: Record<BodyLayer, number> = {
  surface: 0.95,
  muscular: 0.92,
  skeletal: 0.95,
  vascular: 1,
  nervous: 1,
  organs: 1,
};

export function BodyAtlas({ activeLayer, onLayerChange, selected, onSelect }: BodyAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<"anterior" | "posterior">("anterior");
  const visibleStructures = useMemo(() => anatomyStructures.filter((item) => item.layer === activeLayer), [activeLayer]);

  return (
    <section className="med-atlas-shell" aria-label="Atlas anatômico esquemático interativo">
      <div className="med-atlas-topbar">
        <div>
          <span className="med-eyebrow">Atlas imersivo 2D</span>
          <h2>Explore por camadas</h2>
          <p>Representação educacional esquemática. Use as fontes vinculadas para estudo anatômico detalhado.</p>
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
            <button key={layer.id} className={activeLayer === layer.id ? "active" : ""} onClick={() => onLayerChange(layer.id)}>
              <span className="dot" style={{ background: layer.color }} />
              <span><strong>{layer.label}</strong><small>{layer.description}</small></span>
            </button>
          ))}
        </nav>

        <div className="med-body-stage">
          <div className="med-scan-grid" />
          <div className="med-body-viewport" style={{ transform: `scale(${zoom}) scaleX(${view === "posterior" ? -1 : 1})` }}>
            <svg viewBox="0 0 360 720" role="img" aria-label={`Corpo humano, vista ${view}, camada ${activeLayer}`}>
              <defs>
                <linearGradient id="skinGradient" x1="0" x2="1"><stop stopColor="#e9d5c5"/><stop offset="1" stopColor="#cda98f"/></linearGradient>
                <linearGradient id="muscleGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c8796e"/><stop offset="1" stopColor="#8f4b4d"/></linearGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <g opacity={activeLayer === "surface" ? 1 : 0.14}>
                <ellipse cx="180" cy="68" rx="48" ry="58" fill="url(#skinGradient)" />
                <path d="M143 118 C125 128 112 154 108 196 L85 318 C80 350 95 356 106 329 L135 236 L139 414 L118 656 C116 688 142 692 150 660 L180 448 L210 660 C218 692 244 688 242 656 L221 414 L225 236 L254 329 C265 356 280 350 275 318 L252 196 C248 154 235 128 217 118 C197 132 163 132 143 118Z" fill="url(#skinGradient)" />
              </g>
              {activeLayer === "muscular" && <g fill="url(#muscleGradient)" stroke="#7f4145" strokeWidth="2" opacity={layerOpacity.muscular}>
                <ellipse cx="180" cy="70" rx="43" ry="52"/><path d="M143 124 C117 145 118 201 139 236 L142 408 L178 440 L178 134Z"/><path d="M217 124 C243 145 242 201 221 236 L218 408 L182 440 L182 134Z"/><path d="M138 150 L104 202 L88 330 L108 336 L145 230Z"/><path d="M222 150 L256 202 L272 330 L252 336 L215 230Z"/><path d="M143 410 L119 654 L151 664 L179 446Z"/><path d="M217 410 L241 654 L209 664 L181 446Z"/></g>}
              {activeLayer === "skeletal" && <g fill="none" stroke="#e6dfca" strokeWidth="10" strokeLinecap="round" opacity={layerOpacity.skeletal}>
                <circle cx="180" cy="69" r="43" fill="#e6dfca" stroke="#c9bea0"/><path d="M180 116 L180 430"/><path d="M139 153 L221 153 M180 148 L104 210 L93 327 M180 148 L256 210 L267 327"/><path d="M180 430 L137 654 M180 430 L223 654"/><path d="M145 177 Q180 210 215 177 M143 203 Q180 234 217 203 M143 229 Q180 258 217 229" strokeWidth="5"/><path d="M145 408 Q180 445 215 408" strokeWidth="18"/></g>}
              {activeLayer === "vascular" && <g fill="none" strokeLinecap="round" filter="url(#glow)" opacity={layerOpacity.vascular}>
                <path d="M180 142 L180 438 M180 180 L137 226 L101 330 M180 180 L223 226 L259 330 M180 420 L139 657 M180 420 L221 657" stroke="#bd5964" strokeWidth="7"/><path d="M166 150 L166 430 M166 189 L129 232 L95 333 M166 421 L128 652 M194 421 L232 652" stroke="#557eaa" strokeWidth="6"/><circle cx="180" cy="224" r="22" fill="#a64f5b" stroke="#d7848a" strokeWidth="3"/></g>}
              {activeLayer === "nervous" && <g fill="none" stroke="#e0b84f" strokeLinecap="round" filter="url(#glow)" opacity={layerOpacity.nervous}>
                <path d="M180 112 L180 448" strokeWidth="9"/><path d="M180 160 L135 205 L101 330 M180 160 L225 205 L259 330 M180 431 L139 659 M180 431 L221 659" strokeWidth="5"/><path d="M154 57 Q180 28 206 57 Q215 90 180 112 Q145 90 154 57Z" fill="#e0b84f" strokeWidth="3"/></g>}
              {activeLayer === "organs" && <g opacity={layerOpacity.organs} filter="url(#glow)">
                <path d="M151 54 Q180 25 209 54 Q217 91 180 112 Q143 91 151 54Z" fill="#d8ae69"/><path d="M127 168 Q151 143 171 169 L168 270 Q126 257 121 215Z" fill="#779aaa"/><path d="M233 168 Q209 143 189 169 L192 270 Q234 257 239 215Z" fill="#779aaa"/><path d="M180 194 C153 170 139 211 176 246 C213 211 207 170 180 194Z" fill="#ae5360"/><path d="M137 282 Q180 258 224 287 L218 346 Q166 361 136 325Z" fill="#98705b"/><path d="M143 355 Q158 337 169 357 L164 403 Q139 400 143 355Z" fill="#7c6584"/><path d="M217 355 Q202 337 191 357 L196 403 Q221 400 217 355Z" fill="#7c6584"/></g>}
            </svg>
            {visibleStructures.map((structure) => (
              <button key={structure.id} className={`med-anatomy-pin ${selected?.id === structure.id ? "active" : ""}`} style={{ left: `${structure.x}%`, top: `${structure.y}%` }} onClick={() => onSelect(structure)} aria-label={`Selecionar ${structure.name}`}>
                <span />
              </button>
            ))}
          </div>
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
