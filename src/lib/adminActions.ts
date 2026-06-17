import { supabase } from "@/integrations/supabase/client";

type Tier = "free" | "pro" | "pro_plus";
export type AppRole = "admin" | "moderator" | "support" | "user";

async function invoke<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-actions", { body: payload });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && (data as { error: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export const banUser = (user_id: string, banned_until?: string) =>
  invoke<{ ok: true; banned_until: string }>({ action: "ban_user", user_id, banned_until });
export const unbanUser = (user_id: string) => invoke({ action: "unban_user", user_id });
export const resetPasswordLink = (user_id: string) =>
  invoke<{ ok: true; link: string }>({ action: "reset_password", user_id });
export const impersonateLink = (user_id: string) =>
  invoke<{ ok: true; link: string }>({ action: "impersonate_link", user_id });
export const setAdmin = (user_id: string, is_admin: boolean) =>
  invoke({ action: "set_admin", user_id, is_admin });
export const setTier = (user_id: string, tier: Tier) =>
  invoke({ action: "set_tier", user_id, tier });
export const bulkSetTier = (user_ids: string[], tier: Tier) =>
  invoke<{ ok: true; count: number }>({ action: "bulk_set_tier", user_ids, tier });
export const notifyUser = (user_id: string, message: string) =>
  invoke({ action: "notify_user", user_id, message });
export const setRole = (user_id: string, role: AppRole, grant: boolean) =>
  invoke({ action: "set_role", user_id, role, grant });
export const listUserRoles = (user_id: string) =>
  invoke<{ ok: true; roles: AppRole[] }>({ action: "list_roles", user_id });

export function exportUsersCSV(rows: Array<Record<string, unknown>>, filename = "usuarios.csv") {
  if (!rows.length) return;
  const headers = Array.from(
    rows.reduce((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}