import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

interface ImageGenerationRequest {
  concept: string;
  context: string;
  style?: "scientific" | "educational" | "artistic" | "diagram";
  userId: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body: ImageGenerationRequest = await req.json();
    const { concept, context, style = "educational", userId } = body;

    if (!concept || !context || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // Construir prompt para geração de imagem
    const imagePrompt = buildImagePrompt(concept, context, style);

    // Chamar API da OpenAI para gerar imagem
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      }),
    });

    if (!imageResponse.ok) {
      const error = await imageResponse.json();
      console.error("OpenAI API Error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500 }
      );
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.data[0].url;

    // Registrar uso no Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.from("flora_usage_logs").insert({
      user_id: userId,
      action: "image_generation",
      concept: concept,
      model: "dall-e-3",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageUrl,
        concept: concept,
        prompt: imagePrompt,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in flora-images:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
});

function buildImagePrompt(concept: string, context: string, style: string): string {
  const styleDescriptions = {
    scientific: "scientific illustration, accurate, detailed, labeled, educational",
    educational: "educational diagram, clear, colorful, easy to understand for students",
    artistic: "artistic representation, creative, visually appealing, engaging",
    diagram: "technical diagram, schematic, clean lines, professional",
  };

  const styleDesc = styleDescriptions[style as keyof typeof styleDescriptions] || styleDescriptions.educational;

  return `Create an educational illustration for teaching the concept of "${concept}". 
  Context: ${context}
  
  Style: ${styleDesc}
  
  Requirements:
  - Clear and easy to understand for students
  - Use colors effectively to highlight key elements
  - Include labels if applicable
  - Professional quality suitable for educational materials
  - No text overlays, only visual elements
  
  Make it visually engaging and appropriate for a learning platform.`;
}
