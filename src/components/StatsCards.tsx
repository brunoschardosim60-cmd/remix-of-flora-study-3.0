import { BookOpen, CheckCircle2, BarChart3, Layers, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardsProps {
  total: number;
  totalRevisoes: number;
  percentual: number;
  materias: number;
  overdue: number;
}

export function StatsCards({ total, totalRevisoes, percentual, materias, overdue }: StatsCardsProps) {
  const cards = [
    { icon: BookOpen, label: "Tópicos", value: total, color: "text-primary", bg: "bg-primary/5" },
    { icon: CheckCircle2, label: "Revisadas", value: totalRevisoes, color: "text-secondary", bg: "bg-secondary/5" },
    { icon: BarChart3, label: "Progresso", value: `${percentual}%`, color: "text-accent", bg: "bg-accent/5" },
    { icon: Layers, label: "Matérias", value: materias, color: "text-subject-chem", bg: "bg-subject-chem/5" },
    { icon: AlertTriangle, label: "Atrasadas", value: overdue, color: overdue > 0 ? "text-destructive" : "text-secondary", bg: overdue > 0 ? "bg-destructive/5" : "bg-secondary/5" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`glass-card rounded-xl p-3 sm:p-5 border-l-4 ${card.color.replace('text-', 'border-')} ${card.bg} hover:scale-[1.02] transition-transform cursor-default shadow-sm`}
        >
          <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
          <p className="text-xl sm:text-2xl font-heading font-bold">{card.value}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{card.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
