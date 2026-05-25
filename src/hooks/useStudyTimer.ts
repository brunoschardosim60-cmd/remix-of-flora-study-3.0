import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StudySession, Subject } from "@/lib/studyData";
import { loadJsonStorage } from "@/lib/storage";

interface UseStudyTimerParams {
  onSessionEnd: (session: StudySession) => void;
  activeTopicId?: string | null;
  activeSubject?: Subject | null;
}

const TIMER_STORAGE_KEY = "studyflow.timer.v1";

function readInitialTimerState(): { running: boolean; elapsed: number } {
  if (typeof window === "undefined") return { running: false, elapsed: 0 };
  try {
    const saved = loadJsonStorage<{ running: boolean; elapsed: number; savedAt: number }>(TIMER_STORAGE_KEY);
    if (!saved) return { running: false, elapsed: 0 };
    if (saved.running) {
      return {
        running: true,
        elapsed: (saved.elapsed || 0) + Math.max(0, Date.now() - (saved.savedAt || Date.now())),
      };
    }
    return { running: false, elapsed: saved.elapsed || 0 };
  } catch {
    return { running: false, elapsed: 0 };
  }
}

export function useStudyTimer({
  onSessionEnd,
  activeTopicId,
  activeSubject,
}: UseStudyTimerParams) {
  // Inicialização síncrona evita corrida em que os efeitos de persistência
  // gravam (false, 0) sobre o estado salvo antes do restore completar quando
  // o hook é remontado (ex.: voltar de /banco para /).
  const initialStateRef = useRef<{ running: boolean; elapsed: number } | null>(null);
  if (initialStateRef.current === null) initialStateRef.current = readInitialTimerState();
  const [running, setRunning] = useState(initialStateRef.current.running);
  const [elapsed, setElapsed] = useState(initialStateRef.current.elapsed);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);

  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const elapsedRef = useRef(initialStateRef.current.elapsed);

  // Refs para acessar valores atuais dentro do tick sem recriar o intervalo
  const onSessionEndRef = useRef(onSessionEnd);
  const activeTopicIdRef = useRef(activeTopicId);
  const activeSubjectRef = useRef(activeSubject);
  useEffect(() => { onSessionEndRef.current = onSessionEnd; }, [onSessionEnd]);
  useEffect(() => { activeTopicIdRef.current = activeTopicId; }, [activeTopicId]);
  useEffect(() => { activeSubjectRef.current = activeSubject; }, [activeSubject]);

  const persistTimerState = useCallback((nextRunning: boolean, nextElapsed: number) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({ running: nextRunning, elapsed: nextElapsed, savedAt: Date.now() }),
      );
    } catch {}
  }, []);

  // Limpeza do intervalo ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  // Tick interval — depende só de `running`.
  // Usar elapsedRef (não elapsed) para ler o valor atual sem re-criar o intervalo a cada tick.
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    // Ancora o startRef uma única vez ao iniciar/retomar
    startRef.current = Date.now() - elapsedRef.current;
    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      let startTs = startRef.current ?? now;

      // Detecta cruzamento de meia-noite e divide a sessão por dia
      // Loop cobre o caso (raro) de cruzar mais de um dia entre ticks
      // ex: aba dormente por horas
      while (true) {
        const startDay = new Date(startTs);
        startDay.setHours(0, 0, 0, 0);
        const nextMidnight = new Date(startDay);
        nextMidnight.setDate(nextMidnight.getDate() + 1);
        const nextMidnightTs = nextMidnight.getTime();
        if (now < nextMidnightTs) break;

        const endOfDay = nextMidnightTs - 1; // 23:59:59.999
        const partialDuration = endOfDay - startTs;
        if (partialDuration > 1000) {
          const session: StudySession = {
            id: crypto.randomUUID(),
            start: new Date(startTs).toISOString(),
            end: new Date(endOfDay).toISOString(),
            durationMs: partialDuration,
            topicId: activeTopicIdRef.current ?? null,
            subject: activeSubjectRef.current ?? null,
          };
          try { onSessionEndRef.current(session); } catch {}
        }
        // Reinicia a contagem a partir da meia-noite do novo dia
        startTs = nextMidnightTs;
        startRef.current = startTs;
      }

      setElapsed(now - startTs);
    }, 1000);
    return () => { if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Sync refs & persist
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);
  useEffect(() => { persistTimerState(running, elapsedRef.current); }, [running, persistTimerState]);
  useEffect(() => { if (!running) persistTimerState(false, elapsed); }, [elapsed, persistTimerState, running]);

  // Periodic persist while running
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      persistTimerState(true, Date.now() - (startRef.current ?? Date.now()));
    }, 15000);
    return () => window.clearInterval(id);
  }, [running, persistTimerState]);

  // Persist on visibility change / unload
  useEffect(() => {
    if (typeof window === "undefined") return;
    const persist = () => persistTimerState(running, running ? Date.now() - (startRef.current ?? Date.now()) : elapsed);
    const onVisChange = () => { if (document.visibilityState === "hidden") persist(); };
    window.addEventListener("beforeunload", persist);
    document.addEventListener("visibilitychange", onVisChange);
    return () => {
      window.removeEventListener("beforeunload", persist);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [elapsed, persistTimerState, running]);

  const start = useCallback(() => { setRunning(true); setIsFocusModeOpen(true); }, []);
  const pause = useCallback(() => { setRunning(false); }, []);
  const resume = useCallback(() => { setRunning(true); }, []);

  const stop = useCallback(() => {
    setRunning(false);
    if (elapsed > 1000) {
      const session: StudySession = {
        id: crypto.randomUUID(),
        start: new Date(Date.now() - elapsed).toISOString(),
        end: new Date().toISOString(),
        durationMs: elapsed,
        topicId: activeTopicId ?? null,
        subject: activeSubject ?? null,
      };
      onSessionEnd(session);
    }
    setElapsed(0);
    startRef.current = null;
    setIsFocusModeOpen(false);
    if (typeof window !== "undefined") window.localStorage.removeItem(TIMER_STORAGE_KEY);
  }, [elapsed, onSessionEnd, activeTopicId, activeSubject]);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    startRef.current = null;
    setIsFocusModeOpen(false);
    if (typeof window !== "undefined") window.localStorage.removeItem(TIMER_STORAGE_KEY);
  }, []);

  const openFocusMode = useCallback(() => setIsFocusModeOpen(true), []);
  const closeFocusMode = useCallback(() => setIsFocusModeOpen(false), []);

  const formattedTime = useMemo(() => {
    const totalSec = Math.floor(elapsed / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsed]);

  return {
    running, elapsed, formattedTime, isFocusModeOpen,
    start, pause, resume, stop, reset,
    openFocusMode, closeFocusMode,
  };
}
