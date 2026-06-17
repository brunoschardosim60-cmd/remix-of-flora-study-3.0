import { Sparkles } from "lucide-react";
import { AdminAITierPanel } from "@/components/admin/AdminAITierPanel";

export function AITiersPanel({ users }: { users: Array<{ id: string; display_name: string }> }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">IA & Tiers (Free / Pro / Pro+)</h2>
      </div>
      <AdminAITierPanel users={users} />
    </section>
  );
}