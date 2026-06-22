import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkQuota, logAIUsage, quotaExceededResponse } from "../_shared/usage.ts";
import {
  type CallOptions,
  callGemini,
  callGroq,
  callMistral,
  callLovable,
  runChainEx,
  parseAIJSON,
} from "../_shared/providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function buildChain(opts: CallOptions): Array<[string, () => Promise<string>]> {
  const k1 = Deno.env.get("GEMINI_API_KEY") ?? "";
  const k2 = Deno.env.get("GEMINI_API_KEY_2") ?? "";
  return [
    ["gemini",   () => callGemini(opts, k1, "gemini-2.0-flash")],
    ["gemini_2", () => callGemini(opts, k2, "gemini-2.0-flash")],
    ["groq",     () => callGroq(opts)],
    ["mistral",  () => callMistral(opts)],
    ["lovable",  () => callLovable(opts)],
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await caller.auth.getUser();
    if (authErr || !user) return json({ error: "Sessão inválida" }, 401);
    const userId = user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const quota = await checkQuota(admin, userId, "essay_theme");
    if (!quota.allowed) return quotaExceededResponse(quota, corsHeaders);

    // ── Coleta de dados reais do aluno ────────────────────────────────────
    const [
      onboardingRes,
      essaysRes,
      attemptsRes,
      sessionsRes,
      topicsRes,
    ] = await Promise.all([
      admin.from("student_onboarding")
        .select("objetivo, banca, materias_dificeis, tempo_disponivel_min, meta_resultado, rotina")
        .eq("user_id", userId).maybeSingle(),
      admin.from("essays")
        .select("tema, nota_total, competencia_1, competencia_2, competencia_3, competencia_4, competencia_5, feedback_geral, corrected_at, status")
        .eq("user_id", userId).eq("status", "corrigida")
        .order("corrected_at", { ascending: false }).limit(10),
      admin.from("question_attempts")
        .select("acertou, created_at, question:questions(disciplina, tema)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(150),
      admin.from("study_sessions")
        .select("subject, duration_ms, start_at")
        .eq("user_id", userId)
        .order("start_at", { ascending: false }).limit(60),
      admin.from("study_topics")
        .select("tema, materia, rating, quiz_last_score")
        .eq("user_id", userId)
        .order("study_date", { ascending: false }).limit(30),
    ]);

    const onboarding = onboardingRes.data ?? null;
    const essays = essaysRes.data ?? [];
    const attempts = attemptsRes.data ?? [];
    const sessions = sessionsRes.data ?? [];
    const topics = topicsRes.data ?? [];

    // ── Agregações ────────────────────────────────────────────────────────
    const compAvg = (k: keyof typeof essays[number]) => {
      const vals = essays.map((e: any) => e[k]).filter((v: any) => typeof v === "number");
      return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
    };
    const competenciasMedia = {
      c1: compAvg("competencia_1" as any),
      c2: compAvg("competencia_2" as any),
      c3: compAvg("competencia_3" as any),
      c4: compAvg("competencia_4" as any),
      c5: compAvg("competencia_5" as any),
    };
    const notas = essays.map((e: any) => e.nota_total).filter((n: any) => typeof n === "number");
    const notaMedia = notas.length ? Math.round(notas.reduce((a: number, b: number) => a + b, 0) / notas.length) : null;
    const evolucao = notas.length >= 2 ? (notas[0] - notas[notas.length - 1]) : 0;

    const porMateria: Record<string, { total: number; acertos: number }> = {};
    for (const a of attempts as any[]) {
      const m = a?.question?.disciplina?.trim();
      if (!m) continue;
      const b = porMateria[m] ||= { total: 0, acertos: 0 };
      b.total++;
      if (a.acertou) b.acertos++;
    }
    const desempenhoMaterias = Object.entries(porMateria)
      .filter(([, v]) => v.total >= 3)
      .map(([m, v]) => ({ materia: m, acertos: v.acertos, total: v.total, taxa: Math.round((v.acertos / v.total) * 100) }))
      .sort((a, b) => a.taxa - b.taxa);

    const horasPorMateria: Record<string, number> = {};
    for (const s of sessions as any[]) {
      if (!s?.subject) continue;
      horasPorMateria[s.subject] = (horasPorMateria[s.subject] || 0) + (s.duration_ms || 0);
    }
    const tempoEstudo = Object.entries(horasPorMateria).map(([m, ms]) => ({ materia: m, horas: +(ms / 3600000).toFixed(1) }));

    // ── Prompt com dados reais ────────────────────────────────────────────
    const objetivo = onboarding?.objetivo || "enem";
    const dadosPrompt = {
      perfil: {
        objetivo,
        banca: onboarding?.banca || null,
        meta: onboarding?.meta_resultado || null,
        tempo_diario_min: onboarding?.tempo_disponivel_min || null,
        materias_dificeis: onboarding?.materias_dificeis || [],
      },
      redacao: {
        total_corrigidas: essays.length,
        nota_media: notaMedia,
        evolucao_pontos: evolucao,
        media_por_competencia: competenciasMedia,
        ultimos_temas: essays.slice(0, 5).map((e: any) => ({ tema: e.tema, nota: e.nota_total })),
        ultimo_feedback: essays[0]?.feedback_geral?.slice(0, 600) || null,
      },
      questoes: {
        total_respondidas: attempts.length,
        desempenho_por_materia: desempenhoMaterias.slice(0, 10),
      },
      estudo: {
        sessoes_recentes: sessions.length,
        horas_por_materia: tempoEstudo.slice(0, 8),
        topicos_recentes: topics.slice(0, 10).map((t: any) => ({ tema: t.tema, materia: t.materia, rating: t.rating, ultima_nota_quiz: t.quiz_last_score })),
      },
    };

    const system = `Você é a Flora, mentora de estudos brasileira. Gere um plano PERSONALIZADO baseado APENAS nos dados reais do aluno fornecidos. Não invente números. Cite especificamente as matérias, competências e notas que aparecem nos dados. Português direto, sem emoji, tom de mentora prática. Responda APENAS JSON válido.`;

    const userPrompt = `Dados do aluno (JSON):\n${JSON.stringify(dadosPrompt, null, 2)}\n\nGere um plano de estudos personalizado no formato:\n{\n  "diagnostico": [3 a 5 frases curtas citando dados reais — competências mais baixas, matérias com pior taxa, evolução das notas, tempo de estudo],\n  "pontos_fortes": [2 a 3 itens com base nos dados],\n  "pontos_criticos": [2 a 4 itens com base nos dados, citando matéria/competência específica],\n  "dicas_redacao": [3 a 5 dicas específicas baseadas nas competências mais fracas da redação do aluno],\n  "plano_semanal": [{ "dia": "Segunda" | "Terça" | ..., "foco": string, "tarefa": string, "duracao_min": number }] (5 a 7 entradas),\n  "metas_curto_prazo": [3 a 5 metas concretas para 7 dias com números],\n  "indicador_acompanhamento": "uma frase dizendo o que medir na próxima semana"\n}`;

    const opts: CallOptions = {
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      maxTokens: 2200,
      jsonMode: true,
    };

    const { result: raw, provider } = await runChainEx(buildChain(opts), "personalized_plan");
    const plano = parseAIJSON(raw) as any;

    void logAIUsage(admin, {
      userId,
      actionType: "essay_theme",
      model: `plan:${provider}`,
      success: true,
    });

    return json({
      data: {
        plano,
        metricas: {
          nota_media_redacao: notaMedia,
          evolucao_pontos: evolucao,
          media_por_competencia: competenciasMedia,
          materias_mais_fracas: desempenhoMaterias.slice(0, 3),
          total_redacoes: essays.length,
          total_questoes: attempts.length,
        },
      },
    });
  } catch (err) {
    console.error("generate-personalized-plan error", err);
    return json({ error: (err as Error)?.message || "Falha ao gerar plano" }, 500);
  }
});