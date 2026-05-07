// Sistema de Recompensas: Badges, Avatares e Temas

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "streak" | "xp" | "quiz" | "study" | "revision" | "special";
  rarity: "common" | "rare" | "epic" | "legendary";
  condition: (stats: RewardStats) => boolean;
  unlockedAt?: string;
}

export interface Avatar {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requiredLevel: number;
  requiredBadges?: string[];
}

export interface StudyTheme {
  id: string;
  name: string;
  description: string;
  requiredXp: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface RewardStats {
  streak: number;
  xp: number;
  level: number;
  totalStudyMinutes: number;
  totalRevisions: number;
  totalQuizzes: number;
  totalQuizzesCorrect: number;
  notebooksCreated: number;
  essaysWritten: number;
  daysActive: number;
}

export interface RewardsState {
  unlockedBadges: string[];
  selectedAvatar: string;
  selectedTheme: string;
  rewardStats: RewardStats;
  newBadges: string[]; // badges recém desbloqueados para notificação
}

// ============ BADGES ============
export const ALL_BADGES: Badge[] = [
  // Streak
  {
    id: "streak_3",
    name: "Constante",
    description: "Estudou 3 dias seguidos",
    icon: "🔥",
    category: "streak",
    rarity: "common",
    condition: (s) => s.streak >= 3,
  },
  {
    id: "streak_7",
    name: "Semana Perfeita",
    description: "Estudou 7 dias seguidos",
    icon: "🌟",
    category: "streak",
    rarity: "rare",
    condition: (s) => s.streak >= 7,
  },
  {
    id: "streak_30",
    name: "Mês de Ouro",
    description: "Estudou 30 dias seguidos",
    icon: "🏆",
    category: "streak",
    rarity: "epic",
    condition: (s) => s.streak >= 30,
  },
  {
    id: "streak_100",
    name: "Centenário",
    description: "Estudou 100 dias seguidos",
    icon: "💎",
    category: "streak",
    rarity: "legendary",
    condition: (s) => s.streak >= 100,
  },
  // XP / Nível
  {
    id: "level_5",
    name: "Aprendiz",
    description: "Alcançou o nível 5",
    icon: "📚",
    category: "xp",
    rarity: "common",
    condition: (s) => s.level >= 5,
  },
  {
    id: "level_10",
    name: "Estudante Dedicado",
    description: "Alcançou o nível 10",
    icon: "🎓",
    category: "xp",
    rarity: "rare",
    condition: (s) => s.level >= 10,
  },
  {
    id: "level_25",
    name: "Mestre do Conhecimento",
    description: "Alcançou o nível 25",
    icon: "🧠",
    category: "xp",
    rarity: "epic",
    condition: (s) => s.level >= 25,
  },
  {
    id: "xp_1000",
    name: "Mil Pontos",
    description: "Acumulou 1.000 XP",
    icon: "⭐",
    category: "xp",
    rarity: "common",
    condition: (s) => s.xp >= 1000,
  },
  {
    id: "xp_10000",
    name: "Dez Mil Pontos",
    description: "Acumulou 10.000 XP",
    icon: "🌠",
    category: "xp",
    rarity: "epic",
    condition: (s) => s.xp >= 10000,
  },
  // Estudo
  {
    id: "study_60min",
    name: "Primeira Hora",
    description: "Estudou 60 minutos no total",
    icon: "⏱️",
    category: "study",
    rarity: "common",
    condition: (s) => s.totalStudyMinutes >= 60,
  },
  {
    id: "study_600min",
    name: "Dez Horas",
    description: "Estudou 600 minutos no total",
    icon: "📖",
    category: "study",
    rarity: "rare",
    condition: (s) => s.totalStudyMinutes >= 600,
  },
  {
    id: "study_3000min",
    name: "Cinquenta Horas",
    description: "Estudou 3.000 minutos no total",
    icon: "🦉",
    category: "study",
    rarity: "epic",
    condition: (s) => s.totalStudyMinutes >= 3000,
  },
  // Quiz
  {
    id: "quiz_10",
    name: "Curioso",
    description: "Completou 10 quizzes",
    icon: "❓",
    category: "quiz",
    rarity: "common",
    condition: (s) => s.totalQuizzes >= 10,
  },
  {
    id: "quiz_50",
    name: "Questionador",
    description: "Completou 50 quizzes",
    icon: "🎯",
    category: "quiz",
    rarity: "rare",
    condition: (s) => s.totalQuizzes >= 50,
  },
  {
    id: "quiz_perfect",
    name: "Perfeccionista",
    description: "Acertou 100% em um quiz",
    icon: "💯",
    category: "quiz",
    rarity: "rare",
    condition: (s) => s.totalQuizzesCorrect > 0,
  },
  // Revisão
  {
    id: "revision_20",
    name: "Revisor",
    description: "Completou 20 revisões",
    icon: "🔄",
    category: "revision",
    rarity: "common",
    condition: (s) => s.totalRevisions >= 20,
  },
  {
    id: "revision_100",
    name: "Mestre da Revisão",
    description: "Completou 100 revisões",
    icon: "🔁",
    category: "revision",
    rarity: "rare",
    condition: (s) => s.totalRevisions >= 100,
  },
  // Especial
  {
    id: "first_essay",
    name: "Escritor",
    description: "Escreveu sua primeira redação",
    icon: "✍️",
    category: "special",
    rarity: "common",
    condition: (s) => s.essaysWritten >= 1,
  },
  {
    id: "first_notebook",
    name: "Anotador",
    description: "Criou seu primeiro caderno",
    icon: "📓",
    category: "special",
    rarity: "common",
    condition: (s) => s.notebooksCreated >= 1,
  },
  {
    id: "days_30",
    name: "Veterano",
    description: "30 dias ativo na plataforma",
    icon: "🎖️",
    category: "special",
    rarity: "rare",
    condition: (s) => s.daysActive >= 30,
  },
];

// ============ AVATARES ============
export const ALL_AVATARS: Avatar[] = [
  { id: "seedling", name: "Muda", emoji: "🌱", description: "Avatar inicial", requiredLevel: 1 },
  { id: "student", name: "Estudante", emoji: "📚", description: "Nível 3", requiredLevel: 3 },
  { id: "scholar", name: "Estudioso", emoji: "🎓", description: "Nível 5", requiredLevel: 5 },
  { id: "brain", name: "Cérebro", emoji: "🧠", description: "Nível 8", requiredLevel: 8 },
  { id: "star", name: "Estrela", emoji: "⭐", description: "Nível 10", requiredLevel: 10 },
  { id: "rocket", name: "Foguete", emoji: "🚀", description: "Nível 15", requiredLevel: 15 },
  { id: "owl", name: "Coruja", emoji: "🦉", description: "Nível 20", requiredLevel: 20 },
  { id: "diamond", name: "Diamante", emoji: "💎", description: "Nível 30", requiredLevel: 30 },
  { id: "crown", name: "Coroa", emoji: "👑", description: "Nível 50", requiredLevel: 50 },
  { id: "flora", name: "Flora", emoji: "🌸", description: "Badge Semana Perfeita", requiredLevel: 1, requiredBadges: ["streak_7"] },
];

// ============ TEMAS ============
export const ALL_THEMES: StudyTheme[] = [
  {
    id: "default",
    name: "Padrão",
    description: "Tema padrão da plataforma",
    requiredXp: 0,
    colors: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#ec4899" },
  },
  {
    id: "ocean",
    name: "Oceano",
    description: "Tons de azul profundo",
    requiredXp: 500,
    colors: { primary: "#0ea5e9", secondary: "#06b6d4", accent: "#0284c7" },
  },
  {
    id: "forest",
    name: "Floresta",
    description: "Verde natureza",
    requiredXp: 1000,
    colors: { primary: "#22c55e", secondary: "#16a34a", accent: "#84cc16" },
  },
  {
    id: "sunset",
    name: "Pôr do Sol",
    description: "Laranja e rosa vibrantes",
    requiredXp: 2000,
    colors: { primary: "#f97316", secondary: "#ef4444", accent: "#f59e0b" },
  },
  {
    id: "galaxy",
    name: "Galáxia",
    description: "Roxo e azul cósmico",
    requiredXp: 5000,
    colors: { primary: "#7c3aed", secondary: "#4f46e5", accent: "#a855f7" },
  },
  {
    id: "midnight",
    name: "Meia-Noite",
    description: "Escuro e elegante",
    requiredXp: 10000,
    colors: { primary: "#1e293b", secondary: "#334155", accent: "#64748b" },
  },
];

// ============ STORAGE ============
const REWARDS_KEY = "studyflow-rewards";

export function getDefaultRewardsState(): RewardsState {
  return {
    unlockedBadges: [],
    selectedAvatar: "seedling",
    selectedTheme: "default",
    rewardStats: {
      streak: 0,
      xp: 0,
      level: 1,
      totalStudyMinutes: 0,
      totalRevisions: 0,
      totalQuizzes: 0,
      totalQuizzesCorrect: 0,
      notebooksCreated: 0,
      essaysWritten: 0,
      daysActive: 1,
    },
    newBadges: [],
  };
}

export function loadRewards(): RewardsState {
  if (typeof window === "undefined") return getDefaultRewardsState();
  try {
    const raw = localStorage.getItem(REWARDS_KEY);
    if (!raw) return getDefaultRewardsState();
    return { ...getDefaultRewardsState(), ...JSON.parse(raw) };
  } catch {
    return getDefaultRewardsState();
  }
}

export function saveRewards(state: RewardsState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REWARDS_KEY, JSON.stringify(state));
}

