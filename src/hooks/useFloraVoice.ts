/**
 * src/hooks/useFloraVoice.ts
 *
 * Chama o edge function flora-tts (OpenAI TTS-1-HD) e reproduz o áudio.
 * Suporta play, pause e stop. Faz cache do blob em memória por sessão
 * para não chamar a API duas vezes pro mesmo texto.
 *
 * Uso:
 *   const { speak, stop, playing, loading } = useFloraVoice();
 *   <button onClick={() => speak(cena.text, "amiga_motivadora")} />
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const blobCache = new Map<string, string>(); // text slug → objectURL

function slugText(t: string) {
  return t.slice(0, 120).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// Remove markdown antes de falar (**, *, ##, etc.)
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s/gm, "")
    .replace(/^\d+\.\s/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

export type FloraVoicePersonality =
  | "padrao" | "amiga" | "rigorosa" | "engraçada" | "motivadora" | "tecnica";

export interface UseFloraVoiceReturn {
  speak: (text: string, personality?: FloraVoicePersonality) => Promise<void>;
  stop: () => void;
  toggle: (text: string, personality?: FloraVoicePersonality) => Promise<void>;
  playing: boolean;
  loading: boolean;
  error: string | null;
}

export function useFloraVoice(): UseFloraVoiceReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentSlugRef = useRef<string>("");

  // Limpa ao desmontar
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPlaying(false);
    currentSlugRef.current = "";
  }, []);

  const speak = useCallback(async (
    rawText: string,
    personality: FloraVoicePersonality = "amiga",
  ) => {
    const text = stripMarkdown(rawText).slice(0, 4096);
    if (!text) return;

    const slug = slugText(text);

    // Se já está tocando esse texto, para (toggle)
    if (playing && currentSlugRef.current === slug) {
      stop();
      return;
    }

    // Para qualquer áudio anterior
    stop();
    setError(null);
    currentSlugRef.current = slug;

    // Cache hit
    const cached = blobCache.get(slug);
    if (cached) {
      const audio = new Audio(cached);
      audioRef.current = audio;
      audio.onplay = () => setPlaying(true);
      audio.onended = () => { setPlaying(false); currentSlugRef.current = ""; };
      audio.onerror = () => { setPlaying(false); setError("Erro ao reproduzir áudio."); };
      audio.play().catch(() => setError("Não foi possível reproduzir o áudio."));
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("flora-tts", {
        body: { text, personality },
      });
      if (fnErr) throw fnErr;

      // O edge function retorna o áudio diretamente como ArrayBuffer via blob
      // supabase.functions.invoke com responseType não-json retorna data como ArrayBuffer
      let objectUrl: string;
      if (data instanceof ArrayBuffer || data instanceof Blob) {
        const blob = data instanceof Blob ? data : new Blob([data], { type: "audio/mpeg" });
        objectUrl = URL.createObjectURL(blob);
      } else if (typeof data === "string" && data.startsWith("data:")) {
        // fallback base64
        const res = await fetch(data);
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
      } else {
        throw new Error("Formato de áudio desconhecido.");
      }

      blobCache.set(slug, objectUrl);

      // Verifica se o usuário não cancelou enquanto carregava
      if (currentSlugRef.current !== slug) return;

      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      audio.onplay = () => setPlaying(true);
      audio.onended = () => { setPlaying(false); currentSlugRef.current = ""; };
      audio.onerror = () => { setPlaying(false); setError("Erro ao reproduzir áudio."); };
      audio.play().catch(() => setError("Não foi possível reproduzir o áudio."));
    } catch (e: any) {
      setError(e?.message || "Erro ao gerar voz.");
      setPlaying(false);
      currentSlugRef.current = "";
    } finally {
      setLoading(false);
    }
  }, [playing, stop]);

  const toggle = useCallback(async (
    text: string,
    personality: FloraVoicePersonality = "amiga",
  ) => {
    if (playing) stop();
    else await speak(text, personality);
  }, [playing, speak, stop]);

  return { speak, stop, toggle, playing, loading, error };
}
