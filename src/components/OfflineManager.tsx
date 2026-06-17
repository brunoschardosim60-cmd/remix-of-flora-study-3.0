import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Trash2, WifiOff, Wifi, CheckCircle, BookOpen,
  FileText, HardDrive, RefreshCw, AlertCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OfflineContent {
  id: string;
  title: string;
  type: "notes" | "flashcards";
  subject: string;
  size: number; // KB estimado
  downloadedAt: Date;
  content: string;
}

const OFFLINE_KEY = "flora-offline-content";

function loadOfflineContent(): OfflineContent[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((item: any) => ({
      ...item,
      downloadedAt: new Date(item.downloadedAt),
    }));
  } catch {
    return [];
  }
}

function saveOfflineContent(items: OfflineContent[]): void {
  try {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(items));
  } catch {
    toast.error("Sem espaço suficiente para salvar offline.");
  }
}

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function estimateSize(content: string): number {
  return Math.max(1, Math.round(new Blob([content]).size / 1024));
}

function getTypeIcon(type: OfflineContent["type"]) {
  switch (type) {
    case "notes": return FileText;
    case "flashcards": return RefreshCw;
    default: return BookOpen;
  }
}

function getTypeLabel(type: OfflineContent["type"]): string {
  switch (type) {
    case "notes": return "Notas";
    case "flashcards": return "Flashcards";
    default: return "Conteúdo";
  }
}

interface DownloadableItem {
  id: string;
  title: string;
  type: "notes" | "flashcards";
  subject: string;
  content: string;
}

export function OfflineManager() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineContent, setOfflineContent] = useState<OfflineContent[]>(loadOfflineContent);
  const [available, setAvailable] = useState<DownloadableItem[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexão restaurada!");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Sem conexão. Usando conteúdo offline.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchAvailable = useCallback(async () => {
    if (!user || !isOnline) return;
    setLoadingAvailable(true);
    try {
      const { data, error } = await supabase
        .from("study_topics")
        .select("id, tema, materia, notas, flashcards")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      const savedIds = new Set(offlineContent.map((c) => c.id));
      const items: DownloadableItem[] = [];

      for (const row of data ?? []) {
        if (row.notas && row.notas.trim().length > 20) {
          const noteId = `notes_${row.id}`;
          if (!savedIds.has(noteId)) {
            items.push({ id: noteId, title: row.tema, type: "notes", subject: row.materia, content: row.notas });
          }
        }
        const cards = Array.isArray(row.flashcards) ? row.flashcards : [];
        if (cards.length > 0) {
          const fcId = `flashcards_${row.id}`;
          if (!savedIds.has(fcId)) {
            items.push({ id: fcId, title: `Flashcards: ${row.tema}`, type: "flashcards", subject: row.materia, content: JSON.stringify(cards) });
          }
        }
      }

      setAvailable(items);
    } catch {
      toast.error("Erro ao carregar conteúdo disponível.");
    } finally {
      setLoadingAvailable(false);
    }
  }, [user, isOnline, offlineContent]);

  useEffect(() => {
    if (isOpen) fetchAvailable();
  }, [isOpen, fetchAvailable]);

  const downloadContent = useCallback(async (item: DownloadableItem) => {
    if (offlineContent.some((c) => c.id === item.id)) {
      toast.info("Conteúdo já salvo offline.");
      return;
    }
    setDownloading(item.id);
    const newItem: OfflineContent = {
      id: item.id,
      title: item.title,
      type: item.type,
      subject: item.subject,
      size: estimateSize(item.content),
      downloadedAt: new Date(),
      content: item.content,
    };
    const updated = [...offlineContent, newItem];
    setOfflineContent(updated);
    saveOfflineContent(updated);
    setAvailable((prev) => prev.filter((a) => a.id !== item.id));
    setDownloading(null);
    toast.success(`"${item.title}" salvo para uso offline!`);
  }, [offlineContent]);

  const removeContent = useCallback((id: string) => {
    const updated = offlineContent.filter((c) => c.id !== id);
    setOfflineContent(updated);
    saveOfflineContent(updated);
    toast.success("Conteúdo removido do armazenamento offline.");
  }, [offlineContent]);

  const totalSize = offlineContent.reduce((acc, c) => acc + c.size, 0);

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <div>
            <h3 className="font-bold text-base">Modo Offline</h3>
            <p className="text-xs text-muted-foreground">
              {isOnline ? "Online" : "Sem conexão"} · {offlineContent.length} itens salvos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <HardDrive className="w-3.5 h-3.5" />
            {formatSize(totalSize)}
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsOpen((v) => !v)}>
            {isOpen ? "Fechar" : "Gerenciar"}
          </Button>
        </div>
      </div>

      {!isOnline && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Modo offline ativo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Você pode acessar o conteúdo salvo abaixo. Algumas funcionalidades requerem conexão.
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {offlineContent.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Conteúdo Salvo ({offlineContent.length})
                </h4>
                <div className="space-y-2">
                  {offlineContent.map((item) => {
                    const Icon = getTypeIcon(item.type);
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                        <Icon className="w-4 h-4 text-green-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getTypeLabel(item.type)}</Badge>
                            <span className="text-xs text-muted-foreground">{item.subject}</span>
                            <span className="text-xs text-muted-foreground">{formatSize(item.size)}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-red-500" onClick={() => removeContent(item.id)} aria-label="Remover do offline">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                Disponível para Download
              </h4>

              {!isOnline && (
                <p className="text-xs text-muted-foreground py-2">
                  Conecte-se à internet para ver conteúdo disponível para download.
                </p>
              )}

              {isOnline && loadingAvailable && (
                <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Buscando seus tópicos...
                </div>
              )}

              {isOnline && !loadingAvailable && available.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {offlineContent.length > 0
                    ? "Todo o conteúdo disponível já foi baixado!"
                    : "Nenhum tópico com notas ou flashcards encontrado."}
                </p>
              )}

              {isOnline && !loadingAvailable && available.length > 0 && (
                <div className="space-y-2">
                  {available.map((item) => {
                    const Icon = getTypeIcon(item.type);
                    const isDownloading = downloading === item.id;
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/30 transition-colors">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getTypeLabel(item.type)}</Badge>
                            <span className="text-xs text-muted-foreground">{item.subject}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0" disabled={isDownloading} onClick={() => downloadContent(item)}>
                          {isDownloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              O conteúdo offline é armazenado localmente no seu dispositivo. Limpe o armazenamento do navegador para remover todos os dados.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