// Verifica e desbloqueia novos badges
export function checkAndUnlockBadges(state: RewardsState): RewardsState {
  const newlyUnlocked: string[] = [];
  for (const badge of ALL_BADGES) {
    if (!state.unlockedBadges.includes(badge.id) && badge.condition(state.rewardStats)) {
      newlyUnlocked.push(badge.id);
    }
  }
  if (newlyUnlocked.length === 0) return state;
  return {
    ...state,
    unlockedBadges: [...state.unlockedBadges, ...newlyUnlocked],
    newBadges: [...state.newBadges, ...newlyUnlocked],
  };
}

// Atualiza stats e verifica badges
export function updateRewardStats(
  state: RewardsState,
  updates: Partial<RewardStats>
): RewardsState {
  const updated = {
    ...state,
    rewardStats: { ...state.rewardStats, ...updates },
  };
  return checkAndUnlockBadges(updated);
}

export function getRarityColor(rarity: Badge["rarity"]): string {
  switch (rarity) {
    case "common": return "text-gray-500 border-gray-300";
    case "rare": return "text-blue-500 border-blue-300";
    case "epic": return "text-purple-500 border-purple-300";
    case "legendary": return "text-yellow-500 border-yellow-300";
    default: return "text-gray-500 border-gray-300";
  }
}

export function getRarityLabel(rarity: Badge["rarity"]): string {
  switch (rarity) {
    case "common": return "Comum";
    case "rare": return "Raro";
    case "epic": return "Épico";
    case "legendary": return "Lendário";
    default: return "Comum";
  }
}
