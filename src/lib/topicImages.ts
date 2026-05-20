// Mapa de imagens reais (Unsplash CDN — sem API key, sem custo) por tema/assunto.
// As URLs apontam para fotos publicadas no Unsplash; o CDN é estável.
// Usado pelo player de aula como visual temático ao invés de gráficos SVG.

type ImgEntry = { keywords: string[]; url: string };

const W = "?auto=format&fit=crop&w=900&q=70";

const LIBRARY: ImgEntry[] = [
  // ── Exatas ──────────────────────────────────────────────
  { keywords: ["matemat", "algebra", "equac", "funcao", "funç"], url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb" + W },
  { keywords: ["geometr", "trigon", "angulo", "ângulo"], url: "https://images.unsplash.com/photo-1509228468518-180dd4864904" + W },
  { keywords: ["estatist", "probabil", "grafico", "gráfico", "dados"], url: "https://images.unsplash.com/photo-1543286386-713bdd548da4" + W },
  { keywords: ["fisica", "física", "mecanic", "cinemat", "newton", "energia"], url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb" + W },
  { keywords: ["eletric", "elétric", "circuito", "corrente"], url: "https://images.unsplash.com/photo-1518770660439-4636190af475" + W },
  { keywords: ["quimic", "química", "reaç", "molecul", "atomo", "átomo"], url: "https://images.unsplash.com/photo-1554475901-4538ddfbccc2" + W },
  { keywords: ["organic", "orgânic", "carbono"], url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69" + W },

  // ── Biológicas ──────────────────────────────────────────
  { keywords: ["biolog", "celul", "célul", "dna", "gene", "genetic"], url: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8" + W },
  { keywords: ["ecolog", "ecossist", "meio ambiente", "biom"], url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e" + W },
  { keywords: ["anatomia", "corpo humano", "fisiolog"], url: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56" + W },
  { keywords: ["evolu", "darwin", "especi"], url: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7" + W },

  // ── Humanas ─────────────────────────────────────────────
  { keywords: ["histor", "históri", "guerra", "revolu", "imperio", "império"], url: "https://images.unsplash.com/photo-1461360370896-922624d12aa1" + W },
  { keywords: ["geograf", "mapa", "clima", "relevo", "urban"], url: "https://images.unsplash.com/photo-1524661135-423995f22d0b" + W },
  { keywords: ["filosof", "sociolog", "etica", "ética", "polit", "polít"], url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570" + W },

  // ── Linguagens ──────────────────────────────────────────
  { keywords: ["portugu", "gramat", "gramát", "sintax", "sintáx", "ortograf"], url: "https://images.unsplash.com/photo-1455390582262-044cdead277a" + W },
  { keywords: ["literat", "romance", "modernism", "realismo"], url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570" + W },
  { keywords: ["redac", "redaç", "dissertac", "argument"], url: "https://images.unsplash.com/photo-1517842645767-c639042777db" + W },
  { keywords: ["interpret", "texto", "leitura"], url: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d" + W },
  { keywords: ["ingles", "inglês", "espanhol", "lingua estrang"], url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d" + W },

  // ── Concursos ───────────────────────────────────────────
  { keywords: ["direito", "constitu", "juri", "lei", "civil", "penal"], url: "https://images.unsplash.com/photo-1505664194779-8beaceb93744" + W },
  { keywords: ["rlm", "raciocin", "raciocín", "logic", "lógic"], url: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3" + W },
  { keywords: ["administr", "gestao", "gestão"], url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7" + W },
  { keywords: ["informat", "informát", "computa", "tecnolog"], url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97" + W },

  // ── Genéricos por área ──────────────────────────────────
  { keywords: ["enem", "vestibul", "estud"], url: "https://images.unsplash.com/photo-1513258496099-48168024aec0" + W },
];

const DEFAULT_IMG = "https://images.unsplash.com/photo-1513258496099-48168024aec0" + W;

function norm(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Resolve uma imagem temática a partir do título da aula / texto da cena.
 * Faz match por keyword (acentos ignorados). Sempre retorna uma URL.
 */
export function pickTopicImage(...inputs: Array<string | undefined>): string {
  const hay = norm(inputs.filter(Boolean).join(" | "));
  if (!hay) return DEFAULT_IMG;
  for (const entry of LIBRARY) {
    for (const k of entry.keywords) {
      if (hay.includes(k)) return entry.url;
    }
  }
  return DEFAULT_IMG;
}