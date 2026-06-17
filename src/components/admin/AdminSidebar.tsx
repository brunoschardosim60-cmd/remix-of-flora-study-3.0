import { Users, Sparkles, FileQuestion, FileUp, Database, Shield, ShieldAlert, LayoutDashboard, ScrollText } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type AdminSection =
  | "overview"
  | "usuarios"
  | "moderacao"
  | "ia-tiers"
  | "enem"
  | "concurso"
  | "pdf"
  | "cache"
  | "logs";

type SectionDef = {
  id: AdminSection;
  label: string;
  icon: typeof Users;
  group: "Geral" | "Pessoas" | "Conteúdo" | "Sistema";
  badge?: string | number;
};

export function AdminSidebar({
  active,
  onChange,
  userCount,
}: {
  active: AdminSection;
  onChange: (next: AdminSection) => void;
  userCount?: number;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const sections: SectionDef[] = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard, group: "Geral" },
    { id: "usuarios", label: "Usuários", icon: Users, group: "Pessoas", badge: userCount },
    { id: "moderacao", label: "Moderação", icon: ShieldAlert, group: "Pessoas" },
    { id: "ia-tiers", label: "IA & Tiers", icon: Sparkles, group: "Sistema" },
    { id: "enem", label: "ENEM", icon: FileQuestion, group: "Conteúdo" },
    { id: "concurso", label: "Concurso", icon: FileQuestion, group: "Conteúdo" },
    { id: "pdf", label: "Reprocessar PDF", icon: FileUp, group: "Conteúdo" },
    { id: "cache", label: "Cache Flora", icon: Database, group: "Sistema" },
    { id: "logs", label: "Logs admin", icon: ScrollText, group: "Sistema" },
  ];

  const groups = ["Geral", "Pessoas", "Conteúdo", "Sistema"] as const;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-3 py-3">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          {!collapsed && <span className="font-heading text-sm font-semibold">Admin</span>}
        </div>
        {groups.map((g) => {
          const items = sections.filter((s) => s.group === g);
          return (
            <SidebarGroup key={g}>
              {!collapsed && <SidebarGroupLabel>{g}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={active === item.id}
                        onClick={() => onChange(item.id)}
                        tooltip={item.label}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && (
                          <span className="flex-1 truncate">{item.label}</span>
                        )}
                        {!collapsed && item.badge !== undefined && (
                          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}