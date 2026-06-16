/**
 * weekly-adaptive-quiz
 * Gera 10 questões focadas nos pontos fracos do aluno na semana.
 * Reusa o mesmo pipeline de IA (callWithTaskFallback) usado em generate-questions.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callWithTaskFallback, parseAIJSON, type Msg } from "../_shared/providers.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Performance da última semana → identifica matérias com menor accuracy
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: perf } = await supabase
      .from("student_performance")
      .select("materia, accuracy, erro_recorrente")
      .eq("user_id", user.id)
      .gte("updated_at", oneWeekAgo)
      .order("accuracy", { ascending: true })
      .limit(5);

    const weakSubjects = (perf || [])
      .filter((p) => p.accuracy < 0.7 || p.erro_recorrente)
      .map((p) => p.materia);

    // Fallback: pega matérias difíceis declaradas no onboarding
    let topics = weakSubjects;
    if (topics.length === 0) {
      const { data: ob } = await supabase
        .from("student_onboarding")
        .select("materias_dificeis")
        .eq("user_id", user.id)
        .maybeSingle();
      topics = (ob?.materias_dificeis as string[] | undefined) || ["Matemática", "Português"];
    }

    const topicList = topics.slice(0, 4).join(", ");

    const messages: Msg[] = [
      {
        role: "system",
        content:
          "Você cria simulados adaptativos no estilo ENEM. Gere 10 questões objetivas, 5 alternativas (A–E), uma única correta, com explicação curta. Responda APENAS JSON válido, sem markdown.",
      },
      {
        role: "user",
        content: `Gere 10 questões objetivas focadas nestes pontos fracos do aluno: ${topicList}.

Formato JSON estrito:
{
  "questoes": [
    {
      "enunciado": "string",
      "alternativas": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "correta": "A" | "B" | "C" | "D" | "E",
      "explicacao": "1-2 frases",
      "materia": "string",
      "tema": "string"
    }
  ]
}`,
      },
    ];

    const text = await callWithTaskFallback(
      { messages, temperature: 0.6, jsonMode: true, maxTokens: 3000 },
      "quiz",
      "weekly-adaptive-quiz",
    );
    const parsed = parseAIJSON(text) as { questoes?: unknown[] } | unknown[];
    const questoes = Array.isArray(parsed) ? parsed : (parsed?.questoes ?? []);

    return json({ questoes, weakTopics: topics.slice(0, 4) });
  } catch (e) {
    console.error("weekly-adaptive-quiz error:", e);
    return json({ error: (e as Error).message || "Erro inesperado" }, 500);
  }
});