import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/I/1
  let out = "";
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 6; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Question = {
  enunciado: string;
  alternativas: string[];
  correct_index: number;
  explicacao?: string | null;
};

async function buildQuestionsFromBanco(
  admin: ReturnType<typeof createClient>,
  opts: { materia?: string; topic?: string; count: number },
): Promise<Question[]> {
  let q = admin.from("questions").select("enunciado, alternativas, correta, explicacao, disciplina").limit(opts.count * 4);
  if (opts.materia) q = q.ilike("disciplina", `%${opts.materia}%`);
  if (opts.topic) q = q.ilike("enunciado", `%${opts.topic}%`);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Array<{ enunciado: string; alternativas: unknown; correta: number | string; explicacao?: string | null }>;
  const shaped: Question[] = [];
  for (const r of shuffle(rows)) {
    const alts = Array.isArray(r.alternativas) ? (r.alternativas as string[]).map(String) : [];
    if (alts.length < 2) continue;
    let correct = typeof r.correta === "number" ? r.correta : parseInt(String(r.correta), 10);
    if (isNaN(correct) || correct < 0 || correct >= alts.length) correct = 0;
    shaped.push({ enunciado: String(r.enunciado || ""), alternativas: alts, correct_index: correct, explicacao: r.explicacao ?? null });
    if (shaped.length >= opts.count) break;
  }
  if (shaped.length === 0) throw new Error("Nenhuma questão encontrada no banco para esses filtros.");
  return shaped;
}

