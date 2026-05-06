import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ExternalLink, Download, Copy, Check, ChevronDown, ChevronUp, Clock, BookOpen } from "lucide-react";
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

function formatDateForOutlook(date: Date): string {
  return date.toISOString().split(".")[0];
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
    const endDate = formatDateForCalendar(
      new Date(event.date.getTime() + event.durationMinutes * 60000)
    );
    const typeEmoji = {
      study: "📚",
      revision: "🔄",
      quiz: "❓",
      exam: "📝",
    }[event.type];

    lines.push(
      "BEGIN:VEVENT",
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${typeEmoji} ${event.title} - ${event.subject}`,
      `DESCRIPTION:${event.description || `Sessão de ${event.type === "study" ? "estudo" : event.type === "revision" ? "revisão" : event.type === "quiz" ? "quiz" : "prova"} - Flora Study`}`,
      `CATEGORIES:Flora Study`,
      `STATUS:CONFIRMED`,
      `TRANSP:OPAQUE`,
      `UID:flora-${event.id}@flora-study.app`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function generateGoogleCalendarUrl(event: StudyEvent): string {
  const start = formatDateForCalendar(event.date);
  const end = formatDateForCalendar(
    new Date(event.date.getTime() + event.durationMinutes * 60000)
  );
  const typeEmoji = { study: "📚", revision: "🔄", quiz: "❓", exam: "📝" }[event.type];
  const title = encodeURIComponent(`${typeEmoji} ${event.title} - ${event.subject}`);
  const details = encodeURIComponent(
    event.description || `Sessão de estudo - Flora Study\nMatéria: ${event.subject}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&sf=true&output=xml`;
}

function generateOutlookUrl(event: StudyEvent): string {
  const start = formatDateForOutlook(event.date);
  const end = formatDateForOutlook(
    new Date(event.date.getTime() + event.durationMinutes * 60000)
  );
  const typeEmoji = { study: "📚", revision: "🔄", quiz: "❓", exam: "📝" }[event.type];
  const subject = encodeURIComponent(`${typeEmoji} ${event.title} - ${event.subject}`);
  const body = encodeURIComponent(
    event.description || `Sessão de estudo - Flora Study\nMatéria: ${event.subject}`
  );

  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${subject}&startdt=${start}&enddt=${end}&body=${body}`;
}

// Gera eventos de exemplo baseados na semana atual
function generateSampleEvents(): StudyEvent[] {
  const now = new Date();
  const events: StudyEvent[] = [];

  const subjects = ["Matemática", "Português", "Biologia", "História", "Física"];
  const types: StudyEvent["type"][] = ["study", "revision", "quiz", "study"];

  for (let i = 0; i < 5; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    date.setHours(9 + i * 2, 0, 0, 0);

    events.push({
      id: `event_${i}`,
      title: `Sessão ${i + 1}`,
      subject: subjects[i % subjects.length],
      date,
      durationMinutes: 45 + (i % 3) * 15,
      type: types[i % types.length],
      description: `Sessão de estudo gerada pela Flora Study para ${subjects[i % subjects.length]}`,
    });
  }

  return events;
}

function getTypeLabel(type: StudyEvent["type"]): string {
  switch (type) {
    case "study": return "Estudo";
    case "revision": return "Revisão";
    case "quiz": return "Quiz";
    case "exam": return "Prova";
  }
}

function getTypeBadgeClass(type: StudyEvent["type"]): string {
  switch (type) {
    case "study": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "revision": return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "quiz": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "exam": return "bg-red-500/10 text-red-700 dark:text-red-400";
  }
}

export function CalendarIntegration() {
  const [isOpen, setIsOpen] = useState(false);
  const [events] = useState<StudyEvent[]>(generateSampleEvents);
  const [copied, setCopied] = useState(false);

  const downloadICS = useCallback(() => {
    const icsContent = generateICSContent(events);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flora-study-cronograma.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Cronograma exportado! Importe o arquivo .ics no seu calendário.");
  }, [events]);

  const copyICSUrl = useCallback(async () => {
    const icsContent = generateICSContent(events);
    await navigator.clipboard.writeText(icsContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Conteúdo ICS copiado!");
  }, [events]);

  const openGoogleCalendar = useCallback((event: StudyEvent) => {
    window.open(generateGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
  }, []);

  const openOutlook = useCallback((event: StudyEvent) => {
    window.open(generateOutlookUrl(event), "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((v) => !v)}
        className="gap-1.5"
      >
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {isOpen ? "Fechar" : "Ver opções de exportação"}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Exportar tudo */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <h4 className="font-semibold text-sm">Exportar Cronograma Completo</h4>
              <p className="text-xs text-muted-foreground">
                Exporte todos os seus eventos de estudo como arquivo .ics compatível com qualquer calendário.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={downloadICS} className="gap-2">
                  <Download className="w-4 h-4" />
                  Baixar .ics
                </Button>
                <Button size="sm" variant="outline" onClick={copyICSUrl} className="gap-2">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar ICS"}
                </Button>
              </div>
            </div>

            {/* Eventos individuais */}
            <div>
              <h4 className="font-semibold text-sm mb-3">
                Próximos Eventos ({events.length})
              </h4>
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${getTypeBadgeClass(event.type)}`}
                          >
                            {getTypeLabel(event.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
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
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs h-7"
                        onClick={() => openGoogleCalendar(event)}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Google Calendar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs h-7"
                        onClick={() => openOutlook(event)}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Outlook
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instruções */}
            <div className="rounded-xl bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold">Como importar no Google Calendar:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Baixe o arquivo .ics acima</li>
                <li>Abra o Google Calendar no computador</li>
                <li>Clique em "Outros calendários" → "Importar"</li>
                <li>Selecione o arquivo .ics baixado</li>
              </ol>
              <p className="text-xs font-semibold mt-2">Como importar no Outlook:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Baixe o arquivo .ics acima</li>
                <li>Abra o Outlook e vá em "Arquivo" → "Abrir e Exportar"</li>
                <li>Selecione "Importar/Exportar" → "Importar arquivo iCalendar"</li>
                <li>Selecione o arquivo .ics baixado</li>
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
