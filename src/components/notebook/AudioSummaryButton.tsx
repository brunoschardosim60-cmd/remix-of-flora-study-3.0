/**
 * AudioSummaryButton — gera resumo do conteúdo da página atual e narra em áudio.
 * Chama a edge `notebook-audio-summary` (resumo + TTS).
 */
import { useRef, useState } from "react";
import { Headphones, Loader2, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function AudioSummaryButton({
  content,
  title,
}: {
  content: string;
  title?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generate = async () => {
    if (audioUrl) {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) { void a.play(); setPlaying(true); }
      else { a.pause(); setPlaying(false); }
      return;
    }
    if (!content || content.replace(/<[^>]+>/g, "").trim().length < 40) {
      toast.info("Escreva mais conteúdo antes de gerar o resumo.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("notebook-audio-summary", {
        body: { content, title },
      });
      if (error) throw error;
      if (!data?.audio_base64) {
        toast.info(data?.summary ? "Resumo pronto, mas o áudio falhou." : "Sem áudio disponível.");
        if (data?.summary) toast.message("Resumo", { description: data.summary });
        return;
      }
      const blob = base64ToBlob(data.audio_base64, data.mime || "audio/mpeg");
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTimeout(() => {
        if (audioRef.current) { void audioRef.current.play(); setPlaying(true); }
      }, 50);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar resumo em áudio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={generate}
        disabled={loading}
        className="gap-1.5"
        aria-label="Ouvir resumo do caderno"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : audioUrl ? (
          playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />
        ) : (
          <Headphones className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{audioUrl ? (playing ? "Pausar" : "Tocar") : "Ouvir resumo"}</span>
      </Button>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      )}
    </>
  );
}

export default AudioSummaryButton;