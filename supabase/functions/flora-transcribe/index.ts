import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BASE64_BYTES = 10 * 1024 * 1024;

const GEMINI_AUDIO_MODEL = "gemini-3.6-flash";
const OPENAI_AUDIO_MODEL = "gpt-4o-mini-transcribe";

async function callGeminiAudio(audioBase64: string, mimeType: string, apiKey: string): Promise<string> {
  const model = GEMINI_AUDIO_MODEL;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Você transcreve áudio em português brasileiro de forma fiel. Responda APENAS o texto transcrito, sem comentários." }] },
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Transcreva este áudio em português." },
        ] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Gemini ${r.status}: ${txt.slice(0, 200)}`);
  }
  const d = await r.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function audioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

async function callOpenAIAudio(audioBase64: string, mimeType: string, apiKey: string): Promise<string> {
  const bytes = Uint8Array.from(atob(audioBase64), (character) => character.charCodeAt(0));
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), `pergunta.${audioExtension(mimeType)}`);
  form.append("model", OPENAI_AUDIO_MODEL);
  form.append("language", "pt");
  form.append("response_format", "json");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 200)}`);
  }
  const data = await response.json();
  return typeof data?.text === "string" ? data.text : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const audio = body?.audio;
    const mimeType = body?.mimeType || "audio/webm";
    if (!audio || typeof audio !== "string") throw new Error("audio (base64) required");
    if (audio.length > MAX_BASE64_BYTES) {
      return new Response(JSON.stringify({ error: "Áudio muito longo. Grave trechos menores." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: quota } = await supabase.rpc("check_ai_quota", { p_user_id: userId, p_action: "chat_audio" });
    if (quota && !quota.allowed) {
      return new Response(JSON.stringify({ error: "Limite diário de transcrição atingido.", quota }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!geminiKey && !openaiKey) throw new Error("Nenhum provedor de transcrição configurado");

    let text = "";
    let model = GEMINI_AUDIO_MODEL;
    try {
      if (!geminiKey) throw new Error("GEMINI_API_KEY missing");
      text = await callGeminiAudio(audio, mimeType, geminiKey);
      if (!text.trim()) throw new Error("Transcrição vazia do Gemini");
    } catch (geminiError) {
      console.warn("Gemini transcription unavailable, using OpenAI fallback", geminiError);
      if (!openaiKey) throw geminiError;
      text = await callOpenAIAudio(audio, mimeType, openaiKey);
      model = OPENAI_AUDIO_MODEL;
    }

    text = text.trim();
    if (!text) throw new Error("Não foi possível reconhecer fala no áudio");

    await supabase.from("ai_usage_logs").insert({
      user_id: userId, action_type: "chat_audio", model, success: true,
    });

    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
