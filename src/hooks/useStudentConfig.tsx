import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface StudentConfig {
  objetivo: string;
  isConcurso: boolean;
  bancoRoute: string;
  bancoLabel: string;
  onboardingCompleted: boolean;
  onboardingData: any;
}

interface StudentContextType {
  config: StudentConfig | null;
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const StudentContext = createContext<StudentContextType>({
  config: null,
  loading: true,
  refreshConfig: async () => {},
});

export function StudentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [config, setConfig] = useState<StudentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    if (!user) {
      setConfig(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("student_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const obj = (data?.objetivo || "").toLowerCase();
      const isConcurso = obj === "concurso";
      
      setConfig({
        objetivo: obj,
        isConcurso,
        bancoRoute: isConcurso ? "/banco-concurso" : "/banco",
        bancoLabel: isConcurso ? "Questões Concurso" : "Questões ENEM",
        onboardingCompleted: !!data?.completed,
        onboardingData: data,
      });
    } catch (err) {
      console.error("Error fetching student config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [user]);

  return (
    <StudentContext.Provider value={{ config, loading, refreshConfig: fetchConfig }}>
      {children}
    </StudentContext.Provider>
  );
}

export const useStudentConfig = () => useContext(StudentContext);
