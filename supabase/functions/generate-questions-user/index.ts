import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callWithTaskFallback, parseAIJSON, type Msg } from "../_shared/providers.ts";
import {
  QUESTION_SYSTEM_PROMPT,
  buildPrompt,
  schemaFor,
  similarityThreshold,
  type Tipo,
} from "../_shared/prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Similaridade robusta ----------
const STOPWORDS_PT = new Set([
  "a","o","as","os","um","uma","uns","umas","de","do","da","dos","das","em","no","na","nos","nas",
  "por","para","pelo","pela","pelos","pelas","com","sem","sob","sobre","entre","ate","até",
  "e","ou","mas","que","se","como","quando","onde","porque","pois","então","entao",
  "é","eh","ser","sao","são","foi","era","sera","será","ter","tem","tinha","ha","há",
  "ao","à","às","aos","esse","essa","esses","essas","este","esta","estes","estas","isso","isto","aquilo",
  "seu","sua","seus","suas","meu","minha","nosso","nossa","lhe","lhes","me","te","nos","vos","ele","ela","eles","elas",
  "qual","quais","cujo","cuja","cujos","cujas","tal","tais","mesmo","mesma","mesmos","mesmas",
  "muito","muita","muitos","muitas","pouco","pouca","poucos","poucas","todo","toda","todos","todas",
  "nao","não","sim","ja","já","apenas","somente","também","tambem","ainda","sempre","nunca",
  "questao","questão","item","afirmativa","alternativa","assinale","considere","julgue","correta","incorreta","seguinte","seguintes",
]);

function normalizeText(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalizeText(s)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWORDS_PT.has(w));
}

