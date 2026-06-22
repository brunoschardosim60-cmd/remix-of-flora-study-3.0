import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * EmptyState — componente padrão para estados vazios em todo o app.
 * Usar sempre que uma lista, feed ou painel não tiver conteúdo.
 */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl border border-dashed border-border bg-muted/20 ${className}`}
    >
      {Icon && (
        <div className="mb-4 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-7 h-7 text-primary" />
        </div>
      )}
      <h3 className="font-heading text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button size="sm" onClick={action.onClick} className="gap-1.5">
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;