async function buildQuestionsViaFlora(opts: { topic: string; count: number; materia?: string }): Promise<Question[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
  const sys = "Você gera questões de múltipla escolha em PT-BR para um quiz divertido tipo Kahoot. Exatamente 4 alternativas curtas, 1 correta. Sem markdown.";
  const user = `Gere ${opts.count} questões${opts.materia ? ` de ${opts.materia}` : ""} sobre: ${opts.topic}. Cada questão deve ter enunciado claro (1-2 linhas), 4 alternativas curtas e o índice da correta (0-3).`;
  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    tools: [{
      type: "function",
      function: {
        name: "save_questions",
        description: "Salva as questões geradas",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  enunciado: { type: "string" },
                  alternativas: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                  correct_index: { type: "integer", minimum: 0, maximum: 3 },
                  explicacao: { type: "string" },
                },
                required: ["enunciado", "alternativas", "correct_index"],
              },
            },
          },
          required: ["questions"],
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "save_questions" } },
  };
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Flora gateway: ${resp.status}`);
  const out = await resp.json();
  const args = out?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  const parsed = typeof args === "string" ? JSON.parse(args) : args;
  const arr = (parsed?.questions ?? []) as Question[];
  return arr.slice(0, opts.count);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "not_authenticated" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action || "");

  try {
    if (action === "create") {
      const source = String(body.source || "");
      if (!["banco", "manual", "flora"].includes(source)) return json({ error: "invalid_source" }, 400);
      const count = Math.max(5, Math.min(20, Number(body.question_count) || 10));
      const seconds = Math.max(10, Math.min(60, Number(body.seconds_per_question) || 20));
      const topic = body.topic ? String(body.topic) : null;
      const materia = body.materia ? String(body.materia) : null;
      const groupId = body.group_id ? String(body.group_id) : null;
      const manualQuestions = Array.isArray(body.questions) ? (body.questions as Question[]) : null;

      // Gera código único (tenta 5x)
      let code = "";
      for (let i = 0; i < 5; i++) {
        const candidate = genCode();
        const { data: existing } = await admin.from("quiz_battles").select("id").eq("code", candidate).maybeSingle();
        if (!existing) { code = candidate; break; }
      }
      if (!code) return json({ error: "could_not_generate_code" }, 500);

      // Monta perguntas
      let questions: Question[] = [];
      if (source === "manual") {
        if (!manualQuestions || manualQuestions.length < 1) return json({ error: "no_questions" }, 400);
        questions = manualQuestions.slice(0, count).map((q) => ({
          enunciado: String(q.enunciado || ""),
          alternativas: Array.isArray(q.alternativas) ? q.alternativas.map(String) : [],
          correct_index: Number(q.correct_index) || 0,
          explicacao: q.explicacao || null,
        })).filter((q) => q.enunciado && q.alternativas.length >= 2);
      } else if (source === "banco") {
        questions = await buildQuestionsFromBanco(admin, { materia: materia ?? undefined, topic: topic ?? undefined, count });
      } else {
        if (!topic) return json({ error: "topic_required_for_flora" }, 400);
        questions = await buildQuestionsViaFlora({ topic, count, materia: materia ?? undefined });
      }
      if (questions.length === 0) return json({ error: "no_questions_built" }, 400);

      const { data: battle, error: bErr } = await admin
        .from("quiz_battles")
        .insert({
          code, host_id: user.id, group_id: groupId, source,
          topic, materia, question_count: questions.length, seconds_per_question: seconds,
        })
        .select()
        .single();
      if (bErr) throw bErr;

      const rows = questions.map((q, i) => ({
        battle_id: battle.id,
        position: i,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        correct_index: Math.min(Math.max(q.correct_index, 0), q.alternativas.length - 1),
        explicacao: q.explicacao ?? null,
      }));
      const { error: qErr } = await admin.from("quiz_battle_questions").insert(rows);
      if (qErr) throw qErr;

      return json({ battle_id: battle.id, code: battle.code });
    }

    if (action === "join") {
      const code = String(body.code || "").toUpperCase().trim();
      const displayName = String(body.display_name || "Jogador").slice(0, 40);
      const avatarUrl = body.avatar_url ? String(body.avatar_url) : null;
      if (!code) return json({ error: "code_required" }, 400);

      const { data: battle } = await admin.from("quiz_battles").select("*").eq("code", code).maybeSingle();
      if (!battle) return json({ error: "battle_not_found" }, 404);
      if (battle.status !== "lobby") return json({ error: "battle_already_started" }, 400);

      const { count } = await admin.from("quiz_battle_players").select("id", { count: "exact", head: true }).eq("battle_id", battle.id);
      if ((count ?? 0) >= 30) return json({ error: "lobby_full" }, 400);

      await admin.from("quiz_battle_players").upsert(
        { battle_id: battle.id, user_id: user.id, display_name: displayName, avatar_url: avatarUrl },
        { onConflict: "battle_id,user_id" },
      );
      return json({ battle_id: battle.id, code: battle.code });
    }

    if (action === "start") {
      const battleId = String(body.battle_id || "");
      const { data: battle } = await admin.from("quiz_battles").select("*").eq("id", battleId).maybeSingle();
      if (!battle) return json({ error: "battle_not_found" }, 404);
      if (battle.host_id !== user.id) return json({ error: "not_host" }, 403);
      await admin.from("quiz_battles").update({
        status: "running",
        current_question: 0,
        question_started_at: new Date().toISOString(),
      }).eq("id", battleId);
      return json({ ok: true });
    }

    if (action === "next") {
      const battleId = String(body.battle_id || "");
      const { data: battle } = await admin.from("quiz_battles").select("*").eq("id", battleId).maybeSingle();
      if (!battle) return json({ error: "battle_not_found" }, 404);
      if (battle.host_id !== user.id) return json({ error: "not_host" }, 403);
      const nextIdx = (battle.current_question ?? 0) + 1;
      if (nextIdx >= battle.question_count) {
        await admin.from("quiz_battles").update({
          status: "finished",
          finished_at: new Date().toISOString(),
        }).eq("id", battleId);
        return json({ ok: true, finished: true });
      }
      await admin.from("quiz_battles").update({
        current_question: nextIdx,
        question_started_at: new Date().toISOString(),
      }).eq("id", battleId);
      return json({ ok: true, current_question: nextIdx });
    }

    if (action === "answer") {
      const battleId = String(body.battle_id || "");
      const questionId = String(body.question_id || "");
      const choiceIndex = Number(body.choice_index);
      if (isNaN(choiceIndex)) return json({ error: "invalid_choice" }, 400);

      const [{ data: battle }, { data: question }] = await Promise.all([
        admin.from("quiz_battles").select("*").eq("id", battleId).maybeSingle(),
        admin.from("quiz_battle_questions").select("*").eq("id", questionId).maybeSingle(),
      ]);
      if (!battle || !question) return json({ error: "not_found" }, 404);
      if (battle.status !== "running") return json({ error: "not_running" }, 400);
      if (question.battle_id !== battle.id) return json({ error: "mismatch" }, 400);
      if (question.position !== battle.current_question) return json({ error: "wrong_question" }, 400);

      const startedAt = battle.question_started_at ? new Date(battle.question_started_at).getTime() : Date.now();
      const elapsedMs = Math.max(0, Date.now() - startedAt);
      const limitMs = battle.seconds_per_question * 1000;
      if (elapsedMs > limitMs + 1500) return json({ error: "time_up" }, 400);

      const isCorrect = choiceIndex === question.correct_index;
      // Pontuação: 1000 base + bônus por velocidade (até +500), zero se errou
      let points = 0;
      if (isCorrect) {
        const speedRatio = Math.max(0, 1 - elapsedMs / limitMs);
        points = Math.round(700 + 500 * speedRatio);
      }

      // Inserção é idempotente (UNIQUE question_id,user_id)
      const { error: ansErr } = await admin.from("quiz_battle_answers").insert({
        battle_id: battle.id,
        question_id: question.id,
        user_id: user.id,
        choice_index: choiceIndex,
        is_correct: isCorrect,
        time_ms: elapsedMs,
        points,
      });
      if (ansErr) {
        // duplicate → ignora silenciosamente
        return json({ ok: false, already_answered: true });
      }

      // Atualiza score acumulado do jogador
      if (points > 0) {
        const { data: player } = await admin.from("quiz_battle_players").select("score").eq("battle_id", battle.id).eq("user_id", user.id).maybeSingle();
        const newScore = (player?.score ?? 0) + points;
        await admin.from("quiz_battle_players").update({ score: newScore }).eq("battle_id", battle.id).eq("user_id", user.id);
      }
      return json({ ok: true, correct: isCorrect, points });
    }

    if (action === "cancel") {
      const battleId = String(body.battle_id || "");
      const { data: battle } = await admin.from("quiz_battles").select("host_id").eq("id", battleId).maybeSingle();
      if (!battle) return json({ error: "battle_not_found" }, 404);
      if (battle.host_id !== user.id) return json({ error: "not_host" }, 403);
      await admin.from("quiz_battles").update({ status: "cancelled", finished_at: new Date().toISOString() }).eq("id", battleId);
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("quiz-battle error", e);
    return json({ error: (e as Error).message || "internal_error" }, 500);
  }
});