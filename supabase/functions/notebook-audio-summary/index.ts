/**
 * notebook-audio-summary
 * Recebe um texto (HTML/markdown de um caderno) → gera resumo enxuto (5-7 bullets)
 * → converte em áudio MP3 via OpenAI TTS. Retorna { summary, audio_base64 }.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callWithTaskFallback, type Msg } from "../_shared/providers.ts";

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

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { content, title = "Resumo do caderno" } = await req.json();
    const text = stripHtml(String(content || ""));
    if (text.length < 40) return json({ error: "Conteúdo muito curto para resumir" }, 400);

    const truncated = text.slice(0, 6000);
    const messages: Msg[] = [
      {
        role: "system",
        content:
          "Você é a Flora, professora particular. Resuma o conteúdo do aluno em 5 a 7 tópicos curtos, em português claro, fácil de ouvir. Sem markdown, sem títulos. Cada tópico em uma linha começando com 'Ponto 1:', 'Ponto 2:', etc.",
      },
      { role: "user", content: `Título: ${title}\n\nConteúdo:\n${truncated}` },
    ];

    const summary = await callWithTaskFallback(
      { messages, temperature: 0.4, maxTokens: 700 },
      "explicacao",
      "notebook-audio-summary",
    );

    // TTS via OpenAI
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ summary, audio_base64: null, error: "TTS indisponível" });

    const tts = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", input: summary, voice: "nova", speed: 1.05 }),
    });
    if (!tts.ok) {
      const t = await tts.text();
      console.error("TTS error:", tts.status, t);
      return json({ summary, audio_base64: null });
    }
    const buf = new Uint8Array(await tts.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const audio_base64 = btoa(bin);

    return json({ summary, audio_base64, mime: "audio/mpeg" });
  } catch (e) {
    console.error("notebook-audio-summary error:", e);
    return json({ error: (e as Error).message || "Erro inesperado" }, 500);
  }
});