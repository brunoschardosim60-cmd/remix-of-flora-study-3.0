import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "./notebook-premium.css";

export interface NotebookVoiceMemo {
  id: string;
  url: string;
  createdAt: number;
  duration: number;
  label: string;
  storagePath?: string;
}

interface VoiceMemoRecorderProps {
  userId: string;
  notebookId: string;
  pageId: string;
  memos: NotebookVoiceMemo[];
  onChange: (memos: NotebookVoiceMemo[]) => void;
}

const MAX_RECORDING_SECONDS = 180;
const MAX_AUDIO_BYTES = 4.5 * 1024 * 1024;

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function VoiceMemoRecorder({ userId, notebookId, pageId, memos, onChange }: VoiceMemoRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const releaseMicrophone = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      const next = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(next);
      if (next >= MAX_RECORDING_SECONDS) recorderRef.current?.stop();
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseMicrophone();
  }, []);

  const finishRecording = async (mimeType: string) => {
    setRecording(false);
    releaseMicrophone();
    const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
    chunksRef.current = [];
    if (!blob.size) return;
    if (blob.size > MAX_AUDIO_BYTES) {
      toast.error("A gravação ficou grande demais. Grave trechos de até 3 minutos.");
      return;
    }

    const id = crypto.randomUUID();
    const extension = blob.type.includes("mp4") ? "m4a" : "webm";
    const storagePath = `${userId}/${notebookId}/audio/${pageId}/${id}.${extension}`;
    setUploading(true);
    try {
      const { error } = await supabase.storage.from("notebook-images").upload(storagePath, blob, {
        contentType: blob.type || "audio/webm",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("notebook-images").getPublicUrl(storagePath);
      onChange([...memos, {
        id,
        url: data.publicUrl,
        storagePath,
        createdAt: Date.now(),
        duration,
        label: `Áudio ${memos.length + 1}`,
      }]);
      toast.success("Áudio anexado a esta página.");
    } catch (error) {
      console.error("voice memo upload", error);
      toast.error("Não foi possível salvar a gravação.");
    } finally {
      setUploading(false);
      setElapsed(0);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Este navegador não oferece gravação de áudio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => { void finishRecording(recorder.mimeType); };
      recorder.onerror = () => {
        setRecording(false);
        releaseMicrophone();
        toast.error("A gravação foi interrompida pelo navegador.");
      };
      startedAtRef.current = Date.now();
      setElapsed(0);
      setOpen(true);
      setRecording(true);
      recorder.start(1000);
    } catch {
      toast.error("Permita o uso do microfone para gravar uma nota de voz.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const togglePlayback = async (memo: NotebookVoiceMemo) => {
    const audio = audioRefs.current[memo.id];
    if (!audio) return;
    Object.entries(audioRefs.current).forEach(([id, item]) => {
      if (id !== memo.id && item) { item.pause(); item.currentTime = 0; }
    });
    if (audio.paused) {
      await audio.play();
      setPlayingId(memo.id);
    } else {
      audio.pause();
      setPlayingId(null);
    }
  };

  const removeMemo = async (memo: NotebookVoiceMemo) => {
    if (memo.storagePath) await supabase.storage.from("notebook-images").remove([memo.storagePath]);
    onChange(memos.filter((item) => item.id !== memo.id));
  };

  return <div className={`nb-voice-memos ${open ? "open" : ""}`}>
    <button
      type="button"
      className={`nb-voice-trigger ${recording ? "recording" : ""}`}
      onClick={() => {
        if (recording) stopRecording();
        else if (memos.length) setOpen((current) => !current);
        else void startRecording();
      }}
      disabled={uploading}
      title={recording ? "Parar e anexar gravação" : memos.length ? "Gravar outra nota de voz" : "Gravar nota de voz"}
    >
      {recording ? <Square /> : <Mic />}
      <span>{uploading ? "Salvando…" : recording ? formatDuration(elapsed) : memos.length ? `${memos.length} áudio${memos.length > 1 ? "s" : ""}` : "Gravar"}</span>
    </button>

    {open && <div className="nb-voice-popover">
      <header><div><strong>Notas de voz</strong><small>Gravações desta página</small></div>{!recording && <button type="button" onClick={() => void startRecording()}><Mic /> Nova</button>}</header>
      {recording && <div className="nb-voice-live"><i /><span>Gravando {formatDuration(elapsed)}</span><button type="button" onClick={stopRecording}><Square /> Parar</button></div>}
      {!recording && memos.length === 0 && <p className="nb-voice-empty">Use o microfone para registrar uma explicação, aula ou raciocínio clínico.</p>}
      {memos.map((memo) => <div key={memo.id} className="nb-voice-row">
        <audio ref={(node) => { audioRefs.current[memo.id] = node; }} src={memo.url} preload="metadata" onEnded={() => setPlayingId(null)} />
        <button type="button" className="play" onClick={() => void togglePlayback(memo)}>{playingId === memo.id ? <Pause /> : <Play />}</button>
        <div><strong>{memo.label}</strong><small>{formatDuration(memo.duration)} · {new Date(memo.createdAt).toLocaleDateString("pt-BR")}</small></div>
        <button type="button" className="delete" onClick={() => void removeMemo(memo)} title="Excluir gravação"><Trash2 /></button>
      </div>)}
    </div>}
  </div>;
}
