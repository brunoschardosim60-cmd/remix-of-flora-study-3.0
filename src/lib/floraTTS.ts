import { supabase } from "./supabaseClient";

export interface TTSOptions {
  text: string;
  voice?: "nova" | "shimmer" | "alloy" | "echo" | "fable" | "onyx";
  speed?: number;
  personality?: "padrao" | "rigorosa" | "amiga" | "engraçada" | "motivadora" | "tecnica";
}

export interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

class FloraTTSClient {
  private _supabase: SupabaseClient | null = null;

  constructor() {
    // Inicializa com o cliente Supabase padrão se disponível
    // Isso será sobrescrito pelo setSupabaseClient em testes
    if (typeof window !== 'undefined' && (window as any).supabase) {
      this._supabase = (window as any).supabase;
    }
  }

  public setSupabaseClient(client: SupabaseClient) {
    this._supabase = client;
  }

  private audioElement: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private isLoading = false;

  /**
   * Gera áudio a partir de texto usando a API de TTS
   */
  async generateAudio(options: TTSOptions): Promise<Blob> {
    if (this.isLoading) {
      throw new Error("Já existe uma requisição de áudio em progresso");
    }

    this.isLoading = true;

    try {
          if (!this._supabase) {
      throw new Error("Supabase client não configurado no FloraTTSClient.");
    }
    const { data, error } = await this._supabase.functions.invoke("flora-tts", {
        body: {
          text: options.text,
          voice: options.voice || "nova",
          speed: options.speed || 1.0,
          personality: options.personality || "padrao",
        },
      });

      if (error) {
        throw new Error(`Erro ao gerar áudio: ${error.message}`);
      }

      // Converte a resposta em Blob
      const audioBlob = new Blob([data], { type: "audio/mpeg" });
      return audioBlob;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Reproduz áudio a partir de um Blob
   */
  playAudio(audioBlob: Blob, onEnded?: () => void): HTMLAudioElement {
    // Para o áudio anterior se houver
    if (this.audioElement) {
      this.audioElement.pause();
      if (this.currentAudioUrl) {
        URL.revokeObjectURL(this.currentAudioUrl);
      }
    }

    // Cria novo elemento de áudio
    this.audioElement = new Audio();
    this.currentAudioUrl = URL.createObjectURL(audioBlob);
    this.audioElement.src = this.currentAudioUrl;

    if (onEnded) {
      this.audioElement.addEventListener("ended", onEnded, { once: true });
    }

    this.audioElement.play().catch((err) => {
      console.error("Erro ao reproduzir áudio:", err);
    });

    return this.audioElement;
  }

  /**
   * Para a reprodução de áudio
   */
  stopAudio(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  /**
   * Pausa a reprodução de áudio
   */
  pauseAudio(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Retoma a reprodução de áudio
   */
  resumeAudio(): void {
    if (this.audioElement) {
      this.audioElement.play().catch((err) => {
        console.error("Erro ao retomar áudio:", err);
      });
    }
  }

  /**
   * Define o volume do áudio (0-1)
   */
  setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.min(Math.max(volume, 0), 1);
    }
  }

  /**
   * Define a velocidade de reprodução
   */
  setPlaybackRate(rate: number): void {
    if (this.audioElement) {
      this.audioElement.playbackRate = Math.min(Math.max(rate, 0.25), 4.0);
    }
  }

  /**
   * Retorna o estado atual do áudio
   */
  getPlayerState(): AudioPlayerState {
    if (!this.audioElement) {
      return {
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
      };
    }

    return {
      isPlaying: !this.audioElement.paused,
      isPaused: this.audioElement.paused,
      currentTime: this.audioElement.currentTime,
      duration: this.audioElement.duration,
      volume: this.audioElement.volume,
    };
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
    }
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }
  }
}

// Exporta uma instância singleton
export const floraTTS = new FloraTTSClient();
