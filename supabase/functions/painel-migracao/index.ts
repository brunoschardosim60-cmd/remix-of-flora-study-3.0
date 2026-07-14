import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SYSTEM_VARS = new Set([
  "PATH", "HOME", "DENO_DIR", "HOSTNAME", "PORT", "TMPDIR", "USER",
  "LANG", "TERM", "_", "DENO_REGION", "DENO_DEPLOYMENT_ID",
]);

const knownFunctionNames = [
  "account-data",
  "admin-actions",
  "admin-vault",
  "classify-question-temas",
  "concurso-questions",
  "essay-corrector",
  "explain-question",
  "extract-question-from-pdf",
  "flora-engine",
  "flora-images",
  "flora-transcribe",
  "flora-tts",
  "generate-personalized-plan",
  "generate-questions-user",
  "generate-questions",
  "generate-saved-lesson",
  "import-enem-questions",
  "lesson-on-demand",
  "migrate-sql",
  "notebook-audio-summary",
  "ocr-notebook",
  "painel-migracao",
  "quiz-battle",
  "search-related-content",
  "seed-content-cache",
  "solve-math",
  "weekly-adaptive-quiz",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const env = Deno.env.toObject();
    const SUPABASE_URL = env.SUPABASE_URL ?? "";
    const ANON_KEY = env.SUPABASE_ANON_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "";
    const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    // Filter env vars
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(env)) {
      if (SYSTEM_VARS.has(k)) continue;
      if (k.startsWith("XDG_")) continue;
      filtered[k] = v;
    }

    // Probe edge functions
    const probes = await Promise.allSettled(
      knownFunctionNames.map(async (name) => {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
          method: "OPTIONS",
          headers: { "Access-Control-Request-Method": "POST" },
        });
        return { name, status: res.status };
      })
    );
    const edge_functions: string[] = [];
    for (const p of probes) {
      if (p.status === "fulfilled" && p.value.status < 500) {
        edge_functions.push(p.value.name);
      }
    }

    // Discover tables via exec_sql
    let database_tables: unknown = [];
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const tablesQuery = `
        SELECT
          c.relname AS tablename,
          COALESCE(s.n_live_tup, 0)::bigint AS row_count,
          (SELECT count(*) FROM information_schema.columns col
             WHERE col.table_schema = 'public' AND col.table_name = c.relname)::int AS column_count,
          0::int AS encrypted_columns,
          EXISTS (
            SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema = 'public' AND col.table_name = c.relname AND col.column_name = 'user_id'
          ) AS has_user_id
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname
      `;
      const { data, error } = await supabase.rpc("exec_sql", { sql_query: tablesQuery });
      if (!error) database_tables = data ?? [];
    } catch (_) { /* ignore */ }

    const body = {
      project_url: SUPABASE_URL,
      anon_key: ANON_KEY,
      service_role_key: SERVICE_ROLE_KEY,
      secrets: filtered,
      edge_functions,
      edge_functions_count: edge_functions.length,
      database_tables,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});