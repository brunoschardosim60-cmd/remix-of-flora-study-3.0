import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Você é a Flora, professora particular brasileira. Gere uma AULA INTERATIVA COMPLETA em JSON estrito.
Esquema obrigatório:
{
  "titulo": string,
  "introducao": string (2-3 parágrafos cativantes),
  "blocos": [ // 6 a 9 blocos
    {
      "titulo": string,
      "conteudo": string (markdown, 2-4 parágrafos, pode usar $...$ para LaTeX),
      "macete"?: string,
      "pegadinha"?: string,
      "analogia"?: string,
      "exemplo_resolvido"?: string,
      "flora_comment"?: string (comentário curto da Flora),
      "checkpoint"?: string (pergunta de fixação curta)
    }
  ],
  "resumo": string[] (5-7 bullets),
  "exercicio_final": {
    "pergunta": string,
    "alternativas": [string, string, string, string, string],
    "correta": number (0-4),
    "explicacao": string
  }
}
Linguagem: PT-BR, didática, calorosa, sem rodeios. Use exemplos concretos brasileiros. NUNCA invente fatos históricos.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userData } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (!userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supa.rpc("is_admin_user");
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { subject, topic, title, level = "medio", estimated_minutes = 18, cover_emoji = "📚", description = "" } = body;
    if (!subject || !topic) return new Response(JSON.stringify({ error: "subject e topic obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userPrompt = `Matéria: ${subject}\nTema: ${topic}\nNível: ${level}\n${title ? `Título sugerido: ${title}\n` : ""}Gere a aula completa em JSON conforme o esquema.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
        max_tokens: 8000,
        temperature: 0.6,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI ${r.status}: ${t.slice(0, 300)}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ai = await r.json();
    const content = JSON.parse(ai.choices[0].message.content);

    const { data: inserted, error: insErr } = await supa.from("lessons").insert({
      title: title || content.titulo, subject, topic, level,
      estimated_minutes, cover_emoji, description,
      content, published: true, created_by: userData.user.id,
    }).select("id").single();
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});