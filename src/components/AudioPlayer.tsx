import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Download } from "lucide-react";
import { floraTTS, AudioPlayerState } from "../lib/floraTTS";

interface AudioPlayerProps {
  audioBlob: Blob;
  onEnded?: () => void;
  showDownload?: boolean;
  fileName?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBlob,
  onEnded,
  showDownload = false,
  fileName = "flora-audio.mp3",
}) => {
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
  });

  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reproduz o áudio automaticamente
    const audio = floraTTS.playAudio(audioBlob, onEnded);
    audioRef.current = audio;

    // Atualiza o estado do player a cada 100ms
    updateIntervalRef.current = setInterval(() => {
      setPlayerState(floraTTS.getPlayerState());
    }, 100);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [audioBlob, onEnded]);

  const handlePlayPause = () => {
    if (playerState.isPlaying) {
      floraTTS.pauseAudio();
    } else {
      floraTTS.resumeAudio();
    }
    setPlayerState(floraTTS.getPlayerState());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    floraTTS.setVolume(volume);
    setPlayerState(floraTTS.getPlayerState());
  };

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rate = parseFloat(e.target.value);
    floraTTS.setPlaybackRate(rate);
    setPlaybackRate(rate);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = parseFloat(e.target.value);
      setPlayerState(floraTTS.getPlayerState());
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
      {/* Controles principais */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          className="p-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors"
          title={playerState.isPlaying ? "Pausar" : "Reproduzir"}
        >
          {playerState.isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        {/* Barra de progresso */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-gray-600 min-w-[40px]">
            {formatTime(playerState.currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={playerState.duration || 0}
            value={playerState.currentTime}
            onChange={handleProgressChange}
            className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <span className="text-xs text-gray-600 min-w-[40px]">
            {formatTime(playerState.duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          {playerState.volume === 0 ? (
            <VolumeX size={18} className="text-gray-600" />
          ) : (
            <Volume2 size={18} className="text-gray-600" />
          )}
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={playerState.volume}
            onChange={handleVolumeChange}
            className="w-20 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Download */}
        {showDownload && (
          <button
            onClick={handleDownload}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            title="Baixar áudio"
          >
            <Download size={18} className="text-gray-600" />
          </button>
        )}
      </div>

      {/* Controles secundários */}
      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-gray-700">
          <span>Velocidade:</span>
          <select
            value={playbackRate}
            onChange={handlePlaybackRateChange}
            className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 cursor-pointer"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">Normal</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </label>
      </div>
    </div>
  );
};
