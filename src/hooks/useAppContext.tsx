import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AppContextType {
  onboarding: any;
  loading: boolean;
  refreshOnboarding: () => Promise<void>;
  achievements: any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onboarding, setOnboarding] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshOnboarding = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("student_onboarding")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setOnboarding(data);
  };

  const loadAchievements = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("student_achievements")
      .select("*")
      .eq("user_id", user.id);
    setAchievements(data || []);
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([refreshOnboarding(), loadAchievements()]).finally(() => setLoading(false));
    } else {
      setOnboarding(null);
      setAchievements([]);
      setLoading(false);
    }
  }, [user]);

  return (
    <AppContext.Provider value={{ onboarding, loading, refreshOnboarding, achievements }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
