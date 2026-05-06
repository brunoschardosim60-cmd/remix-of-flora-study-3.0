import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ALL_BADGES,
  ALL_AVATARS,
  ALL_THEMES,
  loadRewards,
  saveRewards,
  getRarityColor,
  getRarityLabel,
  type RewardsState,
} from "@/lib/rewards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trophy, User, Palette, Lock } from "lucide-react";

interface RewardsPanelProps {
  xp: number;
  level: number;
  streak: number;
}

export function RewardsPanel({ xp, level, streak }: RewardsPanelProps) {
  const [rewards, setRewards] = useState<RewardsState>(loadRewards);

  // Sincroniza stats de gamification com rewards
  useEffect(() => {
    const current = loadRewards();
    const updated = {
      ...current,
      rewardStats: {
        ...current.rewardStats,
        xp,
        level,
        streak,
      },
    };
    setRewards(updated);
    saveRewards(updated);
  }, [xp, level, streak]);

  // Notifica novos badges
  useEffect(() => {
    if (rewards.newBadges.length > 0) {
      rewards.newBadges.forEach((badgeId) => {
        const badge = ALL_BADGES.find((b) => b.id === badgeId);
        if (badge) {
          toast.success(`🏆 Badge desbloqueado: ${badge.name}!`, {
            description: badge.description,
            duration: 5000,
          });
        }
      });
      const cleared = { ...rewards, newBadges: [] };
      setRewards(cleared);
      saveRewards(cleared);
    }
  }, [rewards.newBadges]);

  const selectAvatar = (avatarId: string) => {
    const avatar = ALL_AVATARS.find((a) => a.id === avatarId);
    if (!avatar) return;
    if (level < avatar.requiredLevel) {
      toast.error(`Nível ${avatar.requiredLevel} necessário para desbloquear este avatar.`);
      return;
    }
    if (avatar.requiredBadges) {
      const hasAll = avatar.requiredBadges.every((b) => rewards.unlockedBadges.includes(b));
      if (!hasAll) {
        toast.error("Você precisa de badges específicos para este avatar.");
        return;
      }
    }
    const updated = { ...rewards, selectedAvatar: avatarId };
    setRewards(updated);
    saveRewards(updated);
    toast.success(`Avatar ${avatar.name} selecionado!`);
  };

  const selectTheme = (themeId: string) => {
    const theme = ALL_THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    if (xp < theme.requiredXp) {
      toast.error(`${theme.requiredXp} XP necessários para desbloquear este tema.`);
      return;
    }
    const updated = { ...rewards, selectedTheme: themeId };
    setRewards(updated);
    saveRewards(updated);
    toast.success(`Tema ${theme.name} ativado!`);
  };

  const unlockedCount = rewards.unlockedBadges.length;
  const totalBadges = ALL_BADGES.length;

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Recompensas
          </h3>
          <p className="text-sm text-muted-foreground">
            {unlockedCount}/{totalBadges} badges desbloqueados
          </p>
        </div>
        <div className="text-3xl">
          {ALL_AVATARS.find((a) => a.id === rewards.selectedAvatar)?.emoji ?? "🌱"}
        </div>
      </div>

      <Tabs defaultValue="badges">
        <TabsList className="w-full">
          <TabsTrigger value="badges" className="flex-1 gap-1">
            <Trophy className="w-4 h-4" /> Badges
          </TabsTrigger>
          <TabsTrigger value="avatars" className="flex-1 gap-1">
            <User className="w-4 h-4" /> Avatares
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex-1 gap-1">
            <Palette className="w-4 h-4" /> Temas
          </TabsTrigger>
        </TabsList>

        {/* BADGES */}
        <TabsContent value="badges" className="mt-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {ALL_BADGES.map((badge) => {
              const unlocked = rewards.unlockedBadges.includes(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    unlocked
                      ? getRarityColor(badge.rarity) + " bg-muted/30"
                      : "border-muted text-muted-foreground opacity-50"
                  }`}
                  title={`${badge.name}: ${badge.description}`}
                >
                  <span className="text-2xl">{unlocked ? badge.icon : "🔒"}</span>
                  <span className="text-xs font-medium text-center leading-tight">
                    {badge.name}
                  </span>
                  {unlocked && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${getRarityColor(badge.rarity)}`}
                    >
                      {getRarityLabel(badge.rarity)}
                    </Badge>
                  )}
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* AVATARES */}
        <TabsContent value="avatars" className="mt-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {ALL_AVATARS.map((avatar) => {
              const isUnlocked =
                level >= avatar.requiredLevel &&
                (!avatar.requiredBadges ||
                  avatar.requiredBadges.every((b) => rewards.unlockedBadges.includes(b)));
              const isSelected = rewards.selectedAvatar === avatar.id;
              return (
                <motion.button
                  key={avatar.id}
                  onClick={() => selectAvatar(avatar.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : isUnlocked
                      ? "border-muted hover:border-primary/50"
                      : "border-muted opacity-50 cursor-not-allowed"
                  }`}
                  title={isUnlocked ? avatar.name : `Nível ${avatar.requiredLevel} necessário`}
                >
                  <span className="text-2xl">{isUnlocked ? avatar.emoji : "🔒"}</span>
                  <span className="text-xs font-medium">{avatar.name}</span>
                  {!isUnlocked && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Nv.{avatar.requiredLevel}
                    </span>
                  )}
                  {isSelected && (
                    <Badge variant="default" className="text-[9px] px-1 py-0">
                      Ativo
                    </Badge>
                  )}
                </motion.button>
              );
            })}
          </div>
        </TabsContent>

        {/* TEMAS */}
        <TabsContent value="themes" className="mt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_THEMES.map((theme) => {
              const isUnlocked = xp >= theme.requiredXp;
              const isSelected = rewards.selectedTheme === theme.id;
              return (
                <motion.button
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex flex-col gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : isUnlocked
                      ? "border-muted hover:border-primary/50"
                      : "border-muted opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex gap-1">
                    {Object.values(theme.colors).map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-white/20"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{theme.name}</p>
                    <p className="text-xs text-muted-foreground">{theme.description}</p>
                  </div>
                  {!isUnlocked && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {theme.requiredXp} XP
                    </p>
                  )}
                  {isSelected && (
                    <Badge variant="default" className="text-xs w-fit">
                      Ativo
                    </Badge>
                  )}
                </motion.button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
