import { useEffect, useRef, useState } from "react";
import { Headphones, Mic, Mic2, MicOff, Music2, Pause, PhoneOff, Play, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";

type VoiceParticipant = { user_id: string; is_speaker: boolean; is_muted: boolean; display_name: string };

/** Room-scoped voice controls with realtime speaker presence. */
export function VoiceRoomDock({ roomName }: { roomName?: string }) {
  const { user } = useAuth();
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    async function loadRoom() {
      if (!roomName) return;
      const { data } = await supabase.from("rooms").select("id").eq("name", roomName).maybeSingle();
      if (active) setRoomId(data?.id ?? null);
    }
    void loadRoom();
    return () => { active = false; };
  }, [roomName]);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    async function loadParticipants() {
      const { data } = await supabase.from("room_voice_participants").select("user_id,is_speaker,is_muted").eq("room_id", roomId).eq("is_speaker", true);
      const ids = (data ?? []).map((row) => row.user_id);
      if (!ids.length) { if (active) setParticipants([]); return; }
      const { data: profiles } = await supabase.from("profiles").select("id,display_name,username").in("id", ids);
      const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name || p.username || "عضو"]));
      if (active) setParticipants((data ?? []).map((row) => ({ ...row, display_name: names.get(row.user_id) ?? "عضو" })));
    }
    void loadParticipants();
    const channel = supabase.channel(`voice-room:${roomId}`).on("postgres_changes", { event: "*", schema: "public", table: "room_voice_participants", filter: `room_id=eq.${roomId}` }, () => void loadParticipants()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [roomId]);

  async function joinVoice() {
    if (!user || !roomId) return false;
    const { error } = await supabase.from("room_voice_participants").insert({ room_id: roomId, user_id: user.id, is_speaker: true, is_muted: false, updated_at: new Date().toISOString() });
    return !error;
  }

  async function leaveVoiceState() {
    if (!roomId) return;
    const { error } = await supabase.rpc("voice_leave", { _room_id: roomId });
    if (!error) setMicOn(false);
  }

  async function setSelfMuted(muted: boolean) {
    if (!roomId) return;
    const { error } = await supabase.rpc("voice_set_self_muted", { _room_id: roomId, _muted: muted });
    if (!error) setSpeakerOn(!muted);
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    audioRef.current?.pause();
    if (roomId) void supabase.rpc("voice_leave", { _room_id: roomId });
  }, [mediaUrl, roomId]);

  async function toggleMic() {
    if (micOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      await leaveVoiceState();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const joined = await joinVoice();
      if (!joined) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setMicOn(true);
      setSpeakerOn(true);
    } catch {
      setMicOn(false);
    }
  }

  async function toggleMute() {
    await setSelfMuted(speakerOn);
  }

  async function leaveVoice() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    await leaveVoiceState();
  }

  function chooseMusic(file: File | undefined) {
    if (!file) return;
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(URL.createObjectURL(file));
    setMediaName(file.name);
    setPlaying(false);
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
      {participants.length > 0 ? (
        <div className="mb-2 flex items-center gap-2 overflow-x-auto rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-2 py-1.5">
          <Mic2 className="size-3.5 shrink-0 text-emerald-400" />
          <span className="shrink-0 text-[10px] font-bold text-emerald-300">على المايك</span>
          {participants.map((p) => <span key={p.user_id} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />{p.display_name}{p.is_muted ? " 🔇" : " 🎙️"}</span>)}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <div className="hidden min-w-0 flex-1 sm:block">
          <p className="truncate text-xs font-semibold">الصوت · {roomName ?? "الغرفة"}</p>
          <p className="truncate text-[10px] text-muted-foreground">{micOn ? "أنت صاعد على المايك" : "ارفع المايك وتكلم مع الموجودين"}</p>
        </div>
        <Button type="button" size="sm" variant={micOn ? "default" : "secondary"} className="h-10 min-w-0 flex-1 rounded-xl sm:flex-none" onClick={() => void toggleMic()} title={micOn ? "إيقاف المايك" : "صعود المايك"}>
          {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}<span className="truncate">{micOn ? "🎙️ على المايك" : "صعود المايك"}</span>
        </Button>
        {micOn ? <Button type="button" size="icon" variant="secondary" className="size-10 shrink-0 rounded-xl" onClick={() => void toggleMute()} title={speakerOn ? "كتم المايك" : "إلغاء كتم المايك"} aria-label={speakerOn ? "كتم المايك" : "إلغاء كتم المايك"}>{speakerOn ? <Volume2 className="size-4" /> : <MicOff className="size-4" />}</Button> : <Button type="button" size="icon" variant="secondary" className="size-10 shrink-0 rounded-xl" onClick={() => setSpeakerOn((value) => !value)} title={speakerOn ? "كتم الصوت" : "تشغيل الصوت"} aria-label={speakerOn ? "كتم الصوت" : "تشغيل الصوت"}>{speakerOn ? <Volume2 className="size-4" /> : <Headphones className="size-4" />}</Button>}
        <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80" title="اختيار موسيقى من الجهاز"><Music2 className="size-4" /><input className="sr-only" type="file" accept="audio/*" onChange={(event) => chooseMusic(event.target.files?.[0])} /></label>
        {micOn ? <Button type="button" size="icon" variant="destructive" className="size-10 shrink-0 rounded-xl" onClick={() => void leaveVoice()} title="مغادرة المايك" aria-label="مغادرة المايك"><PhoneOff className="size-4" /></Button> : null}
      </div>
      {mediaUrl ? <div className="mt-2 flex min-w-0 items-center gap-2 rounded-xl bg-primary/10 px-2.5 py-1.5 text-[11px]"><audio ref={audioRef} src={mediaUrl} onEnded={() => setPlaying(false)} muted={!speakerOn} /><Music2 className="size-3 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{mediaName}</span><Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => void togglePlayback()} aria-label={playing ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}>{playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}</Button><Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" onClick={clearMusic} aria-label="إزالة الموسيقى"><X className="size-3.5" /></Button></div> : null}
    </div>
  );
}
