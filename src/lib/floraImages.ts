import { supabase } from "./supabaseClient";

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
  // Implementar cache local se necessário
  const cached = localStorage.getItem(`flora-image-${concept}`);
  return cached ? JSON.parse(cached).url : null;
}

export function cacheImage(concept: string, imageUrl: string): void {
  localStorage.setItem(
    `flora-image-${concept}`,
    JSON.stringify({
      url: imageUrl,
      timestamp: Date.now(),
    })
  );
}
