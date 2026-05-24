/**
 * src/hooks/useRichMedia.ts
 *
 * Hook central de mídia educacional rica.
 * Detecta automaticamente quais tipos de conteúdo fazem sentido
 * para o tema/matéria e busca todos em paralelo.
 *
 * Uso:
 *   const media = useRichMedia({ subject: "Geografia", topic: "Amazônia" });
 *   media.photo.url   → string | null
 *   media.video.data  → VideoResult | null
 *   media.map.data    → MapResult | null
 *   media.data.data   → DataResult | null
 *   media.types       → ["photo", "map", "video"]  (ordem de relevância)
 */

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Tipos espelho do edge function ──────────────────────────────────────────
export type ContentType = "photo" | "video" | "map" | "data";

export interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  embedUrl: string;
}

export interface MapResult {
  iframeSrc: string;
  label: string;
}

export interface DataResult {
  source: string;
  title: string;
  url: string;
  embedUrl: string | null;
  description: string;
}

export interface MediaSlot<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

export interface RichMediaResult {
  types: ContentType[];          // tipos disponíveis para este tema (na ordem certa)
  photo: MediaSlot<{ imageUrl: string; provider: string }>;
  video: MediaSlot<VideoResult>;
  map: MediaSlot<MapResult>;
  data: MediaSlot<DataResult>;
}

// ─── Cache sessionStorage ─────────────────────────────────────────────────────
const SESS = "flora:rm:";
function sGet(k: string) { try { return sessionStorage.getItem(SESS + k) || null; } catch { return null; } }
function sSet(k: string, v: unknown) { try { sessionStorage.setItem(SESS + k, JSON.stringify(v)); } catch {} }
function sParse<T>(k: string): T | null { const r = sGet(k); if (!r) return null; try { return JSON.parse(r) as T; } catch { return null; } }
function slug(s: string) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60); }

function invoke<T>(action: string, body: object): Promise<T> {
  return supabase.functions.invoke("flora-images", { body: { action, ...body } })
    .then(({ data, error }) => {
      if (error || !data?.success) throw new Error(error?.message || "falhou");
      return data as T;
    });
}

// ─── Detecção local (espelho leve do edge function) ───────────────────────────
const GEO_HIST = ["geograf", "historia", "geopolit", "guerra", "imperia", "coloni", "bioma", "clima", "hidrogr", "urban"];
const DATA_SUBJ = ["matematica", "fisica", "quimica", "econom", "estatistic", "probabilid", "sociolog", "demograf"];

function detectTypes(subject: string, topic: string): ContentType[] {
  const hay = ((subject || "") + " " + (topic || "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const types: ContentType[] = ["photo"];
  if (GEO_HIST.some(t => hay.includes(t))) types.push("map");
  if (DATA_SUBJ.some(t => hay.includes(t))) types.push("data");
  types.push("video");
  return types;
}

// ─── Hook principal ───────────────────────────────────────────────────────────
interface UseRichMediaOptions {
  subject: string;
  topic: string;
  enabled?: boolean;
}

const EMPTY_SLOT = { data: null, loading: false, error: false };

export function useRichMedia({ subject, topic, enabled = true }: UseRichMediaOptions): RichMediaResult {
  const types = detectTypes(subject, topic);
  const typesKey = types.join(",");
  const key = slug(`${subject}-${topic}`);

  const [photo, setPhoto] = useState<MediaSlot<{ imageUrl: string; provider: string }>>(EMPTY_SLOT);
  const [video, setVideo] = useState<MediaSlot<VideoResult>>(EMPTY_SLOT);
  const [map, setMap]     = useState<MediaSlot<MapResult>>(EMPTY_SLOT);
  const [data, setData]   = useState<MediaSlot<DataResult>>(EMPTY_SLOT);

  const fetched = useRef(false);

  useEffect(() => {
    if (!enabled || !subject || !topic || fetched.current) return;
    fetched.current = true;

    const query = `${topic} ${subject}`;

    // ── Foto ─────────────────────────────────────────────────────
    const cachedPhoto = sParse<{ imageUrl: string; provider: string }>(`photo:${key}`);
    if (cachedPhoto) {
      setPhoto({ data: cachedPhoto, loading: false, error: false });
    } else {
      setPhoto(s => ({ ...s, loading: true }));
      invoke<{ imageUrl: string; provider: string }>("search", { query })
        .then(d => { sSet(`photo:${key}`, d); setPhoto({ data: d, loading: false, error: false }); })
        .catch(() => setPhoto({ data: null, loading: false, error: true }));
    }

    // ── Vídeo ─────────────────────────────────────────────────────
    const cachedVideo = sParse<VideoResult>(`video:${key}`);
    if (cachedVideo) {
      setVideo({ data: cachedVideo, loading: false, error: false });
    } else {
      setVideo(s => ({ ...s, loading: true }));
      invoke<VideoResult>("search_video", { query })
        .then(d => { sSet(`video:${key}`, d); setVideo({ data: d, loading: false, error: false }); })
        .catch(() => setVideo({ data: null, loading: false, error: true }));
    }

    // ── Mapa (só se relevante) ────────────────────────────────────
    if (types.includes("map")) {
      const cachedMap = sParse<MapResult>(`map:${key}`);
      if (cachedMap) {
        setMap({ data: cachedMap, loading: false, error: false });
      } else {
        setMap(s => ({ ...s, loading: true }));
        invoke<MapResult>("search_map", { topic: query })
          .then(d => { sSet(`map:${key}`, d); setMap({ data: d, loading: false, error: false }); })
          .catch(() => setMap({ data: null, loading: false, error: true }));
      }
    }

    // ── Dados (só se relevante) ────────────────────────────────────
    if (types.includes("data")) {
      const cachedData = sParse<DataResult>(`data:${key}`);
      if (cachedData) {
        setData({ data: cachedData, loading: false, error: false });
      } else {
        setData(s => ({ ...s, loading: true }));
        invoke<DataResult>("search_data", { topic: query })
          .then(d => { sSet(`data:${key}`, d); setData({ data: d, loading: false, error: false }); })
          .catch(() => setData({ data: null, loading: false, error: false })); // silencioso se não há dataset
      }
    }
  }, [key, typesKey, enabled]);

  useEffect(() => { fetched.current = false; }, [key, typesKey]);

  return { types, photo, video, map, data };
}
