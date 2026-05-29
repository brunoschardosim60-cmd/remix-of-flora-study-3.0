import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callWithTaskFallback } from "../_shared/providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, context } = await req.json();
    if (!text) throw new Error("No text provided");

    const systemPrompt = `Você é um dicionário acadêmico inteligente do StudyFlow. Analise o parágrafo de aula e identifique de 2 a 4 termos técnicos ou conceitos importantes.
Para cada termo, forneça uma definição curta e clara (máximo 2 frases).

Responda SOMENTE com JSON no formato:
{
  "terms": [
    {"term": "Termo", "definition": "Definição curta..."},
    ...
  ]
}`;

    const content = await callWithTaskFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Contexto: ${context || ""}\n\nTexto para análise:\n${text}` }
      ],
      jsonMode: true,
      maxTokens: 500,
    }, "chat", "glossary");

    return new Response(content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
