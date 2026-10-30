import { useEffect, useMemo, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { cleavageSourceIds, cleavageSteps, type CleavageStep } from "@/lib/embryoCleavage";
import { medicalSources } from "@/lib/medicineData";
import "./embryo-cleavage.css";

const CENTER = 150;
const STEP_MS = 5200;

type Cell = { x: number; y: number; r: number };

/** Posições esquemáticas: o conjunto mantém o tamanho total e as células ficam menores a cada divisão. */
export function cleavageCellLayout(count: number): Cell[] {
  if (count <= 1) return [{ x: CENTER, y: CENTER, r: 84 }];
  if (count === 2) return [{ x: CENTER - 56, y: CENTER, r: 58 }, { x: CENTER + 56, y: CENTER, r: 58 }];
  if (count === 4) {
    return [[-46, -46], [46, -46], [-46, 46], [46, 46]].map(([dx, dy]) => ({ x: CENTER + dx, y: CENTER + dy, r: 46 }));
  }
  if (count === 8) {
    const ring = Array.from({ length: 7 }, (_, i) => {
      const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
      return { x: CENTER + Math.cos(angle) * 66, y: CENTER + Math.sin(angle) * 66, r: 33 };
    });
    return [...ring, { x: CENTER, y: CENTER, r: 32 }];
  }
  return Array.from({ length: count }, (_, i) => {
    const angle = i * 2.399963;
    const radius = 22 * Math.sqrt(i + 0.5);
    return { x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius, r: 21 };
  });
}

function Sperm({ x, y, angle = 0, scale = 1 }: { x: number; y: number; angle?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} className="cleave-sperm">
      <ellipse cx="0" cy="0" rx="7" ry="5" fill="#5b7fa6" />
      <path d="M 7 0 C 22 -8, 30 8, 46 0 S 62 -6, 70 0" fill="none" stroke="#5b7fa6" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Oocyte({ stepId }: { stepId: string }) {
  const zygote = stepId === "zygote";
  return (
    <>
      <circle cx={CENTER} cy={CENTER} r="112" className="cleave-corona" />
      <circle cx={CENTER} cy={CENTER} r="98" className="cleave-zona" />
      <circle cx={CENTER} cy={CENTER} r="78" className="cleave-oocyte" />
      {zygote ? (
        <>
          <circle cx={CENTER - 20} cy={CENTER + 4} r="17" className="cleave-nucleus" />
          <circle cx={CENTER + 22} cy={CENTER - 2} r="15" className="cleave-nucleus paternal" />
          <circle cx={CENTER + 56} cy={CENTER - 78} r="7" className="cleave-polar" />
        </>
      ) : (
        <circle cx={CENTER} cy={CENTER} r="20" className="cleave-nucleus" />
      )}
    </>
  );
}

function Scene({ step }: { step: CleavageStep }) {
  const cells = useMemo(() => (step.visual === "cells" || step.visual === "morula" ? cleavageCellLayout(step.cells ?? 1) : []), [step]);
  switch (step.visual) {
    case "sperm-approach":
      return (
        <>
          <Oocyte stepId={step.id} />
          <Sperm x={22} y={70} angle={30} />
          <Sperm x={14} y={200} angle={-20} scale={0.9} />
          <Sperm x={60} y={262} angle={-50} scale={0.85} />
          <Sperm x={246} y={26} angle={150} scale={0.9} />
        </>
      );
    case "sperm-entry":
      return (
        <>
          <Oocyte stepId={step.id} />
          <Sperm x={-8} y={60} angle={42} scale={0.8} />
          <Sperm x={238} y={278} angle={-150} scale={0.8} />
          <g transform="translate(120 120)"><Sperm x={-86} y={-82} angle={42} scale={1.05} /></g>
          <circle cx={CENTER - 54} cy={CENTER - 54} r="9" className="cleave-flash" />
        </>
      );
    case "zygote":
      return <Oocyte stepId={step.id} />;
    case "cells":
    case "morula":
      return (
        <>
          <circle cx={CENTER} cy={CENTER} r="118" className="cleave-zona" />
          {cells.map((cell, index) => (
            <circle key={index} cx={cell.x} cy={cell.y} r={cell.r} className="cleave-blastomere" />
          ))}
        </>
      );
    case "blastocyst": {
      const ring = Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2;
        return { x: CENTER + Math.cos(angle) * 100, y: CENTER + Math.sin(angle) * 100 };
      });
      const inner = [[-62, -52], [-42, -66], [-72, -28], [-46, -36], [-24, -50], [-58, -8]];
      return (
        <>
          <circle cx={CENTER} cy={CENTER} r="122" className="cleave-zona" />
          <circle cx={CENTER} cy={CENTER} r="100" className="cleave-blastocoel" />
          {ring.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="12" className="cleave-trophoblast" />)}
          {inner.map(([dx, dy], i) => <circle key={i} cx={CENTER + dx + 28} cy={CENTER + dy + 28} r="15" className="cleave-icm" />)}
          <text x={CENTER - 34} y={CENTER + 4} className="cleave-label">massa celular interna</text>
        </>
      );
    }
    case "implantation": {
      const ring = Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        return { x: CENTER + Math.cos(angle) * 78, y: 128 + Math.sin(angle) * 78, angle };
      });
      return (
        <>
          <path d="M 0 236 C 60 226, 110 244, 150 232 S 250 224, 300 238 L 300 300 L 0 300 Z" className="cleave-endometrium" />
          <circle cx={CENTER} cy="128" r="78" className="cleave-blastocoel" />
          {ring.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="10" className={p.y > 190 ? "cleave-trophoblast invading" : "cleave-trophoblast"} />)}
          {[[-18, -30], [2, -40], [-30, -8], [-6, -14], [14, -22]].map(([dx, dy], i) => <circle key={i} cx={CENTER + dx} cy={128 + dy + 54} r="13" className="cleave-icm" />)}
          <text x="8" y="288" className="cleave-label">endométrio</text>
        </>
      );
    }
    default:
      return null;
  }
}

