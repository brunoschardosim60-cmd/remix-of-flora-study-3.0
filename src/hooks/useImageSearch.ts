/**
 * src/hooks/useImageSearch.ts
 *
 * Hook que chama flora-images com action="search".
 * A cadeia Unsplash → Pexels → Pixabay roda no edge function (server-side),
 * então as chaves de API nunca ficam expostas no bundle do frontend.
 *
 * Uso:
 *   const { url, loading } = useImageSearch("fotossíntese planta");
 *   const { url } = useImageSearch(bloco.titulo + " " + lesson.titulo);
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache em sessionStorage: evita chamar o edge function duas vezes para
// a mesma query durante a sessão (o edge function já tem cache no Supabase
// por 7 dias, mas isso evita até o round-trip desnecessário).
const SESSION_PREFIX = "flora:img-search:";

function sessionGet(key: string): string | null {
  try { return sessionStorage.getItem(SESSION_PREFIX + key) || null; } catch { return null; }
}
function sessionSet(key: string, url: string) {
  try { sessionStorage.setItem(SESSION_PREFIX + key, url); } catch { /* cheio */ }
}
function slugKey(q: string) {
  return (q || "").toLowerCase().replace(/\s+/g, "-").slice(0, 80);
}

interface UseImageSearchResult {
  url: string | null;
  provider: string | null;
  loading: boolean;
  error: boolean;
}

export function useImageSearch(query: string, enabled = true): UseImageSearchResult {
  const [url, setUrl]           = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);

  useEffect(() => {
    if (!enabled || !query.trim()) return;

    const key = slugKey(query);
    const cached = sessionGet(key);
    if (cached) { setUrl(cached); return; }

    let cancelled = false;
    setLoading(true);
    setError(false);

    supabase.functions
      .invoke("flora-images", { body: { action: "search", query } })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data?.imageUrl) {
          console.warn("[useImageSearch] falhou:", err?.message || "sem URL");
          setError(true);
        } else {
          sessionSet(key, data.imageUrl);
          setUrl(data.imageUrl);
          setProvider(data.provider || null);
        }
      })
      .catch((e) => {
        if (!cancelled) { console.warn("[useImageSearch] erro:", e); setError(true); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [query, enabled]);

  return { url, provider, loading, error };
}

/**
 * Versão para uso fora de componentes React (ex: pré-fetch em listas).
 * Chama o edge function e retorna a URL, sem estado.
 */
export async function fetchImageUrl(query: string): Promise<string | null> {
  const key = slugKey(query);
  const cached = sessionGet(key);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.functions.invoke("flora-images", {
      body: { action: "search", query },
    });
    if (error || !data?.imageUrl) return null;
    sessionSet(key, data.imageUrl);
    return data.imageUrl as string;
  } catch {
    return null;
  }
}
