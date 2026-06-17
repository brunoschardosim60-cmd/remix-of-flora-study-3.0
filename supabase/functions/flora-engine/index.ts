import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  type Msg,
  type CallOptions,
  type TaskType,
  callGemini,
  callWithTaskFallback,
  callWithTaskFallbackEx,
  runChain,
  parseAIJSON,
  trimHistory,
  TOKEN_LIMITS,
} from "../_shared/providers.ts";
import { FloraPersonality, ExplanationStyle, getSystemPromptWithPersona } from "../_shared/flora_persona.ts";
import { checkQuota, logAIUsage, quotaExceededResponse } from "../_shared/usage.ts";
import { cacheLookup as sharedCacheLookup, cacheStore as sharedCacheStore, buildCacheKey as sharedBuildCacheKey, normCacheStr as sharedNormCacheStr } from "../_shared/cache.ts";

// ─── Cache em memória do contexto do aluno ──────────────────────────────────
// Várias ações da Flora (chat → quiz → flashcards → lesson) carregam o mesmo
// contexto em sequência. Cache de 60s por uid corta 80%+ das queries ao DB.
const STUDENT_CTX_TTL_MS = 60_000;
const _studentCtxCache = new Map<string, { value: any; expiresAt: number }>();
function studentCtxGet(uid: string): any | null {
  const hit = _studentCtxCache.get(uid);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { _studentCtxCache.delete(uid); return null; }
  return hit.value;
}
function studentCtxSet(uid: string, value: any) {
  _studentCtxCache.set(uid, { value, expiresAt: Date.now() + STUDENT_CTX_TTL_MS });
  // Evita crescer indefinidamente em workers de longa vida
  if (_studentCtxCache.size > 200) {
    const oldest = [..._studentCtxCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0]?.[0];
    if (oldest) _studentCtxCache.delete(oldest);
  }
}

// TTLs (segundos) por tipo de conteúdo cacheado.
const TTL_DAY = 86400;
const CACHE_TTL = {
  lesson: 30 * TTL_DAY,
  lesson_skel: 30 * TTL_DAY,
  lesson_block: 30 * TTL_DAY,
  quiz: 7 * TTL_DAY,
  flashcards: 30 * TTL_DAY,
} as const;

// ─── Sanitiza alternativas de quiz: remove prefixos duplicados como "A) A)" → "A)" ──
function sanitizeQuizQuestions(questions: any[]): any[] {
  if (!Array.isArray(questions)) return questions;
  const prefixRe = /^([A-E]\))\s*\1\s*/i;
  return questions.map((q: any) => {
    if (!Array.isArray(q?.alternativas)) return q;
    const seen = new Set<string>();
    q.alternativas = q.alternativas.map((alt: string) => {
      // Strip doubled prefix: "A) A) texto" → "A) texto"
      let fixed = typeof alt === "string" ? alt.replace(prefixRe, "$1 ") : alt;
      // Also strip leading prefix entirely for dedup check
      const bare = typeof fixed === "string" ? fixed.replace(/^[A-E]\)\s*/i, "").trim() : "";
      if (seen.has(bare) && bare.length > 0) return null; // mark duplicate content
      if (bare.length > 0) seen.add(bare);
      return fixed;
    }).filter(Boolean);
    // Adjust correta index if alternatives were removed
    if (typeof q.correta === "number" && q.correta >= q.alternativas.length) {
      q.correta = 0;
    }
    return q;
  });
}

// Mapeia ações públicas → action_type usado pra quota.
// "chat" cobre `recommend` (chat com a Flora).
const QUOTA_ACTION_MAP: Record<string, string> = {
  recommend: "chat",
  decide_next_topic: "decide_next_topic",
  study_now: "decide_next_topic",
  study_now_followup: "chat",
  generate_quiz: "generate_quiz",
  generate_flashcards: "generate_flashcards",
  generate_initial_plan: "decide_next_topic",
  analyze_and_suggest: "decide_next_topic",
  // generate_lesson é tratado internamente no execute_action com quota "chat"
};