function shingles(tokens: string[], n = 3): Set<string> {
  const out = new Set<string>();
  if (tokens.length < n) {
    if (tokens.length) out.add(tokens.join(" "));
    return out;
  }
  for (let i = 0; i <= tokens.length - n; i++) {
    out.add(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function isTooSimilar(
  cand: string,
  refs: Set<string>[],
  threshold: number,
): { dup: boolean; score: number } {
  const candTokens = tokenize(cand);
  if (candTokens.length < 4) return { dup: false, score: 0 };
  const candSh = shingles(candTokens, 3);
  let best = 0;
  for (const r of refs) {
    const s = jaccard(candSh, r);
    if (s > best) best = s;
    if (s >= threshold) return { dup: true, score: s };
  }
  return { dup: false, score: best };
}

function buildRefShingles(textos: string[]): Set<string>[] {
  return textos
    .map((t) => shingles(tokenize(t), 3))
    .filter((s) => s.size > 0);
}
// -------------------------------------------

function extractQuestionsFromText(text: string): any[] {
  const parsed = parseAIJSON(text) as any;
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.questoes)) return parsed.questoes;
  if (Array.isArray(parsed?.questions)) return parsed.questions;
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[gen-q-user] start", { method: req.method });
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("[gen-q-user] missing auth");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authErr } = await callerClient.auth.getClaims(token);
    if (authErr || !claimsData?.claims?.sub) {
      console.warn("[gen-q-user] invalid session", authErr?.message);
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    console.log("[gen-q-user] user", userId.slice(0, 8));

    // Quota check
    const { data: quota } = await callerClient.rpc("check_ai_quota", {
      p_user_id: userId,
      p_action: "generate_quiz",
    });
    if (quota && (quota as any).allowed === false) {
      return new Response(
        JSON.stringify({
          error: `Limite diário atingido (${(quota as any).used}/${(quota as any).limit}). Tente amanhã ou faça upgrade.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = await req.json();
    const banca = String(payload.banca || "").trim();
    const materia = String(payload.materia || "").trim();
    const assunto = String(payload.assunto || "").trim();
    const quantRaw = Number(payload.quantidade ?? 5);
    const quantidade = Math.min(Math.max(Math.floor(quantRaw) || 5, 1), 5); // máx 5 pro usuário
    const nivel = ["facil", "medio", "dificil"].includes(payload.nivel) ? payload.nivel : "medio";
    const tipo: Tipo = payload.tipo === "certo_errado" ? "certo_errado" : "multipla_escolha";
    const orgao = String(payload.orgao || "").trim();
    const cargo = String(payload.cargo || "").trim();
    const forcarFocoErros = payload.focoErros === true;
    const evitarEnunciadosRaw = Array.isArray(payload.evitarEnunciados) ? payload.evitarEnunciados : [];
    const evitarEnunciados = evitarEnunciadosRaw
      .map((s: unknown) => String(s || "").trim())
      .filter((s: string) => s.length > 10)
      .slice(0, 30);

    if (!banca || !materia || !assunto) {
      return new Response(
        JSON.stringify({ error: "banca, materia e assunto são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Paraleliza as 3 queries de personalização (eram sequenciais, ~3x mais lentas)
    const [perfRes, iaHistRes, histIaRes] = await Promise.allSettled([
      callerClient
        .from("student_performance")
        .select("topic_id,erros,acertos,materia")
        .eq("user_id", userId)
        .ilike("materia", `%${materia}%`)
        .order("erros", { ascending: false })
        .limit(5),
      callerClient
        .from("concurso_ia_attempts")
        .select("tema,acertou")
        .eq("user_id", userId)
        .eq("disciplina", materia)
        .order("created_at", { ascending: false })
        .limit(200),
      callerClient
        .from("concurso_ia_attempts")
        .select("enunciado")
        .eq("user_id", userId)
        .eq("disciplina", materia)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    let errosRecentes: string[] = [];
    try {
      const perf = perfRes.status === "fulfilled" ? perfRes.value.data : null;
      errosRecentes = (perf ?? [])
        .filter((p: any) => (p.erros ?? 0) > (p.acertos ?? 0))
        .map((p: any) => {
          const parts = String(p.topic_id || "").split("::");
          return parts[2] || "";
        })
        .filter(Boolean)
        .slice(0, 4);
    } catch (_) { /* não bloqueia */ }

    try {
      const iaHist = iaHistRes.status === "fulfilled" ? iaHistRes.value.data : null;
      if (iaHist && iaHist.length) {
        const stat: Record<string, { e: number; a: number }> = {};
        for (const r of iaHist as any[]) {
          const t = String(r.tema || "").trim();
          if (!t) continue;
          stat[t] = stat[t] || { e: 0, a: 0 };
          if (r.acertou) stat[t].a++; else stat[t].e++;
        }
        const piores = Object.entries(stat)
          .filter(([, v]) => v.e > v.a)
          .sort((x, y) => y[1].e - x[1].e)
          .map(([t]) => t);
        for (const t of piores) {
          if (!errosRecentes.includes(t) && errosRecentes.length < 6) errosRecentes.push(t);
        }
      }
    } catch (_) { /* ignore */ }

    // Enriquecer lista de enunciados a evitar
    try {
      const histIa = histIaRes.status === "fulfilled" ? histIaRes.value.data : null;
      for (const r of (histIa ?? []) as any[]) {
        const t = String(r.enunciado || "").trim();
        if (t.length > 10 && !evitarEnunciados.includes(t)) evitarEnunciados.push(t);
        if (evitarEnunciados.length >= 60) break;
      }
    } catch (_) { /* ignore */ }

    // Monta blocos extras para o prompt
    const focoErros = errosRecentes.length
      ? forcarFocoErros
        ? `\n⚠️ MODO FOCO NOS ERROS — gere TODAS as questões cobrindo EXCLUSIVAMENTE estes sub-temas (distribua entre eles): ${errosRecentes.join(", ")}.`
        : `\nFOCO ESPECIAL: o aluno tem dificuldade nestes pontos — ${errosRecentes.join(", ")}. Inclua questões que abordem esses sub-temas.`
      : "";
    const antiDup = evitarEnunciados.length
      ? `\nNÃO REPITA enunciados parecidos com estes (gere variações ou troque o sub-tema):\n${evitarEnunciados
          .map((s: string, i: number) => `${i + 1}. "${s.slice(0, 160)}"`)
          .join("\n")}`
      : "";

    const userPrompt = buildPrompt({
      banca, materia, assunto, quantidade, nivel, tipo,
      orgao, cargo,
      focoErros, antiDup,
    });

    const jsonOnlyPrompt = `${userPrompt}\n\nSe tool calling não estiver disponível, responda APENAS JSON válido no formato:\n${
      tipo === "certo_errado"
        ? `{"questoes":[{"afirmativa":"...","correta":"certo","explicacao":"...","tema":"..."}]}`
        : `{"questoes":[{"enunciado":"...","alternativas":[{"letra":"A","texto":"..."},{"letra":"B","texto":"..."},{"letra":"C","texto":"..."},{"letra":"D","texto":"..."},{"letra":"E","texto":"..."}],"correta":"A","explicacao":"...","tema":"..."}]}`
    }`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
    console.log("[gen-q-user] calling AI gateway", { tipo, quantidade, banca, materia });

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: QUESTION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_questions",
            description: "Retorna as questões geradas no formato estruturado.",
            parameters: schemaFor(tipo),
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_questions" } },
    };

    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      console.error("[gen-q-user] aborting AI fetch after 55s");
      ctrl.abort();
    }, 55000);

    let resp: Response;
    try {
      resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timer);
      console.error("[gen-q-user] fetch failed", fetchErr?.name, fetchErr?.message);
      return new Response(
        JSON.stringify({ error: "Tempo esgotado ao contatar a IA. Tente novamente." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    clearTimeout(timer);
    console.log("[gen-q-user] AI gateway responded", { status: resp.status, ms: Date.now() - t0 });

    let raw: any[] = [];
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("AI gateway error:", resp.status, txt);
      const fallbackMessages: Msg[] = [
        { role: "system", content: `${QUESTION_SYSTEM_PROMPT}\nResponda somente JSON válido, sem markdown.` },
        { role: "user", content: jsonOnlyPrompt },
      ];
      try {
        const text = await callWithTaskFallback(
          { messages: fallbackMessages, temperature: 0.65, jsonMode: true, maxTokens: 2600 },
          "quiz",
          "generate-questions-user-fallback",
        );
        raw = extractQuestionsFromText(text);
        console.log("[gen-q-user] fallback raw count", raw.length);
      } catch (fallbackErr: any) {
        console.error("[gen-q-user] fallback failed", fallbackErr?.message || fallbackErr);
        const status = resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500;
        const message =
          resp.status === 402
            ? "Créditos da IA principal esgotados e os provedores reserva também falharam."
            : resp.status === 429
              ? "Limite de IA atingido. Tente em instantes."
              : "Erro ao gerar questões com IA.";
        return new Response(JSON.stringify({ error: message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const json = await resp.json();
      console.log("[gen-q-user] AI json received", {
        hasChoices: !!json?.choices?.length,
        hasToolCall: !!json?.choices?.[0]?.message?.tool_calls?.[0],
        finishReason: json?.choices?.[0]?.finish_reason,
      });
      const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          raw = Array.isArray(args.questoes) ? args.questoes : [];
        } catch (parseErr) {
          console.error("[gen-q-user] JSON parse error", parseErr, toolCall.function.arguments?.slice(0, 500));
        }
      }
      if (!raw.length) {
        const content = json?.choices?.[0]?.message?.content;
        if (content) raw = extractQuestionsFromText(content);
      }
      if (!raw.length) {
        console.error("[gen-q-user] no structured questions", JSON.stringify(json).slice(0, 500));
        return new Response(
          JSON.stringify({ error: "IA não retornou questões estruturadas" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    console.log("[gen-q-user] raw count", raw.length);

    // Threshold dinâmico por disciplina (jurídicas toleram mais similaridade natural)
    const SIM_THRESHOLD = similarityThreshold(materia);
    const refShingles = buildRefShingles(evitarEnunciados);
    const batchShingles: Set<string>[] = [];
    let dropDuplicadas = 0;

    const normalized = raw
      .map((q: any, i: number) => {
        const id = `ia-${userId.slice(0, 8)}-${Date.now()}-${i}`;
        if (tipo === "certo_errado") {
          return {
            id, source: "ia", temporary: true,
            banca, disciplina: materia, tema: q.tema || assunto, nivel, dificuldade: nivel,
            tipo: "certo_errado" as const,
            enunciado: "",
            afirmativa: String(q.afirmativa || "").trim(),
            alternativas: [],
            correta: String(q.correta || "").toLowerCase(),
            explicacao: String(q.explicacao || "").trim(),
            ano: null, orgao, cargo,
          };
        }
        const alts = Array.isArray(q.alternativas)
          ? q.alternativas.map((a: any) => ({
              letra: String(a.letra || "").toUpperCase(),
              texto: String(a.texto || "").trim(),
            }))
          : [];
        return {
          id, source: "ia", temporary: true,
          banca, disciplina: materia, tema: q.tema || assunto, nivel, dificuldade: nivel,
          tipo: "multipla_escolha" as const,
          enunciado: String(q.enunciado || "").trim(),
          afirmativa: "",
          alternativas: alts,
          correta: String(q.correta || "").toUpperCase(),
          explicacao: String(q.explicacao || "").trim(),
          ano: null, orgao, cargo,
        };
      })
      .filter((r: any) =>
        r.tipo === "certo_errado"
          ? r.afirmativa && (r.correta === "certo" || r.correta === "errado")
          : r.enunciado && r.alternativas.length >= 2 && r.correta,
      );

    const out = normalized.filter((r: any) => {
      const text = r.tipo === "certo_errado" ? r.afirmativa : r.enunciado;
      const vsHist = isTooSimilar(text, refShingles, SIM_THRESHOLD);
      if (vsHist.dup) { dropDuplicadas++; return false; }
      const vsBatch = isTooSimilar(text, batchShingles, Math.min(SIM_THRESHOLD + 0.10, 0.65));
      if (vsBatch.dup) { dropDuplicadas++; return false; }
      batchShingles.push(shingles(tokenize(text), 3));
      return true;
    });

    // Log de uso (não bloqueia)
    try {
      await callerClient.from("ai_usage_logs").insert({
        user_id: userId,
        action_type: "generate_quiz",
        model: "google/gemini-2.5-flash",
        success: out.length > 0,
        tokens_in: 0, tokens_out: 0,
        metadata: {
          feature: "generate-questions-user",
          banca, materia,
          quantidade: out.length,
          dropDuplicadas,
          focoErros: errosRecentes,
          simThreshold: SIM_THRESHOLD,
        },
      });
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({
        ok: true,
        questions: out,
        personalizado: errosRecentes.length > 0,
        foco: errosRecentes,
        modoFocoErros: forcarFocoErros && errosRecentes.length > 0,
        duplicadasFiltradas: dropDuplicadas,
        latency_ms: Date.now() - t0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("generate-questions-user error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
