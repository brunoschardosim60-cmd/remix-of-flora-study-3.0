/**
 * src/components/RichMediaPanel.tsx
 *
 * Painel lateral de mídia rica — reutilizável no Aulão, Aulas Prontas e Caderno.
 *
 * Props:
 *   subject, topic        → para buscar conteúdo
 *   onInsertToNotebook    → callback quando aluno clica em "Inserir no caderno"
 *                           (recebe HTML string com o bloco a inserir)
 *   onClose               → fecha o painel
 *   showInsert            → exibe botão de inserir (true no caderno, false nas aulas)
 */

import { useState } from "react";
import { X, Image, Youtube, Map, BarChart2, ExternalLink, Loader2, AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRichMedia, type ContentType } from "@/hooks/useRichMedia";

interface RichMediaPanelProps {
  subject: string;
  topic: string;
  onClose?: () => void;
  onInsertToNotebook?: (html: string) => void;
  showInsert?: boolean;
}

const TAB_ICONS: Record<ContentType, React.ReactNode> = {
  photo: <Image size={15} />,
  video: <Youtube size={15} />,
  map:   <Map size={15} />,
  data:  <BarChart2 size={15} />,
};

const TAB_LABELS: Record<ContentType, string> = {
  photo: "Foto",
  video: "Vídeo",
  map:   "Mapa",
  data:  "Dados",
};

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-40 bg-muted rounded-lg" />
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  );
}

