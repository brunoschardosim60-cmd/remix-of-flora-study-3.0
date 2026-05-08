import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { callLovable, parseAIJSON } from "../_shared/providers.ts";
import { LESSON_SYSTEM_PROMPT, buildLessonPrompt } from "../_shared/prompts_aulas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normCacheStr(s: string): string {
  return (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function buildCacheKey(parts: Record<string, string>): string {
  return Object.entries(parts).map(([k, v]) => `${k}:${normCacheStr(v)}`).join("|");
}

// Tópicos populares pré-definidos
const POPULAR_TOPICS: Array<{ materia: string; tema: string }> = [
  // Matemática
  { materia: "Matemática", tema: "Porcentagem" },
  { materia: "Matemática", tema: "Regra de Três" },
  { materia: "Matemática", tema: "Função do 1º Grau" },
  { materia: "Matemática", tema: "Função Quadrática" },
  { materia: "Matemática", tema: "Razão e Proporção" },
  { materia: "Matemática", tema: "Juros Simples e Compostos" },
  // Português
  { materia: "Português", tema: "Crase" },
  { materia: "Português", tema: "Concordância Verbal e Nominal" },
  { materia: "Português", tema: "Interpretação de Texto" },
  { materia: "Português", tema: "Regência Verbal" },
  // Redação
  { materia: "Redação", tema: "Estrutura da Redação ENEM" },
  { materia: "Redação", tema: "Como Fazer uma Boa Introdução" },
  { materia: "Redação", tema: "Como Fazer uma Boa Conclusão (Proposta de Intervenção)" },
  // História
  { materia: "História", tema: "Revolução Francesa" },
  { materia: "História", tema: "Guerra Fria" },
  { materia: "História", tema: "Era Vargas" },
  // Biologia
  { materia: "Biologia", tema: "Mitose e Meiose" },
  { materia: "Biologia", tema: "Genética Básica - Leis de Mendel" },
  { materia: "Biologia", tema: "Ecologia - Cadeia Alimentar" },
  // Física
  { materia: "Física", tema: "Cinemática - MRU e MRUV" },
  { materia: "Física", tema: "Leis de Newton" },
  // Química
  { materia: "Química", tema: "Tabela Periódica" },
  { materia: "Química", tema: "Ligações Químicas" },
  // Geografia
  { materia: "Geografia", tema: "Globalização" },
  { materia: "Geografia", tema: "Climas do Brasil" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: precisa ser admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Apenas admins" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode: "rapida" | "completa" | "masterclass" = body.mode || "completa";
    const level: "enem" | "concurso" | "basico" = body.level || "enem";
    const onlyMissing: boolean = body.onlyMissing !== false; // default true
    const customTopics = Array.isArray(body.topics) ? body.topics : null;
    const topics = customTopics?.length ? customTopics : POPULAR_TOPICS;

    const results: any[] = [];
    let okCount = 0, skipCount = 0, errCount = 0;

    for (const t of topics) {
      const materia = t.materia || "Geral";
      const tema = t.tema || "";
      const cacheKey = buildCacheKey({
        k: "lesson",
        materia,
        tema,
        level,
        style: "normal",
        mode,
      });

      // skip se já existe
      if (onlyMissing) {
        const { data: exists } = await supabase
          .from("content_cache")
          .select("id")
          .eq("cache_key", cacheKey)
          .maybeSingle();
        if (exists?.id) { skipCount++; results.push({ materia, tema, status: "skip" }); continue; }
      }

      try {
        const userPrompt = buildLessonPrompt("", materia, tema, level, "normal", mode);
        const tokensCap = mode === "masterclass" ? 8000 : mode === "rapida" ? 2200 : 4500;
        const raw = await callLovable({
          messages: [
            { role: "system", content: LESSON_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          maxTokens: tokensCap,
          temperature: 0.7,
          jsonMode: true,
        });
        const lesson = parseAIJSON(raw as string);
        if (!lesson) throw new Error("Falha ao parsear JSON");

        await supabase.from("content_cache").upsert({
          cache_key: cacheKey,
          tipo: "lesson",
          materia,
          tema,
          dificuldade: "normal",
          estilo: mode,
          objetivo: level,
          payload: { lesson },
          hits: 0,
        }, { onConflict: "cache_key" });

        okCount++;
        results.push({ materia, tema, status: "ok" });
      } catch (e: any) {
        errCount++;
        results.push({ materia, tema, status: "error", error: String(e?.message || e) });
      }

      // pequena pausa pra não estourar rate limit
      await new Promise(r => setTimeout(r, 400));
    }

    return new Response(JSON.stringify({
      ok: true,
      mode, level,
      total: topics.length,
      created: okCount,
      skipped: skipCount,
      errors: errCount,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});