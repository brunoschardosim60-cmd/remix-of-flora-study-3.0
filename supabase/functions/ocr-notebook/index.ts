import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    const text = await callGeminiVision(image, apiKey);

    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
