import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BASE64_BYTES = 8 * 1024 * 1024; // ~6MB de imagem real

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function callGeminiVision(imageBase64: string, apiKey: string): Promise<string> {
  const model = "gemini-2.0-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Você é um especialista em OCR. Extraia todo o texto visível na imagem de forma fiel, mantendo a estrutura de parágrafos. Responda APENAS o texto extraído." }] },
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType: "image/png", data: imageBase64 } },
          { text: "Extraia o texto desta página de caderno." },
        ] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );
  if (!r.ok) throw new Error(`Gemini Error: ${r.status}`);
  const d = await r.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { image } = await req.json();
    if (!image) throw new Error("No image provided");
    if (typeof image !== "string") throw new Error("image must be base64 string");
    if (image.length > MAX_BASE64_BYTES) {
      return new Response(JSON.stringify({ error: "Imagem muito grande. Máximo 6MB." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth + quota
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
    const { data: quota } = await supabase.rpc("check_ai_quota", { p_user_id: userId, p_action: "ocr_extract" });
    if (quota && !quota.allowed) {
      return new Response(JSON.stringify({ error: "Limite diário de OCR atingido.", quota }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache por hash da imagem
    const hash = await sha256(image);
    const { data: cached } = await supabase.from("ocr_cache").select("text").eq("hash", hash).maybeSingle();
    if (cached?.text) {
      await supabase.from("ocr_cache").update({ hits: (cached as any).hits ? (cached as any).hits + 1 : 2 }).eq("hash", hash);
      return new Response(JSON.stringify({ text: cached.text, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    const text = await callGeminiVision(image, apiKey);

    if (text) {
      await supabase.from("ocr_cache").insert({ hash, text });
      await supabase.from("ai_usage_logs").insert({ user_id: userId, action_type: "ocr_extract", model: "gemini-2.0-flash", success: true });
    }

    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
