import { useEffect, useState, type ReactNode } from "react";
import { Hash, Sparkles, Users } from "lucide-react";

type Props = { children: ReactNode; slug?: string };

export function PublicRoomEntrance({ children, slug }: Props) {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setVisible(true);
    setReady(false);
    const readyTimer = window.setTimeout(() => setReady(true), 90);
    const hideTimer = window.setTimeout(() => setVisible(false), 900);
    return () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(hideTimer);
    };
  }, [slug]);

  return (
    <div
      className="relative min-h-0 overflow-hidden"
      style={{
        height: "calc(100% + 78px + env(safe-area-inset-bottom))",
        marginBottom: "calc(-78px - env(safe-area-inset-bottom))",
      }}
    >
      <div className="h-full min-h-0">
        <div
          className="h-full min-h-0"
          style={{ animation: ready ? "diwanPublicReveal 560ms cubic-bezier(.2,.8,.2,1) both" : undefined }}
        >
          {children}
        </div>
      </div>

      {visible ? (
        <div className="pointer-events-none absolute inset-0 z-[60] grid place-items-center overflow-hidden bg-slate-950/88 backdrop-blur-sm" style={{ animation: "diwanPublicVeil 900ms cubic-bezier(.65,0,.35,1) forwards" }} aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(59,130,246,.14),transparent_25%),radial-gradient(circle_at_30%_70%,rgba(251,191,36,.06),transparent_35%)]" />
          <div className="absolute size-48 rounded-full border border-blue-300/15 diwan-public-motion" style={{ animation: "diwanPublicRing 900ms ease-out infinite" }} />
          <div className="absolute size-32 rounded-full border border-primary/15 diwan-public-motion" style={{ animation: "diwanPublicRing 900ms 140ms ease-out infinite" }} />
          <div className="relative flex flex-col items-center gap-3 px-6 text-center">
            <div className="relative grid size-20 place-items-center rounded-[26px] border border-blue-200/25 bg-gradient-to-br from-blue-500/90 via-indigo-500/90 to-slate-800 text-white shadow-[0_0_55px_rgba(59,130,246,.24)] diwan-public-motion" style={{ animation: "diwanPublicCore 800ms ease-in-out infinite" }}>
              <Hash className="size-9 stroke-[1.8]" />
              <span className="absolute -end-2 -bottom-2 grid size-7 place-items-center rounded-full border border-slate-900/50 bg-slate-900 text-blue-200 shadow-lg"><Users className="size-3.5" /></span>
              <Sparkles className="absolute -start-2 -top-2 size-4 text-amber-200" style={{ animation: "diwanPublicSpark 760ms ease-in-out infinite" }} />
            </div>
            <div><p className="text-[10px] font-bold tracking-[.34em] text-blue-200/70">DIWAN • PUBLIC ROOM</p><h2 className="mt-1 font-display text-lg font-black text-white drop-shadow-lg">جاري دخول الغرفة</h2><p className="mt-1 text-xs text-white/55">لحظة ونكون ويا أهل الديوان ✨</p></div>
          </div>
          <div className="absolute -inset-y-16 left-1/2 w-20 bg-gradient-to-r from-transparent via-blue-200/12 to-transparent blur-xl diwan-public-motion" style={{ animation: "diwanPublicSweep 820ms 60ms ease-in-out forwards" }} />
          <span className="absolute left-[18%] top-[29%] size-1.5 rounded-full bg-blue-200/70 diwan-public-motion" style={{ animation: "diwanPublicSpark 760ms 70ms ease-in-out infinite" }} />
          <span className="absolute right-[20%] top-[38%] size-1 rounded-full bg-amber-100/60 diwan-public-motion" style={{ animation: "diwanPublicSpark 880ms 180ms ease-in-out infinite" }} />
          <span className="absolute left-[27%] bottom-[28%] size-1 rounded-full bg-blue-300/60 diwan-public-motion" style={{ animation: "diwanPublicSpark 840ms 260ms ease-in-out infinite" }} />
        </div>
      ) : null}

      <style>{`
        @keyframes diwanPublicReveal { from { opacity:0; transform:translateY(8px) scale(.985); filter:blur(4px); } to { opacity:1; transform:translateY(0) scale(1); filter:blur(0); } }
        @keyframes diwanPublicVeil { 0% { opacity:0; } 12% { opacity:1; } 72% { opacity:1; } 100% { opacity:0; } }
        @keyframes diwanPublicCore { 0%,100% { transform:scale(.96); box-shadow:0 0 28px rgba(59,130,246,.14); } 50% { transform:scale(1.04); box-shadow:0 0 58px rgba(59,130,246,.28); } }
        @keyframes diwanPublicRing { from { transform:scale(.7); opacity:.5; } to { transform:scale(1.65); opacity:0; } }
        @keyframes diwanPublicSweep { from { transform:translateX(-125%) skewX(-12deg); opacity:0; } 22% { opacity:.55; } 72% { opacity:.55; } to { transform:translateX(125%) skewX(-12deg); opacity:0; } }
        @keyframes diwanPublicSpark { 0%,100% { transform:translateY(0) scale(.7); opacity:.3; } 50% { transform:translateY(-10px) scale(1); opacity:.9; } }
        @media (prefers-reduced-motion: reduce) { .diwan-public-motion { animation:none !important; } }
      `}</style>
    </div>
  );
}
