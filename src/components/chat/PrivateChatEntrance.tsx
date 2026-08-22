import { useEffect, useState, type ReactNode } from "react";
import { LockKeyhole, MessageCircle, Sparkles } from "lucide-react";

type Props = { children: ReactNode; slug?: string };

export function PrivateChatEntrance({ children, slug }: Props) {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setVisible(true);
    setReady(false);
    const readyTimer = window.setTimeout(() => setReady(true), 120);
    const hideTimer = window.setTimeout(() => setVisible(false), 1150);
    return () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(hideTimer);
    };
  }, [slug]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <style>{`
        @keyframes diwanPrivateReveal { from { opacity:0; transform:scale(.965) translateY(10px); filter:blur(7px); } to { opacity:1; transform:scale(1) translateY(0); filter:blur(0); } }
        @keyframes diwanPrivateVeil { 0% { opacity:0; transform:scale(1.08); } 18% { opacity:1; } 78% { opacity:1; } 100% { opacity:0; transform:scale(1); } }
        @keyframes diwanPrivateCore { 0%,100% { transform:scale(.92); box-shadow:0 0 0 0 rgba(251,191,36,.05),0 0 35px rgba(251,191,36,.16); } 50% { transform:scale(1.04); box-shadow:0 0 0 12px rgba(251,191,36,.04),0 0 75px rgba(251,191,36,.38); } }
        @keyframes diwanPrivateRing { from { transform:scale(.45); opacity:.7; } to { transform:scale(1.9); opacity:0; } }
        @keyframes diwanPrivateSweep { from { transform:translateX(-130%) rotate(12deg); opacity:0; } 20% { opacity:.7; } 70% { opacity:.7; } to { transform:translateX(130%) rotate(12deg); opacity:0; } }
        @keyframes diwanPrivateSpark { 0%,100% { transform:translateY(0) scale(.7); opacity:.25; } 50% { transform:translateY(-13px) scale(1); opacity:1; } }
      `}</style>

      <div
        className="h-full min-h-0"
        style={{
          animation: ready ? "diwanPrivateReveal 700ms cubic-bezier(.2,.8,.2,1) both" : undefined,
        }}
      >
        {children}
      </div>

      {visible ? (
        <div
          className="pointer-events-none absolute inset-0 z-[60] grid place-items-center overflow-hidden bg-slate-950/92 backdrop-blur-md"
          style={{ animation: "diwanPrivateVeil 1150ms cubic-bezier(.65,0,.35,1) forwards" }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(251,191,36,.16),transparent_24%),radial-gradient(circle_at_50%_50%,rgba(59,130,246,.08),transparent_52%)]" />
          <div className="absolute h-56 w-56 rounded-full border border-amber-300/20" style={{ animation: "diwanPrivateRing 1050ms ease-out infinite" }} />
          <div className="absolute h-40 w-40 rounded-full border border-amber-200/20" style={{ animation: "diwanPrivateRing 1050ms 180ms ease-out infinite" }} />

          <div className="relative flex flex-col items-center gap-4 px-6 text-center">
            <div className="relative grid size-24 place-items-center rounded-[30px] border border-amber-200/35 bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 text-slate-950 shadow-[0_0_70px_rgba(251,191,36,.38)]" style={{ animation: "diwanPrivateCore 900ms ease-in-out infinite" }}>
              <MessageCircle className="size-11 stroke-[1.7]" />
              <span className="absolute -end-2 -top-2 grid size-8 place-items-center rounded-full border border-slate-900/30 bg-slate-950 text-amber-200 shadow-lg">
                <LockKeyhole className="size-4" />
              </span>
              <Sparkles className="absolute -start-3 -bottom-2 size-5 text-yellow-200" style={{ animation: "diwanPrivateSpark 900ms ease-in-out infinite" }} />
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[.38em] text-amber-200/70">DIWAN • PRIVATE</p>
              <h2 className="mt-1 font-display text-xl font-black text-white drop-shadow-lg">محادثة خاصة</h2>
              <p className="mt-1 text-xs text-white/55">مساحة خاصة بينك وبين العضو فقط</p>
            </div>
          </div>

          <div className="absolute -inset-y-20 left-1/2 w-24 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent blur-xl" style={{ animation: "diwanPrivateSweep 1000ms 80ms ease-in-out forwards" }} />
          <span className="absolute left-[18%] top-[27%] size-1.5 rounded-full bg-amber-200/80" style={{ animation: "diwanPrivateSpark 800ms 80ms ease-in-out infinite" }} />
          <span className="absolute right-[21%] top-[36%] size-1 rounded-full bg-yellow-100/70" style={{ animation: "diwanPrivateSpark 950ms 220ms ease-in-out infinite" }} />
          <span className="absolute left-[28%] bottom-[27%] size-1 rounded-full bg-amber-300/60" style={{ animation: "diwanPrivateSpark 900ms 300ms ease-in-out infinite" }} />
        </div>
      ) : null}
    </div>
  );
}
