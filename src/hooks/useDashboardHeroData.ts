import { useMemo } from "react";
import type { User } from "@supabase/supabase-js";

type Profile = { display_name?: string | null } | null | undefined;

type Gamification = {
  todayStudyMinutes: number;
  todayRevisions: number;
  todayQuizCount: number;
  dailyGoals: { studyMinutes: number; revisions: number; quizCount: number };
};

/**
 * Deriva os dados de exibição do Hero do dashboard:
 * - `firstName`: prioriza profile.display_name, depois user_metadata, por fim e-mail.
 * - `dailyGoals`: array no formato consumido por DashboardHero, montado a partir
 *   das metas diárias da gamificação. Memoizado para evitar re-render desnecessário.
 *
 * Mantém o Index.tsx focado em composição.
 */
export function useDashboardHeroData(user: User | null, profile: Profile, gamification: Gamification) {
  const firstName = useMemo(() => {
    const profileName = profile?.display_name;
    if (typeof profileName === "string" && profileName.trim()) {
      return profileName.trim().split(" ")[0];
    }
    const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (typeof metaName === "string" && metaName.trim()) {
      return metaName.trim().split(" ")[0];
    }
    if (user?.email) return user.email.split("@")[0];
    return undefined;
  }, [profile?.display_name, user?.user_metadata?.full_name, user?.user_metadata?.name, user?.email]);

  const dailyGoals = useMemo(
    () => [
      {
        id: "minutes" as const,
        label: "Tempo estudado",
        current: gamification.todayStudyMinutes,
        target: gamification.dailyGoals.studyMinutes,
        unit: "min",
      },
      {
        id: "revisions" as const,
        label: "Revisadas",
        current: gamification.todayRevisions,
        target: gamification.dailyGoals.revisions,
        unit: "itens",
      },
      {
        id: "quiz" as const,
        label: "Quiz",
        current: gamification.todayQuizCount,
        target: gamification.dailyGoals.quizCount,
        unit: "quiz",
      },
    ],
    [
      gamification.todayStudyMinutes,
      gamification.todayRevisions,
      gamification.todayQuizCount,
      gamification.dailyGoals.studyMinutes,
      gamification.dailyGoals.revisions,
      gamification.dailyGoals.quizCount,
    ]
  );

  return { firstName, dailyGoals };
}