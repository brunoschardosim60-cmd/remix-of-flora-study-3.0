import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voice = "nova", speed = 1.0, personality = "padrao" } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return jsonResponse({ error: "Texto vazio ou inválido" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Unauthorized: invalid token" }, 401);

    // Mapeia personalidades para vozes OpenAI
    const voiceMap: Record<string, string> = {
      "padrao": "nova",
      "rigorosa": "shimmer",
      "amiga": "alloy",
      "engraçada": "echo",
      "motivadora": "fable",
      "tecnica": "onyx",
    };

    const selectedVoice = voiceMap[personality] || voiceMap["padrao"];

    // Chama a API de TTS da OpenAI
    const openaiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        input: text,
        voice: selectedVoice,
        speed: Math.min(Math.max(speed, 0.25), 4.0), // Limita entre 0.25 e 4.0
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI TTS Error:", error);
      return jsonResponse({ error: "Falha ao gerar áudio" }, 500);
    }

    // Retorna o áudio como stream
    const audioBuffer = await openaiResponse.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error("TTS Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
