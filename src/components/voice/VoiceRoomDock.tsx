import { useEffect, useRef, useState } from "react";
import { Headphones, Mic, MicOff, Music2, PhoneOff, Radio, Users, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Voice-room UI foundation. It deliberately does not fake microphone/audio activity.
 * WebRTC/Supabase signaling can be attached here when the voice backend is enabled.
 */
export function VoiceRoomDock({ roomName }: { roomName?: string }) {
  const [open, setOpen] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  if (!open) {
    return (
      <Button
        className="fixed bottom-20 end-4 z-50 rounded-full shadow-xl lg:bottom-6"
        onClick={() => setOpen(true)}
      >
        <Radio className="size-4" />
        صعود المايك
      </Button>
    );
  }

  return (
    <section className="glass-strong fixed bottom-20 end-4 z-50 w-[min(92vw,360px)] overflow-hidden rounded-3xl border shadow-2xl lg:bottom-6">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary"><Radio className="size-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">غرفة صوتية</p>
          <p className="truncate text-xs text-muted-foreground">{roomName ?? "الغرفة الحالية"}</p>
        </div>
        <Badge variant="secondary"><Users className="me-1 size-3" /> 0</Badge>
      </header>

      <div className="space-y-3 p-4">
        <div className="rounded-2xl border border-dashed p-4 text-center">
          <Headphones className="mx-auto mb-2 size-7 text-primary" />
          <p className="text-sm font-medium">الميكروفون الصوتي</p>
          <p className="mt-1 text-xs text-muted-foreground">البنية جاهزة للـ WebRTC — ما راح نزوّر صوت أو مستمعين.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant={micOn ? "default" : "secondary"} onClick={() => setMicOn((v) => !v)}>
            {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            {micOn ? "المايك شغال" : "ارفع المايك"}
          </Button>
          <Button variant={speakerOn ? "secondary" : "outline"} onClick={() => setSpeakerOn((v) => !v)}>
            <Volume2 className="size-4" /> الصوت
          </Button>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-secondary/50">
          <Music2 className="size-5 text-primary" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-medium">تشغيل أغنية</span><span className="block text-xs text-muted-foreground">اختَر ملفًا صوتيًا من جهازك</span></span>
          <input
            className="sr-only"
            type="file"
            accept="audio/*"
            onChange={(event) => setMediaName(event.target.files?.[0]?.name ?? null)}
          />
        </label>
        {mediaName ? <p className="truncate rounded-xl bg-secondary/60 px-3 py-2 text-xs">🎵 {mediaName}</p> : null}

        <Button variant="destructive" className="w-full" onClick={() => setOpen(false)}>
          <PhoneOff className="size-4" /> مغادرة الغرفة الصوتية
        </Button>
      </div>
    </section>
  );
}
