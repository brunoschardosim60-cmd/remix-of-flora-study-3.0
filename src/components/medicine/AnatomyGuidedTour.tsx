import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Headphones, Pause, Play, X } from "lucide-react";
import { anatomyGuidedTours, type AnatomyTour } from "@/lib/anatomyGuidedTours";
import { useFloraVoice } from "@/hooks/useFloraVoice";
import "./anatomy-guided-tour.css";

interface AnatomyGuidedTourProps {
  /** Pede ao Corpo 3D que foque a estrutura; `nonce` novo refaz o foco. */
  onFocusStructure: (structureId: string) => void;
}

export function AnatomyGuidedTour({ onFocusStructure }: AnatomyGuidedTourProps) {
  const [open, setOpen] = useState(false);
  const [tour, setTour] = useState<AnatomyTour | null>(null);
  const [index, setIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const { speak, stop, playing, loading, error } = useFloraVoice();
  const startedStop = useRef<number | null>(null);
  const advanceTimer = useRef<number | null>(null);

  const stop_ = tour?.stops[index] ?? null;
  const isLast = tour ? index >= tour.stops.length - 1 : true;

  const clearTimer = () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };

  const goTo = useCallback((next: number, narrate: boolean) => {
    if (!tour) return;
    const bounded = Math.max(0, Math.min(tour.stops.length - 1, next));
    const target = tour.stops[bounded];
    clearTimer();
    stop();
    startedStop.current = null;
    setIndex(bounded);
    onFocusStructure(target.structureId);
    if (narrate) {
      startedStop.current = bounded;
      void speak(target.narration, "tecnica");
    }
  }, [onFocusStructure, speak, stop, tour]);

  // Avança sozinho quando a narração termina.
  const wasPlaying = useRef(false);
  useEffect(() => {
    if (playing) {
      wasPlaying.current = true;
      return;
    }
    if (!wasPlaying.current) return;
    wasPlaying.current = false;
    if (!autoAdvance || !tour || startedStop.current !== index || isLast) return;
    advanceTimer.current = window.setTimeout(() => goTo(index + 1, true), 1200);
    return clearTimer;
  }, [playing, autoAdvance, tour, index, isLast, goTo]);

  useEffect(() => () => { clearTimer(); stop(); }, [stop]);

  const begin = (selected: AnatomyTour) => {
    setTour(selected);
    setIndex(0);
    clearTimer();
    stop();
    onFocusStructure(selected.stops[0].structureId);
    startedStop.current = 0;
    void speak(selected.stops[0].narration, "tecnica");
  };

  const close = () => {
    clearTimer();
    stop();
    startedStop.current = null;
    setTour(null);
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className="tour-launch" onClick={() => setOpen(true)}>
        <Headphones aria-hidden="true" /> Visita guiada narrada
      </button>
    );
  }

  return (
    <section className="tour-panel" aria-label="Visita guiada narrada">
      <header>
        <strong>{tour ? tour.title : "Visita guiada narrada"}</strong>
        <button type="button" className="tour-close" onClick={close} aria-label="Encerrar visita guiada"><X aria-hidden="true" /></button>
      </header>

      {!tour && (
        <ul className="tour-choices">
          {anatomyGuidedTours.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => begin(item)}>
                <strong>{item.title}</strong>
                <span>{item.description} · {item.stops.length} paradas</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tour && stop_ && (
        <div className="tour-stop">
          <small>Parada {index + 1} de {tour.stops.length}</small>
          <h4>{stop_.title}</h4>
          <p>{stop_.narration}</p>
          {stop_.reflection && <p className="tour-reflection"><em>Para pensar:</em> {stop_.reflection}</p>}
          {error && <p className="tour-note" role="status">{error}</p>}
          <div className="tour-controls">
            <button type="button" onClick={() => goTo(index - 1, true)} disabled={index === 0} aria-label="Parada anterior"><ChevronLeft aria-hidden="true" /></button>
            <button type="button" className="tour-play" onClick={() => (playing ? stop() : goTo(index, true))} disabled={loading} aria-label={playing ? "Pausar narração" : "Ouvir narração"}>
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {loading ? "Carregando…" : playing ? "Pausar" : "Ouvir"}
            </button>
            <button type="button" onClick={() => goTo(index + 1, true)} disabled={isLast} aria-label="Próxima parada"><ChevronRight aria-hidden="true" /></button>
            <label className="tour-auto">
              <input type="checkbox" checked={autoAdvance} onChange={(event) => setAutoAdvance(event.target.checked)} /> Avançar sozinho
            </label>
          </div>
          <ol className="tour-dots" aria-label="Paradas">
            {tour.stops.map((item, position) => (
              <li key={item.structureId + position}><button type="button" className={position === index ? "active" : ""} aria-label={`Ir para ${item.title}`} aria-current={position === index ? "step" : undefined} onClick={() => goTo(position, false)} /></li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