function ErrorState({ msg = "Não encontrado para este tema" }: { msg?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
      <AlertCircle size={28} className="opacity-40" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

export function RichMediaPanel({ subject, topic, onClose, onInsertToNotebook, showInsert = false }: RichMediaPanelProps) {
  const media = useRichMedia({ subject, topic });
  const [activeTab, setActiveTab] = useState<ContentType>(media.types[0] || "photo");

  // ── Constrói HTML para inserir no caderno ──────────────────────
  function buildInsertHtml(): string {
    if (activeTab === "photo" && media.photo.data?.imageUrl) {
      return `<figure style="margin:1rem 0;"><img src="${media.photo.data.imageUrl}" alt="${topic}" style="max-width:100%;border-radius:8px;" /><figcaption style="font-size:0.75rem;color:#888;margin-top:4px;">${topic} — via ${media.photo.data.provider}</figcaption></figure>`;
    }
    if (activeTab === "video" && media.video.data) {
      const v = media.video.data;
      return `<div style="margin:1rem 0;"><p style="font-size:0.85rem;font-weight:600;margin-bottom:4px;">📺 ${v.title}</p><a href="https://youtu.be/${v.videoId}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #ddd;border-radius:8px;text-decoration:none;color:inherit;font-size:0.8rem;"><img src="${v.thumbnail}" style="width:80px;border-radius:4px;" /><span>${v.channelTitle}</span></a></div>`;
    }
    if (activeTab === "map" && media.map.data) {
      return `<div style="margin:1rem 0;"><p style="font-size:0.8rem;font-weight:600;margin-bottom:4px;">🗺 Mapa: ${media.map.data.label}</p><iframe src="${media.map.data.iframeSrc}" width="100%" height="220" style="border:1px solid #ddd;border-radius:8px;" frameborder="0"></iframe></div>`;
    }
    if (activeTab === "data" && media.data.data) {
      const d = media.data.data;
      return `<div style="margin:1rem 0;padding:10px;border:1px solid #ddd;border-radius:8px;"><p style="font-size:0.85rem;font-weight:600;margin-bottom:2px;">📊 ${d.title}</p><p style="font-size:0.75rem;color:#888;margin-bottom:6px;">${d.description} — ${d.source}</p>${d.embedUrl ? `<iframe src="${d.embedUrl}" width="100%" height="200" style="border:none;border-radius:6px;"></iframe>` : `<a href="${d.url}" target="_blank" style="font-size:0.8rem;color:#2563eb;">Ver gráfico em ${d.source}</a>`}</div>`;
    }
    return "";
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Mídia educacional</p>
          <p className="text-sm font-semibold truncate">{topic}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Fechar painel de mídia">
            <X size={16} />
          </Button>
        )}
      </div>

      {/* Abas */}
      <div className="flex border-b border-border shrink-0 overflow-x-auto">
        {media.types.map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === type
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_ICONS[type]}
            {TAB_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Foto ── */}
        {activeTab === "photo" && (
          media.photo.loading ? <Skeleton /> :
          media.photo.error || !media.photo.data ? <ErrorState /> : (
            <div className="p-4 space-y-3">
              <img
                src={media.photo.data.imageUrl}
                alt={topic}
                className="w-full rounded-lg object-cover max-h-64"
              />
              <p className="text-xs text-muted-foreground">
                via {media.photo.data.provider} · {topic}
              </p>
            </div>
          )
        )}

        {/* ── Vídeo ── */}
        {activeTab === "video" && (
          media.video.loading ? <Skeleton /> :
          media.video.error || !media.video.data ? <ErrorState msg="Nenhum vídeo encontrado. Verifique se YOUTUBE_API_KEY está configurada." /> : (
            <div className="p-4 space-y-3">
              <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ paddingTop: "56.25%" }}>
                {media.video.data.embedUrl.endsWith(".mp4") ? (
                  <video
                    src={media.video.data.embedUrl}
                    controls
                    className="absolute inset-0 w-full h-full"
                    poster={media.video.data.thumbnail}
                  />
                ) : (
                  <iframe
                    src={media.video.data.embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={media.video.data.title}
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-medium leading-snug">{media.video.data.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{media.video.data.channelTitle}</p>
              </div>
              {!media.video.data.embedUrl.endsWith(".mp4") && (
                <a
                  href={`https://youtu.be/${media.video.data.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary"
                >
                  <ExternalLink size={11} />
                  Abrir no YouTube
                </a>
              )}
            </div>
          )
        )}

        {/* ── Mapa ── */}
        {activeTab === "map" && (
          media.map.loading ? <Skeleton /> :
          !media.map.data ? <ErrorState msg="Mapa não disponível para este tema" /> : (
            <div className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {media.map.data.label}
              </p>
              <div className="rounded-lg overflow-hidden border border-border" style={{ height: 260 }}>
                <iframe
                  src={media.map.data.iframeSrc}
                  width="100%"
                  height="260"
                  frameBorder="0"
                  scrolling="no"
                  title={`Mapa: ${media.map.data.label}`}
                />
              </div>
              <a
                href={`https://www.openstreetmap.org/#map=4/${media.map.data.iframeSrc.includes("bbox") ? "0/0" : "0/0"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary"
              >
                <ExternalLink size={11} />
                Abrir no OpenStreetMap
              </a>
            </div>
          )
        )}

        {/* ── Dados ── */}
        {activeTab === "data" && (
          media.data.loading ? <Skeleton /> :
          !media.data.data ? <ErrorState msg="Nenhum dataset disponível para este tema" /> : (
            <div className="p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">{media.data.data.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{media.data.data.description}</p>
                <p className="text-xs text-muted-foreground">Fonte: {media.data.data.source}</p>
              </div>
              {media.data.data.embedUrl && (
                <div className="rounded-lg overflow-hidden border border-border" style={{ height: 280 }}>
                  <iframe
                    src={media.data.data.embedUrl}
                    width="100%"
                    height="280"
                    frameBorder="0"
                    title={media.data.data.title}
                  />
                </div>
              )}
              <a
                href={media.data.data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary"
              >
                <ExternalLink size={11} />
                Ver no {media.data.data.source}
              </a>
            </div>
          )
        )}
      </div>

      {/* Botão inserir no caderno */}
      {showInsert && onInsertToNotebook && (
        <div className="p-4 border-t border-border shrink-0">
          <Button
            className="w-full"
            size="sm"
            onClick={() => {
              const html = buildInsertHtml();
              if (html) onInsertToNotebook(html);
            }}
            disabled={
              (activeTab === "photo" && !media.photo.data) ||
              (activeTab === "video" && !media.video.data) ||
              (activeTab === "map"   && !media.map.data)   ||
              (activeTab === "data"  && !media.data.data)
            }
          >
            <BookOpen size={14} className="mr-2" />
            Inserir no caderno
          </Button>
        </div>
      )}
    </div>
  );
}
