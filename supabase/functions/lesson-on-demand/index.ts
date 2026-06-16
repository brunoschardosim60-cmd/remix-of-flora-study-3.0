/**
 * lesson-on-demand
 * Geração on-demand de aula com cache permanente em `content_cache`.
 *
 * Fluxo:
 *   1. Recebe { materia, tema, level? }.
 *   2. Monta cache_key e procura em content_cache (tipo='lesson').
 *      - HIT: incrementa hits, retorna payload (cached=true).
 *   3. MISS: chama IA (Lovable AI Gateway, gemini-2.5-pro), salva no
 *      content_cache com expires_at=NULL (permanente), retorna (cached=false).
 *
 * Não exige admin — qualquer usuário autenticado pode pedir.
 * Como o cache é compartilhado, a 2ª pessoa que pedir a mesma aula
 * recebe instantaneamente sem custo de IA.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalize(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildKey(materia: string, tema: string, level: string): string {
  return `k:lesson|materia:${normalize(materia)}|tema:${normalize(tema)}|level:${normalize(level)}`;
}

const SYSTEM = `Você é a Flora, professora particular brasileira. Gere uma AULA INTERATIVA COMPLETA em JSON estrito.
Esquema obrigatório:
{
  "titulo": string,
  "introducao": string (2-3 parágrafos cativantes),
  "blocos": [ // 6 a 9 blocos
    {
      "titulo": string,
      "conteudo": string (markdown, 2-4 parágrafos, pode usar $...$ para LaTeX),
      "macete"?: string,
      "pegadinha"?: string,
      "analogia"?: string,
      "exemplo_resolvido"?: string,
      "flora_comment"?: string,
      "checkpoint"?: string
    }
  ],
  "resumo": string[] (5-7 bullets),
  "exercicio_final": {
    "pergunta": string,
    "alternativas": [string, string, string, string, string],
    "correta": number (0-4),
    "explicacao": string
  }
}
Linguagem: PT-BR, didática, calorosa, sem rodeios. Exemplos brasileiros. NUNCA invente fatos históricos.`;

function sanitizeJson(raw: string): string {
  let s = (raw || "").trim();
  // Remove code fences ```json ... ```
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s.trim();
}

async function callAI(lovableKey: string, model: string, userPrompt: string, signal: AbortSignal) {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 8000,
      temperature: 0.6,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { materia, tema, level = "medio" } = await req.json();
    if (!materia || !tema) return json({ error: "materia e tema obrigatórios" }, 400);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const cacheKey = buildKey(String(materia), String(tema), String(level));

    // 1) Lookup cache
    const { data: hit } = await supabaseAdmin
      .from("content_cache")
      .select("id, payload, hits")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (hit?.payload) {
      // Incrementa hits assíncrono (best-effort)
      supabaseAdmin
        .from("content_cache")
        .update({ hits: (hit.hits || 0) + 1 })
        .eq("id", hit.id)
        .then(() => {});
      return json({ cached: true, lesson: hit.payload });
    }

    // 2) MISS — gera via Lovable AI
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const userPrompt = `Matéria: ${materia}\nTema: ${tema}\nNível: ${level}\nGere a aula completa em JSON conforme o esquema.`;

    // Tenta gemini-2.5-pro primeiro; se falhar (5xx/timeout) cai para flash.
    const models = ["google/gemini-2.5-pro", "google/gemini-2.5-flash"];
    let ai: Response | null = null;
    let lastErr = "";
    for (const model of models) {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 55_000);
      try {
        ai = await callAI(lovableKey, model, userPrompt, ctl.signal);
        clearTimeout(to);
        if (ai.ok) break;
        if (ai.status === 429) return json({ error: "Limite de uso da IA. Tente em alguns minutos." }, 429);
        if (ai.status === 402) return json({ error: "Créditos esgotados. Adicione mais em Settings." }, 402);
        lastErr = `${model} retornou HTTP ${ai.status}`;
        console.error("AI error:", model, ai.status, await ai.text());
        ai = null;
      } catch (e) {
        clearTimeout(to);
        lastErr = `${model}: ${(e as Error).message}`;
        console.error("AI exception:", model, e);
      }
    }
    if (!ai) return json({ error: `IA indisponível agora (${lastErr}). Tente novamente em 1 min.` }, 502);

    const aiJson = await ai.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "";
    let lesson: unknown;
    try {
      lesson = JSON.parse(sanitizeJson(String(raw)));
    } catch (e) {
      console.error("JSON parse failed. Raw head:", String(raw).slice(0, 300));
      return json({ error: "IA retornou JSON inválido — tente reformular o tema." }, 502);
    }

    // 3) Salva no cache permanente
    await supabaseAdmin.from("content_cache").upsert({
      cache_key: cacheKey,
      tipo: "lesson",
      materia: String(materia),
      tema: String(tema),
      dificuldade: String(level),
      banca: "",
      estilo: "",
      objetivo: "enem",
      payload: lesson,
      hits: 1,
      expires_at: null,
    }, { onConflict: "cache_key" });

    return json({ cached: false, lesson });
  } catch (e) {
    console.error("lesson-on-demand error:", e);
    return json({ error: (e as Error).message || "Erro inesperado" }, 500);
  }
});