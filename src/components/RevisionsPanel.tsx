import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudyTopic } from "@/lib/studyData";
import { OverdueRevisions } from "./OverdueRevisions";
import { TodayRevisions } from "./TodayRevisions";
import { UpcomingRevisions } from "./UpcomingRevisions";

interface RevisionsPanelProps {
  overdue: { topic: StudyTopic; revisionIndex: number; date: string }[];
  today: { topic: StudyTopic; revisionIndex: number }[];
  upcoming: { topic: StudyTopic; revisionIndex: number; date: string }[];
  onComplete: (topicId: string, revisionIndex: number) => void;
  onReschedule: (topicId: string, revisionIndex: number) => void;
}

type RevisionsPanelTab = "overdue" | "today" | "upcoming";
const REVISIONS_PANEL_TAB_KEY = "flora.revisionsPanel.activeTab";

function readSavedTab(fallback: RevisionsPanelTab): RevisionsPanelTab {
  try {
    const saved = window.localStorage.getItem(REVISIONS_PANEL_TAB_KEY);
    return saved === "overdue" || saved === "today" || saved === "upcoming" ? saved : fallback;
  } catch {
    return fallback;
  }
}

export function RevisionsPanel({ overdue, today, upcoming, onComplete, onReschedule }: RevisionsPanelProps) {
  const defaultTab: RevisionsPanelTab = overdue.length > 0 ? "overdue" : today.length > 0 ? "today" : "upcoming";
  const [activeTab, setActiveTab] = useState<RevisionsPanelTab>(() => readSavedTab(defaultTab));

  const changeTab = (value: string) => {
    if (value !== "overdue" && value !== "today" && value !== "upcoming") return;
    setActiveTab(value);
    try {
      window.localStorage.setItem(REVISIONS_PANEL_TAB_KEY, value);
    } catch {
      // O painel continua funcional quando o armazenamento do navegador está indisponível.
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="overdue" className="gap-1.5">
            Atrasadas
            {overdue.length > 0 && (
              <span className="bg-destructive/15 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded-full">{overdue.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-1.5">
            Hoje
            {today.length > 0 && (
              <span className="bg-accent/15 text-accent text-[10px] font-bold px-1.5 py-0.5 rounded-full">{today.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5">
            Próximas
            {upcoming.length > 0 && (
              <span className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{upcoming.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overdue" className="mt-0">
          {overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma revisão atrasada. Continua assim.</p>
          ) : (
            <div className="-m-4 sm:-m-5 [&>div]:border-0 [&>div]:shadow-none [&>div]:bg-transparent">
              <OverdueRevisions revisions={overdue} onComplete={onComplete} onReschedule={onReschedule} />
            </div>
          )}
        </TabsContent>
        <TabsContent value="today" className="mt-0">
          <div className="-m-4 sm:-m-5 [&>div]:border-0 [&>div]:shadow-none [&>div]:bg-transparent">
            <TodayRevisions revisions={today} onComplete={onComplete} />
          </div>
        </TabsContent>
        <TabsContent value="upcoming" className="mt-0">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nada agendado nos próximos 7 dias.</p>
          ) : (
            <div className="-m-4 sm:-m-5 [&>div]:border-0 [&>div]:shadow-none [&>div]:bg-transparent">
              <UpcomingRevisions revisions={upcoming} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
