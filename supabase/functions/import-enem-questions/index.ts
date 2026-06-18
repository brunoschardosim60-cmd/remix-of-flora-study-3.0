/**
 * import-enem-questions
 * Importa questões oficiais do ENEM a partir da API pública enem.dev
 * e popula a tabela public.questions com origem='enem.dev'.
 *
 * Body: { year: number, limit?: number, offset?: number }
 * Requer usuário admin (is_admin_user).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EnemAlt = { letter: string; text: string; file: string | null; isCorrect: boolean };
type EnemQ = {
  title: string;
  index: number;
  discipline: string | null;
  language: string | null;
  year: number;
  context: string | null;
  files: string[];
  correctAlternative: string;
  alternativesIntroduction: string | null;
  alternatives: EnemAlt[];
};

const DISC_TO_AREA: Record<string, string> = {
  "linguagens": "linguagens",
  "matematica": "matematica",
  "ciencias-humanas": "humanas",
  "ciencias-natureza": "natureza",
};

const DISC_LABEL: Record<string, string> = {
  "linguagens": "Linguagens",
  "matematica": "Matemática",
  "ciencias-humanas": "Ciências Humanas",
  "ciencias-natureza": "Ciências da Natureza",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth: precisa de admin
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: userData } = await supabase.auth.getUser(token);
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await supabase
      .from("profiles").select("is_admin").eq("id", uid).maybeSingle();
    if (!prof?.is_admin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const year = Number(body.year);
    const offset = Number(body.offset ?? 0);
    const limit = Math.min(Number(body.limit ?? 50), 50);
    if (!year || year < 2009 || year > 2024) return json({ error: "year inválido" }, 400);

    const url = `https://api.enem.dev/v1/exams/${year}/questions?limit=${limit}&offset=${offset}`;
    const r = await fetch(url);
    if (!r.ok) return json({ error: `enem.dev ${r.status}` }, 502);
    const data = await r.json();
    const questions: EnemQ[] = data.questions ?? [];
    const total: number = data.metadata?.total ?? 0;
    const hasMore: boolean = data.metadata?.hasMore ?? false;

    let inserted = 0, skipped = 0, failed = 0;
    for (const q of questions) {
      try {
        // Dedup: mesma (ano, numero, prova) — usa caderno azul como padrão (API enem.dev não diferencia)
        const { data: existing } = await supabase
          .from("questions")
          .select("id")
          .eq("ano", year)
          .eq("numero", q.index)
          .eq("origem", "enem.dev")
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const disc = q.discipline ?? "linguagens";
        const alternativas: Record<string, string> = {};
        for (const a of q.alternatives ?? []) alternativas[a.letter] = a.text ?? "";
        const enunciadoFull = [q.context, q.alternativesIntroduction].filter(Boolean).join("\n\n");

        const { error } = await supabase.from("questions").insert({
          ano: year,
          prova: "ENEM",
          dia: ["linguagens", "ciencias-humanas"].includes(disc) ? 1 : 2,
          caderno: "azul",
          area: DISC_TO_AREA[disc] ?? disc,
          disciplina: DISC_LABEL[disc] ?? disc,
          numero: q.index,
          enunciado: enunciadoFull,
          alternativas,
          correta: q.correctAlternative,
          tem_imagem: (q.files ?? []).length > 0,
          imagem_urls: q.files ?? [],
          origem: "enem.dev",
          incomplete: !enunciadoFull || Object.keys(alternativas).length < 4,
        });
        if (error) { failed++; console.error("insert err", q.index, error.message); }
        else inserted++;
      } catch (e) {
        failed++; console.error("q err", e);
      }
    }

    return json({
      year, offset, limit, total, hasMore,
      fetched: questions.length, inserted, skipped, failed,
      nextOffset: offset + questions.length,
    });
  } catch (e) {
    console.error(e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}