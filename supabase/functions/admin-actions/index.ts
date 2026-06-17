import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Action =
  | "ban_user"
  | "unban_user"
  | "reset_password"
  | "set_admin"
  | "set_tier"
  | "impersonate_link"
  | "notify_user"
  | "bulk_set_tier"
  | "set_role"
  | "list_roles";

interface Payload {
  action: Action;
  user_id?: string;
  user_ids?: string[];
  banned_until?: string | null;
  tier?: "free" | "pro" | "pro_plus";
  is_admin?: boolean;
  message?: string;
  redirect_to?: string;
  role?: "admin" | "moderator" | "support" | "user";
  grant?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "missing_auth" }, 401);

    // Identify caller using the anon client + JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "invalid_auth" }, 401);
    const admin_id = userData.user.id;

    // Service-role client (bypasses RLS)
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller is admin
    const { data: profile, error: profErr } = await svc
      .from("profiles")
      .select("is_admin")
      .eq("id", admin_id)
      .maybeSingle();
    if (profErr) return json({ error: "profile_lookup_failed", detail: profErr.message }, 500);
    if (!profile?.is_admin) return json({ error: "forbidden" }, 403);

    const body = (await req.json()) as Payload;
    if (!body?.action) return json({ error: "missing_action" }, 400);

    const log = async (action_type: string, user_id: string, note = "", extra: Record<string, unknown> = {}) => {
      await svc.from("admin_action_logs").insert({
        admin_id,
        user_id,
        action_type,
        note,
        after_state: extra,
      });
    };

    switch (body.action) {
      case "ban_user": {
        if (!body.user_id) return json({ error: "missing_user_id" }, 400);
        const until = body.banned_until ?? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
        const { error } = await svc.from("profiles").update({ banned_until: until }).eq("id", body.user_id);
        if (error) return json({ error: error.message }, 500);
        await svc.auth.admin.updateUserById(body.user_id, { ban_duration: "8760h" });
        await log("ban_user", body.user_id, `until=${until}`);
        return json({ ok: true, banned_until: until });
      }
      case "unban_user": {
        if (!body.user_id) return json({ error: "missing_user_id" }, 400);
        const { error } = await svc.from("profiles").update({ banned_until: null }).eq("id", body.user_id);
        if (error) return json({ error: error.message }, 500);
        await svc.auth.admin.updateUserById(body.user_id, { ban_duration: "none" });
        await log("unban_user", body.user_id);
        return json({ ok: true });
      }
      case "reset_password": {
        if (!body.user_id) return json({ error: "missing_user_id" }, 400);
        const { data: u } = await svc.auth.admin.getUserById(body.user_id);
        if (!u?.user?.email) return json({ error: "user_has_no_email" }, 400);
        const { data: link, error } = await svc.auth.admin.generateLink({
          type: "recovery",
          email: u.user.email,
          options: { redirectTo: body.redirect_to ?? `${new URL(req.url).origin}/reset` },
        });
        if (error) return json({ error: error.message }, 500);
        await log("reset_password", body.user_id);
        return json({ ok: true, link: link.properties?.action_link });
      }
      case "impersonate_link": {
        if (!body.user_id) return json({ error: "missing_user_id" }, 400);
        const { data: u } = await svc.auth.admin.getUserById(body.user_id);
        if (!u?.user?.email) return json({ error: "user_has_no_email" }, 400);
        const { data: link, error } = await svc.auth.admin.generateLink({
          type: "magiclink",
          email: u.user.email,
          options: { redirectTo: body.redirect_to ?? new URL(req.url).origin },
        });
        if (error) return json({ error: error.message }, 500);
        await log("impersonate_link", body.user_id, "magic link gerado");
        return json({ ok: true, link: link.properties?.action_link });
      }
      case "set_admin": {
        if (!body.user_id || typeof body.is_admin !== "boolean")
          return json({ error: "missing_fields" }, 400);
        const { error } = await svc.from("profiles").update({ is_admin: body.is_admin }).eq("id", body.user_id);
        if (error) return json({ error: error.message }, 500);
        await log(body.is_admin ? "promote_admin" : "demote_admin", body.user_id);
        return json({ ok: true });
      }
      case "set_tier": {
        if (!body.user_id || !body.tier) return json({ error: "missing_fields" }, 400);
        const { error } = await svc
          .from("user_tiers")
          .upsert({ user_id: body.user_id, tier: body.tier }, { onConflict: "user_id" });
        if (error) return json({ error: error.message }, 500);
        await log("set_tier", body.user_id, `tier=${body.tier}`);
        return json({ ok: true });
      }
      case "bulk_set_tier": {
        if (!body.user_ids?.length || !body.tier) return json({ error: "missing_fields" }, 400);
        const rows = body.user_ids.map((id) => ({ user_id: id, tier: body.tier! }));
        const { error } = await svc.from("user_tiers").upsert(rows, { onConflict: "user_id" });
        if (error) return json({ error: error.message }, 500);
        for (const id of body.user_ids) await log("set_tier", id, `bulk tier=${body.tier}`);
        return json({ ok: true, count: body.user_ids.length });
      }
      case "notify_user": {
        if (!body.user_id || !body.message) return json({ error: "missing_fields" }, 400);
        const { error } = await svc.from("flora_chat_messages").insert({
          user_id: body.user_id,
          role: "assistant",
          content: `📣 Mensagem do suporte: ${body.message}`,
          seq: Date.now(),
        });
        if (error) return json({ error: error.message }, 500);
        await log("notify_user", body.user_id, body.message.slice(0, 200));
        return json({ ok: true });
      }
      case "set_role": {
        if (!body.user_id || !body.role || typeof body.grant !== "boolean")
          return json({ error: "missing_fields" }, 400);
        if (body.grant) {
          const { error } = await svc
            .from("user_roles")
            .upsert({ user_id: body.user_id, role: body.role }, { onConflict: "user_id,role" });
          if (error) return json({ error: error.message }, 500);
        } else {
          const { error } = await svc
            .from("user_roles")
            .delete()
            .eq("user_id", body.user_id)
            .eq("role", body.role);
          if (error) return json({ error: error.message }, 500);
        }
        await log(body.grant ? "grant_role" : "revoke_role", body.user_id, body.role);
        return json({ ok: true });
      }
      case "list_roles": {
        if (!body.user_id) return json({ error: "missing_user_id" }, 400);
        const { data, error } = await svc
          .from("user_roles")
          .select("role")
          .eq("user_id", body.user_id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, roles: (data ?? []).map((r) => r.role) });
      }
      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    return json({ error: "internal", detail: String((e as Error).message ?? e) }, 500);
  }
});