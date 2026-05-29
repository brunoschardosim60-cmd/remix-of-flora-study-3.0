import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finishOAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          // Verifica se o usuário já completou o onboarding para decidir o redirect
          const { data: onboarding } = await supabase
            .from("student_onboarding")
            .select("completed")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (onboarding?.completed) {
            navigate("/", { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
        } else {
          // Retry logic original para casos de delay no cache de sessão
          let retrySession = null;
          for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            const { data: { session: s } } = await supabase.auth.getSession();
            if (s) {
              retrySession = s;
              break;
            }
          }
          
          if (retrySession) {
            const { data: onboarding } = await supabase
              .from("student_onboarding")
              .select("completed")
              .eq("user_id", retrySession.user.id)
              .maybeSingle();
            navigate(onboarding?.completed ? "/" : "/onboarding", { replace: true });
          } else {
            navigate("/auth", { replace: true });
          }
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Erro ao finalizar login"));
        navigate("/auth", { replace: true });
      }
    };

    finishOAuth();
  }, [navigate]);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
