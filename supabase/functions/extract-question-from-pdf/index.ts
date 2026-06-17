import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY_2");

/**
 * Extrai uma questão específica de um PDF do ENEM usando Gemini com input multimodal.
 * Body esperado:
 *  - pdfBase64: string  (PDF inteiro em base64, sem prefixo data:)
 *  - numero: number     (número da questão a extrair)
 *  - ano?: number
 *  - disciplina?: string (dica para o modelo)
 *  - hint?: string       (descrição/contexto extra opcional)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Auth: somente admin pode reprocessar PDF de prova ────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", claimsData.claims.sub)
      .maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfBase64, numero, ano, disciplina, hint, pageRange } = await req.json();

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(JSON.stringify({ error: "pdfBase64 obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!numero || typeof numero !== "number") {
      return new Response(JSON.stringify({ error: "numero (da questão) obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageHint =
      pageRange && typeof pageRange === "object" && pageRange.from && pageRange.to
        ? `\n\nIMPORTANTE: Este PDF já foi recortado pelo operador para conter apenas as páginas ${pageRange.from} a ${pageRange.to} da prova original. Foque exclusivamente nesse conteúdo — não procure a questão fora dessa faixa.`
        : "";

    const prompt = `Você é um extrator de questões do ENEM. Receberá o PDF de uma prova oficial e deve localizar e transcrever EXATAMENTE a questão de número ${numero}${ano ? ` do ENEM ${ano}` : ""}${disciplina ? ` (área: ${disciplina})` : ""}.${hint ? `\n\nContexto adicional: ${hint}` : ""}${pageHint}

REGRAS:
1. Localize a questão pelo número impresso na prova (ex: "QUESTÃO ${numero}" ou apenas "${numero}.").
2. Transcreva o enunciado COMPLETO, preservando parágrafos, fórmulas (em texto plano) e fonte/autor quando houver. NÃO inclua imagens — descreva-as brevemente entre colchetes se forem essenciais.
3. Liste TODAS as 5 alternativas (A, B, C, D, E). Se alguma alternativa for visual (gráfico/imagem), descreva-a entre colchetes.
4. Identifique a alternativa correta SOMENTE se houver gabarito explícito no PDF. Caso contrário, deixe "correta" como string vazia.
5. Devolva APENAS JSON válido, sem markdown, sem explicação adicional.

Formato OBRIGATÓRIO:
{
  "encontrada": boolean,
  "enunciado": string,
  "alternativas": [
    { "letra": "A", "texto": string },
    { "letra": "B", "texto": string },
    { "letra": "C", "texto": string },
    { "letra": "D", "texto": string },
    { "letra": "E", "texto": string }
  ],
  "correta": "A" | "B" | "C" | "D" | "E" | "",
  "tema": string,
  "observacao": string
}

Se não encontrar a questão no PDF, retorne {"encontrada": false, "enunciado": "", "alternativas": [], "correta": "", "tema": "", "observacao": "explique por quê"}.`;

    // Gemini 2.5 Pro suporta PDF inline até ~50MB
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini error:", resp.status, errText.slice(0, 500));
      return new Response(JSON.stringify({ error: `Gemini ${resp.status}`, detail: errText.slice(0, 300) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Tenta achar bloco JSON no meio do texto
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* noop */ }
      }
    }

    if (!parsed) {
      return new Response(JSON.stringify({ error: "Resposta da IA não é JSON válido", raw: text.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("extract-question-from-pdf error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});