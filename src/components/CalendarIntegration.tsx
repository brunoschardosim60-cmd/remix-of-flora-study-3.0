import { useState, useCallback } from "react";
import { Calendar, ExternalLink, Download, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StudyEvent {
  id: string;
  title: string;
  subject: string;
  date: Date;
  durationMinutes: number;
  type: "study" | "revision" | "quiz" | "exam";
  description?: string;
}

function formatDateForCalendar(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateICSContent(events: StudyEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Flora Study//Flora Study App//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Flora Study - Cronograma",
    "X-WR-TIMEZONE:America/Sao_Paulo",
  ];
  for (const event of events) {
    const startDate = formatDateForCalendar(event.date);
    const endDate = formatDateForCalendar(new Date(event.date.getTime() + event.durationMinutes * 60000));
    const emoji = { study: "📚", revision: "🔄", quiz: "❓", exam: "📝" }[event.type];
    lines.push(
      "BEGIN:VEVENT",
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${emoji} ${event.title} - ${event.subject}`,
      `DESCRIPTION:${event.description || `Sessão de estudo - Flora Study`}`,
      `UID:flora-${event.id}@flora-study.app`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function generateGoogleCalendarUrl(event: StudyEvent): string {
  const start = formatDateForCalendar(event.date);
  const end = formatDateForCalendar(new Date(event.date.getTime() + event.durationMinutes * 60000));
  const emoji = { study: "📚", revision: "🔄", quiz: "❓", exam: "📝" }[event.type];
  const title = encodeURIComponent(`${emoji} ${event.title} - ${event.subject}`);
  const details = encodeURIComponent(event.description || `Sessão de estudo - Flora Study\nMatéria: ${event.subject}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&sf=true&output=xml`;
}

function generateSampleEvents(): StudyEvent[] {
  const now = new Date();
  const subjects = ["Matemática", "Português", "Biologia", "História", "Física"];
  const types: StudyEvent["type"][] = ["study", "revision", "quiz", "study"];
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    date.setHours(9 + i * 2, 0, 0, 0);
    return {
      id: `event_${i}`,
      title: `Sessão ${i + 1}`,
      subject: subjects[i % subjects.length],
      date,
      durationMinutes: 45 + (i % 3) * 15,
      type: types[i % types.length],
    };
  });
}

const typeLabel = { study: "Estudo", revision: "Revisão", quiz: "Quiz", exam: "Prova" };
const typeBadge = {
  study: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  revision: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  quiz: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  exam: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export function CalendarIntegration() {
  const [events] = useState<StudyEvent[]>(generateSampleEvents);

  const downloadICS = useCallback(() => {
    const blob = new Blob([generateICSContent(events)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flora-study-cronograma.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Cronograma exportado!");
  }, [events]);

  const openGoogleCalendar = useCallback((event: StudyEvent) => {
    window.open(generateGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <h3 className="font-bold text-base">Google Calendar</h3>
          <p className="text-xs text-muted-foreground">Sincronize seu cronograma com o Google Calendar</p>
        </div>
        <Button size="sm" onClick={downloadICS} variant="outline" className="gap-1.5">
          <Download className="w-4 h-4" />
          .ics
        </Button>
      </div>

      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="rounded-xl border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{event.title}</p>
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${typeBadge[event.type]}`}>
                {typeLabel[event.type]}
              </Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {event.subject}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {event.durationMinutes}min
              </span>
              <span className="text-xs text-muted-foreground">
                {event.date.toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8" onClick={() => openGoogleCalendar(event)}>
              <ExternalLink className="w-3 h-3" />
              Adicionar ao Google Calendar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
