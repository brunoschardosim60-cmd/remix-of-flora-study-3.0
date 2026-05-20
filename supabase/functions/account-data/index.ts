/**
 * account-data — exporta (GET) ou deleta (DELETE) todos os dados do usuário (LGPD).
 * Requer JWT válido. Para export: retorna JSON com todas as tabelas do usuário.
 * Para delete: apaga linhas em todas as tabelas e exclui auth.users.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
};

const TABLES = [
  "profiles", "user_tiers", "student_onboarding", "study_goals",
  "study_topics", "study_state", "study_sessions", "weekly_slots",
  "spaced_reviews", "notebooks", "notebook_pages", "notebook_shares",
  "essays", "user_theme_status", "gamification_profiles",
  "flora_chat_messages", "flora_decisions", "user_actions",
  "ai_usage_logs", "question_attempts", "concurso_question_attempts",
  "concurso_simulado_results", "concurso_ia_attempts",
  "push_subscriptions", "notebook_ai_activities", "notebook_page_state",
  "student_performance",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Valida usuário via JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceKey);

  if (req.method === "GET") {
    const out: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      email: userData.user.email,
      tables: {},
    };
    for (const t of TABLES) {
      const col = t === "profiles" ? "id" : "user_id";
      try {
        const { data } = await admin.from(t).select("*").eq(col, userId);
        (out.tables as any)[t] = data ?? [];
      } catch { (out.tables as any)[t] = []; }
    }
    return new Response(JSON.stringify(out, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="studyflow-${userId}.json"`,
      },
    });
  }

  if (req.method === "DELETE") {
    for (const t of TABLES) {
      const col = t === "profiles" ? "id" : "user_id";
      try { await admin.from(t).delete().eq(col, userId); } catch { /* ignore */ }
    }
    // Apaga usuário do auth
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response("method not allowed", { status: 405, headers: corsHeaders });
});