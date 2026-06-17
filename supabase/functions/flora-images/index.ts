/**
 * supabase/functions/flora-images/index.ts — v3
 *
 * actions disponíveis:
 *   "search"       → foto (Unsplash → Pexels → Pixabay)        [já existia]
 *   "generate"     → DALL-E 3                                   [já existia]
 *   "search_video" → YouTube Data API v3
 *   "search_map"   → retorna URL iframe OpenStreetMap (sem chave)
 *   "search_data"  → IBGE ou Our World in Data (sem chave)
 *
 * Variáveis de ambiente:
 *   OPENAI_API_KEY, UNSPLASH_ACCESS_KEY, PEXELS_API_KEY, PIXABAY_API_KEY  [já existiam]
 *   YOUTUBE_API_KEY   — console.cloud.google.com → YouTube Data API v3 (10k units/dia grátis)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { cacheLookup, cacheStore, normCacheStr } from "../_shared/cache.ts";

const OPENAI_KEY    = Deno.env.get("OPENAI_API_KEY");
const LOVABLE_KEY   = Deno.env.get("LOVABLE_API_KEY");
const UNSPLASH_KEY  = Deno.env.get("UNSPLASH_ACCESS_KEY");
const PEXELS_KEY    = Deno.env.get("PEXELS_API_KEY");
const PIXABAY_KEY   = Deno.env.get("PIXABAY_API_KEY");
const PIXABAY_VIDEO_KEY = Deno.env.get("PIXABAY_VIDEO_API_KEY") || Deno.env.get("PIXABAY_API_KEY");
const YOUTUBE_KEY   = Deno.env.get("YOUTUBE_API_KEY");
const SUPA_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPA_ANON     = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ─── Tradução PT → EN ─────────────────────────────────────────────────────────
const PT_EN: [RegExp, string][] = [
  [/\bmatematica\b/g, "mathematics"], [/\bquimica\b/g, "chemistry"],
  [/\bfisica\b/g, "physics"], [/\bbiologia\b/g, "biology"],
  [/\bgeografia\b/g, "geography"], [/\bhistoria\b/g, "history"],
  [/\bportuges\b/g, "portuguese language"], [/\bredacao\b/g, "writing essay"],
  [/\bcelula\b/g, "cell biology"], [/\bdna\b/g, "DNA genetics"],
  [/\bevolucao\b/g, "evolution"], [/\becologia\b/g, "ecology nature"],
  [/\bfotossintese\b/g, "photosynthesis"], [/\bclima\b/g, "climate weather"],
  [/\bguerra\b/g, "war history"], [/\brevolu/g, "revolution"],
  [/\bimperio\b/g, "empire history"], [/\bcircuito\b/g, "electric circuit"],
  [/\beletric/g, "electricity"], [/\bnewton\b/g, "physics force"],
  [/\btermodinamic/g, "thermodynamics"], [/\botica\b/g, "optics light"],
  [/\bondul/g, "waves physics"], [/\bmolecul/g, "molecule"],
  [/\batom/g, "atom"], [/\borganica\b/g, "organic chemistry"],
  [/\balgeb/g, "algebra"], [/\bgeometr/g, "geometry"],
  [/\bfuncao\b/g, "function math"], [/\bprobabilid/g, "probability"],
  [/\bestatistic/g, "statistics"], [/\bjuros\b/g, "finance interest"],
  [/\bfilosof/g, "philosophy"], [/\bsociolog/g, "sociology"],
  [/\bdireit/g, "law justice"], [/\burbani/g, "urban city"],
  [/\bhidrogr/g, "river hydrology"], [/\bbioma\b/g, "biome ecosystem"],
  [/\bamazonia\b/g, "amazon rainforest"], [/\bmitose\b/g, "mitosis cell"],
  [/\bmeiose\b/g, "meiosis"], [/\bengenharia\b/g, "engineering"],
  [/\bcinematic/g, "kinematics motion"], [/\bguerr/g, "war"],
  [/\brepublica\b/g, "republic"], [/\bcoloni/g, "colonization"],
];

function toEn(raw: string): string {
  let q = (raw || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  for (const [re, en] of PT_EN) q = q.replace(re, en);
  return q.slice(0, 80);
}

// ─── Detecta tipo de conteúdo mais útil pela matéria/tema ────────────────────
export type ContentType = "photo" | "video" | "map" | "data";

const GEO_HIST = ["geograf", "historia", "geopolit", "guerra", "imperia", "coloni", "bioma", "clima", "hidrogr", "urban"];
const DATA_SUBJECTS = ["matematica", "fisica", "quimica", "econom", "estatistic", "probabilid", "sociolog", "demograf"];

export function detectContentType(subject: string, topic: string): ContentType[] {
  const hay = ((subject || "") + " " + (topic || "")).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const types: ContentType[] = ["photo"]; // foto sempre disponível
  if (GEO_HIST.some(t => hay.includes(t))) types.push("map");
  if (DATA_SUBJECTS.some(t => hay.includes(t))) types.push("data");
  types.push("video"); // vídeo sempre disponível como último
  return types;
}

// ─── FOTO: Unsplash → Pexels → Pixabay ───────────────────────────────────────
async function searchUnsplash(q: string): Promise<string | null> {
  if (!UNSPLASH_KEY) return null;
  const r = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) { console.warn(`[flora-images] Unsplash ${r.status}`); return null; }
  const d = await r.json();
  return d?.urls?.regular || d?.urls?.small || null;
}

async function searchPexels(q: string): Promise<string | null> {
  if (!PEXELS_KEY) return null;
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape`,
    { headers: { Authorization: PEXELS_KEY }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) { console.warn(`[flora-images] Pexels ${r.status}`); return null; }
  const d = await r.json();
  const photos: any[] = d?.photos || [];
  if (!photos.length) return null;
  const pick = photos[Math.floor(photos.length / 2)];
  return pick?.src?.large || pick?.src?.medium || null;
}

async function searchPixabay(q: string): Promise<string | null> {
  if (!PIXABAY_KEY) return null;
  const r = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=5`,
    { signal: AbortSignal.timeout(8000) });
  if (!r.ok) { console.warn(`[flora-images] Pixabay ${r.status}`); return null; }
  const d = await r.json();
  const hits: any[] = d?.hits || [];
  if (!hits.length) return null;
  const pick = hits[Math.floor(hits.length / 2)];
  return pick?.webformatURL || null;
}

async function searchPhoto(query: string): Promise<{ imageUrl: string; provider: string }> {
  const q = toEn(query);
  for (const [name, fn] of [
    ["pixabay",  () => searchPixabay(q)],
    ["unsplash", () => searchUnsplash(q)],
    ["pexels",   () => searchPexels(q)],
  ] as [string, () => Promise<string | null>][]) {
    try {
      const url = await fn();
      if (url) { console.log(`[flora-images:photo] ${name} OK`); return { imageUrl: url, provider: name }; }
    } catch (e) { console.warn(`[flora-images:photo] ${name} falhou:`, e instanceof Error ? e.message : e); }
  }
  throw new Error("Todos os provedores de foto falharam");
}

// ─── Gera ilustração via IA quando bancos de foto falham ────────────────────
// Modelo escolhido por tier: free/pro = flash-image (barato); pro_plus = pro-image-preview (alta qualidade)
async function generateAiImage(concept: string, tier: string = "free"): Promise<string | null> {
  if (!LOVABLE_KEY) return null;
  const model = tier === "pro_plus"
    ? "google/gemini-3-pro-image-preview"
    : "google/gemini-2.5-flash-image";
  const prompt = `Educational illustration about "${concept}". Clear, colorful, didactic, no text overlays, suitable for students.`;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
      signal: AbortSignal.timeout(40000),
    });
    if (!r.ok) { console.warn(`[flora-images:ai] ${model} ${r.status}`); return null; }
    const d = await r.json();
    const msg = d?.choices?.[0]?.message;
    const img =
      msg?.images?.[0]?.image_url?.url ||
      msg?.images?.[0]?.url ||
      (Array.isArray(msg?.content) ? msg.content.find((c: any) => c?.image_url?.url)?.image_url?.url : null) ||
      (typeof msg?.content === "string" && msg.content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/)?.[0]);
    return img || null;
  } catch (e) { console.warn("[flora-images:ai] falhou:", e instanceof Error ? e.message : e); return null; }
}

// ─── VÍDEO: YouTube Data API v3 ───────────────────────────────────────────────
export interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  embedUrl: string;
}

async function searchVideo(query: string, lang = "pt"): Promise<VideoResult | null> {
  // 1ª tentativa: Pixabay Videos (sem necessidade de embed externo)
  if (PIXABAY_VIDEO_KEY) {
    try {
      const q = encodeURIComponent(toEn(query));
      const r = await fetch(`https://pixabay.com/api/videos/?key=${PIXABAY_VIDEO_KEY}&q=${q}&per_page=5&safesearch=true`,
        { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d = await r.json();
        const hits: any[] = d?.hits || [];
        if (hits.length) {
          const pick = hits[0];
          const v = pick.videos?.medium || pick.videos?.small || pick.videos?.tiny || pick.videos?.large;
          if (v?.url) {
            return {
              videoId: String(pick.id),
              title: (pick.tags || query).split(",")[0].trim(),
              channelTitle: pick.user || "Pixabay",
              thumbnail: v.thumbnail || "",
              embedUrl: v.url, // MP4 direto — usar em <video src="..."> ou iframe
            };
          }
        }
      } else {
        console.warn(`[flora-images] Pixabay video ${r.status}`);
      }
    } catch (e) { console.warn("[flora-images] Pixabay video falhou:", e instanceof Error ? e.message : e); }
  }
  // Fallback: YouTube se a chave estiver presente
  if (!YOUTUBE_KEY) { console.warn("[flora-images] sem provedor de vídeo"); return null; }
  // Busca em PT-BR primeiro, depois EN como fallback
  const q = encodeURIComponent(`${query} aula explicação`);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&videoEmbeddable=true&relevanceLanguage=${lang}&safeSearch=strict&maxResults=5&key=${YOUTUBE_KEY}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) { console.warn(`[flora-images] YouTube ${r.status}`); return null; }
  const d = await r.json();
  const items: any[] = d?.items || [];
  if (!items.length) return null;
  // Prefere vídeos com duração razoável (não filtrável sem API adicional, pega o primeiro)
  const item = items[0];
  const videoId: string = item?.id?.videoId;
  if (!videoId) return null;
  return {
    videoId,
    title: item.snippet?.title || "",
    channelTitle: item.snippet?.channelTitle || "",
    thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
    embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
  };
}

// ─── MAPA: OpenStreetMap iframe (sem chave, gratuito) ────────────────────────
export interface MapResult {
  iframeSrc: string;
  label: string;
}

// Coordenadas pré-definidas para temas comuns
const GEO_COORDS: Record<string, [number, number, number]> = { // [lat, lon, zoom]
  "brasil": [-15.8, -47.9, 4], "amazonia": [-3.4, -65.0, 5],
  "africa": [1.0, 20.0, 3], "europa": [50.0, 10.0, 4],
  "asia": [35.0, 100.0, 3], "america": [10.0, -80.0, 3],
  "china": [35.0, 105.0, 4], "russia": [60.0, 90.0, 3],
  "eua": [39.5, -98.4, 4], "oriente medio": [28.0, 45.0, 4],
  "india": [22.0, 79.0, 4], "japao": [36.0, 138.0, 5],
  "argentina": [-34.6, -58.4, 4], "franca": [46.0, 2.0, 5],
  "alemanha": [51.0, 10.0, 5], "itália": [42.0, 12.0, 5],
  "angola": [-11.2, 17.9, 5], "mocambique": [-18.0, 35.0, 5],
};

function buildMapUrl(topic: string): MapResult {
  const hay = topic.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let lat = -15.8, lon = -47.9, zoom = 4, label = "Brasil";
  for (const [key, [la, lo, z]] of Object.entries(GEO_COORDS)) {
    if (hay.includes(key)) { lat = la; lon = lo; zoom = z; label = key; break; }
  }
  return {
    iframeSrc: `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 15}%2C${lat - 10}%2C${lon + 15}%2C${lat + 10}&layer=mapnik&marker=${lat}%2C${lon}`,
    label,
  };
}

// ─── DADOS: IBGE / Our World in Data ─────────────────────────────────────────
export interface DataResult {
  source: string;
  title: string;
  url: string;
  embedUrl: string | null;
  description: string;
}

// Datasets curados por tema — OWID tem iframes embutíveis
const DATA_CATALOG: Array<{ keywords: string[]; title: string; owid: string; desc: string }> = [
  { keywords: ["populac", "demograf", "crescimento populacional"],
    title: "Crescimento populacional mundial", owid: "population-growth",
    desc: "Evolução da população global ao longo dos séculos" },
  { keywords: ["pib", "economia", "renda", "desigualdade"],
    title: "PIB per capita por país", owid: "gdp-per-capita-worldbank",
    desc: "Renda média por habitante em diferentes países" },
  { keywords: ["co2", "emissao", "clima", "aquecimento", "efeito estufa"],
    title: "Emissões de CO₂ por país", owid: "co2-emissions",
    desc: "Emissões de dióxido de carbono ao longo do tempo" },
  { keywords: ["expectativa de vida", "mortalidade", "saude"],
    title: "Expectativa de vida", owid: "life-expectancy",
    desc: "Evolução da expectativa de vida no mundo" },
  { keywords: ["energia", "renovavel", "eletricidade"],
    title: "Mix de energia elétrica", owid: "electricity-mix",
    desc: "Fontes de geração de energia por país" },
  { keywords: ["educacao", "alfabetizacao", "escolaridade"],
    title: "Taxa de alfabetização", owid: "literacy-rate-by-generation",
    desc: "Evolução da alfabetização global" },
  { keywords: ["biodiversidade", "extincao", "especies"],
    title: "Índice de biodiversidade", owid: "biodiversity",
    desc: "Perda de espécies ao longo do tempo" },
  { keywords: ["desmatamento", "floresta", "amazonia"],
    title: "Desmatamento global", owid: "forest-area",
    desc: "Perda de cobertura florestal por país" },
];

function findDataset(topic: string): DataResult | null {
  const hay = topic.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const item of DATA_CATALOG) {
    if (item.keywords.some(k => hay.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()))) {
      return {
        source: "Our World in Data",
        title: item.title,
        url: `https://ourworldindata.org/grapher/${item.owid}`,
        embedUrl: `https://ourworldindata.org/grapher/${item.owid}?tab=chart`,
        description: item.desc,
      };
    }
  }
  return null;
}

// ─── DALL-E (legado) ──────────────────────────────────────────────────────────
function buildDallePrompt(concept: string, context: string, style: string): string {
  const styles: Record<string, string> = {
    scientific: "scientific illustration, accurate, detailed, labeled, educational",
    educational: "educational diagram, clear, colorful, easy to understand for students",
    artistic: "artistic representation, creative, visually appealing, engaging",
    diagram: "technical diagram, schematic, clean lines, professional",
  };
  return `Create an educational illustration for teaching "${concept}". Context: ${context}. Style: ${styles[style] || styles.educational}. No text overlays. Professional quality.`;
}

async function generateDalle(concept: string, context: string, style: string): Promise<string> {
  if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY ausente");
  const prompt = buildDallePrompt(concept, context, style);
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) { const t = await r.text().catch(() => ""); throw new Error(`Image gen ${r.status}: ${t.slice(0, 200)}`); }
  const d = await r.json();
  const msg = d?.choices?.[0]?.message;
  const img =
    msg?.images?.[0]?.image_url?.url ||
    msg?.images?.[0]?.url ||
    (Array.isArray(msg?.content) ? msg.content.find((c: any) => c?.image_url?.url)?.image_url?.url : null) ||
    (typeof msg?.content === "string" && msg.content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/)?.[0]);
  if (!img) {
    console.error("[flora-images] image gen response:", JSON.stringify(d).slice(0, 800));
    throw new Error("Image gen: sem URL");
  }
  return img;
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(SUPA_URL, SUPA_ANON);

  try {
    const body = await req.json();
    const action: string = body.action || "generate";

    // ── search_video ─────────────────────────────────────────────
    if (action === "search_video") {
      const query: string = body.query || "";
      if (!query.trim()) return json({ error: "query obrigatório" }, 400);
      const cacheKey = `vid:${normCacheStr(query)}`;
      const cached = await cacheLookup(supabase, cacheKey);
      if (cached?.videoId) return json({ success: true, ...cached, cached: true });

      const result = await searchVideo(query);
      if (!result) return json({ success: false, error: "Nenhum vídeo encontrado" });
      await cacheStore(supabase, cacheKey, { tipo: "video_search", tema: query }, result, 7 * 24 * 3600);
      return json({ success: true, ...result });
    }

    // ── search_map ───────────────────────────────────────────────
    if (action === "search_map") {
      const topic: string = body.topic || body.query || "";
      const result = buildMapUrl(topic);
      return json({ success: true, ...result });
    }

    // ── search_data ──────────────────────────────────────────────
    if (action === "search_data") {
      const topic: string = body.topic || body.query || "";
      const result = findDataset(topic);
      if (!result) return json({ success: false, error: "Nenhum dataset encontrado para este tema" });
      return json({ success: true, ...result });
    }

    // ── detect ───────────────────────────────────────────────────
    if (action === "detect") {
      const subject: string = body.subject || "";
      const topic: string = body.topic || "";
      return json({ success: true, types: detectContentType(subject, topic) });
    }

    // ── ai_generate (IA real, sob demanda do usuário) ────────────
    // Usado quando o aluno pede explicitamente: "desenha", "gera imagem de…"
    // Sempre tenta IA primeiro; cai pra busca de foto se IA falhar.
    if (action === "ai_generate") {
      const prompt: string = (body.prompt || body.concept || body.query || "").trim();
      if (!prompt) return json({ error: "prompt obrigatório" }, 400);
      const tier: string = body.tier || "free";
      const cacheKey = `img-ai:${normCacheStr(prompt)}:${tier}`;
      const cached = await cacheLookup(supabase, cacheKey);
      if (cached?.imageUrl) return json({ success: true, imageUrl: cached.imageUrl, provider: cached.provider, cached: true });
      const aiUrl = await generateAiImage(prompt, tier);
      if (aiUrl) {
        await cacheStore(supabase, cacheKey, { tipo: "image_ai", tema: prompt }, { imageUrl: aiUrl, provider: `ai:${tier}` }, 30 * 24 * 3600);
        return json({ success: true, imageUrl: aiUrl, provider: `ai:${tier}`, generated: true });
      }
      // Fallback: foto real
      try {
        const { imageUrl, provider } = await searchPhoto(prompt);
        return json({ success: true, imageUrl, provider, fallback: true });
      } catch (e) {
        return json({ success: false, error: "image_unavailable", reason: e instanceof Error ? e.message : String(e) });
      }
    }

    // ── search (foto) ────────────────────────────────────────────
    if (action === "search") {
      const rawQuery: string = body.query || body.concept || "";
      if (!rawQuery.trim()) return json({ error: "query obrigatório" }, 400);
      const enQuery = toEn(rawQuery);
      const cacheKey = `img-search:${normCacheStr(enQuery)}`;
      const cached = await cacheLookup(supabase, cacheKey);
      if (cached?.imageUrl) return json({ success: true, ...cached, cached: true });
      try {
        const { imageUrl, provider } = await searchPhoto(rawQuery);
        await cacheStore(supabase, cacheKey, { tipo: "image_search", tema: rawQuery }, { imageUrl, provider, query: enQuery }, 7 * 24 * 3600);
        return json({ success: true, imageUrl, provider, query: enQuery });
      } catch (e) {
        // Fallback: se nenhum banco de foto retornou, gera via IA (modelo barato por padrão)
        const tier: string = body.tier || "free";
        const aiUrl = await generateAiImage(rawQuery, tier);
        if (aiUrl) {
          await cacheStore(supabase, cacheKey, { tipo: "image_search", tema: rawQuery }, { imageUrl: aiUrl, provider: `ai:${tier}`, query: enQuery }, 30 * 24 * 3600);
          return json({ success: true, imageUrl: aiUrl, provider: `ai:${tier}`, query: enQuery, generated: true });
        }
        return json({ success: false, error: "image_unavailable", reason: e instanceof Error ? e.message : String(e) });
      }
    }

    // ── generate (DALL-E legado) ──────────────────────────────────
    // ── generate / default: usa busca de foto real (Pixabay → Unsplash → Pexels) ──
    // A IA NÃO gera imagem. Apenas bancos de foto reais, com cache permanente
    // da melhor foto encontrada por conceito.
    const { concept, context } = body;
    if (!concept) return json({ error: "concept obrigatório" }, 400);
    const queryRaw = `${concept} ${context || ""}`.trim();
    const enQuery = toEn(queryRaw);
    const cacheKey = `img-search:${normCacheStr(enQuery)}`;
    const cached = await cacheLookup(supabase, cacheKey);
    if (cached?.imageUrl) {
      return json({ success: true, imageUrl: cached.imageUrl, provider: cached.provider, concept, cached: true });
    }
    try {
      const { imageUrl, provider } = await searchPhoto(queryRaw);
      await cacheStore(supabase, cacheKey, { tipo: "image_search", tema: queryRaw }, { imageUrl, provider, query: enQuery }, 30 * 24 * 3600);
      return json({ success: true, imageUrl, provider, concept });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ success: false, error: "image_unavailable", reason: msg.slice(0, 120) });
    }

  } catch (error) {
    console.error("[flora-images] erro:", error);
    return json({ error: "Internal server error", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});
