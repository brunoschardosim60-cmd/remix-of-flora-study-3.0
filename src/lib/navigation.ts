import { Home, Sparkles, BookOpen, GraduationCap, Library, Users, BarChart3, Settings, PenTool, LayoutDashboard } from "lucide-react";

export const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "flora", label: "Flora", icon: Sparkles, path: "/?flora=1" },
  { id: "banco", label: "Questões", icon: Library, path: "/banco" },
  { id: "redacao", label: "Redação", icon: PenTool, path: "/redacao" },
  { id: "aulao", label: "Aulões", icon: BookOpen, path: "/aulao" },
  { id: "notebooks", label: "Caderno", icon: GraduationCap, path: "/notebooks" },
  { id: "comunidades", label: "Comunidades", icon: Users, path: "/comunidades" },
  { id: "analise", label: "Análises", icon: BarChart3, path: "/analise" },
  { id: "settings", label: "Configurações", icon: Settings, path: "/settings" },
];
