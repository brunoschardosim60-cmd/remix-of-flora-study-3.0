import { supabase } from "@/integrations/supabase/client";

export interface ImageGenerationRequest {
  concept: string;
  context: string;
  style?: "scientific" | "educational" | "artistic" | "diagram";
  userId: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl: string;
  concept: string;
  prompt: string;
  error?: string;
}

export async function generateDidacticImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  try {
    const response = await supabase.functions.invoke("flora-images", {
      body: request,
    });

    if (response.error) {
      console.error("Error generating image:", response.error);
      return {
        success: false,
        imageUrl: "",
        concept: request.concept,
        prompt: "",
        error: response.error.message || "Failed to generate image",
      };
    }

    return response.data as ImageGenerationResponse;
  } catch (error) {
    console.error("Error in generateDidacticImage:", error);
    return {
      success: false,
      imageUrl: "",
      concept: request.concept,
      prompt: "",
      error: "Failed to generate image",
    };
  }
}

export async function generateMultipleImages(
  concepts: Array<{ concept: string; context: string; style?: string }>,
  userId: string
): Promise<ImageGenerationResponse[]> {
  const promises = concepts.map((item) =>
    generateDidacticImage({
      concept: item.concept,
      context: item.context,
      style: (item.style as any) || "educational",
      userId,
    })
  );

  return Promise.all(promises);
}

export function getCachedImage(concept: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(`flora-image-${concept}`);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return typeof parsed?.url === "string" ? parsed.url : null;
  } catch {
    // Entrada corrompida — limpa para evitar repetir o erro
    try { localStorage.removeItem(`flora-image-${concept}`); } catch { /* ignore */ }
    return null;
  }
}

export function cacheImage(concept: string, imageUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `flora-image-${concept}`,
      JSON.stringify({ url: imageUrl, timestamp: Date.now() })
    );
  } catch {
    // localStorage cheio ou desabilitado — silencioso
  }
}

/**
 * Geração de imagem sob demanda do usuário (chat/caderno).
 * Chama flora-images com action="ai_generate" — usa IA real (Gemini image).
 */
export async function generateImageFromPrompt(prompt: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("flora-images", {
      body: { action: "ai_generate", prompt },
    });
    if (error) throw error;
    if (data?.success && typeof data.imageUrl === "string") return data.imageUrl;
    return null;
  } catch (e) {
    console.warn("[floraImages] generateImageFromPrompt falhou:", e);
    return null;
  }
}
