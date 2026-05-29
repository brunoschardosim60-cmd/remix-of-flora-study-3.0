import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentConfig } from "./useStudentConfig";
import type { User } from "@supabase/supabase-js";

/**
 * Redireciona para /onboarding se o usuário logado ainda não completou.
 * Admins pulam a verificação. Retorna `checked = true` quando seguro renderizar.
 */
export function useOnboardingGuard(user: User | null, isAdmin: boolean) {
  const navigate = useNavigate();
  const { config, loading } = useStudentConfig();
  const [checked, setChecked] = useState(!user);

  useEffect(() => {
    if (!user || loading) return;
    if (isAdmin) { setChecked(true); return; }

    if (config?.onboardingCompleted === false) {
      navigate("/onboarding", { replace: true });
    } else {
      setChecked(true);
    }
  }, [user, isAdmin, navigate, config, loading]);

  return checked;
}
