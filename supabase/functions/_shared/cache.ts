// Shared content_cache helpers for edge functions.
// Provides TTL-aware lookup, write, and key normalization.

export interface CacheMeta {
  tipo: string;
  materia?: string;
  tema?: string;
  dificuldade?: string;
  banca?: string;
  estilo?: string;
  objetivo?: string;
}

export function normCacheStr(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCacheKey(parts: Record<string, string>): string {
  return Object.entries(parts)
    .map(([k, v]) => `${k}:${normCacheStr(v)}`)
    .join("|");
}

/**
 * Retrieves a cached payload. Honors expires_at when set.
 * Increments hits asynchronously (fire-and-forget).
 */
export async function cacheLookup(supabase: any, key: string): Promise<any | null> {
  try {
    const { data } = await supabase
      .from("content_cache")
      .select("id, payload, hits, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (!data?.payload) return null;
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return null;
    }
    supabase.from("content_cache")
      .update({ hits: (data.hits ?? 0) + 1 })
      .eq("id", data.id)
      .then(() => {}, () => {});
    return data.payload;
  } catch {
    return null;
  }
}

/**
 * Upserts a cache entry. ttlSeconds optional — when provided, sets expires_at.
 */
export async function cacheStore(
  supabase: any,
  key: string,
  meta: CacheMeta,
  payload: any,
  ttlSeconds?: number,
): Promise<void> {
  try {
    const expires_at = ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
      : null;
    await supabase.from("content_cache").upsert({
      cache_key: key,
      tipo: meta.tipo,
      materia: meta.materia || "",
      tema: meta.tema || "",
      dificuldade: meta.dificuldade || "medio",
      banca: meta.banca || "",
      estilo: meta.estilo || "",
      objetivo: meta.objetivo || "enem",
      payload,
      hits: 1,
      expires_at,
    }, { onConflict: "cache_key" });
  } catch { /* ignore */ }
}
