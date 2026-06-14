export type FocusSoundType = "none" | "rain" | "lofi" | "cafe" | "nature";

export const FOCUS_SOUNDS: Record<Exclude<FocusSoundType, "none">, string> = {
  rain: "https://cdn.pixabay.com/audio/2022/11/17/audio_c97f7f4ea0.mp3",
  lofi: "https://cdn.pixabay.com/audio/2023/10/30/audio_5f23f7ffba.mp3",
  cafe: "https://cdn.pixabay.com/audio/2022/11/17/audio_c97f7f4ea0.mp3",
  nature: "https://cdn.pixabay.com/audio/2022/08/04/audio_2dde668d05.mp3",
};