export function EmbryoCleavageAnimation() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = cleavageSteps[index];
  const last = cleavageSteps.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex((current) => Math.min(current + 1, last)), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index, last]);

  const source = medicalSources[cleavageSourceIds[0]];

  return (
    <section className="cleave" aria-labelledby="cleave-title">
      <header>
        <span className="med-eyebrow">Animação esquemática</span>
        <h3 id="cleave-title">Da fertilização ao blastocisto</h3>
        <p>Acompanhe, passo a passo, a entrada do espermatozoide, as primeiras divisões e a chegada ao útero.</p>
      </header>

      <div className="cleave-body">
        <figure className="cleave-figure">
          <svg viewBox="0 0 300 300" role="img" aria-label={`${step.title}: ${step.description}`}>
            <rect width="300" height="300" className="cleave-bg" />
            <g key={step.id} className="cleave-scene"><Scene step={step} /></g>
          </svg>
          <figcaption>Esquema fora de escala: o embrião real tem cerca de 0,1 mm nesta fase.</figcaption>
        </figure>

        <div className="cleave-info">
          <small>{step.time} · {step.location}</small>
          <h4>{step.title}</h4>
          {step.cells && <p className="cleave-count" aria-live="polite">{step.cells === 1 ? "1 célula" : `${step.cells} células`}</p>}
          <p>{step.description}</p>
        </div>
      </div>

      <div className="cleave-controls">
        <button type="button" onClick={() => { setPlaying(false); setIndex((c) => Math.max(0, c - 1)); }} disabled={index === 0} aria-label="Etapa anterior"><SkipBack aria-hidden="true" /></button>
        <button type="button" className="cleave-play" onClick={() => { if (index >= last) setIndex(0); setPlaying((value) => !value); }} aria-label={playing ? "Pausar animação" : "Reproduzir animação"}>
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? "Pausar" : index >= last ? "Rever" : "Reproduzir"}
        </button>
        <button type="button" onClick={() => { setPlaying(false); setIndex((c) => Math.min(last, c + 1)); }} disabled={index === last} aria-label="Próxima etapa"><SkipForward aria-hidden="true" /></button>
        <input
          type="range" min={0} max={last} step={1} value={index}
          onChange={(event) => { setPlaying(false); setIndex(Number(event.target.value)); }}
          aria-label="Linha do tempo da clivagem" aria-valuetext={`${step.time}: ${step.title}`}
        />
      </div>

      <p className="cleave-source">Tempos aproximados, com variação entre indivíduos. Fonte: {source?.title} ({source?.organization}). Esquema autoral simplificado, sem reprodução de imagens da fonte.</p>
    </section>
  );
}
