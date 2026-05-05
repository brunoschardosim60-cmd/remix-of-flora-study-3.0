import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth obrigatória
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: authErr } = await client.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aceita GET (querystring) ou POST (json)
    let params: Record<string, any> = {};
    if (req.method === "POST") {
      try { params = await req.json(); } catch { params = {}; }
    } else {
      const url = new URL(req.url);
      url.searchParams.forEach((v, k) => { params[k] = v; });
    }

    const banca = String(params.banca || "").trim();
    const disciplina = String(params.disciplina || "").trim();
    const nivel = String(params.nivel || "").trim();
    const tipo = String(params.tipo || "").trim();
    const ano = params.ano ? Number(params.ano) : null;
    const tag = String(params.tag || "").trim();
    const random = params.random === true || params.random === "true" || params.mode === "random";
    const limit = Math.min(Math.max(Number(params.limit ?? 20), 1), 100);

    // Quando random=true, busca um pool maior e embaralha (RLS aplica via cliente do user)
    if (random) {
      const poolSize = Math.min(limit * 10, 500);
      let q = client
        .from("concurso_questions")
        .select("id,banca,ano,orgao,cargo,disciplina,tema,tipo,nivel,enunciado,afirmativa,alternativas,correta,explicacao,tags,dificuldade")
        .limit(poolSize);
      if (banca) q = q.eq("banca", banca);
      if (disciplina) q = q.eq("disciplina", disciplina);
      if (nivel) q = q.eq("nivel", nivel);
      if (tipo) q = q.eq("tipo", tipo);
      if (ano) q = q.eq("ano", ano);
      if (tag) q = q.contains("tags", [tag]);

      const { data, error } = await q;
      if (error) throw error;
      const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5).slice(0, limit);
      return new Response(JSON.stringify({ questions: shuffled, total: shuffled.length, mode: "random" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Listagem padrão com filtros + paginação
    const offset = Math.max(Number(params.offset ?? 0), 0);
    let q = client
      .from("concurso_questions")
      .select("id,banca,ano,orgao,cargo,disciplina,tema,tipo,nivel,enunciado,afirmativa,alternativas,correta,explicacao,tags,dificuldade", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (banca) q = q.eq("banca", banca);
    if (disciplina) q = q.eq("disciplina", disciplina);
    if (nivel) q = q.eq("nivel", nivel);
    if (tipo) q = q.eq("tipo", tipo);
    if (ano) q = q.eq("ano", ano);
    if (tag) q = q.contains("tags", [tag]);

    const { data, error, count } = await q;
    if (error) throw error;

    return new Response(JSON.stringify({
      questions: data ?? [],
      total: count ?? (data?.length ?? 0),
      offset,
      limit,
      mode: "list",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("concurso-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});