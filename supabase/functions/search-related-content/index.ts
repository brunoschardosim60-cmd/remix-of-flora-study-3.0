import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, materia, difficulty = "medio", limit = 10 } = await req.json();

    if (!topic || !materia) {
      return jsonResponse({ error: "Tópico e matéria são obrigatórios" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Unauthorized: invalid token" }, 401);

    // Busca questões relacionadas no banco de dados
    const { data: questions, error: questionsError } = await supabase
      .from("study_questions")
      .select("id, titulo, descricao, materia, tema, dificuldade, alternativas, resposta_correta")
      .eq("materia", materia)
      .eq("tema", topic)
      .eq("dificuldade", difficulty)
      .limit(limit);

    if (questionsError) {
      console.error("Erro ao buscar questões:", questionsError);
      return jsonResponse({ error: "Erro ao buscar questões" }, 500);
    }

    // Busca vídeos relacionados (simulado, pois não temos integração direta com YouTube)
    const relatedVideos = [
      {
        id: "yt_1",
        titulo: `Aula sobre ${topic} - ${materia}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} ${materia}`)}`,
        fonte: "YouTube",
        duracao: "12:34",
      },
      {
        id: "yt_2",
        titulo: `${topic} - Explicação completa`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} explicação`)}`,
        fonte: "YouTube",
        duracao: "8:45",
      },
    ];

    // Busca recursos adicionais (links, artigos, etc.)
    const { data: resources, error: resourcesError } = await supabase
      .from("study_resources")
      .select("id, titulo, url, tipo, materia, tema")
      .eq("materia", materia)
      .eq("tema", topic)
      .limit(5);

    if (resourcesError) {
      console.error("Erro ao buscar recursos:", resourcesError);
    }

    return jsonResponse({
      success: true,
      data: {
        questions: questions || [],
        videos: relatedVideos,
        resources: resources || [],
        summary: {
          totalQuestions: questions?.length || 0,
          totalVideos: relatedVideos.length,
          totalResources: resources?.length || 0,
        },
      },
    });

  } catch (error) {
    console.error("Search Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
