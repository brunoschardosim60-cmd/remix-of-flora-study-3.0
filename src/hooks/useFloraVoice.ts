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

const blobCache = new Map<string, string>(); // texto + personalidade → objectURL

function slugText(t: string, personality: FloraVoicePersonality) {
  const hash = [...t].reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0);
  return `${personality}-${t.length}-${Math.abs(hash)}`;
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
  mode: "remote" | "device" | null;
}

const DEVICE_VOICE_NOTICE = "Voz online indisponível. Usando a voz do dispositivo.";

function speechStyle(personality: FloraVoicePersonality) {
  if (personality === "rigorosa" || personality === "tecnica") return { rate: 0.94, pitch: 0.96 };
  if (personality === "engraçada" || personality === "motivadora") return { rate: 1.04, pitch: 1.04 };
  return { rate: 0.98, pitch: 1 };
}

function portugueseVoice(synth: SpeechSynthesis) {
  const voices = synth.getVoices();
  return voices.find((voice) => voice.lang.toLowerCase() === "pt-br")
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("pt"));
}

export function useFloraVoice(): UseFloraVoiceReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"remote" | "device" | null>(null);
  const currentSlugRef = useRef<string>("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const requestRef = useRef(0);

  // Limpa ao desmontar
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
      utteranceRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    requestRef.current += 1;
    setPlaying(false);
    setMode(null);
    setError(null);
    currentSlugRef.current = "";
  }, []);

  const speak = useCallback(async (
    rawText: string,
    personality: FloraVoicePersonality = "amiga",
  ) => {
    const text = stripMarkdown(rawText).slice(0, 4096);
    if (!text) return;

    const slug = slugText(text, personality);

    // Se já está tocando esse texto, para (toggle)
    if (playing && currentSlugRef.current === slug) {
      stop();
      return;
    }

    // Para qualquer áudio anterior
    stop();
    const requestId = requestRef.current;
    setError(null);
    currentSlugRef.current = slug;

    const startDeviceVoice = (showNotice: boolean) => {
      if (requestRef.current !== requestId || typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return false;
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      const style = speechStyle(personality);
      utterance.lang = "pt-BR";
      utterance.rate = style.rate;
      utterance.pitch = style.pitch;
      utterance.voice = portugueseVoice(synth) ?? null;
      utterance.onstart = () => {
        if (requestRef.current !== requestId) return;
        setPlaying(true);
        setMode("device");
      };
      utterance.onend = () => {
        if (requestRef.current !== requestId) return;
        setPlaying(false);
        setMode(null);
        setError(null);
        currentSlugRef.current = "";
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        if (requestRef.current !== requestId) return;
        setPlaying(false);
        setMode(null);
        setError("Não foi possível reproduzir a voz neste dispositivo.");
        currentSlugRef.current = "";
        utteranceRef.current = null;
      };
      utteranceRef.current = utterance;
      if (showNotice) setError(DEVICE_VOICE_NOTICE);
      setMode("device");
      setPlaying(true);
      synth.cancel();
      synth.resume();
      synth.speak(utterance);
      return true;
    };

    const playRemoteAudio = async (objectUrl: string) => {
      if (requestRef.current !== requestId) return;
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      audio.onplay = () => {
        if (requestRef.current !== requestId) return;
        setPlaying(true);
        setMode("remote");
      };
      audio.onended = () => {
        if (requestRef.current !== requestId) return;
        setPlaying(false);
        setMode(null);
        setError(null);
        currentSlugRef.current = "";
      };
      audio.onerror = () => {
        if (requestRef.current !== requestId || startDeviceVoice(true)) return;
        setPlaying(false);
        setMode(null);
        setError("Erro ao reproduzir áudio.");
      };
      try {
        await audio.play();
      } catch {
        if (!startDeviceVoice(true)) throw new Error("Não foi possível reproduzir o áudio.");
      }
    };

    // Cache hit
    const cached = blobCache.get(slug);
    if (cached) {
      try {
        await playRemoteAudio(cached);
      } catch (playbackError) {
        setError(playbackError instanceof Error ? playbackError.message : "Não foi possível reproduzir o áudio.");
        setPlaying(false);
        setMode(null);
        currentSlugRef.current = "";
      }
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

      await playRemoteAudio(objectUrl);
    } catch (voiceError) {
      if (!startDeviceVoice(true)) {
        setError(voiceError instanceof Error ? voiceError.message : "Erro ao gerar voz.");
        setPlaying(false);
        setMode(null);
        currentSlugRef.current = "";
      }
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

  return { speak, stop, toggle, playing, loading, error, mode };
}
