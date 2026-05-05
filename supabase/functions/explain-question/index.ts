import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callWithTaskFallback, type Msg } from "../_shared/providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ─── Auth: exige usuário autenticado ─────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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
      console.error("getClaims failed:", authErr?.message, "hasClaims:", !!claimsData?.claims);
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { enunciado, alternativaMarcada, correta, ano, numero, disciplina, tema } = await req.json();

    const acertou = alternativaMarcada && alternativaMarcada === correta;
    const systemPrompt = `Você é Flora, professora particular para vestibulandos do ENEM. Explique questões de forma clara, objetiva e didática em português brasileiro. Use no máximo 4 parágrafos curtos. Comece reconhecendo se o aluno acertou ou errou de forma encorajadora. Depois explique o raciocínio para chegar à resposta correta. Se o aluno errou, mostre por que a alternativa marcada é incorreta. Termine com uma dica de estudo ou um repertório útil.`;

    const userPrompt = `QUESTÃO ENEM ${ano ?? ""} (Q${numero ?? "?"}) — ${disciplina ?? ""}${tema ? " · " + tema : ""}

ENUNCIADO:
${enunciado}

RESPOSTA CORRETA: ${correta}
ALTERNATIVA DO ALUNO: ${alternativaMarcada || "(não marcou)"}
RESULTADO: ${acertou ? "ACERTOU ✓" : "ERROU ✗"}

Explique a questão.`;

    const messages: Msg[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // Cadeia: gemini → gemini_2 → groq → mistral → cerebras → deepseek → openai → lovable
    // (task "explicacao" prioriza mistral, depois cai pro resto)
    const text = await callWithTaskFallback(
      { messages, temperature: 0.6 },
      "explicacao",
      "explain-question"
    );

    // Emite como SSE pra manter compat com o cliente (que faz streaming parser)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Quebra em chunks pra dar sensação de streaming
        const chunks = text.match(/.{1,80}(\s|$)/gs) ?? [text];
        let i = 0;
        const send = () => {
          if (i >= chunks.length) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
          const payload = JSON.stringify({ choices: [{ delta: { content: chunks[i] } }] });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          i++;
          setTimeout(send, 20);
        };
        send();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("explain-question error:", e);
    const status = (e as any)?.status === 429 ? 429 : 500;
    const msg = status === 429
      ? "Limite de requisições atingido. Tente novamente em instantes."
      : (e instanceof Error ? e.message : "Erro ao gerar explicação");
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
