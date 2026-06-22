// Lista curta de termos de baixo calão / spam óbvio. Não é completa;
// serve como primeiro filtro client-side. Moderação real fica no backend.
const BANNED = [
  "porra", "caralho", "merda", "fdp", "filho da puta", "puta que pariu",
  "viado", "vagabunda", "vagabundo", "arrombado", "arrombada",
  "buceta", "cu\\b", "piroca", "pau no cu",
];

const re = new RegExp(`\\b(${BANNED.join("|")})\\b`, "i");

export function containsProfanity(text: string): boolean {
  return re.test(text.toLowerCase());
}

export function validatePostContent(text: string): { ok: boolean; error?: string } {
  const t = text.trim();
  if (t.length < 3) return { ok: false, error: "Escreva ao menos 3 caracteres." };
  if (t.length > 2000) return { ok: false, error: "Post muito longo (máx. 2000)." };
  if (containsProfanity(t)) return { ok: false, error: "Evite palavrões. Reformule e tente de novo." };
  // Anti-spam simples: linha repetida
  if (/(.)\1{20,}/.test(t)) return { ok: false, error: "Parece spam (caractere repetido)." };
  return { ok: true };
}

const RATE_KEY = "studyflow.lastPostAt";
const RATE_MS = 30_000; // 30s entre posts

export function canPostNow(): { ok: boolean; waitSec?: number } {
  if (typeof window === "undefined") return { ok: true };
  const last = Number(window.localStorage.getItem(RATE_KEY) || 0);
  const diff = Date.now() - last;
  if (diff < RATE_MS) return { ok: false, waitSec: Math.ceil((RATE_MS - diff) / 1000) };
  return { ok: true };
}

export function markPosted() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RATE_KEY, String(Date.now()));
}