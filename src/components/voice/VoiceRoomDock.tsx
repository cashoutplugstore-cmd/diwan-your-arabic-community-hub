import { useEffect, useRef, useState } from "react";
import { Headphones, Mic, MicOff, Music2, PhoneOff, Radio, Users, Volume2, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Visual voice-room dock. Real WebRTC signaling is intentionally kept separate from this UI layer. */
export function VoiceRoomDock({ roomName }: { roomName?: string }) {
  const [open, setOpen] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audioRef.current?.pause(), []);

  if (!open) return <Button className="fixed bottom-20 end-4 z-50 rounded-full shadow-xl lg:bottom-6" onClick={() => setOpen(true)}><Radio className="size-4" /> صعود المايك</Button>;

  return (
    <section className="glass-strong fixed bottom-20 end-4 z-50 w-[min(94vw,390px)] overflow-hidden rounded-[28px] border shadow-2xl lg:bottom-6">
      <header className="relative overflow-hidden border-b px-4 py-4">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-transparent to-violet-500/10" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20"><Waves className="size-5" /></div>
          <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Voice Room</p><p className="truncate font-display font-bold">{roomName ?? "الغرفة الحالية"}</p><p className="text-xs text-muted-foreground">صوت مباشر · جاهز للانضمام</p></div>
          <Badge variant="secondary" className="rounded-full"><Users className="me-1 size-3" /> 1</Badge>
        </div>
      </header>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3 rounded-2xl border bg-secondary/30 p-3"><div className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary"><Headphones className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">أنت في الروم الصوتي</p><p className="text-xs text-muted-foreground">ارفع المايك حتى تبدأ الكلام</p></div><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_currentColor]" /></div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={micOn ? "default" : "secondary"} className="h-11 rounded-2xl" onClick={() => setMicOn((v) => !v)}>{micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}{micOn ? "المايك شغال" : "ارفع المايك"}</Button>
          <Button variant={speakerOn ? "secondary" : "outline"} className="h-11 rounded-2xl" onClick={() => setSpeakerOn((v) => !v)}><Volume2 className="size-4" />{speakerOn ? "الصوت شغال" : "الصوت مكتوم"}</Button>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-secondary/50"><Music2 className="size-5 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">مشغل الموسيقى</span><span className="block truncate text-xs text-muted-foreground">اختَر ملفًا صوتيًا من جهازك</span></span><input className="sr-only" type="file" accept="audio/*" onChange={(event) => setMediaName(event.target.files?.[0]?.name ?? null)} /></label>
        {mediaName ? <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs"><Music2 className="size-3 text-primary" /><span className="truncate">{mediaName}</span></div> : null}
        <Button variant="destructive" className="h-11 w-full rounded-2xl" onClick={() => setOpen(false)}><PhoneOff className="size-4" /> مغادرة الروم الصوتي</Button>
      </div>
    </section>
  );
}
