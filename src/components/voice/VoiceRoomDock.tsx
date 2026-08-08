import { useEffect, useRef, useState } from "react";
import { Headphones, Mic, MicOff, Music2, Pause, PhoneOff, Play, Volume2, X, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Room-scoped voice controls. Keeps the mic, speaker and local music inside the current room. */
export function VoiceRoomDock({ roomName }: { roomName?: string }) {
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    audioRef.current?.pause();
  }, [mediaUrl]);

  async function toggleMic() {
    if (micOn) { leaveVoice(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicOn(true);
    } catch {
      setMicOn(false);
    }
  }

  function leaveVoice() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMicOn(false);
  }

  function chooseMusic(file: File | undefined) {
    if (!file) return;
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    const url = URL.createObjectURL(file);
    setMediaUrl(url); setMediaName(file.name); setPlaying(false);
  }

  async function togglePlayback() {
    if (!audioRef.current || !mediaUrl) return;
    if (audioRef.current.paused) { await audioRef.current.play(); setPlaying(true); }
    else { audioRef.current.pause(); setPlaying(false); }
  }

  function clearMusic() {
    audioRef.current?.pause();
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(null); setMediaName(null); setPlaying(false);
  }

  return (
    <div className="border-t bg-background/80 px-3 py-2 backdrop-blur-sm" aria-label="الصوت">
      <div className="flex items-center gap-2">
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="flex items-center gap-1.5 text-xs font-semibold"><Radio className={micOn ? "size-3 text-emerald-400" : "size-3 text-muted-foreground"} aria-hidden /> الصوت · {roomName ?? "الغرفة"}</div>
          <p className="truncate text-[10px] text-muted-foreground">{micOn ? "أنت على المايك الآن · اضغط للخروج" : "المايك مرتبط بهذه الغرفة فقط"}</p>
        </div>
        <Button type="button" size="sm" variant={micOn ? "default" : "secondary"} className="h-10 min-w-0 flex-1 rounded-xl sm:flex-none" onClick={() => void toggleMic()} title={micOn ? "إيقاف المايك" : "صعود المايك"}>
          {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}<span className="truncate">{micOn ? "على المايك الآن" : "صعود المايك"}</span>
        </Button>
        <Button type="button" size="icon" variant="secondary" className="size-10 shrink-0 rounded-xl" onClick={() => setSpeakerOn((value) => !value)} title={speakerOn ? "كتم الصوت" : "تشغيل الصوت"} aria-label={speakerOn ? "كتم الصوت" : "تشغيل الصوت"}>
          {speakerOn ? <Volume2 className="size-4" /> : <Headphones className="size-4" />}
        </Button>
        <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80" title="اختيار موسيقى من الجهاز">
          <Music2 className="size-4" /><input className="sr-only" type="file" accept="audio/*" onChange={(event) => chooseMusic(event.target.files?.[0])} />
        </label>
        {micOn ? <Button type="button" size="icon" variant="destructive" className="size-10 shrink-0 rounded-xl" onClick={leaveVoice} title="مغادرة المايك" aria-label="مغادرة المايك"><PhoneOff className="size-4" /></Button> : null}
      </div>
      {mediaUrl ? <div className="mt-2 flex min-w-0 items-center gap-2 rounded-xl bg-primary/10 px-2.5 py-1.5 text-[11px]">
        <audio ref={audioRef} src={mediaUrl} onEnded={() => setPlaying(false)} muted={!speakerOn} />
        <Music2 className="size-3 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">{mediaName}</span>
        <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => void togglePlayback()} aria-label={playing ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}>{playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}</Button>
        <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" onClick={clearMusic} aria-label="إزالة الموسيقى"><X className="size-3.5" /></Button>
      </div> : null}
    </div>
  );
}