// Constrói bloco de ADAPTAÇÃO REAL pra incluir no system prompt do Flora.
// A IA deve USAR esses sinais pra decidir comportamento (não só listar).
function buildAdaptiveBlock(context: {
  performance: any[];
  recentSessions: any[];
  pendingReviews: any[];
  onboarding: any;
}): string {
  const perf = context.performance ?? [];
  const sessions = context.recentSessions ?? [];
  const reviews = context.pendingReviews ?? [];
  const onb = context.onboarding;

  // Erros recorrentes (>=3 erros ou accuracy<60)
  const fracos = perf
    .filter((p: any) => p.erro_recorrente || p.accuracy < 60)
    .sort((a: any, b: any) => (b.prioridade ?? 0) - (a.prioridade ?? 0))
    .slice(0, 5);

  // Domínio (accuracy>=80)
  const fortes = perf.filter((p: any) => p.accuracy >= 80).slice(0, 5);

  // Última sessão — detecta sumiço
  const ultimaSessao = sessions[0]?.start_at ? new Date(sessions[0].start_at) : null;
  const diasSemEstudar = ultimaSessao
    ? Math.floor((Date.now() - ultimaSessao.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Revisões atrasadas
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const atrasadas = reviews.filter((r: any) => new Date(r.scheduled_date) < hoje).length;

  // Matérias difíceis declaradas no onboarding
  const dificeisOnb: string[] = onb?.materias_dificeis ?? [];

  // Decisão sugerida (a IA deve seguir):
  const decisoes: string[] = [];
  if (typeof diasSemEstudar === "number" && diasSemEstudar >= 3) decisoes.push(`SUMIU ${diasSemEstudar} dias → reduza carga, sugira 1 ação curta e motive sem cobrar`);
  if (atrasadas >= 5) decisoes.push(`${atrasadas} revisões atrasadas → priorize REVISÃO antes de conteúdo novo`);
  if (fracos.length > 0) decisoes.push(`PRIORIZAR estes erros recorrentes: ${fracos.map((f: any) => `${f.materia} (${f.accuracy}%)`).join(", ")}`);
  if (fortes.length > 0 && fracos.length === 0) decisoes.push(`Aluno dominando: ${fortes.map((f: any) => f.materia).join(", ")} → SOBE dificuldade dos quizzes pra "dificil"`);
  if (dificeisOnb.length > 0) decisoes.push(`Matérias declaradas difíceis no onboarding: ${dificeisOnb.join(", ")} → dê atenção extra`);

  return `
ADAPTAÇÃO REAL (use ATIVAMENTE pra decidir comportamento, não só citar):
${decisoes.length > 0 ? decisoes.map(d => `- ${d}`).join("\n") : "- Sem sinais fortes ainda → mantenha curso normal"}

QUANDO ABRIR O CARD "POR QUE DECIDI ISSO": ao sugerir um quiz/tópico/foco específico, inclua na resposta uma frase tipo "Notei que você ${fracos[0] ? `errou bastante em ${fracos[0].materia}` : typeof diasSemEstudar === "number" && diasSemEstudar >= 3 ? `ficou ${diasSemEstudar} dias sem estudar` : `está começando agora`}, então vamos ${fracos[0] ? `focar nisso` : `continuar firme`}." — natural, sem parecer técnica.`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ─── Tipos locais ─────────────────────────────────────────────────────────────
type Objetivo = "enem" | "vestibular" | "concurso" | "faculdade" | "aprender" | string;

// Re-usa buildChain via callWithTaskFallback do shared
// Wrapper local para compatibilidade com o código existente.
// Loga uso (estimativa de tokens) — fire-and-forget.
async function runTaskChain(opts: CallOptions, task: TaskType, tag: string, ctx?: { supabase: any; userId: string; actionType: string }): Promise<string> {
  const t0 = Date.now();
  try {
    const { result: out, provider } = await callWithTaskFallbackEx(opts, task, tag);
    if (ctx) {
      // Estimativa simples: 1 token ≈ 4 chars (PT/EN).
      const tokensIn = Math.round(JSON.stringify(opts.messages ?? []).length / 4);
      const tokensOut = Math.round((out?.length ?? 0) / 4);
      logAIUsage(ctx.supabase, {
        userId: ctx.userId,
        actionType: ctx.actionType,
        model: task,
        provider,
        tokensIn,
        tokensOut,
        success: true,
        metadata: { tag, latencyMs: Date.now() - t0, task },
      });
    }
    return out;
  } catch (e) {
    if (ctx) {
      logAIUsage(ctx.supabase, {
        userId: ctx.userId,
        actionType: ctx.actionType,
        model: task,
        provider: "error",
        success: false,
        errorMessage: e instanceof Error ? e.message : String(e),
        metadata: { tag, latencyMs: Date.now() - t0, task },
      });
    }
    throw e;
  }
}


// ─── Objetivo do onboarding ───────────────────────────────────────────────────
function getObjetivoContext(objetivo: Objetivo, banca?: string) {
  switch (objetivo) {
    case "enem": case "vestibular":
      return { label: "ENEM", quizStyle: "5 alternativas (A-E), contexto inicial obrigatório, padrão INEP", nivelDesc: "Ensino Médio / ENEM" };
    case "concurso": {
      const b = (banca || "").trim();
      const styleByBanca: Record<string, string> = {
        "CESPE": "4 alternativas (A-D), estilo CESPE/Cebraspe — enunciados em forma de assertiva longa, distratores com inversão sutil de regra/lei",
        "Cebraspe": "4 alternativas (A-D), estilo CESPE/Cebraspe — enunciados em forma de assertiva longa, distratores com inversão sutil de regra/lei",
        "FCC": "4 alternativas (A-D), estilo FCC — enunciados objetivos baseados em letra de lei, sem pegadinha excessiva",
        "Vunesp": "4 alternativas (A-D), estilo Vunesp — enunciados claros, foco em interpretação de texto e jurisprudência aplicada",
        "FGV": "4 alternativas (A-D), estilo FGV — enunciados conceituais com casos práticos, raciocínio analítico",
      };
      const style = b && styleByBanca[b]
        ? styleByBanca[b]
        : `4 alternativas (A-D), estilo${b ? ` ${b}` : " CESPE/FCC"}`;
      return {
        label: `Concurso público${b ? ` (${b})` : ""}`,
        quizStyle: style,
        nivelDesc: `Concurso público${b ? ` — banca ${b}` : ""}`,
      };
    }
    case "faculdade": case "aprender": default:
      return { label: "Aprendizado geral", quizStyle: "5 alternativas, nível médio adaptado", nivelDesc: "Ensino Médio" };
  }
}

// Detecta se um tema envolve matérias exatas (usa DeepSeek como primário)
function isExatasTask(materia: string): boolean {
  const exatas = ["matemática", "matematica", "física", "fisica", "química", "quimica", "biologia"];
  return exatas.some(e => materia.toLowerCase().includes(e));
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
// Re-export shared helpers as locals for backwards compatibility within this file.
const normCacheStr = sharedNormCacheStr;
const buildCacheKey = sharedBuildCacheKey;
const cacheLookup = sharedCacheLookup;
const cacheStore = sharedCacheStore;

/**
 * Procura uma questão real cacheada para (matéria, tema). Retorna 1 questão
 * aleatória ou null. Tem fallback: se não houver match exato em (materia,tema),
 * busca por matéria apenas.
 */
async function findCachedQuestion(supabase: any, materia: string, tema: string): Promise<any | null> {
  try {
    const exactKey = buildCacheKey({ k: "questions", materia, tema });
    let { data } = await supabase
      .from("content_cache").select("payload").eq("cache_key", exactKey).maybeSingle();
    let qs: any[] | undefined = data?.payload?.questions;
    if (!qs?.length) {
      // fallback: qualquer cache de questões da mesma matéria
      const { data: list } = await supabase
        .from("content_cache").select("payload")
        .eq("tipo", "questions").ilike("materia", materia).limit(3);
      qs = (list || []).flatMap((r: any) => r.payload?.questions || []);
    }
    if (!qs?.length) return null;
    return qs[Math.floor(Math.random() * qs.length)];
  } catch { return null; }
}

/**
 * Procura no catálogo de imagens didáticas um conceito relacionado ao tema
 * (busca por substring no nome/contexto). Retorna { concept, context, style } ou null.
 */
async function findCatalogedImageConcept(supabase: any, materia: string, tema: string): Promise<any | null> {
  try {
    const key = buildCacheKey({ k: "image_catalog", materia });
    const { data } = await supabase
      .from("content_cache").select("payload").eq("cache_key", key).maybeSingle();
    const concepts: any[] = data?.payload?.concepts || [];
    if (!concepts.length) return null;
    const t = (tema || "").toLowerCase();
    const match = concepts.find(c =>
      t.includes(String(c.concept || "").toLowerCase().split(" - ")[0].toLowerCase()) ||
      String(c.concept || "").toLowerCase().includes(t)
    );
    return match || concepts[0]; // fallback: 1º conceito da matéria
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, data, personality = "padrao", explanationStyle = "padrao" } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Unauthorized: invalid token" }, 401);
    const userId = user.id;

    // ─── QUOTA GUARD ──────────────────────────────────────────────────────
    // Bloqueia ações IA pagas se o usuário estourou o limite diário do tier.
    // Ações leves (log_action, save_chat, load_chat, execute_action sem IA) passam.
    const quotaActionType = QUOTA_ACTION_MAP[action];
    if (quotaActionType) {
      const quota = await checkQuota(supabase, userId, quotaActionType);
      if (!quota.allowed) {
        console.warn(`[flora] quota exceeded user=${userId} action=${action} tier=${quota.tier} ${quota.used}/${quota.limit}`);
        return quotaExceededResponse(quota, corsHeaders);
      }
    }
    // execute_action tem subtipos (QUIZ, FLASHCARDS) que também consomem IA — checa lá embaixo.

    // ─── Context do aluno ──────────────────────────────────────────────────
    async function getStudentContext(uid: string) {
      const cached = studentCtxGet(uid);
      if (cached) return cached;
      const [
        { data: onboarding }, { data: performance }, { data: recentActions },
        { data: recentDecisions }, { data: pendingReviews }, { data: profile },
        { data: studyState }, { data: weeklySlots }, { data: recentSessions }, { data: recentChat },
        { data: recentEssays }, { data: studyTopics }, { data: recentAttempts },
      ] = await Promise.all([
        supabase.from("student_onboarding").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("student_performance").select("*").eq("user_id", uid).order("prioridade", { ascending: false }).limit(20),
        supabase.from("user_actions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(15),
        supabase.from("flora_decisions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
        supabase.from("spaced_reviews").select("*").eq("user_id", uid).eq("completed", false).order("scheduled_date").limit(20),
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("study_state").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("weekly_slots").select("*").eq("user_id", uid).order("dia").limit(50),
        supabase.from("study_sessions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(10),
        supabase.from("flora_chat_messages").select("role,content").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
        supabase.from("essays").select("id,tema,tipo_prova,status,nota_total,competencia_1,competencia_2,competencia_3,competencia_4,competencia_5,corrected_at,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
        supabase.from("study_topics").select("id,materia,tema,rating,quiz_last_score,quiz_attempts,quiz_errors,updated_at,study_date").eq("user_id", uid).order("updated_at", { ascending: false }).limit(40),
        supabase.from("question_attempts").select("acertou,modo,created_at,question:questions(disciplina,area,tema,ano)").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
      ]);

      // Para alunos de concurso: carrega trilhas padrão + tentativas no banco de concurso.
      let concursoTrilhas: any[] = [];
      let concursoBankStats: any[] = [];
      if (onboarding?.objetivo === "concurso") {
        const [{ data: trilhas }, { data: cAtt }] = await Promise.all([
          supabase.from("concurso_trilhas").select("pacote,disciplina,topicos,descricao").eq("ativo", true).order("ordem"),
          supabase.from("concurso_question_attempts").select("acertou,question:concurso_questions(disciplina,tema,banca)").eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
        ]);
        concursoTrilhas = trilhas ?? [];
        const map = new Map<string, { total: number; acertos: number }>();
        for (const a of (cAtt ?? []) as any[]) {
          const disc = a?.question?.disciplina || "—";
          if (!map.has(disc)) map.set(disc, { total: 0, acertos: 0 });
          const e = map.get(disc)!;
          e.total++;
          if (a.acertou) e.acertos++;
        }
        concursoBankStats = Array.from(map.entries()).map(([disciplina, s]) => ({
          disciplina,
          total: s.total,
          accuracy: s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0,
        })).sort((a, b) => b.total - a.total);
      }

      // Agrega banco de questões por disciplina
      const attempts = recentAttempts ?? [];
      const byDisc = new Map<string, { total: number; acertos: number; temas: Map<string, { t: number; a: number }> }>();
      for (const att of attempts as any[]) {
        const disc = att?.question?.disciplina || "—";
        const tema = att?.question?.tema || "";
        if (!byDisc.has(disc)) byDisc.set(disc, { total: 0, acertos: 0, temas: new Map() });
        const entry = byDisc.get(disc)!;
        entry.total += 1;
        if (att.acertou) entry.acertos += 1;
        if (tema) {
          if (!entry.temas.has(tema)) entry.temas.set(tema, { t: 0, a: 0 });
          const t = entry.temas.get(tema)!;
          t.t += 1;
          if (att.acertou) t.a += 1;
        }
      }
      const questionBankStats = Array.from(byDisc.entries())
        .map(([disciplina, s]) => ({
          disciplina,
          total: s.total,
          acertos: s.acertos,
          accuracy: s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0,
          temas_fracos: Array.from(s.temas.entries())
            .filter(([, t]) => t.t >= 2 && t.a / t.t < 0.6)
            .map(([tema, t]) => `${tema} (${Math.round((t.a / t.t) * 100)}%)`)
            .slice(0, 3),
        }))
        .sort((a, b) => b.total - a.total);

      const result = {
        onboarding,
        performance: performance ?? [],
        recentActions: recentActions ?? [],
        recentDecisions: recentDecisions ?? [],
        pendingReviews: pendingReviews ?? [],
        profile, studyState,
        weeklySlots: weeklySlots ?? [],
        recentSessions: recentSessions ?? [],
        recentChat: (recentChat ?? []).reverse(),
        recentEssays: recentEssays ?? [],
        studyTopics: studyTopics ?? [],
        questionBankStats,
        questionBankTotal: attempts.length,
        concursoTrilhas,
        concursoBankStats,
      };
      studentCtxSet(uid, result);
      return result;
    }

    // ─── Helper: Memórias específicas (datas relativas) para a Flora citar ───
    // Pesca, dentro do contexto do aluno, 1-2 episódios concretos relacionados à
    // matéria/tema da aula atual: travou em X há N dias, mandou bem em Y na semana
    // passada. Frases curtas, sem números técnicos, prontas pra prompt.
    function buildSpecificMemories(
      studyTopics: any[],
      materiaAtual: string,
      temaAtual: string,
    ): string[] {
      if (!Array.isArray(studyTopics) || studyTopics.length === 0) return [];
      const norm = (s: string) => (s || "").toString().toLowerCase();
      const matAtual = norm(materiaAtual);
      const temaAtualN = norm(temaAtual);

      const sameMateria = (t: any) =>
        matAtual && norm(t.materia).includes(matAtual.split(" ")[0]);

      const ago = (iso?: string): string => {
        if (!iso) return "";
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "";
        const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 0) return "hoje";
        if (diff === 1) return "ontem";
        if (diff < 7) return `${diff} dias atrás`;
        if (diff < 14) return "semana passada";
        if (diff < 35) return `há ${Math.round(diff / 7)} semanas`;
        return `há ${Math.round(diff / 30)} meses`;
      };

      // Filtra tópicos relacionados (mesma matéria) excluindo o próprio tema
      const related = studyTopics.filter(
        (t) => sameMateria(t) && norm(t.tema) !== temaAtualN,
      );

      const struggles = related
        .filter((t) => (Number(t.rating) > 0 && Number(t.rating) <= 2) || (Number(t.quiz_last_score) > 0 && Number(t.quiz_last_score) < 60))
        .slice(0, 1)
        .map((t) => `travou em "${(t.tema || "").slice(0, 40)}" ${ago(t.updated_at || t.study_date)}`.trim());

      const wins = related
        .filter((t) => Number(t.rating) >= 4 || Number(t.quiz_last_score) >= 80)
        .slice(0, 1)
        .map((t) => `mandou bem em "${(t.tema || "").slice(0, 40)}" ${ago(t.updated_at || t.study_date)}`.trim());

      // Erro recente concreto no MESMO tema (gold)
      const sameTema = studyTopics.find((t) => norm(t.tema) === temaAtualN && Array.isArray(t.quiz_errors) && t.quiz_errors.length);
      const sameTemaMem: string[] = [];
      if (sameTema) {
        const e0 = sameTema.quiz_errors[0];
        const label = typeof e0 === "string" ? e0 : (e0?.tema || e0?.topico || e0?.pergunta || "");
        if (label) sameTemaMem.push(`errou exatamente "${String(label).slice(0, 50)}" em ${temaAtual} ${ago(sameTema.updated_at)}`);
      }

      const out = [...sameTemaMem, ...struggles, ...wins]
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter((s) => s.length > 8 && s.length < 110);
      return Array.from(new Set(out)).slice(0, 2);
    }

    // ─── Streaming do chat ─────────────────────────────────────────────────
    // Streaming: Gemini k1 (SSE) → Gemini k2 (SSE) → Lovable → síntese non-stream
    async function callAIStream(messages: Msg[]): Promise<Response> {
      const k1 = Deno.env.get("GEMINI_API_KEY") ?? "";
      const k2 = Deno.env.get("GEMINI_API_KEY_2") ?? "";

      async function tryGeminiStream(apiKey: string, label: string): Promise<Response | null> {
        if (!apiKey) return null;
        try {
          const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
          const userMsgs = messages.filter(m => m.role !== "system");
          const contents = userMsgs.length
            ? userMsgs.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
            : [{ role: "user", parts: [{ text: "Olá" }] }];
          const body: Record<string, unknown> = { contents, generationConfig: { temperature: 0.55, maxOutputTokens: 4096 } };
          if (sys) body.systemInstruction = { parts: [{ text: sys }] };

          const geminiStream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
          );
          if (!geminiStream.ok || !geminiStream.body) { console.warn(`[flora:stream] ${label} falhou ${geminiStream.status}`); return null; }

          // Converte SSE Gemini → SSE OpenAI (formato que o frontend espera)
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const encoder = new TextEncoder();
          const reader = geminiStream.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                let nl: number;
                while ((nl = buf.indexOf("\n")) !== -1) {
                  const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
                  if (!line.startsWith("data:")) continue;
                  const jsonStr = line.slice(5).trim(); if (jsonStr === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}

`));
                  } catch { /* skip */ }
                }
              }
              await writer.write(encoder.encode("data: [DONE]\n\n"));
            } catch (e) { console.warn(`[flora:stream] ${label} stream error:`, e); }
            finally { await writer.close(); }
          })();
          console.log(`[flora:stream] ${label} OK`);
          return new Response(readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
        } catch (e) { console.warn(`[flora:stream] ${label} exception:`, e); return null; }
      }

      // Lovable stream primeiro para evitar atrasos quando Gemini estiver limitado
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableKey) {
        try {
          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, stream: true, max_tokens: 1200 }),
          });
          if (resp.ok && resp.body) { console.log("[flora:stream] lovable OK"); return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }); }
        } catch (e) { console.warn("[flora:stream] lovable exception:", e); }
      }

      const r1 = await tryGeminiStream(k1, "gemini");
      if (r1) return r1;
      const r2 = await tryGeminiStream(k2, "gemini_2");
      if (r2) return r2;

      // Síntese SSE a partir de non-stream (fallback final)
      const opts: CallOptions = { messages, maxTokens: 800, temperature: 0.55 };
      const full = await runTaskChain(opts, "chat", "flora:chat-synth", { supabase, userId, actionType: "chat" });
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const chunks = full.match(/[\s\S]{1,40}/g) || [full];
          for (const piece of chunks) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}

`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // ─── System prompt da Flora ────────────────────────────────────────────
    function buildSystemPrompt(context: Awaited<ReturnType<typeof getStudentContext>>, personality: FloraPersonality, explanationStyle: ExplanationStyle) {
      const nome = context.profile?.display_name || "aluno";
      const isAdmin = context.profile?.is_admin === true;
      const hasData = context.performance.length > 0 || context.recentActions.length > 0 || context.recentSessions.length > 0;
      const totalStudyMin = Math.round(context.recentSessions.reduce((a: number, s: any) => a + (s.duration_ms || 0), 0) / 60000);
      const weakSubjects = context.performance.filter((p: any) => p.accuracy < 60 || p.erro_recorrente).map((p: any) => `${p.materia} (${p.accuracy}% acerto)`).slice(0, 5);
      const overdueReviews = context.pendingReviews.filter((r: any) => new Date(r.scheduled_date) < new Date()).length;
      const objetivo: Objetivo = context.onboarding?.objetivo || "enem";
      const objCtx = getObjetivoContext(objetivo, (context?.onboarding?.banca ?? "") as string);

      // Temas específicos fracos: cruza performance.topic_id com study_topics
      const topicsById = new Map<string, any>();
      for (const t of (context.studyTopics || [])) topicsById.set(t.id, t);
      const weakTopics = (context.performance || [])
        .filter((p: any) => p.topic_id && (p.accuracy < 60 || p.erro_recorrente))
        .slice(0, 6)
        .map((p: any) => {
          const t = topicsById.get(p.topic_id);
          const tema = t?.tema || p.topic_id;
          return `${p.materia} › ${tema} (${p.accuracy}%${p.erro_recorrente ? " RECORRENTE" : ""})`;
        });

      // Histórico de redações: nota + competências + tema
      const essays = context.recentEssays || [];
      const correctedEssays = essays.filter((e: any) => e.status === "corrigida" && e.nota_total != null);
      const essayInfo = essays.length > 0 ? `
REDAÇÕES (${essays.length} recente${essays.length > 1 ? "s" : ""}${correctedEssays.length > 0 ? `, média ${Math.round(correctedEssays.reduce((a: number, e: any) => a + (e.nota_total || 0), 0) / correctedEssays.length)}` : ""}):
${essays.slice(0, 5).map((e: any) => {
        const status = e.status === "corrigida" ? `nota ${e.nota_total ?? "?"}` : e.status;
        const comps = e.status === "corrigida" ? ` (C1:${e.competencia_1 ?? "-"} C2:${e.competencia_2 ?? "-"} C3:${e.competencia_3 ?? "-"} C4:${e.competencia_4 ?? "-"} C5:${e.competencia_5 ?? "-"})` : "";
        return `- "${(e.tema || "sem tema").slice(0, 60)}" — ${status}${comps}`;
      }).join("\n")}
IMPORTANTE: NUNCA sugira praticar redação como se fosse a 1ª vez quando há redações acima. Use as competências mais baixas para focar.` : "";

      // Banco de Questões: tentativas e accuracy por disciplina
      const qbStats = (context as any).questionBankStats || [];
      const qbTotal = (context as any).questionBankTotal || 0;
      const qbInfo = qbTotal > 0 ? `
BANCO DE QUESTÕES (${qbTotal} tentativa${qbTotal > 1 ? "s" : ""} recentes):
${qbStats.slice(0, 6).map((s: any) =>
  `- ${s.disciplina}: ${s.acertos}/${s.total} (${s.accuracy}%)${s.temas_fracos.length > 0 ? ` — fracos: ${s.temas_fracos.join("; ")}` : ""}`
).join("\n")}
IMPORTANTE: NUNCA sugira "começar a praticar X" se o aluno já tem tentativas em X acima. Use as disciplinas com baixa accuracy ou os temas fracos específicos.` : "";

      // Bloco específico de concurso: trilhas padrão e desempenho no banco de concurso.
      const cTrilhas = (context as any).concursoTrilhas || [];
      const cBank = (context as any).concursoBankStats || [];
      const concursoInfo = (objetivo === "concurso" && (cTrilhas.length > 0 || cBank.length > 0)) ? `
CONCURSO — TRILHAS DISPONÍVEIS (use ao montar planos/quizzes/revisões):
${cTrilhas.slice(0, 12).map((t: any) =>
  `- [${t.pacote}] ${t.disciplina}${Array.isArray(t.topicos) && t.topicos.length ? `: ${t.topicos.slice(0, 5).join(", ")}` : ""}`
).join("\n")}
${cBank.length > 0 ? `\nBANCO DE CONCURSO (desempenho real):\n${cBank.slice(0, 6).map((s: any) => `- ${s.disciplina}: ${s.total} questões, ${s.accuracy}% acerto`).join("\n")}` : ""}
REGRA: priorize disciplinas com accuracy < 60%; ao gerar quiz/plano de concurso use SOMENTE disciplinas/tópicos das trilhas acima e respeite a banca alvo.` : "";

      const adminInfo = isAdmin ? `
ESSE USUÁRIO É ADMINISTRADOR. Trate-o como admin/criador da plataforma.` : "";

      // Insights proativos pendentes — Flora usa no chat naturalmente
      const pendingDecisions = ((context as any).floraDecisions || [])
        .filter((d: any) => d.accepted === null && ["increase_difficulty","reduce_load","adjust_plan","proactive_suggestion"].includes(d.decision_type))
        .slice(0, 2);
      const insightsInfo = pendingDecisions.length > 0 ? `
INSIGHTS PENDENTES (use naturalmente na conversa quando relevante — não liste todos de uma vez):
${pendingDecisions.map((d: any) => `- [${d.decision_type}] ${d.reasoning}`).join("\n")}
REGRA: Se o aluno perguntar como está indo ou pedir sugestões, mencione UM insight de forma natural. Ex: "Percebi que você errou bastante X — quer focar nisso agora?"` : "";
      const onboardingInfo = context.onboarding
        ? `
ONBOARDING (use pra personalizar, NUNCA mencione):
- Objetivo: ${objCtx.label}
- Tempo: ${context.onboarding.tempo_disponivel_min} min/dia
- Difíceis: ${(context.onboarding.materias_dificeis || []).join(", ") || "nenhuma"}
- Rotina: ${context.onboarding.rotina}
- Meta: ${context.onboarding.meta_resultado}${objetivo === "concurso" ? `
- Banca alvo: ${context.onboarding.banca || "(não informada)"} | Cargo: ${(context.onboarding as any).cargo || "(não informado)"} | Órgão: ${(context.onboarding as any).orgao || "(não informado)"}
REGRA CONCURSO: ao gerar quizzes/simulados/material, SEMPRE calibre pelo estilo da banca${context.onboarding.banca ? ` (${context.onboarding.banca})` : ""}. CESPE/Cebraspe = afirmativas Certo/Errado, objetividade extrema, pegadinhas com troca de termo legal/prazo/exceção. FCC = norma culta rigorosa, A-E. Vunesp = clareza e progressão. FGV = analítico/dados. Use SEMPRE matérias específicas (Direito Constitucional, Raciocínio Lógico, Informática, Atualidades, etc.) — NUNCA "Simulado" ou rótulo genérico no campo materia.` : ""}`
        : "";

      const allChat = context.recentChat;
      const olderMsgs = allChat.slice(0, Math.max(0, allChat.length - 12));
      const recentMsgs = allChat.slice(-12);

      // ── Atividades recentes (loop fechado) ──────────────────────────────
      // Sem isso a Flora chat não sabe que o aluno acabou de terminar uma aula,
      // gerou quiz, criou caderno, etc. — mesmo que tudo esteja em user_actions.
      const ACTION_LABELS: Record<string, string> = {
        lesson_completed: "concluiu aula",
        generate_lesson: "gerou aula",
        flora_generate_quiz: "gerou quiz",
        generate_quiz: "fez quiz",
        flora_generate_flashcards: "gerou flashcards",
        generate_flashcards: "estudou flashcards",
        flora_create_notebook: "criou caderno",
        flora_create_schedule: "montou cronograma",
        study_now: "estudou agora",
        onboarding_plan_created: "criou plano inicial",
      };
      const fmtAgo = (iso: string): string => {
        const diffMs = Date.now() - new Date(iso).getTime();
        const min = Math.round(diffMs / 60000);
        if (min < 60) return `${min}min atrás`;
        const h = Math.round(min / 60);
        if (h < 24) return `${h}h atrás`;
        const d = Math.round(h / 24);
        return `${d}d atrás`;
      };
      const recActs = (context.recentActions || []).slice(0, 8);
      const recSess = (context.recentSessions || [])[0];
      const lastSessionAgo = recSess?.start_at
        ? Math.floor((Date.now() - new Date(recSess.start_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const recentActivityInfo = recActs.length > 0 ? `
ATIVIDADES RECENTES (use naturalmente — ex: "vi que você acabou de terminar X"):
${recActs.map((a: any) => {
  const label = ACTION_LABELS[a.action] || a.action;
  const mat = a.materia ? ` ${a.materia}` : "";
  const tema = a.metadata?.titulo || a.metadata?.tema || "";
  return `- ${fmtAgo(a.created_at)}: ${label}${mat}${tema ? ` — "${String(tema).slice(0, 50)}"` : ""}`;
}).join("\n")}${lastSessionAgo !== null && lastSessionAgo >= 2 ? `\n⚠ ${lastSessionAgo} dia${lastSessionAgo > 1 ? "s" : ""} sem sessão registrada — considere puxar de volta.` : ""}` : "";

      // ── Erros recorrentes específicos (loop fechado — Flora muda explicação) ──
      // Agrega quiz_errors dos study_topics: pergunta + alternativa marcada + resposta correta.
      // Sem isso a Flora não sabe QUE TIPO de erro o aluno comete (ex: "sempre erra sinal").
      const errosRec: string[] = [];
      for (const t of (context.studyTopics || [])) {
        const errs = Array.isArray(t.quiz_errors) ? t.quiz_errors : [];
        for (const e of errs.slice(0, 2)) {
          const q = String(e?.pergunta || e?.question || "").slice(0, 80);
          const marcada = String(e?.alternativa_marcada || e?.marcada || "?");
          const correta = String(e?.correta || e?.resposta_correta || "?");
          if (q) errosRec.push(`${t.materia} › ${t.tema}: "${q}" (marcou ${marcada}, correta ${correta})`);
          if (errosRec.length >= 6) break;
        }
        if (errosRec.length >= 6) break;
      }
      const errosRecInfo = errosRec.length > 0 ? `
ERROS RECORRENTES NO QUIZ (use para adaptar explicações — ex: "vi que você sempre marca X em vez de Y"):
${errosRec.map((e) => `- ${e}`).join("\n")}
REGRA: ao explicar conceitos relacionados, ANTECIPE essas confusões específicas no próprio texto.` : "";

      const olderSummary = olderMsgs.length > 0 ? `
CONVERSA ANTERIOR (${olderMsgs.length} msgs):
${olderMsgs.map((m: any) => `${m.role === "user" ? "Aluno" : "Flora"}: ${m.content.slice(0, 90).replace(/\n/g, " ")}`).join(" | ")}` : "";
      const recentChatSummary = recentMsgs.length > 0 ? `
ÚLTIMAS MENSAGENS:
${recentMsgs.map((m: any) => `${m.role === "user" ? "Aluno" : "Flora"}: ${m.content.slice(0, 250)}`).join("\n")}` : "";

      const systemPrompt = getSystemPromptWithPersona(personality, explanationStyle) + `
OBJETIVO DO ALUNO: ${objCtx.label} | ESTILO DE QUIZ: ${objCtx.quizStyle}
${insightsInfo}
REGRAS ABSOLUTAS: 1) NUNCA exiba JSON ou dados técnicos. 2) NUNCA diga que salvou algo se a ação não foi executada. 3) Chat curto (máx. 3 linhas) — conteúdo longo SEMPRE vai pra ação ([AÇÃO:CADERNO] ou [AÇÃO:QUIZ]), nunca inline. 4) Sem emoji. 5) Os blocos [AÇÃO:...] ficam escondidos no final. 6) NUNCA invente histórico, tempo sem estudar ou progresso quando não houver dados reais.

COMO FALAR: Direta, prática, linguagem natural tipo "Boa. Vamos focar em X." Nunca "analisando dados" ou "com base nos seus dados". Sempre termine com pergunta curta ou próxima ação.

REGRA DE OURO — ONDE O CONTEÚDO VAI:
- QUIZ / TESTE / SIMULADO / PROVA → [AÇÃO:QUIZ] por padrão; MAS se o aluno pedir explicitamente "no caderno", use [AÇÃO:CADERNO] com as questões completas em HTML
- RESUMO / EXPLICAÇÃO LONGA / TEORIA → SEMPRE [AÇÃO:CADERNO] (NUNCA escreva o resumo no chat)
- REDAÇÃO COMPLETA → SEMPRE [AÇÃO:CADERNO] com a redação inteira no campo "conteudo"
- FLASHCARDS → SEMPRE [AÇÃO:FLASHCARDS]
No chat você só dá uma frase curta tipo "Abrindo o quiz." ou "Vou colocar no caderno." — só confirme resultado real depois que a ação terminar.

QUALIDADE MÍNIMA DO [AÇÃO:CADERNO]:
- Se for resumo / aula / explicação: conteúdo completo, com título + subtítulos + exemplos + fechamento. Mínimo 5 seções e material realmente útil, nunca 3-4 linhas.
- Se for quiz / teste / prova no caderno: gere as 10 questões completas numeradas, com alternativas e gabarito separado no final.
- Se o aluno pedir "mais completo", aprofunde de verdade: aumente conteúdo, detalhe causas, processos, exemplos e pegadinhas.

REGRA UNIVERSAL DE QUALIDADE (vale para TUDO que você gerar — quiz, prova, simulado, flashcard, exercício, questão de revisão):
- UNICIDADE: APENAS UMA resposta correta. Nunca duas alternativas defensáveis.
- SEM AMBIGUIDADE: enunciados claros, sem duplo sentido, sem termos vagos ("o melhor", "o mais adequado") sem critério objetivo.
- JUSTIFICÁVEL: a correta deve ser sustentada por regra, lei, definição ou dado verificável; cada distrator deve ter erro factual/lógico apontável.
- Antes de finalizar, RELEIA e confirme: "só uma está certa, e consigo provar por quê".

QUANDO EXPLICAR UM CONCEITO RÁPIDO (até 5 linhas, dúvida pontual): responda inline.
QUANDO O ALUNO PEDE EXPLICAÇÃO COMPLETA / RESUMO / MATERIAL DE ESTUDO: SEMPRE use [AÇÃO:CADERNO] — proibido escrever inline.

FLUXO DE AÇÃO: Toda ação = 2 mensagens do aluno. 1ª: sugerir + perguntar curto. 2ª (confirmação): incluir [AÇÃO:...] + frase curta confirmando.
NUNCA inclua [AÇÃO:...] na mesma resposta que pergunta. NUNCA gere ação sem confirmação clara (sim/ok/pode/manda/bora/faz).

CORREÇÃO DE REDAÇÕES (do aluno): ${objetivo === "enem" || objetivo === "vestibular"
  ? "5 competências ENEM (C1-C5, 0-200 cada). Para cada: bom + ruim + trecho + sugestão de reescrita. Use [AÇÃO:CADERNO] com tudo formatado em HTML."
  : "Clareza, argumentação, norma culta, estrutura. Nota 0-10. Use [AÇÃO:CADERNO]."}

AÇÕES (no FINAL, APÓS CONFIRMAÇÃO):
[AÇÃO:CRONOGRAMA]{"slots":[{"dia":0,"horario":"14:00","materia":"Matemática","descricao":"..."}]}
[AÇÃO:QUIZ]{"materia":"...","tema":"...","difficulty":"medio"}    ← usa para quiz/teste/simulado/prova
[AÇÃO:FLASHCARDS]{"materia":"...","tema":"..."}
[AÇÃO:POMODORO]{"workMin":25,"restMin":5}
[AÇÃO:CADERNO]{"titulo":"...","materia":"...","conteudo":"<h2>...</h2><p>...</p>"}    ← usa para resumo/explicação longa/redação completa/correção de redação
[AÇÃO:META_DIA]{"studyMinutes":60,"revisions":5,"quizCount":2}
[AÇÃO:REMOVER_CRONOGRAMA]{"materia":"..."}
[AÇÃO:IMAGEM]{"prompt":"descrição curta em inglês ou português do que ilustrar"}    ← usa quando o aluno pedir imagem/foto/ilustração/diagrama/desenho
[AÇÃO:NAVEGAR]{"destino":"redacao|caderno|quiz|banco|banco_concurso|aulao|aulas|simulado|simulado_semanal|cronograma|analise|explica_foto|cursos|comunidades","tema":"...","materia":"...","modo":"escrever|corrigir"}    ← LEVA o aluno pra página certa quando ele pede ajuda numa área específica

REGRA DE NAVEGAÇÃO (use [AÇÃO:NAVEGAR] SEM precisar de confirmação):
- "me ajuda numa redação sobre X" / "quero escrever sobre X" → [AÇÃO:NAVEGAR]{"destino":"redacao","tema":"X","modo":"escrever"} + frase curta "Te levo pro editor de redação com o tema X. Pode escrever — eu te ajudo aqui do lado."
- "corrige minha redação" / "quero corrigir uma redação" → [AÇÃO:NAVEGAR]{"destino":"redacao","modo":"corrigir"} + "Abrindo a página de redação. Cole o texto lá e eu corrijo."
- "preciso anotar X" / "abre meu caderno" → [AÇÃO:NAVEGAR]{"destino":"caderno","materia":"..."}
- "quero treinar questões de X" / "quero questões do ENEM" → [AÇÃO:NAVEGAR]{"destino":"banco","materia":"...","tema":"..."}
- "quero ver minha aula" / "abre o aulão" → [AÇÃO:NAVEGAR]{"destino":"aulao"}
- "ver meu cronograma" → [AÇÃO:NAVEGAR]{"destino":"cronograma"}
- "explica essa foto" → [AÇÃO:NAVEGAR]{"destino":"explica_foto"}
IMPORTANTE: NAVEGAR é a ÚNICA ação que NÃO precisa confirmação — execute na hora.
Depois de navegar você CONTINUA no chat (painel flutuante) — pode pedir ao aluno "agora cola/escreve o texto que eu te ajudo".

EXEMPLOS DO COMPORTAMENTO CERTO:
Aluno: "me faz um resumo de mitose" → "Boa. Resumo completo no caderno?"
Aluno: "sim" → "Vou colocar no caderno." [AÇÃO:CADERNO]{"titulo":"Mitose","materia":"Biologia","conteudo":"<h2>Mitose</h2><p>...</p>..."}
Aluno: "quiz de funções" → "Quantas questões? 10 padrão?"
Aluno: "manda" → "Abrindo o quiz." [AÇÃO:QUIZ]{"materia":"Matemática","tema":"Funções","difficulty":"medio"}
Aluno: "me ajuda numa redação sobre desigualdade no Brasil" → "Te levo pro editor com esse tema. Vai escrevendo, eu te ajudo aqui." [AÇÃO:NAVEGAR]{"destino":"redacao","tema":"Desigualdade no Brasil","modo":"escrever"}
Aluno: "corrige uma redação" → "Abrindo o corretor. Cola o texto lá." [AÇÃO:NAVEGAR]{"destino":"redacao","modo":"corrigir"}

O nome do aluno é ${nome}. Responda SEMPRE em português brasileiro.
PÁGINA ATUAL DO ALUNO: ${currentPath || "/"}
${onboardingInfo}
${hasData ? `
CONTEXTO (silencioso):
- Tempo estudado: ${totalStudyMin} min
- Dificuldades: ${weakSubjects.join(", ") || "nenhuma"}
- Temas fracos específicos: ${weakTopics.join("; ") || "—"}
- Revisões atrasadas: ${overdueReviews}
- Desempenho: ${context.performance.map((p: any) => `${p.materia}: ${p.accuracy}%${p.erro_recorrente ? " RECORRENTE" : ""}`).join("; ") || "sem dados"}` : `O aluno "${nome}" é novo. Sugira primeira ação concreta.`}
${essayInfo}
${qbInfo}
${concursoInfo}
${recentActivityInfo}
${errosRecInfo}
${buildAdaptiveBlock(context)}
${olderSummary}${recentChatSummary}`;
      return systemPrompt;
}

    // ─── ACTIONS ───────────────────────────────────────────────────────────

    // Chat principal
    if (action === "recommend") {
      const context = await getStudentContext(userId);
      const systemPrompt = buildSystemPrompt(context);
      const userPrompt = data?.message || "Me ajuda a organizar meus estudos?";

      const normalizedPrompt = (userPrompt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.!?,;:]+/g, " ").replace(/\s+/g, " ").trim();
      const confirmPhrases = ["sim","s","ok","okay","claro","pode","pode ser","pode fazer","pode mandar","pode salvar","pode criar","pode gerar","manda","manda ver","manda bala","bora","bora la","vamos","vamos la","vamos nessa","faz","faca","faz isso","faz ai","faz ae","salva","cria","gera","gere","confirma","confirmo","isso","isso ai","isso mesmo","certo","beleza","blz","fechou","fechado","ta","ta bom","ta certo","tabom","uhum","aham","yep","yes","y","quero","quero sim","positivo","vai","vai la","vai nessa","manda ai","demorou","valeu","show","perfeito","otimo","legal"];
      const isConfirmation = normalizedPrompt.length > 0 && normalizedPrompt.split(" ").length <= 5 && confirmPhrases.some(p => normalizedPrompt === p);

      // Pedido direto com verbo imperativo ("gere um quiz", "faz um resumo", "monta cronograma")
      // conta como ação direta — não precisa confirmar de novo.
      const directActionVerbs = ["gere","gera","gerar","faz","faca","fazer","cria","criar","monta","montar","manda","mandar","quero","preciso","me da","me de","me passa","me faz","me gera","me cria","me manda","me monta"];
      const isDirectActionRequest = directActionVerbs.some(v => normalizedPrompt === v || normalizedPrompt.startsWith(v + " "));

      const wantsNotebook = /\bcaderno\b/.test(normalizedPrompt);
      const wantsQuizLike = /\b(quiz|teste|simulado|prova|perguntas?|questoes?|questões?)\b/.test(normalizedPrompt);
      const wantsSummaryLike = /\b(resumo|resumir|explica|explicar|explicacao|explicação|teoria|aula|material)\b/.test(normalizedPrompt);
      const wantsMoreDetail = /mais completo|mais detalhes|detalha|detalhado|aprofunda|aprofundar/.test(normalizedPrompt);

      const intentNote = wantsNotebook && wantsQuizLike
        ? `\n[INTERNO]: O aluno pediu o material NO CADERNO. Mesmo sendo quiz/teste, use [AÇÃO:CADERNO], NÃO [AÇÃO:QUIZ]. Gere HTML com 10 questões numeradas, alternativas e gabarito no final.`
        : wantsSummaryLike || wantsNotebook || wantsMoreDetail
          ? `\n[INTERNO]: O pedido é de material de estudo em caderno. Use [AÇÃO:CADERNO]. O campo "conteudo" deve vir completo, com subtítulos, exemplos e profundidade real — nunca curto ou superficial.`
          : wantsQuizLike
            ? `\n[INTERNO]: O pedido principal é quiz/teste. Use [AÇÃO:QUIZ], a menos que o aluno tenha pedido explicitamente no caderno.`
            : "";

      const guardNote = (isConfirmation || isDirectActionRequest)
        ? `

[INTERNO]: O aluno PEDIU/CONFIRMOU diretamente ("${userPrompt.slice(0, 80)}"). EXECUTE AGORA incluindo [AÇÃO:...] no final com payload completo. Resposta no chat: 1 frase curta tipo "Abrindo." ou "Vou colocar no caderno." NUNCA escreva o conteúdo (questões, resumo, redação) inline — TUDO vai no payload da ação. OBRIGATÓRIO terminar a resposta com o bloco [AÇÃO:...].${intentNote}`
        : `

[INTERNO]: O aluno NÃO confirmou. Apenas sugira e pergunte. PROIBIDO incluir [AÇÃO:...] nesta resposta.${intentNote}`;

      // Limita histórico a 12 msgs para reduzir tokens enviados à IA (~-40% em conversas longas)
      const trimmedHistory = (data?.history || []).slice(-8);
      const chatMessages = [
        { role: "system", content: systemPrompt + guardNote },
        ...trimmedHistory,
        { role: "user", content: userPrompt },
      ];

      const streamResp = await callAIStream(chatMessages);

      // Se não confirmou NEM pediu ação direta, filtra [AÇÃO:...] do stream
      // (quando confirma OU pede direto tipo "cria redação", a ação DEVE passar)
      const allowAction = isConfirmation || isDirectActionRequest;
      if (!allowAction && streamResp.body) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = streamResp.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buf = "";
        let braceDepth = -1; let inString = false; let escapeNext = false;
        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read(); if (done) break;
              buf += decoder.decode(value, { stream: true });
              let nl: number;
              while ((nl = buf.indexOf("\n")) !== -1) {
                let line = buf.slice(0, nl); buf = buf.slice(nl + 1); if (line.endsWith("\n")) line = line.slice(0, -1);
                if (!line.startsWith("data: ")) { await writer.write(encoder.encode(line + "\n")); continue; }
                const jsonStr = line.slice(6).trim(); if (jsonStr === "[DONE]") { await writer.write(encoder.encode(line + "\n")); continue; }
                try {
                  const parsed = JSON.parse(jsonStr); const content: string | undefined = parsed.choices?.[0]?.delta?.content;
                  if (typeof content === "string" && content.length > 0) {
                    let out = ""; let pending = "";
                    for (const ch of content) {
                      if (braceDepth === -1) {
                        pending += ch; const idx = pending.indexOf("[AÇÃO:");
                        if (idx !== -1) { out += pending.slice(0, idx); pending = pending.slice(idx); braceDepth = 0; continue; }
                        if (pending.length > 7) { out += pending.slice(0, pending.length - 7); pending = pending.slice(-7); }
                      } else if (braceDepth === 0) { if (ch === "{") { braceDepth = 1; inString = false; escapeNext = false; } }
                      else {
                        if (escapeNext) { escapeNext = false; } else if (ch === "\\" && inString) { escapeNext = true; } else if (ch === '"') { inString = !inString; }
                        else if (!inString) { if (ch === "{") braceDepth++; else if (ch === "}") { braceDepth--; if (braceDepth === 0) { braceDepth = -1; pending = ""; } } }
                      }
                    }
                    if (braceDepth === -1) { out += pending; pending = ""; }
                    if (out.length > 0) { parsed.choices[0].delta.content = out; await writer.write(encoder.encode("data: " + JSON.stringify(parsed) + "\n")); }
                  } else { await writer.write(encoder.encode(line + "\n")); }
                } catch { await writer.write(encoder.encode(line + "\n")); }
              }
            }
            if (buf) await writer.write(encoder.encode(buf));
          } catch (e) { console.error("stream filter error:", e); }
          finally { await writer.close(); }
        })();
        return new Response(readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }
      return streamResp;
    }

    if (action === "save_chat") {
      const messages = data?.messages;
      if (!Array.isArray(messages) || messages.length === 0) return jsonResponse({ ok: true });
      await supabase.from("flora_chat_messages").delete().eq("user_id", userId);
      const now = Date.now();
      const inserts = messages.slice(-80).map((m: any, i: number) => ({
        user_id: userId,
        role: m.role,
        content: m.content?.slice(0, 4000) || "",
        created_at: new Date(now + i).toISOString(),
        seq: i,
        metadata: m.metadata && typeof m.metadata === "object" ? m.metadata : {},
      }));
      await supabase.from("flora_chat_messages").insert(inserts);
      return jsonResponse({ ok: true, saved: inserts.length });
    }

    if (action === "load_chat") {
      const { data: messages } = await supabase.from("flora_chat_messages").select("role, content, created_at, seq, metadata").eq("user_id", userId).order("seq", { ascending: true }).order("created_at", { ascending: true }).limit(80);
      return jsonResponse({ messages: messages ?? [] });
    }

    if (action === "execute_action") {
      const actionType = data?.actionType;

      if (actionType === "CRONOGRAMA" && data?.payload?.slots) {
        const slots = data.payload.slots;
        await supabase.from("weekly_slots").delete().eq("user_id", userId);
        await supabase.from("weekly_slots").insert(slots.map((s: any, i: number) => ({ id: `flora-${Date.now()}-${i}`, user_id: userId, dia: typeof s.dia === "number" ? s.dia : 0, horario: s.horario || "08:00", descricao: s.descricao || s.materia || "", materia: s.materia || null, concluido: false })));
        await supabase.from("user_actions").insert({ user_id: userId, action: "flora_create_schedule", metadata: { slotCount: slots.length } });
        return jsonResponse({ ok: true, message: "Cronograma criado!", slotCount: slots.length });
      }

      if (actionType === "REMOVER_CRONOGRAMA" && data?.payload) {
        const { materia, dia, horario } = data.payload;
        let query = supabase.from("weekly_slots").delete().eq("user_id", userId);
        if (materia) query = query.eq("materia", materia);
        if (typeof dia === "number") query = query.eq("dia", dia);
        if (horario) query = query.eq("horario", horario);
        await query;
        return jsonResponse({ ok: true, type: "remove_schedule" });
      }

      if (actionType === "QUIZ" && data?.payload) {
        const qChk = await checkQuota(supabase, userId, "generate_quiz");
        if (!qChk.allowed) return quotaExceededResponse(qChk, corsHeaders);
        const { materia, tema, difficulty } = data.payload;
        const context = await getStudentContext(userId);
        const objetivo: Objetivo = context.onboarding?.objetivo || "enem";
        const banca = String(context?.onboarding?.banca ?? "").trim();
        const objCtx = getObjetivoContext(objetivo, banca);
        const perfData = context.performance.filter((p: any) => p.materia === materia);
        const accuracyMedia = perfData.length > 0 ? Math.round(perfData.reduce((a: number, p: any) => a + p.accuracy, 0) / perfData.length) : 50;
        const errosRecorrentes = perfData.filter((p: any) => p.erro_recorrente).map((p: any) => p.materia);
        // Em concursos, exige explicitamente que o quiz reflita a banca preferida do aluno.
        const bancaInstrucao = (objetivo === "concurso" && banca)
          ? `\nBANCA-ALVO DO ALUNO: ${banca}. Gere TODAS as questões no formato e estilo característicos da banca ${banca} (enunciado, número de alternativas, tom, tipo de pegadinha) — NÃO use formato genérico ENEM/INEP.`
          : "";

        const opts: CallOptions = {
          messages: [
            { role: "system", content: `Você é Flora, professora especialista em ${objCtx.label}. Gere 8 questões NO PADRÃO REAL ${objCtx.label} sobre "${tema}" (${materia}). NÍVEL: ${accuracyMedia}% de acerto. Dificuldade: ${difficulty || "medio"}. ERROS RECORRENTES: ${errosRecorrentes.join(", ") || "nenhum"}. ESTILO: ${objCtx.quizStyle}.${bancaInstrucao}

REGRAS OBRIGATÓRIAS DE CADA QUESTÃO (estilo ${objCtx.label} REAL — NÃO aceitar pergunta seca):
1) TEXTO-BASE rico e contextualizado (mínimo 4 linhas): situação real, trecho de notícia/artigo/livro, dado científico, tabela descrita em texto, gráfico descrito ("O gráfico mostra que..."), charge descrita, citação de autor, contexto histórico/social/cotidiano. NUNCA comece direto com a pergunta.
2) COMANDO claro DEPOIS do texto-base (ex: "Com base no texto acima, é correto afirmar que:", "A partir da situação descrita, conclui-se que:", "Considerando o gráfico apresentado, o fenômeno observado se deve a:").
3) INTERPRETAÇÃO obrigatória: o aluno PRECISA ler e raciocinar sobre o texto-base — não pode responder só sabendo decoreba. Conecte conteúdo da matéria com a situação apresentada.
4) PEGADINHA LEVE: pelo menos 2 distratores plausíveis (afirmações que parecem certas mas têm um erro sutil — inversão de causa/efeito, conceito parecido, generalização indevida, número trocado, etiologia errada).
5) ${objetivo === "concurso" ? "4 alternativas (A-D)" : "5 alternativas (A-E)"}, todas do MESMO tamanho aproximado, todas plausíveis, sem "todas/nenhuma das anteriores".
6) EXPLICAÇÃO completa: por que a correta está certa + por que CADA um dos 2 distratores mais plausíveis está errado + dica de p7) UNICIDADE DA RESPOSTA (CRÍTICO): APENAS UMA alternativa pode estar 100% correta. As demais DEVEM conter erro factual, conceitual ou lógico claro e demonstrável. PROIBIDO ter duas alternativas que possam ser defendidas como corretas. PROIBIDO ambiguidade, sinônimos que digam a mesma coisa, ou afirmações parcialmente certas sem erro objetivo. Antes de finalizar, RELEIA cada distrator e confirme: "este tem um erro específico que posso apontar". Se houver QUALQUER dúvida sobre unicidade, reescreva o distrator.
8) JUSTIFICATIVA ÚNICA: na explicação, deixe explícito o critério objetivo que torna a correta a ÚNICA possível (regra, lei, dado, definição) — não apenas "é a mais adequada".
9) FEEDBACK DE ERRO: Para cada alternativa incorreta, crie um "feedbackErro" curto (1-2 frases) explicando POR QUE aquela alternativa está errada e reforçando o conceito correto. Isso ajuda o aluno a aprender com o erro.

PROIBIDO: pergunta solta sem contexto, "qual é a definição de X?", "marque a alternativa correta sobre Y" sem texto-base, alternativas óbvias ou de tamanhos muito diferentes, explicação curta de 1 linha, DUAS ALTERNATIVAS CORRETAS, ambiguidade entre alternativas, comandos vagos ("a melhor opção" sem critério claro).

Responda SOMENTE com JSON: {"questions":[{"pergunta":"TEXTO-BASE COMPLETO\\n\\nCOMANDO DA QUESTÃO","alternativas":["A) ...","B) ...","C) ...","D) ..."${objetivo === "concurso" ? "" : ',"E) ..."'}],"correta":0,"explicacao":"...","feedbackErro":"...","dificuldade":"facil|medio|dificil"}]}\nSEMPRE responda em português brasileiro.` },
            { role: "user", content: `Gere um quiz de ${materia} sobre ${tema}.` },
          ],
          maxTokens: 1500, temperature: 0.5, jsonMode: true,
        };
        // Quiz: Groq como primário
        const content = await runTaskChain(opts, "quiz", "flora:quiz", { supabase, userId, actionType: "generate_quiz" });
        const result = parseAIJSON(content as string) as any;
        if (result?.questions) result.questions = sanitizeQuizQuestions(result.questions);
        await supabase.from("user_actions").insert({ user_id: userId, action: "flora_generate_quiz", materia, metadata: { tema, difficulty, questionCount: result.questions?.length || 0 } });
        return jsonResponse({ ok: true, type: "quiz", materia, tema, ...result });
      }

      if (actionType === "FLASHCARDS" && data?.payload) {
        // ... (existing flashcards logic)
      }

      if (actionType === "GENERATE_LESSON" && data?.payload) {
        // Usa quota de "chat" — mais seguro pois certamente existe na tabela
        const qChk = await checkQuota(supabase, userId, "chat");
        if (!qChk.allowed) return quotaExceededResponse(qChk, corsHeaders);

        const { topic, materia, level, didacticStyle, content, mode } = data.payload;

        // ─── Contexto pedagógico do aluno (curto, focado) ─────────────────
        let learningContext: any = undefined;
        let hasContext = false;
        try {
          const ctx = await getStudentContext(userId);
          const perf = (ctx.performance || []) as any[];
          const weak = perf
            .filter((p) => Number(p.accuracy) < 65 && Number(p.erros) >= 2)
            .sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0))
            .slice(0, 4)
            .map((p) => `${p.materia ? p.materia + ": " : ""}${p.topic_id}`)
            .filter(Boolean);
          const totals = perf.reduce((acc: any, p: any) => {
            acc.a += Number(p.acertos) || 0;
            acc.e += Number(p.erros) || 0;
            return acc;
          }, { a: 0, e: 0 });
          const accuracyPct = (totals.a + totals.e) > 0
            ? Math.round((totals.a / (totals.a + totals.e)) * 100)
            : undefined;
          // Erros recentes em quizzes (study_topics.quiz_errors)
          const recentErrors: string[] = [];
          for (const t of (ctx.studyTopics || []) as any[]) {
            if (Array.isArray(t?.quiz_errors)) {
              for (const e of t.quiz_errors.slice(0, 2)) {
                const label = typeof e === "string" ? e : e?.tema || e?.topico || "";
                if (label) recentErrors.push(`${t.materia || ""}: ${label}`.trim());
              }
            }
            if (recentErrors.length >= 4) break;
          }
          // Perfil baseado em accuracy
          let profileLevel: "iniciante" | "intermediario" | "avancado" = "intermediario";
          if (typeof accuracyPct === "number") {
            if (accuracyPct < 50) profileLevel = "iniciante";
            else if (accuracyPct >= 78) profileLevel = "avancado";
          }
          // Sanitiza: máx 3 itens por categoria, cada string até 60 chars, dedupe.
          const clip = (s: string, n = 60) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");
          const trim = (arr: string[], max: number) =>
            Array.from(new Set(arr.map((x) => clip(String(x))).filter(Boolean))).slice(0, max);
          const weakTrim = trim(weak, 3);
          const errsTrim = trim(recentErrors, 3);
          if (weakTrim.length || errsTrim.length || typeof accuracyPct === "number") {
            learningContext = {
              weakTopics: weakTrim,
              recentErrors: errsTrim,
              accuracyPct,
              profileLevel,
              specificMemories: buildSpecificMemories(ctx.studyTopics || [], materia || "", topic || ""),
            };
            hasContext = weakTrim.length > 0 || errsTrim.length > 0 || (learningContext.specificMemories?.length ?? 0) > 0;
          }
        } catch (e) {
          console.warn("[generate_lesson] contexto falhou, seguindo sem:", (e as Error)?.message);
        }

        // ─── Cache lookup ─────────────────────────────────────────────────
        // Se há contexto pedagógico forte, pular cache (aula personalizada).
        const lessonCacheKey = buildCacheKey({
          k: "lesson",
          materia: materia || "geral",
          tema: topic || "",
          level: level || "enem",
          style: didacticStyle || "normal",
          mode: mode || "completa",
        });
        if (!hasContext) {
          const cachedLesson = await cacheLookup(supabase, lessonCacheKey);
          if (cachedLesson && cachedLesson.lesson) {
            return jsonResponse({ ok: true, lesson: cachedLesson.lesson, cached: true });
          }
        }

        const { LESSON_SYSTEM_PROMPT, buildLessonPrompt } = await import("../_shared/prompts_aulas.ts");

        const systemPrompt = getSystemPromptWithPersona(
          personality as FloraPersonality,
          explanationStyle as ExplanationStyle,
        ) + "\n\n" + LESSON_SYSTEM_PROMPT;

        const userPrompt = buildLessonPrompt(content || topic, materia || "Geral", topic, level || "enem", didacticStyle || "normal", (mode as any) || "completa", learningContext);
        const tokensCap = mode === "masterclass" ? 8000 : mode === "rapida" ? 2200 : 4500;

        const lessonJson = await runTaskChain(
          { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], maxTokens: tokensCap, temperature: 0.7, jsonMode: true },
          "explicacao",
          "aulao_lesson_generation",
          { supabase, userId, actionType: "generate_lesson" },
        );

        const parsedLesson = parseAIJSON(lessonJson as string);
        if (!parsedLesson) throw new Error("Erro ao processar a aula gerada. Tente novamente.");

        await supabase.from("user_actions").insert({ user_id: userId, action: "generate_lesson", metadata: { topic, materia, level } }).then(() => {}).catch(() => {});
        // Só cacheia aulas genéricas (sem contexto pedagógico) pra não poluir o cache.
        if (!hasContext) {
          cacheStore(supabase, lessonCacheKey, {
            tipo: "lesson",
            materia: materia || "Geral",
            tema: topic || "",
            dificuldade: didacticStyle || "normal",
            estilo: mode || "completa",
            objetivo: level || "enem",
          }, { lesson: parsedLesson }, CACHE_TTL.lesson).catch(() => {});
        }
        return jsonResponse({ ok: true, lesson: parsedLesson });
      }

      if (actionType === "FLASHCARDS" && data?.payload) {
        const qChk = await checkQuota(supabase, userId, "generate_flashcards");
        if (!qChk.allowed) return quotaExceededResponse(qChk, corsHeaders);
        const { materia, tema } = data.payload;
        const context = await getStudentContext(userId);
        const objetivo: Objetivo = context.onboarding?.objetivo || "enem";
        const objCtx = getObjetivoContext(objetivo, (context?.onboarding?.banca ?? "") as string);
        const perfData = context.performance.filter((p: any) => p.materia === materia);
        const accuracyMedia = perfData.length > 0 ? Math.round(perfData.reduce((a: number, p: any) => a + p.accuracy, 0) / perfData.length) : 50;

        const opts: CallOptions = {
          messages: [
            { role: "system", content: `Você é Flora, professora especialista em ${objCtx.label}. Gere 8-12 flashcards de "${tema}" (${materia}). NÍVEL: ${accuracyMedia}% de acerto.
Regras: frente variada (cotidiano, comparação, causa-efeito, aplicação); verso = resposta completa + mecanismo + exemplo + pegadinha do ${objCtx.label}. Mínimo 2 cotidiano, 1 comparação. Resumo 6+ linhas. Fórmulas em LaTeX.
UNICIDADE (CRÍTICO): cada flashcard deve ter UMA resposta correta, objetiva e sem ambiguidade. Frente não pode admitir múltiplas interpretações. Verso deve ser factualmente único e justificável (citar regra/lei/definição quando cabível). PROIBIDO frente vaga ("fale sobre X") ou verso aberto.
Responda SOMENTE com JSON: {"resumo":"...","flashcards":[{"frente":"...","verso":"...","tipo":"definição|aplicação|comparação|cotidiano|causa-efeito"}]}\nSEMPRE responda em português brasileiro.` },
            { role: "user", content: `Gere flashcards de ${materia} sobre ${tema}.` },
          ],
          maxTokens: 1200, temperature: 0.5, jsonMode: true,
        };
        // Flashcards: Gemini 2.0-flash como primário (ótimo em síntese)
        const task: TaskType = isExatasTask(materia) ? "exatas" : "flashcard";
        const content = await runTaskChain(opts, task as TaskType, "flora:flashcard", { supabase, userId, actionType: "generate_flashcards" });
        const result = parseAIJSON(content as string) as any;
        await supabase.from("user_actions").insert({ user_id: userId, action: "flora_generate_flashcards", materia, metadata: { tema, cardCount: result.flashcards?.length || 0 } });
        return jsonResponse({ ok: true, type: "flashcards", materia, tema, ...result });
      }

      if (actionType === "POMODORO" && data?.payload) return jsonResponse({ ok: true, type: "pomodoro", ...data.payload });

      if (actionType === "IMAGEM" && data?.payload) {
        const prompt: string = String(data.payload.prompt || data.payload.concept || "").trim();
        if (!prompt) return jsonResponse({ error: "prompt obrigatório" }, 400);
        // Detecta tier do aluno pra escolher qualidade do modelo de geração
        let tier = "free";
        try {
          const { data: t } = await supabase.from("user_tiers").select("tier").eq("user_id", userId).maybeSingle();
          if (t?.tier) tier = t.tier;
        } catch { /* mantém free */ }
        try {
          const imgRes = await fetch(`${supabaseUrl}/functions/v1/flora-images`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
            body: JSON.stringify({ action: "search", query: prompt, tier }),
          });
          const j = await imgRes.json().catch(() => ({}));
          if (j?.success && j?.imageUrl) {
            await supabase.from("user_actions").insert({ user_id: userId, action: "flora_image", metadata: { prompt, provider: j.provider, generated: !!j.generated } });
            return jsonResponse({ ok: true, type: "image", imageUrl: j.imageUrl, prompt, provider: j.provider, generated: !!j.generated });
          }
          return jsonResponse({ ok: false, type: "image", error: "Não consegui gerar a imagem agora." });
        } catch (e) {
          return jsonResponse({ ok: false, type: "image", error: e instanceof Error ? e.message : String(e) });
        }
      }

      if (actionType === "CADERNO" && data?.payload) {
        const { titulo, materia, conteudo } = data.payload;
        const notebookId = crypto.randomUUID(); const pageId = crypto.randomUUID();
        const notebookTitle = typeof titulo === "string" && titulo.trim() ? titulo.trim() : "Novo Caderno";
        // Remove <img> hallucinados pela IA — vamos colocar uma foto real abaixo
        let cleanContent = typeof conteudo === "string" && conteudo.trim() ? conteudo.trim() : "<p></p>";
        cleanContent = cleanContent.replace(/<img[^>]*>/gi, "").replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "");

        // Busca foto real (Pixabay → Unsplash → Pexels) via flora-images
        let realImageUrl: string | null = null;
        try {
          const imgRes = await fetch(`${supabaseUrl}/functions/v1/flora-images`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
            body: JSON.stringify({ action: "search", query: `${notebookTitle} ${materia || ""}`.trim() }),
          });
          if (imgRes.ok) {
            const j = await imgRes.json();
            if (j?.success && j?.imageUrl) realImageUrl = j.imageUrl;
          }
        } catch (e) { console.warn("[flora] search image falhou:", e instanceof Error ? e.message : e); }

        const imageBlock = realImageUrl
          ? `<figure style="margin:0 0 1rem 0;"><img src="${realImageUrl}" alt="${notebookTitle.replace(/"/g, "&quot;")}" style="max-width:100%;border-radius:8px;" /></figure>`
          : "";
        const notebookContent = imageBlock + cleanContent;

        await supabase.from("notebooks").insert({ id: notebookId, user_id: userId, title: notebookTitle, subject: materia || null, cover_color: "hsl(217 91% 60%)" });
        await supabase.from("notebook_pages").insert({ id: pageId, notebook_id: notebookId, user_id: userId, page_number: 1, content: notebookContent });
        await supabase.from("user_actions").insert({ user_id: userId, action: "flora_create_notebook", metadata: { titulo: notebookTitle, materia, notebookId, pageId } });
        return jsonResponse({ ok: true, type: "notebook", notebookId, pageId, titulo: notebookTitle, materia: materia || null, imageUrl: realImageUrl });
      }

      if (actionType === "META_DIA" && data?.payload) {
        const { studyMinutes, revisions, quizCount } = data.payload;
        const { data: existing } = await supabase.from("gamification_profiles").select("state").eq("user_id", userId).maybeSingle();
        const currentState = (existing?.state as Record<string, unknown>) || {};
        const newState = { ...currentState, dailyGoals: { studyMinutes: studyMinutes ?? (currentState as any)?.dailyGoals?.studyMinutes ?? 30, revisions: revisions ?? (currentState as any)?.dailyGoals?.revisions ?? 5, quizCount: quizCount ?? (currentState as any)?.dailyGoals?.quizCount ?? 1 } };
        await supabase.from("gamification_profiles").upsert({ user_id: userId, state: newState }, { onConflict: "user_id" });
        return jsonResponse({ ok: true, type: "meta_dia", studyMinutes, revisions, quizCount });
      }

      return jsonResponse({ error: "Ação desconhecida" }, 400);
    }

    if (action === "decide_next_topic") {
      const context = await getStudentContext(userId);
      // Cache 6h: se já decidiu next_topic recentemente, reusa (mesma sessão / device-switch).
      const since6h = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data: cachedDecide } = await supabase
        .from("flora_decisions")
        .select("recommendation")
        .eq("user_id", userId)
        .eq("decision_type", "next_topic")
        .gte("created_at", since6h)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cachedDecide && cachedDecide.length > 0 && cachedDecide[0].recommendation) {
        console.log("[flora:decide] cache HIT (6h)");
        return jsonResponse(cachedDecide[0].recommendation);
      }
      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora. Analise e sugira o melhor tópico pra estudar agora. DADOS: ${JSON.stringify({ onboarding: context.onboarding, performance: context.performance, pendingReviews: context.pendingReviews, recentActions: context.recentActions })}
REGRA CRÍTICA: Se o objetivo do aluno for ENEM, você deve sugerir APENAS matérias do ENEM (Matemática, Biologia, Física, Química, Português, História, Geografia, Filosofia, Sociologia, Inglês/Espanhol, Redação). PROIBIDO sugerir Direito, Raciocínio Lógico (fora de matemática), Informática para concursos ou matérias jurídicas.
Responda SOMENTE com JSON: {"topic_id":"...","materia":"...","tema":"...","formato":"quiz|explicacao|resumo|exercicio","razao":"frase curta específica","prioridade":"alta|media|baixa"}\nSEMPRE responda em português brasileiro.` },
          { role: "user", content: "Qual o melhor tópico para estudar agora?" },
        ],
        maxTokens: 600, temperature: 0.5, jsonMode: true,
      };
      // Planejamento: Groq como primário
      const content = await runTaskChain(opts, "lite", "flora:decide", { supabase, userId, actionType: "decide_next_topic" });
      const decision = parseAIJSON(content as string) as any;
      await supabase.from("flora_decisions").insert({ user_id: userId, decision_type: "next_topic", reasoning: decision.razao || "", recommendation: decision });
      return jsonResponse(decision);
    }

    if (action === "study_now") {
      const context = await getStudentContext(userId);
      const objetivo: Objetivo = context.onboarding?.objetivo || "enem";
      const objCtx = getObjetivoContext(objetivo, (context?.onboarding?.banca ?? "") as string);
      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, especialista em ${objCtx.label}, conversando com o aluno antes dele iniciar o cronômetro. Escolha o tópico mais urgente e prepare um BRIEFING DE ESTUDO conversacional, NÃO uma aula longa.
DADOS: ${JSON.stringify({ onboarding: context.onboarding, performance: context.performance, pendingReviews: context.pendingReviews, goal: context.onboarding?.objetivo })}

Se o objetivo for "enem", foque EXCLUSIVAMENTE em Redação e matérias do ENEM (Humanas, Natureza, Linguagens, Matemática). É PROIBIDO sugerir matérias de concurso como "Direito Constitucional", "Direito Administrativo", "Raciocínio Lógico" (a menos que seja lógica matemática do ENEM) ou "Informática para concursos". Se o objetivo for "concurso", foque nas matérias da banca e órgão escolhidos.


Tom: direto, próximo, como uma mentora explicando antes da sessão. Português brasileiro, sem emojis.
Tamanho: 25–40 linhas. Markdown obrigatório nesta estrutura:

## [Tema] — vamos começar
**Por que esse tema agora:** 1–2 frases conectando ao histórico do aluno.
**Por onde começar:** passo a passo curto (3–5 itens) na ordem ideal de leitura/estudo.
**O essencial em 1 minuto:** explicação direta do conceito-chave, com 1 exemplo concreto.
**O que costuma cair:** como ${objCtx.label} cobra, pegadinha mais comum.
**Checagem rápida:** 1 pergunta curta para o aluno responder mentalmente antes de iniciar.
**Antes de iniciar o cronômetro:** pergunte se ficou claro, se quer que você explique de outro jeito, dê mais exemplos, ou aprofunde algum ponto. Deixe explícito que ele pode pedir antes de começar.

Responda SOMENTE com JSON: {"topic_id":"...","materia":"...","tema":"...","formato":"briefing","razao":"frase motivadora curta","conteudo":"briefing em markdown seguindo a estrutura acima"}` },
          { role: "user", content: "Quero estudar agora." },
        ],
        maxTokens: 2200, temperature: 0.6,
      };
      // study_now: detecta matéria para escolher provider ideal
      const content = await runTaskChain(opts, "explicacao", "flora:study_now", { supabase, userId, actionType: "decide_next_topic" });
      const result = parseAIJSON(content as string) as any;
      await supabase.from("flora_decisions").insert({ user_id: userId, decision_type: "study_now", reasoning: result.razao || "", recommendation: result });
      await supabase.from("user_actions").insert({ user_id: userId, action: "study_now", topic_id: result.topic_id || null, materia: result.materia || null, metadata: { formato: result.formato } });
      return jsonResponse(result);
    }

    if (action === "study_now_followup") {
      const { tema, materia, previousContent, userRequest } = data || {};
      const context = await getStudentContext(userId);
      const objetivo: Objetivo = context.onboarding?.objetivo || "enem";
      const objCtx = getObjetivoContext(objetivo, (context?.onboarding?.banca ?? "") as string);
      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, mentora de ${objCtx.label}. O aluno está no briefing pré-cronômetro do tema "${tema}" (${materia}) e pediu um esclarecimento. Responda em português brasileiro, sem emojis, em markdown, 15–30 linhas, mantendo tom conversacional.

Briefing anterior:
"""
${(previousContent || "").slice(0, 2500)}
"""

Pedido do aluno: ${userRequest}

Adapte sua resposta exatamente ao pedido (explicar diferente / dar mais exemplos / aprofundar / responder dúvida). Termine perguntando se já está pronto para iniciar o cronômetro ou se quer que você ajuste mais alguma coisa.
Responda SOMENTE com JSON: {"conteudo":"resposta em markdown"}` },
          { role: "user", content: userRequest || "Explica de outra forma." },
        ],
        maxTokens: 1500, temperature: 0.6,
      };
      const content = await runTaskChain(opts, "explicacao", "flora:study_now_followup", { supabase, userId, actionType: "study_now_followup" });
      const result = parseAIJSON(content as string) as any;
      return jsonResponse({ conteudo: result?.conteudo || (typeof content === "string" ? content : "") });
    }

    // ─── LESSON_DOUBT: aluno tira dúvida durante a aula ────────────────────
    if (action === "lesson_doubt") {
      const { tema, blocoTitulo, blocoConteudo, duvida } = data || {};
      if (!duvida) return jsonResponse({ resposta: "Manda a dúvida!" });
      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, professora particular. O aluno está numa aula sobre "${tema}", no bloco "${blocoTitulo}".

Conteúdo do bloco que ele acabou de ver:
"""
${(blocoConteudo || "").slice(0, 1500)}
"""

Ele perguntou: "${duvida}"

Responda como uma professora real: clara, com 1-2 exemplos concretos, analogia se ajudar, sem encher de teoria. 6-15 linhas em markdown. Use **negrito** em conceitos-chave. Sem emojis. PT-BR.
Termine confirmando se ficou claro ou propondo um ângulo extra.
Responda SOMENTE JSON: {"resposta":"markdown"}` },
          { role: "user", content: duvida },
        ],
        maxTokens: 900, temperature: 0.6, jsonMode: true,
      };
      const raw = await runTaskChain(opts, "explicacao", "flora:lesson_doubt", { supabase, userId, actionType: "lesson_doubt" });
      const parsed = parseAIJSON(raw as string) as any;
      return jsonResponse({ resposta: parsed?.resposta || (typeof raw === "string" ? raw : "Não consegui responder agora.") });
    }

    // ─── LESSON_REINFORCE: aluno errou exercício → mini-bloco de reforço ───
    if (action === "lesson_reinforce") {
      const tema = (data as any)?.tema || "";
      const blocoTitulo = (data as any)?.blocoTitulo || "";
      const pergunta = ((data as any)?.pergunta || "").toString().slice(0, 600);
      const alternativaErrada = ((data as any)?.alternativaErrada || "").toString().slice(0, 200);
      const alternativaCorreta = ((data as any)?.alternativaCorreta || "").toString().slice(0, 200);
      const explicacaoOriginal = ((data as any)?.explicacao || "").toString().slice(0, 600);
      if (!pergunta) return jsonResponse({ ok: false, error: "missing pergunta" });

      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, professora particular calorosa e direta. O aluno está numa aula sobre "${tema}" (bloco "${blocoTitulo}") e ACABOU DE ERRAR um exercício.

Pergunta: "${pergunta}"
Resposta dele (errada): "${alternativaErrada}"
Resposta correta: "${alternativaCorreta}"
Contexto da explicação original: "${explicacaoOriginal}"

Sua missão: gerar um MINI-BLOCO de reforço que faça o aluno entender de verdade o erro. NÃO repita a explicação original. Use ângulo NOVO.

Responda SOMENTE JSON neste formato:
{
  "porque_errou": "1-2 frases dizendo o erro de raciocínio mais provável (ex.: 'Você caiu na pegadinha de X — é fácil confundir com Y').",
  "analogia": "1 analogia curta e visual (1-2 frases).",
  "exemplo_novo": "1 exemplo CONCRETO diferente do original, resolvido em 2-4 passos curtos em markdown.",
  "dica_flora": "1 frase curta de encerramento, encorajadora, em primeira pessoa ('Vou te dar um truque...' / 'Toda vez que ver X, lembra...')."
}

Tom: conversado, PT-BR, sem emojis, sem listas gigantes. Cada campo curto. Não cite percentuais nem dados do aluno.` },
          { role: "user", content: "Gera o reforço." },
        ],
        maxTokens: 700, temperature: 0.7, jsonMode: true,
      };
      const raw = await runTaskChain(opts, "explicacao", "flora:lesson_reinforce", { supabase, userId, actionType: "lesson_reinforce" });
      const parsed = parseAIJSON(raw as string) as any;
      if (!parsed) return jsonResponse({ ok: false, error: "parse_error" });
      return jsonResponse({ ok: true, reforco: parsed });
    }

    // ─── LESSON_GUIDED_SOLUTION: resolução em passos curtos ─────────────────
    if (action === "lesson_guided_solution") {
      const tema = (data as any)?.tema || "";
      const pergunta = ((data as any)?.pergunta || "").toString().slice(0, 800);
      const correta = ((data as any)?.alternativaCorreta || "").toString().slice(0, 200);
      const explicacao = ((data as any)?.explicacao || "").toString().slice(0, 800);
      if (!pergunta) return jsonResponse({ ok: false, error: "missing pergunta" });

      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, professora particular. Quebre a resolução do exercício em PASSOS CURTOS e CLAROS, como se estivesse no quadro.

Tema: "${tema}"
Pergunta: "${pergunta}"
Resposta correta: "${correta}"
Explicação base: "${explicacao}"

Gere de 3 a 5 passos. Cada passo deve:
- ter um título curto (3-7 palavras, verbo no infinitivo, ex.: "Identificar o que é pedido")
- ter um conteúdo CURTO (1-3 frases) explicando o que fazer e por quê
- usar markdown e LaTeX inline ($...$) quando houver matemática

Responda SOMENTE JSON:
{"passos":[{"titulo":"...","conteudo":"..."}]}
PT-BR. Sem emojis. Sem listas dentro do conteúdo.` },
          { role: "user", content: "Quebra em passos." },
        ],
        maxTokens: 800, temperature: 0.5, jsonMode: true,
      };
      const raw = await runTaskChain(opts, "explicacao", "flora:lesson_guided_solution", { supabase, userId, actionType: "lesson_guided_solution" });
      const parsed = parseAIJSON(raw as string) as any;
      if (!parsed?.passos) return jsonResponse({ ok: false, error: "parse_error" });
      return jsonResponse({ ok: true, passos: parsed.passos });
    }

    // ─── LESSON_EXPLAIN_STEP: aprofunda 1 passo da resolução guiada ─────────
    if (action === "lesson_explain_step") {
      const tema = (data as any)?.tema || "";
      const pergunta = ((data as any)?.pergunta || "").toString().slice(0, 600);
      const passoTitulo = ((data as any)?.passoTitulo || "").toString().slice(0, 150);
      const passoConteudo = ((data as any)?.passoConteudo || "").toString().slice(0, 500);
      if (!passoTitulo) return jsonResponse({ ok: false, error: "missing passo" });

      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora. O aluno pediu para explicar MELHOR um passo específico da resolução.

Tema: "${tema}"
Pergunta original: "${pergunta}"
Passo: "${passoTitulo}"
Conteúdo atual do passo: "${passoConteudo}"

Gere uma explicação aprofundada SÓ desse passo: por que se faz isso, qual o raciocínio, mini-exemplo se ajudar, erros comuns nesse ponto. 4-8 linhas em markdown, com LaTeX inline quando precisar. Tom de professora paciente.

Responda SOMENTE JSON: {"explicacao":"markdown"}
PT-BR. Sem emojis.` },
          { role: "user", content: "Explica esse passo." },
        ],
        maxTokens: 600, temperature: 0.6, jsonMode: true,
      };
      const raw = await runTaskChain(opts, "explicacao", "flora:lesson_explain_step", { supabase, userId, actionType: "lesson_explain_step" });
      const parsed = parseAIJSON(raw as string) as any;
      return jsonResponse({ ok: true, explicacao: parsed?.explicacao || "" });
    }

    // ─── SEMANTIC_SEARCH: busca conteúdo no banco ──────────────────────────
    if (action === "semantic_search") {
      const query = (data?.query || "").toString().trim();
      const limit = Math.min(Number(data?.limit) || 10, 25);
      if (!query) return jsonResponse({ results: [] });
      const q = `%${query}%`;
      const results: any[] = [];
      try {
        const { data: questoes } = await supabase
          .from("questions")
          .select("id, enunciado, disciplina, tema")
          .or(`enunciado.ilike.${q},tema.ilike.${q},disciplina.ilike.${q}`)
          .limit(limit);
        for (const r of questoes || []) {
          results.push({
            id: `q-${r.id}`, tipo: "questao",
            titulo: (r.enunciado || "").slice(0, 120),
            descricao: r.tema || "",
            materia: r.disciplina || "",
          });
        }
      } catch { /* tabela pode não ter resultados */ }
      try {
        const { data: topics } = await supabase
          .from("study_topics")
          .select("id, tema, materia, notas")
          .eq("user_id", userId)
          .or(`tema.ilike.${q},materia.ilike.${q},notas.ilike.${q}`)
          .limit(limit);
        for (const r of topics || []) {
          results.push({
            id: `t-${r.id}`, tipo: "resumo",
            titulo: r.tema, descricao: (r.notas || "").slice(0, 140),
            materia: r.materia || "",
          });
        }
      } catch {}
      return jsonResponse({ results: results.slice(0, limit) });
    }

    if (action === "generate_quiz") {
      const context = await getStudentContext(userId);
      const objetivo: Objetivo = context.onboarding?.objetivo || "enem";
      const objCtx = getObjetivoContext(objetivo, (context?.onboarding?.banca ?? "") as string);
      const materia = data?.materia || "geral";
      const tema = data?.tema || "tema geral";
      const difficulty = data?.difficulty || "medio";
      const pageContent = (data?.pageContent || "").toString().slice(0, 5000);
      const requestedCount = Math.max(3, Math.min(20, Number(data?.questionCount) || 8));
      const mode = data?.mode === "review_errors" ? "review_errors" : "normal";
      const previousErrors: string[] = Array.isArray(data?.previousErrors) ? data.previousErrors.slice(0, 10).map((s: unknown) => String(s).slice(0, 300)) : [];
      const perfData = context.performance.filter((p: any) => p.materia === materia);
      const accuracyMedia = perfData.length > 0 ? Math.round(perfData.reduce((a: number, p: any) => a + p.accuracy, 0) / perfData.length) : 50;
      const reviewBlock = mode === "review_errors" && previousErrors.length > 0 ? `
MODO REVISÃO: gere questões NOVAS sobre esses conceitos:
${previousErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}
` : "";

      const bancaAluno = (context?.onboarding?.banca ?? "").toString().trim();
      // Detecta banca tipo CESPE/Cebraspe (gabarito de Certo/Errado).
      const bancaUpper = bancaAluno.toUpperCase().replace(/[^A-Z]/g, "");
      const isCespe = objetivo === "concurso" && /^CESPE|^CEBRASPE/.test(bancaUpper);

      const altCount = isCespe ? 2 : (objetivo === "concurso" ? 4 : 5);
      const altLetters = isCespe ? "Certo/Errado" : (objetivo === "concurso" ? "A-D" : "A-E");
      const altExample = isCespe
        ? `["Certo","Errado"]`
        : objetivo === "concurso"
          ? `["A) ...","B) ...","C) ...","D) ..."]`
          : `["A) ...","B) ...","C) ...","D) ...","E) ..."]`;
      const cespeBlock = isCespe ? `\nFORMATO CESPE/CEBRASPE — JULGAMENTO CERTO/ERRADO:
- Cada questão é UMA AFIRMATIVA única (não pergunta) que o candidato deve julgar como Certa ou Errada.
- O TEXTO-BASE vem antes; depois a AFIRMATIVA a julgar (precisa ser declarativa, fechada, verificável).
- "alternativas" DEVE ser EXATAMENTE ["Certo","Errado"]; "correta" é 0 (Certo) ou 1 (Errado).
- Pegadinha típica CESPE: troca sutil de termo da lei, generalização indevida, inversão de competência, prazo trocado, exceção apresentada como regra.
- A explicação cita a fonte objetiva (artigo de lei, súmula, princípio, dado) que torna a afirmativa Certa ou Errada.
` : "";
      const bancaBlock = objetivo === "concurso" && bancaAluno
        ? `\nBANCA ALVO: ${bancaAluno} — siga RIGOROSAMENTE o estilo dessa banca (linguagem, formato de assertiva, tipo de pegadinha característica).\n`
        : "";

      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, examinadora especialista em ${objCtx.label}. Gere ${requestedCount} questões NO PADRÃO REAL ${objCtx.label} sobre "${tema}" (${materia}). NÍVEL aluno: ${accuracyMedia}% acerto. Dificuldade: ${difficulty}. ESTILO: ${objCtx.quizStyle}.${bancaBlock}${cespeBlock}${pageContent ? `\nBASE DE CONTEÚDO: ${pageContent}` : ""}${reviewBlock}

REGRAS OBRIGATÓRIAS DE CADA QUESTÃO (estilo ${objCtx.label} REAL — proibido pergunta seca):
1) TEXTO-BASE rico (mínimo 4 linhas): situação real, trecho de notícia/artigo/livro, dado científico, tabela/gráfico descritos em texto, citação, contexto histórico/social/cotidiano. NUNCA comece direto com a pergunta.
2) COMANDO claro DEPOIS do texto-base ("Com base no texto, é correto afirmar:", "A partir da situação descrita, conclui-se que:", "Considerando o gráfico apresentado, o fenômeno se deve a:").
3) INTERPRETAÇÃO obrigatória: o aluno precisa LER e RACIOCINAR sobre o texto — não pode responder só por decoreba.
4) PEGADINHA LEVE: pelo menos 2 distratores plausíveis (parecem certos mas têm erro sutil — inversão de causa/efeito, conceito parecido, generalização indevida, número trocado, etiologia errada).
5) ${altCount} alternativas (${altLetters}), todas com tamanho aproximado, todas plausíveis, sem "todas/nenhuma das anteriores".
6) UNICIDADE DA RESPOSTA (CRÍTICO E INEGOCIÁVEL): APENAS UMA alternativa pode estar 100% correta. As demais DEVEM conter erro factual, conceitual ou lógico claro e demonstrável. PROIBIDO duas alternativas defensáveis. PROIBIDO sinônimos que digam a mesma coisa. PROIBIDO afirmações parcialmente certas sem erro objetivo. ANTES de finalizar cada questão, faça este TESTE INTERNO por eliminação:
   - Para cada distrator, escreva mentalmente: "este está errado porque ___ (regra/lei/dado específico)". Se NÃO conseguir apontar erro objetivo, REESCREVA o distrator.
   - Para a correta, escreva: "esta é a única certa porque ___ (regra/lei/dado)". Se outro distrator também passar nesse critério, REESCREVA.
7) JUSTIFICATIVA ÚNICA: na "explicacao", deixe explícito o critério objetivo (regra, lei, dado, definição) que torna a correta a ÚNICA possível + por que CADA um dos 2 distratores mais plausíveis está errado + a pegadinha.
8) NÍVEL ${objCtx.label}: leitura exigente, interpretação profunda, análise — NÃO básico, NÃO direto, NÃO superficial.

PROIBIDO: pergunta solta sem contexto; "qual é a definição de X?"; "marque a alternativa correta sobre Y" sem texto-base; alternativas óbvias ou de tamanhos muito diferentes; explicação de 1 linha; DUAS ALTERNATIVAS CORRETAS; ambiguidade; comandos vagos ("a melhor opção" sem critério); leitura simples sem armadilha.

Responda SOMENTE com JSON: {"questions":[{"pergunta":"TEXTO-BASE COMPLETO\\n\\nCOMANDO DA QUESTÃO","alternativas":${altExample},"correta":0,"explicacao":"Correta (X): [critério único]. Distrator Y errado porque [erro objetivo]. Distrator Z errado porque [erro objetivo]. Pegadinha: [...].","dificuldade":"facil|medio|dificil"}]}
SEMPRE responda em português brasileiro.` },
          { role: "user", content: `Gere um quiz de ${materia} sobre ${tema} no padrão ${objCtx.label} real, com texto-base, interpretação e UMA única resposta correta inequivocamente justificável.` },
        ],
        maxTokens: Math.min(350 * requestedCount + 800, 4000), temperature: 0.45, jsonMode: true,
      };

      // ─── Cache lookup (apenas modo normal, sem pageContent customizado) ──
      const canCacheQuiz = mode === "normal" && !pageContent;
      const quizCacheKey = canCacheQuiz ? buildCacheKey({
        k: "quiz", materia, tema, dif: difficulty, banca: bancaAluno, obj: objetivo, n: String(requestedCount),
      }) : "";
      if (canCacheQuiz) {
        const cached = await cacheLookup(supabase, quizCacheKey);
        if (cached?.questions) return jsonResponse({ ...cached, cached: true });
      }

      // Quiz: Groq como primário
      const content = await runTaskChain(opts, "quiz", "flora:generate_quiz", { supabase, userId, actionType: "generate_quiz" });
      const result = parseAIJSON(content as string) as any;

      // ─── AUDITORIA INEP: valida unicidade de cada questão ───
      // Audita o lote inteiro em uma chamada para preservar qualidade sem multiplicar a latência.
      const auditQuestionsBatch = async (questions: any[]): Promise<Array<{ valid: boolean; correctIndexes: number[] }>> => {
        if (!Array.isArray(questions) || questions.length === 0) return [];
        try {
          const auditOpts: CallOptions = {
            messages: [
              { role: "system", content: `Você é um corretor oficial INEP. Analise CADA alternativa individualmente como correta ou incorreta, com lógica objetiva. PROIBIDO usar "mais adequada", "melhor opção", "não é o foco". Responda SOMENTE JSON: {"audits":[{"index":0,"corretas":[0]}]} onde "index" é o índice da questão recebida e "corretas" é o array de ÍNDICES (0-based) das alternativas 100% corretas.` },
              { role: "user", content: `Avalie estas questões em lote. Para cada uma, liste TODAS as alternativas 100% corretas.\n\n${questions.map((q: any, qi: number) => `QUESTÃO ${qi}\n${q.pergunta}\n\nAlternativas:\n${(q.alternativas || []).map((a: string, i: number) => `[${i}] ${a}`).join("\n")}\nGabarito proposto: índice ${q.correta}`).join("\n\n---\n\n")}` },
            ],
            maxTokens: Math.min(400 * questions.length + 300, 3500), temperature: 0.1, jsonMode: true,
          };
          const auditContent = await runTaskChain(auditOpts, "quiz", "flora:audit_questions_batch");
          const audit = parseAIJSON(auditContent as string) as any;
          const byIndex = new Map<number, number[]>();
          if (Array.isArray(audit?.audits)) {
            for (const item of audit.audits) {
              const index = Number(item?.index);
              if (!Number.isInteger(index) || index < 0 || index >= questions.length) continue;
              const maxAlternatives = questions[index]?.alternativas?.length || 0;
              const corretas = Array.isArray(item?.corretas)
                ? item.corretas.filter((i: unknown) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < maxAlternatives)
                : [];
              byIndex.set(index, corretas);
            }
          }
          return questions.map((q: any, index: number) => {
            const correctIndexes = byIndex.get(index) ?? [q.correta];
            return { valid: correctIndexes.length === 1, correctIndexes };
          });
        } catch (_e) {
          return questions.map((q: any) => ({ valid: true, correctIndexes: [q.correta] }));
        }
      };

      const auditQuestion = async (q: any): Promise<{ valid: boolean; correctIndexes: number[] }> => {
        const [audit] = await auditQuestionsBatch([q]);
        return audit ?? { valid: true, correctIndexes: [q.correta] };
      };

      const regenerateOne = async (): Promise<any | null> => {
        try {
          const regenOpts: CallOptions = {
            messages: [
              { role: "system", content: (opts.messages[0].content as string) + `\n\nIMPORTANTE: a questão anterior foi REPROVADA por ambiguidade (mais de uma correta ou nenhuma). REGENERE com UMA única resposta correta e demonstrável por critério objetivo.` },
              { role: "user", content: `Gere UMA nova questão sobre ${tema} (${materia}), padrão ${objCtx.label}, com texto-base, interpretação e UMA única resposta correta. Responda SOMENTE JSON: {"questions":[{...}]} com 1 questão.` },
            ],
            maxTokens: 1200, temperature: 0.4, jsonMode: true,
          };
          const regenContent = await runTaskChain(regenOpts, "quiz", "flora:regen_question");
          const regen = parseAIJSON(regenContent as string) as any;
          return regen?.questions?.[0] || null;
        } catch (_e) {
          return null;
        }
      };

      let discarded = 0;
      if (Array.isArray(result?.questions) && result.questions.length > 0) {
        const audited: any[] = [];
        const batchAudits = await auditQuestionsBatch(result.questions);
        for (let i = 0; i < result.questions.length; i++) {
          const q = result.questions[i];
          const { valid, correctIndexes } = batchAudits[i] ?? { valid: true, correctIndexes: [q.correta] };
          if (valid) {
            if (correctIndexes[0] !== q.correta) q.correta = correctIndexes[0];
            audited.push(q);
            continue;
          }
          const fixed = await regenerateOne();
          if (fixed) {
            const reAudit = await auditQuestion(fixed);
            if (reAudit.valid) {
              if (reAudit.correctIndexes[0] !== fixed.correta) fixed.correta = reAudit.correctIndexes[0];
              audited.push(fixed);
              continue;
            }
          }
          discarded++;
          console.warn(`[flora:quiz] questão descartada por ambiguidade INEP (${correctIndexes.length} corretas)`);
        }
        result.questions = sanitizeQuizQuestions(audited);
      }

      await supabase.from("user_actions").insert({ user_id: userId, action: "generate_quiz", materia, metadata: { tema, difficulty, questionCount: result.questions?.length || 0, discarded, mode } });
      if (canCacheQuiz && Array.isArray(result?.questions) && result.questions.length >= 3) {
        cacheStore(supabase, quizCacheKey, { tipo: "quiz", materia, tema, dificuldade: difficulty, banca: bancaAluno, objetivo }, result, CACHE_TTL.quiz).catch(() => {});
      }
      return jsonResponse(result);
    }

    if (action === "generate_flashcards") {
      const context = await getStudentContext(userId);
      const objetivo: Objetivo = context.onboarding?.objetivo || "enem";
      const objCtx = getObjetivoContext(objetivo, (context?.onboarding?.banca ?? "") as string);
      const materia = data?.materia || "geral";
      const tema = data?.tema || "tema geral";
      const pageContent = data?.pageContent || "";
      const perfData = context.performance.filter((p: any) => p.materia === materia);
      const accuracyMedia = perfData.length > 0 ? Math.round(perfData.reduce((a: number, p: any) => a + p.accuracy, 0) / perfData.length) : 50;

      // ─── Cache lookup ─────────────────────────────────────────────────
      const canCacheFc = !pageContent;
      const fcCacheKey = canCacheFc ? buildCacheKey({ k: "flashcards", materia, tema, obj: objetivo }) : "";
      if (canCacheFc) {
        const cached = await cacheLookup(supabase, fcCacheKey);
        if (cached?.flashcards) return jsonResponse({ ...cached, cached: true });
      }

      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, especialista em ${objCtx.label}. Gere 8-12 flashcards de "${tema}" (${materia}). NÍVEL: ${accuracyMedia}%.${pageContent ? `\nBASE: ${pageContent}` : ""}
Frente variada. Verso = resposta + mecanismo + exemplo + pegadinha do ${objCtx.label}. Resumo 6+ linhas. LaTeX para fórmulas.
Responda SOMENTE com JSON: {"resumo":"...","flashcards":[{"frente":"...","verso":"...","tipo":"definição|aplicação|comparação|cotidiano|causa-efeito"}]}
SEMPRE responda em português brasileiro.` },
          { role: "user", content: `Gere flashcards de ${materia} sobre ${tema}.` },
        ],
        maxTokens: 1200, temperature: 0.5, jsonMode: true,
      };
      // Flashcards: Gemini 2.0-flash para humanas, DeepSeek para exatas
      const task: TaskType = isExatasTask(materia) ? "exatas" : "flashcard";
      const content = await runTaskChain(opts, task as TaskType, "flora:flashcards", { supabase, userId, actionType: "generate_flashcards" });
      const result = parseAIJSON(content as string) as any;
      await supabase.from("user_actions").insert({ user_id: userId, action: "generate_flashcards", materia, metadata: { tema, cardCount: result.flashcards?.length || 0 } });
      if (canCacheFc && Array.isArray(result?.flashcards) && result.flashcards.length >= 4) {
        cacheStore(supabase, fcCacheKey, { tipo: "flashcards", materia, tema, objetivo }, result, CACHE_TTL.flashcards).catch(() => {});
      }
      return jsonResponse(result);
    }

    // ─── GENERATE_LESSON: Aulão com a Flora ─────────────────────────────────
    if (action === "generate_lesson") {
      const qChk = await checkQuota(supabase, userId, "generate_lesson");
      if (!qChk.allowed) return quotaExceededResponse(qChk, corsHeaders);

      const topic = (data as any)?.topic || "tema geral";
      const materia = (data as any)?.materia || "Geral";
      const level = (data as any)?.level || "enem";
      const didacticStyle = (data as any)?.didacticStyle || "normal";
      const content = (data as any)?.content || topic;
      const mode = (data as any)?.mode || "completa";

      const lessonCacheKey = buildCacheKey({
        k: "lesson", materia, tema: topic, level, style: didacticStyle, mode,
      });
      const cachedLesson = await cacheLookup(supabase, lessonCacheKey);
      if (cachedLesson?.lesson) return jsonResponse({ ok: true, lesson: cachedLesson.lesson, cached: true });

      const { LESSON_SYSTEM_PROMPT, buildLessonPrompt } = await import("../_shared/prompts_aulas.ts");
      const ctx = await getStudentContext(userId);
      const pers: FloraPersonality = (ctx?.onboarding?.flora_personality as FloraPersonality) || "padrao";
      const expStyle: ExplanationStyle = (ctx?.onboarding?.explanation_style as ExplanationStyle) || "padrao";

      const systemPrompt = getSystemPromptWithPersona(pers, expStyle) + "\n\n" + LESSON_SYSTEM_PROMPT;
      const userPrompt = buildLessonPrompt(content, materia, topic, level, didacticStyle, mode as any);

      const lessonJson = await runTaskChain(
        { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] },
        "explicacao",
        "aulao_lesson_generation",
        { supabase, userId, actionType: "generate_lesson" },
      );

      const parsedLesson = parseAIJSON(lessonJson as string);
      if (!parsedLesson) throw new Error("Erro ao processar a aula gerada. Tente novamente.");

      await supabase.from("user_actions").insert({ user_id: userId, action: "generate_lesson", metadata: { topic, materia, level } });
      cacheStore(supabase, lessonCacheKey, { tipo: "lesson", materia, tema: topic, dificuldade: didacticStyle, estilo: mode, objetivo: level }, { lesson: parsedLesson }, CACHE_TTL.lesson).catch(() => {});
      return jsonResponse({ ok: true, lesson: parsedLesson });
    }

    // ─── GENERATE_LESSON_SKELETON: Fase 1 do streaming (rápido ~2-3s) ───────
    // Retorna intro + títulos dos blocos + exercício final. Cliente exibe
    // skeletons enquanto chama generate_lesson_block para cada bloco.
    if (action === "generate_lesson_skeleton") {
      const qChk = await checkQuota(supabase, userId, "generate_lesson");
      if (!qChk.allowed) return quotaExceededResponse(qChk, corsHeaders);

      const topic = (data as any)?.topic || "tema geral";
      const materia = (data as any)?.materia || "Geral";
      const level = (data as any)?.level || "enem";
      const mode = (data as any)?.mode || "completa";

      const skelKey = buildCacheKey({ k: "lesson_skel", materia, tema: topic, level, mode });
      const cached = await cacheLookup(supabase, skelKey);
      if (cached?.skeleton) return jsonResponse({ ok: true, skeleton: cached.skeleton, cached: true });

      const { LESSON_SKELETON_SYSTEM_PROMPT, buildLessonSkeletonPrompt } = await import("../_shared/prompts_aulas.ts");
      const userPrompt = buildLessonSkeletonPrompt(topic, materia, level, mode as any);

      const json = await runTaskChain(
        { messages: [{ role: "system", content: LESSON_SKELETON_SYSTEM_PROMPT }, { role: "user", content: userPrompt }], maxTokens: 1200, temperature: 0.6, jsonMode: true },
        "chat",
        "aulao_lesson_skeleton",
        { supabase, userId, actionType: "generate_lesson_skeleton" },
      );
      const parsed = parseAIJSON(json as string);
      if (!parsed || !Array.isArray(parsed.blocos_titulos)) {
        throw new Error("Erro ao gerar esqueleto da aula.");
      }
      cacheStore(supabase, skelKey, { tipo: "lesson_skel", materia, tema: topic, estilo: mode, objetivo: level }, { skeleton: parsed }, CACHE_TTL.lesson_skel).catch(() => {});
      return jsonResponse({ ok: true, skeleton: parsed });
    }

    // ─── GENERATE_LESSON_BLOCK: Fase 2 do streaming (gera 1 bloco) ──────────
    if (action === "generate_lesson_block") {
      const qChk = await checkQuota(supabase, userId, "generate_lesson");
      if (!qChk.allowed) return quotaExceededResponse(qChk, corsHeaders);

      const topic = (data as any)?.topic || "tema geral";
      const materia = (data as any)?.materia || "Geral";
      const blocoTitulo = (data as any)?.blocoTitulo || "";
      const blocoIndex = Number((data as any)?.blocoIndex ?? 0);
      const totalBlocos = Number((data as any)?.totalBlocos ?? 10);
      const mode = (data as any)?.mode || "completa";
      const didacticStyle = (data as any)?.didacticStyle || "normal";

      // Memória específica do aluno (1 item) — só no 1º bloco pra não saturar
      let memoryHint: string | undefined;
      try {
        if (blocoIndex === 0) {
          const ctx = await getStudentContext(userId);
          const mems = buildSpecificMemories(ctx.studyTopics || [], materia, topic);
          memoryHint = mems[0];
        }
      } catch { /* segue sem memória */ }

      // Cache: se houver memória personalizada, pula cache (aula viva)
      const blockKey = buildCacheKey({ k: "lesson_block", materia, tema: topic, mode, t: blocoTitulo, i: blocoIndex });
      if (!memoryHint) {
        const cached = await cacheLookup(supabase, blockKey);
        if (cached?.block) return jsonResponse({ ok: true, block: cached.block, cached: true });
      }

      const { LESSON_BLOCK_SYSTEM_PROMPT, buildLessonBlockPrompt } = await import("../_shared/prompts_aulas.ts");
      const userPrompt = buildLessonBlockPrompt(topic, materia, blocoTitulo, blocoIndex, totalBlocos, mode as any, didacticStyle as any, memoryHint);
      const tokensCap = mode === "masterclass" ? 1800 : mode === "rapida" ? 900 : 1300;

      const json = await runTaskChain(
        { messages: [{ role: "system", content: LESSON_BLOCK_SYSTEM_PROMPT }, { role: "user", content: userPrompt }], maxTokens: tokensCap, temperature: 0.7, jsonMode: true },
        "explicacao",
        "aulao_lesson_block",
        { supabase, userId, actionType: "generate_lesson_block" },
      );
      const parsed = parseAIJSON(json as string);
      if (!parsed) throw new Error("Erro ao gerar bloco da aula.");
      // Substitui o exercício gerado pela IA por uma QUESTÃO REAL do banco
      // quando houver cache de questões para (matéria, tema). Economia de tokens
      // e maior fidelidade ao estilo de prova real.
      try {
        if (parsed && typeof parsed === "object" && (parsed as any).exercicio) {
          const real = await findCachedQuestion(supabase, materia, topic);
          if (real && Array.isArray(real.alternativas) && real.alternativas.length >= 4) {
            (parsed as any).exercicio = {
              pergunta: real.pergunta,
              alternativas: real.alternativas,
              correta: real.correta,
              explicacao: real.explicacao,
              fonte: real.fonte || "Banco oficial",
            };
          }
        }
      } catch { /* mantém exercício original */ }
      // Só cacheia bloco se NÃO tiver sido personalizado por memória do aluno
      if (!memoryHint) {
        cacheStore(supabase, blockKey, { tipo: "lesson_block", materia, tema: topic, estilo: mode, objetivo: String(blocoIndex) }, { block: parsed }, CACHE_TTL.lesson_block).catch(() => {});
      }
      return jsonResponse({ ok: true, block: parsed });
    }

    // ─── LIVE_ESSAY_FEEDBACK: sugestões em tempo real enquanto escreve ───────
    if (action === "live_essay_feedback") {
      const text = (data as any)?.text || "";
      const theme = (data as any)?.theme || "";
      const wordCount = (data as any)?.wordCount || 0;
      if (wordCount < 30 || !text) return jsonResponse({ ok: true, suggestions: [] });

      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, tutora de redação. Analise o trecho abaixo e gere 2-3 sugestões CURTAS e ESPECÍFICAS para melhorar a redação enquanto o aluno escreve.
Tema: "${theme}"
Trecho atual (${wordCount} palavras): "${text.slice(-600)}"

Responda SOMENTE JSON: {"suggestions":[{"type":"coesao|argumento|estrutura|vocabulario","text":"sugestão curta (máx 15 palavras)"}]}
Foque no que está acontecendo AGORA no texto. Português brasileiro.` },
          { role: "user", content: "Dê sugestões para melhorar." },
        ],
        maxTokens: 150, temperature: 0.4, jsonMode: true,
      };
      const raw = await runTaskChain(opts, "lite", "live_essay", { supabase, userId, actionType: "live_essay" });
      const parsed = parseAIJSON(raw as string) as any;
      return jsonResponse({ ok: true, suggestions: parsed?.suggestions || [] });
    }

    // ─── ANALYZE_AND_SUGGEST: Flora analisa dados e gera sugestões pendentes ───
    if (action === "analyze_and_suggest") {
      const context = await getStudentContext(userId);
      const perf = context.performance ?? [];
      const sessions = context.recentSessions ?? [];
      const reviews = context.pendingReviews ?? [];
      const onb = context.onboarding;
      const essays = (context as any).recentEssays ?? [];
      const studyTopics = (context as any).studyTopics ?? [];
      const dificeisOnb: string[] = onb?.materias_dificeis ?? [];

      // Threshold relaxado: aceita usuários novos se houver QUALQUER sinal:
      // perf, sessões, redações, OU matérias declaradas como difíceis no onboarding.
      const hasAnySignal =
        perf.length >= 1 ||
        sessions.length >= 1 ||
        essays.length >= 1 ||
        ((context as any).questionBankTotal || 0) >= 1 ||
        dificeisOnb.length >= 1;
      if (!hasAnySignal) return jsonResponse({ ok: true, suggestions: 0 });

      // Verifica se já tem sugestão pendente (não respondida)
      const { data: existingPending } = await supabase
        .from("flora_decisions")
        .select("id")
        .eq("user_id", userId)
        .is("accepted", null)
        .in("decision_type", ["increase_difficulty", "reduce_load", "adjust_plan", "proactive_suggestion"])
        .limit(1);
      if (existingPending && existingPending.length > 0) return jsonResponse({ ok: true, suggestions: 0, reason: "pending_exists" });

      // Cache 24h: se já gerou QUALQUER decisão hoje, evita re-rodar a análise (economiza ~50% das chamadas
      // quando o aluno troca de device no mesmo dia).
      const sinceTodayUTC = new Date(); sinceTodayUTC.setUTCHours(0, 0, 0, 0);
      const { data: todayDecisions } = await supabase
        .from("flora_decisions")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", sinceTodayUTC.toISOString())
        .in("decision_type", ["increase_difficulty", "reduce_load", "adjust_plan", "proactive_suggestion"])
        .limit(1);
      if (todayDecisions && todayDecisions.length > 0) return jsonResponse({ ok: true, suggestions: 0, reason: "already_today" });

      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, o motor de decisão do StudyFlow. Analise os dados do aluno e decida se alguma mudança significativa é necessária.

DADOS DO ALUNO:
- Performance: ${JSON.stringify(perf.slice(0, 10))}
- Sessões recentes: ${JSON.stringify(sessions.slice(0, 5))}
- Revisões pendentes: ${reviews.length}
- Temas estudados (até 10): ${JSON.stringify(studyTopics.slice(0, 10).map((t: any) => ({ materia: t.materia, tema: t.tema, score: t.quiz_last_score })))}
- Redações (até 5): ${JSON.stringify(essays.slice(0, 5).map((e: any) => ({ tema: e.tema, status: e.status, nota: e.nota_total })))}
- Banco de questões (top 6 disciplinas): ${JSON.stringify(((context as any).questionBankStats || []).slice(0, 6))}
- Onboarding: ${JSON.stringify(onb)}

TIPOS DE SUGESTÃO (escolha UM ou "nenhuma"):
1. increase_difficulty — accuracy média > 80% em 3+ matérias → sugira aumentar dificuldade
2. reduce_load — aluno sumiu 3+ dias OU revisões atrasadas > 10 → sugira reduzir carga
3. adjust_plan — padrão de estudo muito diferente do cronograma → sugira ajustar horários
4. proactive_suggestion — usuário novo/com poucos dados: sugira primeira ação concreta usando matérias difíceis do onboarding ou tema de redação fraca
5. nenhuma — sem sinais claros de mudança necessária

Responda SOMENTE JSON: {"type":"increase_difficulty|reduce_load|adjust_plan|proactive_suggestion|nenhuma","reasoning":"frase curta e motivadora explicando POR QUE (dirigida ao aluno)","details":"contexto extra curto","changes":{"description":"o que muda concretamente"}}
SEMPRE em português brasileiro.` },
          { role: "user", content: "Analise se o aluno precisa de algum ajuste no plano." },
        ],
        maxTokens: 400, temperature: 0.4, jsonMode: true,
      };
      const content = await runTaskChain(opts, "lite", "flora:analyze_suggest", { supabase, userId, actionType: "decide_next_topic" });
      const result = parseAIJSON(content as string) as any;

      if (!result?.type || result.type === "nenhuma") return jsonResponse({ ok: true, suggestions: 0 });

      // Validações rígidas pra não criar sugestões com números falsos / sem base real.
      const todayISO = new Date().toISOString().slice(0, 10);
      const overdueReal = reviews.filter((r: any) => {
        const sd = String(r?.scheduled_date || "").slice(0, 10);
        return sd && sd < todayISO;
      }).length;
      const lastSession = sessions[0];
      const daysSinceLast = lastSession?.created_at
        ? Math.floor((Date.now() - new Date(lastSession.created_at).getTime()) / 86400000)
        : 999;
      if (result.type === "reduce_load" && overdueReal < 10 && daysSinceLast < 3) {
        return jsonResponse({ ok: true, suggestions: 0, reason: "reduce_load_gate" });
      }
      // Sanitiza qualquer número alucinado no reasoning trocando por valor real.
      let safeReasoning = String(result.reasoning || "");
      if (result.type === "reduce_load") {
        safeReasoning = safeReasoning
          .replace(/\b\d+\s+(revis[oõ]es?\s+(pendentes|atrasadas?))/gi, `${overdueReal} $1`)
          .replace(/\b\d+\s+revis[oõ]es?\b/gi, `${overdueReal} revisões`);
      }

      await supabase.from("flora_decisions").insert({
        user_id: userId,
        decision_type: result.type,
        reasoning: safeReasoning,
        recommendation: { details: result.details, changes: result.changes },
        accepted: null,
      });

      return jsonResponse({ ok: true, suggestions: 1, type: result.type });
    }

    // ─── APPLY_DECISION: executa uma decisão aceita pelo aluno ───
    if (action === "apply_decision") {
      const { decisionId, recommendation } = data || {};
      if (!decisionId) return jsonResponse({ error: "Missing decisionId" }, 400);

      // Verify ownership
      const { data: decision } = await supabase
        .from("flora_decisions")
        .select("*")
        .eq("id", decisionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!decision) return jsonResponse({ error: "Decision not found" }, 404);

      let appliedSummary = "";
      const applied: Record<string, unknown> = {};

      // reduce_load: empurra revisões atrasadas +3 dias pra aliviar a fila
      if (decision.decision_type === "reduce_load") {
        const todayISO = new Date().toISOString().slice(0, 10);
        const { data: overdue } = await supabase
          .from("spaced_reviews")
          .select("id, scheduled_date")
          .eq("user_id", userId)
          .eq("completed", false)
          .lt("scheduled_date", todayISO);
        const ids = (overdue || []).map((r: any) => r.id);
        if (ids.length > 0) {
          const newDate = new Date();
          newDate.setDate(newDate.getDate() + 3);
          const newISO = newDate.toISOString().slice(0, 10);
          await supabase
            .from("spaced_reviews")
            .update({ scheduled_date: newISO })
            .in("id", ids);
          appliedSummary = `${ids.length} revisão(ões) atrasada(s) foram remarcadas para daqui 3 dias.`;
          applied.rescheduled = ids.length;
        } else {
          appliedSummary = "Você não tem revisões atrasadas. Carga já está equilibrada.";
        }
      } else if (decision.decision_type === "increase_difficulty") {
        appliedSummary = "Vou aumentar o nível das próximas questões e revisões.";
      } else if (decision.decision_type === "adjust_plan") {
        appliedSummary = "Cronograma marcado para ajuste. Abra o cronograma para conferir.";
      } else {
        appliedSummary = "Sugestão registrada. Vamos focar nessa direção.";
      }

      await supabase.from("user_actions").insert({
        user_id: userId,
        action: "flora_decision_accepted",
        metadata: { decisionId, type: decision.decision_type, recommendation, appliedSummary, applied },
      });

      return jsonResponse({ ok: true, applied: true, summary: appliedSummary, ...applied });
    }

    if (action === "generate_initial_plan") {
      const context = await getStudentContext(userId);
      const onb = context.onboarding;
      if (!onb) return jsonResponse({ error: "No onboarding data" }, 400);
      const objetivo: Objetivo = onb.objetivo || "enem";
      const objCtx = getObjetivoContext(objetivo, (context?.onboarding?.banca ?? "") as string);

      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora. Crie um cronograma semanal para ${objCtx.label}.
ALUNO: objetivo=${objCtx.label}, tempo=${onb.tempo_disponivel_min}min/dia, difíceis=${(onb.materias_dificeis || []).join(", ")}, rotina=${onb.rotina}, meta=${onb.meta_resultado}${objetivo === "concurso" ? `
BANCA: ${onb.banca || "(não informada)"} | CARGO: ${onb.cargo || "(não informado)"} | ÓRGÃO: ${onb.orgao || "(não informado)"}
REGRA CRÍTICA — MATÉRIAS DE CONCURSO: use SEMPRE nomes específicos como "Direito Constitucional", "Direito Administrativo", "Direito Penal", "Direito Civil", "Raciocínio Lógico", "Português", "Redação", "Matemática", "Informática", "Atualidades", "Administração Pública", "Contabilidade". NUNCA use "Simulado", "Geral", "Concurso" ou rótulos genéricos no campo "materia". Calibre a distribuição pela banca: CESPE pesa muito Direito Constitucional/Administrativo + Português; FCC pesa muito Português + Raciocínio Lógico.` : ""}
Responda SOMENTE com JSON: {"plano":"...","slots":[{"dia":0,"horario":"14:00","materia":"...","descricao":"..."}]}
dia: 0=seg..6=dom. Max ${Math.floor(onb.tempo_disponivel_min / 30)} slots/dia.\nSEMPRE responda em português brasileiro.` },
          { role: "user", content: "Crie meu cronograma inicial." },
        ],
        maxTokens: 800, temperature: 0.5, jsonMode: true,
      };
      // Plano: Groq como primário (rápido e estruturado)
      const content = await runTaskChain(opts, "plano", "flora:initial_plan");
      const plan = parseAIJSON(content as string) as any;
      if (plan.slots?.length) {
        await supabase.from("weekly_slots").delete().eq("user_id", userId);
        await supabase.from("weekly_slots").insert(plan.slots.map((s: any, i: number) => ({ id: `flora-init-${Date.now()}-${i}`, user_id: userId, dia: typeof s.dia === "number" ? s.dia : 0, horario: s.horario || "08:00", descricao: s.descricao || s.materia || "", materia: s.materia || null, concluido: false })));
      }
      await supabase.from("flora_decisions").insert({ user_id: userId, decision_type: "initial_plan", reasoning: plan.plano || "", recommendation: plan });
      await supabase.from("user_actions").insert({ user_id: userId, action: "onboarding_plan_created", metadata: { slotCount: plan.slots?.length || 0 } });
      return jsonResponse(plan);
    }

    // ─── RISK_SCAN: alertas silenciosos quando aluno está em risco ───
    // Heurísticas puras (sem IA, sem custo de token). Insere flora_decisions
    // com decision_type='risk_alert' e accepted=null. Dedup 24h por subtype.
    if (action === "risk_scan") {
      const now = Date.now();
      const since14d = new Date(now - 14 * 86400000).toISOString();
      const since7d = new Date(now - 7 * 86400000).toISOString();
      const since24h = new Date(now - 86400000).toISOString();

      const [lastSessRes, attemptsRes, sessions7Res, recentAlertsRes] = await Promise.all([
        supabase.from("study_sessions").select("start_at").eq("user_id", userId).order("start_at", { ascending: false }).limit(1),
        supabase.from("question_attempts").select("acertou, created_at").eq("user_id", userId).gte("created_at", since14d).order("created_at", { ascending: false }).limit(500),
        supabase.from("study_sessions").select("duration_ms, start_at").eq("user_id", userId).gte("start_at", since7d).limit(500),
        supabase.from("flora_decisions").select("recommendation").eq("user_id", userId).eq("decision_type", "risk_alert").gte("created_at", since24h),
      ]);

      const recentSubtypes = new Set<string>(
        (recentAlertsRes.data ?? [])
          .map((r: any) => r?.recommendation?.subtype)
          .filter((s: any): s is string => typeof s === "string"),
      );

      const alerts: Array<{ subtype: string; reasoning: string; details: Record<string, unknown> }> = [];

      // 1) Abandono: >= 3 dias sem sessão (mas já estudou alguma vez antes)
      const lastStart = lastSessRes.data?.[0]?.start_at as string | undefined;
      if (lastStart) {
        const daysSince = Math.floor((now - new Date(lastStart).getTime()) / 86400000);
        if (daysSince >= 3 && !recentSubtypes.has("abandono")) {
          alerts.push({
            subtype: "abandono",
            reasoning: `Você está ${daysSince} dias sem estudar — que tal voltar com 15 minutinhos?`,
            details: { daysSinceLast: daysSince, lastStart },
          });
        }
      }

      // 2) Queda de acertos: últimos 7d vs 7d anteriores, delta <= -10pp, >= 5 tentativas cada
      const attempts = (attemptsRes.data ?? []) as Array<{ acertou: boolean; created_at: string }>;
      const cut = now - 7 * 86400000;
      let rH = 0, rT = 0, pH = 0, pT = 0;
      for (const a of attempts) {
        const t = new Date(a.created_at).getTime();
        if (t >= cut) { rT++; if (a.acertou) rH++; }
        else { pT++; if (a.acertou) pH++; }
      }
      if (rT >= 5 && pT >= 5) {
        const rAcc = rH / rT, pAcc = pH / pT;
        const deltaPP = (rAcc - pAcc) * 100;
        if (deltaPP <= -10 && !recentSubtypes.has("queda_acertos")) {
          alerts.push({
            subtype: "queda_acertos",
            reasoning: `Sua taxa de acerto caiu ${Math.abs(Math.round(deltaPP))} pontos nas últimas 2 semanas — vamos revisar juntos?`,
            details: { recentAcc: Math.round(rAcc * 100), prevAcc: Math.round(pAcc * 100), recentCount: rT, prevCount: pT },
          });
        }
      }

      // 3) Excesso de tempo: > 6h/dia em pelo menos 3 dos últimos 7 dias
      const dayTotals = new Map<string, number>();
      for (const s of (sessions7Res.data ?? []) as Array<{ duration_ms: number; start_at: string }>) {
        const k = String(s.start_at).slice(0, 10);
        dayTotals.set(k, (dayTotals.get(k) || 0) + (s.duration_ms || 0));
      }
      const heavyDays = [...dayTotals.values()].filter((ms) => ms > 6 * 3600_000).length;
      if (heavyDays >= 3 && !recentSubtypes.has("excesso_tempo")) {
        alerts.push({
          subtype: "excesso_tempo",
          reasoning: `Você passou mais de 6h estudando em ${heavyDays} dos últimos 7 dias — descansar também faz parte.`,
          details: { heavyDays },
        });
      }

      if (alerts.length > 0) {
        await supabase.from("flora_decisions").insert(
          alerts.map((a) => ({
            user_id: userId,
            decision_type: "risk_alert",
            reasoning: a.reasoning,
            recommendation: { subtype: a.subtype, ...a.details },
            accepted: null,
          })),
        );
      }

      return jsonResponse({ ok: true, alerts: alerts.length, subtypes: alerts.map((a) => a.subtype) });
    }

    if (action === "log_action") {
      const { actionType, topicId, materia, metadata } = data;
      await supabase.from("user_actions").insert({ user_id: userId, action: actionType, topic_id: topicId || null, materia: materia || null, metadata: metadata || {} });
      if (topicId && (actionType === "quiz_correct" || actionType === "quiz_wrong")) {
        const { data: existing } = await supabase.from("student_performance").select("*").eq("user_id", userId).eq("topic_id", topicId).maybeSingle();
        const acertos = (existing?.acertos || 0) + (actionType === "quiz_correct" ? 1 : 0);
        const erros = (existing?.erros || 0) + (actionType === "quiz_wrong" ? 1 : 0);
        const total = acertos + erros;
        const accuracy = total > 0 ? Math.round((acertos / total) * 100) : 0;
        await supabase.from("student_performance").upsert({ user_id: userId, topic_id: topicId, materia: materia || "", acertos, erros, accuracy, erro_recorrente: erros >= 3, prioridade: Math.round(erros * 10 + (100 - accuracy)) }, { onConflict: "user_id,topic_id" });
      }
      return jsonResponse({ ok: true });
    }

    // ─── GHOST_COMPLETE: autocomplete enquanto escreve no caderno ────────────
    if (action === "ghost_complete") {
      const before = ((data as any)?.before || "").toString().slice(-800);
      if (!before.trim()) return jsonResponse({ suggestion: "" });
      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora completando o texto que o aluno está escrevendo num caderno de estudos. Continue NATURALMENTE o trecho a seguir com 1 frase curta (5-20 palavras), no MESMO tom e idioma (PT-BR). NÃO repita o que já foi escrito. NÃO comece com pontuação. Apenas a continuação, sem aspas, sem comentários, sem markdown.` },
          { role: "user", content: before },
        ],
        maxTokens: 60, temperature: 0.5,
      };
      const raw = await runTaskChain(opts, "lite", "flora:ghost_complete", { supabase, userId, actionType: "chat" });
      const suggestion = (typeof raw === "string" ? raw : "").trim().replace(/^["'`]+|["'`]+$/g, "").split("\n")[0].slice(0, 200);
      return jsonResponse({ suggestion });
    }

    // ─── REWRITE_SELECTION: corrigir/reescrever trecho selecionado ───────────
    if (action === "rewrite_selection") {
      const text = ((data as any)?.text || "").toString().slice(0, 4000);
      const mode = ((data as any)?.mode || "fix") as "fix" | "formal" | "simple" | "summary" | "expand";
      if (!text.trim()) return jsonResponse({ result: "" });
      const instruction: Record<string, string> = {
        fix: "Corrija ortografia, gramática e pontuação. NÃO mude o sentido nem o estilo. Mantenha o mesmo idioma e tom.",
        formal: "Reescreva em tom formal e claro, preservando 100% do significado.",
        simple: "Reescreva de forma mais simples e direta, como se explicasse a um colega, preservando o significado.",
        summary: "Resuma em 1-3 frases curtas mantendo as ideias principais.",
        expand: "Expanda com 1-2 frases extras de exemplo ou detalhe, mantendo o tom.",
      };
      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, editora de texto do aluno. ${instruction[mode] || instruction.fix} Responda APENAS com o texto final, sem aspas, sem markdown, sem comentários. PT-BR.` },
          { role: "user", content: text },
        ],
        maxTokens: 800, temperature: 0.4,
      };
      const raw = await runTaskChain(opts, "lite", "flora:rewrite_selection", { supabase, userId, actionType: "chat" });
      const result = (typeof raw === "string" ? raw : "").trim().replace(/^["'`]+|["'`]+$/g, "");
      return jsonResponse({ result });
    }

    // ─── EXPLAIN_DRAWING: Flora olha o desenho e explica ─────────────────────
    if (action === "explain_drawing") {
      const imageDataUrl = ((data as any)?.image || "").toString();
      if (!imageDataUrl.startsWith("data:image/")) return jsonResponse({ error: "missing image" }, 400);
      const question = ((data as any)?.question || "Explique o que tem nesta página do caderno.").toString().slice(0, 400);
      // Gemini suporta visão nativa — chamada direta (mistral/lovable do task chain não fariam vision).
      const opts: CallOptions = {
        messages: [
          { role: "system", content: `Você é Flora, professora particular. O aluno te mostrou um desenho/anotação do caderno. Descreva o que vê e explique o conteúdo de forma clara, didática, em PT-BR. 4-10 linhas em markdown. Sem emojis. Se for um diagrama/fórmula/figura de matéria escolar, identifique e ensine. Se não conseguir reconhecer nada, diga isso honestamente.` },
          { role: "user", content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: question },
          ] as any },
        ],
        maxTokens: 700, temperature: 0.5,
      };
      const key1 = Deno.env.get("GEMINI_API_KEY") ?? "";
      const key2 = Deno.env.get("GEMINI_API_KEY_2") ?? "";
      let raw = "";
      let provider = "gemini";
      try {
        raw = await callGemini(opts, key1, "gemini-2.0-flash");
      } catch (e) {
        console.warn("[explain_drawing] gemini primary failed, tentando key2:", (e as Error)?.message);
        try {
          raw = await callGemini(opts, key2, "gemini-2.0-flash");
          provider = "gemini_2";
        } catch (e2) {
          await logAIUsage(supabase, { userId, actionType: "chat", provider: "gemini", success: false, errorMessage: (e2 as Error)?.message ?? "vision fail" });
          return jsonResponse({ error: "Não consegui ler o desenho agora. Tente de novo em alguns segundos." }, 502);
        }
      }
      await logAIUsage(supabase, { userId, actionType: "chat", model: "gemini-2.0-flash", provider, success: true });
      return jsonResponse({ explanation: typeof raw === "string" ? raw : "" });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("Flora error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
