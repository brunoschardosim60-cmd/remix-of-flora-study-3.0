import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callWithTaskFallback, parseAIJSON, type Msg } from "../_shared/providers.ts";
import {
  QUESTION_SYSTEM_PROMPT,
  buildPrompt,
  schemaFor,
  type Tipo,
} from "../_shared/prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateViaToolCalling(params: {
  banca: string;
  materia: string;
  assunto: string;
  quantidade: number;
  nivel: string;
  tipo: Tipo;
  orgao?: string;
  cargo?: string;
}): Promise<any[]> {
  const { tipo } = params;
  const userPrompt = buildPrompt(params);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

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
          description: "Salva as questões geradas no formato estruturado.",
          parameters: schemaFor(tipo),
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "save_questions" } },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("AI gateway error:", resp.status, txt);
    const messages: Msg[] = [
      {
        role: "system",
        content: QUESTION_SYSTEM_PROMPT + "\nResponda APENAS com um array JSON válido, sem comentários nem markdown.",
      },
      { role: "user", content: userPrompt },
    ];
    const text = await callWithTaskFallback(
      { messages, temperature: 0.7, jsonMode: true },
      "quiz",
      "generate-questions",
    );
    const parsed = parseAIJSON(text) as any;
    return Array.isArray(parsed) ? parsed : (parsed?.questoes ?? []);
  }

  const json = await resp.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    const content = json.choices?.[0]?.message?.content;
    if (content) {
      const parsed = parseAIJSON(content) as any;
      return Array.isArray(parsed) ? parsed : (parsed?.questoes ?? []);
    }
    throw new Error("Resposta da IA sem tool_call estruturado");
  }
  const args = JSON.parse(toolCall.function.arguments);
  return Array.isArray(args.questoes) ? args.questoes : [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authErr } = await callerClient.auth.getClaims(token);
    if (authErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem gerar questões" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = await req.json();
    const banca = String(payload.banca || "").trim();
    const materia = String(payload.materia || "").trim();
    const assunto = String(payload.assunto || "").trim();
    const quantidadeRaw = Number(payload.quantidade ?? 5);
    const quantidade = Math.min(Math.max(Math.floor(quantidadeRaw) || 5, 1), 10);
    const nivel = ["facil", "medio", "dificil"].includes(payload.nivel) ? payload.nivel : "medio";
    const tipo: Tipo = payload.tipo === "certo_errado" ? "certo_errado" : "multipla_escolha";
    const orgao = String(payload.orgao || "").trim();
    const cargo = String(payload.cargo || "").trim();
    const ano = payload.ano ? Number(payload.ano) : null;
    const persist = payload.persist !== false;

    if (!banca || !materia || !assunto) {
      return new Response(
        JSON.stringify({ error: "banca, materia e assunto são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const questoes = await generateViaToolCalling({ banca, materia, assunto, quantidade, nivel, tipo, orgao, cargo });

    if (!questoes.length) {
      return new Response(JSON.stringify({ error: "IA não retornou questões" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = questoes
      .map((q: any) => {
        if (tipo === "certo_errado") {
          return {
            banca, orgao, cargo, disciplina: materia,
            tema: q.tema || assunto, ano,
            enunciado: "",
            afirmativa: String(q.afirmativa || "").trim(),
            alternativas: [],
            correta: String(q.correta || "").toLowerCase(),
            explicacao: String(q.explicacao || "").trim(),
            dificuldade: nivel, nivel,
            tipo: "certo_errado",
            origem: "ia_gerada",
            tags: ["gerado_por_ia", banca.toLowerCase()],
            created_by: userId,
          };
        }
        const alts = Array.isArray(q.alternativas)
          ? q.alternativas.map((a: any) => ({
              letra: String(a.letra || "").toUpperCase(),
              texto: String(a.texto || "").trim(),
            }))
          : [];
        return {
          banca, orgao, cargo, disciplina: materia,
          tema: q.tema || assunto, ano,
          enunciado: String(q.enunciado || "").trim(),
          afirmativa: "",
          alternativas: alts,
          correta: String(q.correta || "").toUpperCase(),
          explicacao: String(q.explicacao || "").trim(),
          dificuldade: nivel, nivel,
          tipo: "multipla_escolha",
          origem: "ia_gerada",
          tags: ["gerado_por_ia", banca.toLowerCase()],
          created_by: userId,
        };
      })
      .filter((r: any) =>
        r.tipo === "certo_errado"
          ? r.afirmativa && (r.correta === "certo" || r.correta === "errado")
          : r.enunciado && r.alternativas.length >= 2 && r.correta,
      );

    let inserted: any[] = [];
    if (persist && rows.length) {
      const { data, error } = await admin.from("concurso_questions").insert(rows).select("*");
      if (error) {
        console.error("Insert error:", error);
        return new Response(
          JSON.stringify({ error: "Erro ao salvar questões: " + error.message, preview: rows }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      inserted = data ?? [];
    }

    return new Response(
      JSON.stringify({ ok: true, generated: rows.length, saved: inserted.length, questions: persist ? inserted : rows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("generate-questions error:", e);
    const status = e?.status === 429 ? 429 : e?.status === 402 ? 402 : 500;
    const msg =
      status === 429 ? "Limite de IA atingido. Tente novamente em instantes."
      : status === 402 ? "Créditos de IA esgotados."
      : e instanceof Error ? e.message : "Erro ao gerar questões";
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
