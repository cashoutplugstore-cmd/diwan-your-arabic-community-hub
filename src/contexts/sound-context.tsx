import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type SoundKind = "message" | "notification" | "mention";
export type SoundSettings = { master: boolean } & Record<SoundKind, boolean>;

const STORAGE_KEY = "diwan.sounds";
const DEFAULTS: SoundSettings = { master: true, message: true, notification: true, mention: true };

// Short synthesized tones — no audio assets shipped.
const TONES: Record<SoundKind, { freq: number; second: number; duration: number; gain: number }> = {
  message: { freq: 620, second: 780, duration: 0.09, gain: 0.05 },
  notification: { freq: 520, second: 700, duration: 0.13, gain: 0.06 },
  mention: { freq: 880, second: 1180, duration: 0.16, gain: 0.07 },
};

type SoundValue = {
  settings: SoundSettings;
  setSetting: (key: keyof SoundSettings, value: boolean) => void;
  play: (kind: SoundKind) => void;
};

const SoundContext = createContext<SoundValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SoundSettings>(DEFAULTS);
  const ctxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...DEFAULTS, ...JSON.parse(stored) });
    } catch {
      /* ignore malformed settings */
    }
  }, []);

  // Browsers block audio before a gesture: create/resume the context on first interaction.
  useEffect(() => {
    const unlock = () => {
      unlockedRef.current = true;
      const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      if (!ctxRef.current) ctxRef.current = new AudioCtor();
      void ctxRef.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => () => void ctxRef.current?.close(), []);

  const setSetting = useCallback((key: keyof SoundSettings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const play = useCallback(
    (kind: SoundKind) => {
      if (!settings.master || !settings[kind]) return;
      if (!unlockedRef.current || !ctxRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && kind === "message") return;
      const ctx = ctxRef.current;
      const tone = TONES[kind];
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.freq, now);
      osc.frequency.exponentialRampToValueAtTime(tone.second, now + tone.duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(tone.gain, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + tone.duration + 0.14);
    },
    [settings],
  );

  return <SoundContext.Provider value={{ settings, setSetting, play }}>{children}</SoundContext.Provider>;
}

export function useSounds() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSounds must be used within SoundProvider");
  return ctx;
}
