import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFloraVoice } from "./useFloraVoice";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

class MockAudio {
  currentTime = 0;
  onplay: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public src = "") {}

  play() {
    this.onplay?.();
    return Promise.resolve();
  }

  pause() {}
}

class MockSpeechSynthesisUtterance {
  lang = "";
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public text: string) {}
}

describe("useFloraVoice", () => {
  const speakDevice = vi.fn((utterance: MockSpeechSynthesisUtterance) => utterance.onstart?.());
  const cancelDevice = vi.fn();

  beforeEach(() => {
    invokeMock.mockReset();
    speakDevice.mockClear();
    cancelDevice.mockClear();
    vi.stubGlobal("Audio", MockAudio as unknown as typeof Audio);
    vi.stubGlobal("SpeechSynthesisUtterance", MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:voice") });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { cancel: cancelDevice, resume: vi.fn(), speak: speakDevice, getVoices: () => [] },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("reproduz o áudio remoto quando o TTS responde", async () => {
    invokeMock.mockResolvedValue({ data: new Blob(["audio"], { type: "audio/mpeg" }), error: null });
    const { result } = renderHook(() => useFloraVoice());

    await act(async () => { await result.current.speak("Resposta do paciente", "padrao"); });

    expect(invokeMock).toHaveBeenCalledWith("flora-tts", expect.objectContaining({ body: expect.objectContaining({ text: "Resposta do paciente" }) }));
    expect(result.current.playing).toBe(true);
    expect(result.current.mode).toBe("remote");
    expect(result.current.error).toBeNull();
  });

  it("usa a voz do dispositivo quando o TTS remoto falha", async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error("TTS indisponível") });
    const { result } = renderHook(() => useFloraVoice());

    await act(async () => { await result.current.speak("Consigo falar mesmo sem o serviço remoto", "padrao"); });

    expect(speakDevice).toHaveBeenCalledTimes(1);
    expect(result.current.playing).toBe(true);
    expect(result.current.mode).toBe("device");
    expect(result.current.error).toContain("voz do dispositivo");

    act(() => result.current.stop());
    expect(cancelDevice).toHaveBeenCalled();
    expect(result.current.playing).toBe(false);
  });
});
