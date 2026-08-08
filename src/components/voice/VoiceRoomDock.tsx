import { useEffect, useRef, useState } from "react";
import { Headphones, Mic, MicOff, Music2, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { profileQuery } from "@/services/profiles.service";
import { roomQuery } from "@/services/rooms.service";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

function currentRoomSlug() {
  return decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() ?? "");
}

/** Compact room-scoped microphone controls plus room-only voice presence. */
export function VoiceRoomDock({ roomName }: { roomName?: string }) {
  const { user } = useAuth();
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const voiceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roomSlug = currentRoomSlug();
  const room = useQuery(roomQuery(roomSlug));
  const profile = useQuery(profileQuery(user?.id));

  useEffect(() => {
    const roomId = room.data?.id;
    if (!roomId || !user) return;
    const channel = supabase.channel(`voice-presence:room:${roomId}`, { config: { presence: { key: user.id } } });
    voiceChannelRef.current = channel;
    channel.subscribe();
    return () => {
      voiceChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [room.data?.id, user?.id]);

  useEffect(() => {
    if (!voiceChannelRef.current || !user) return;
    void voiceChannelRef.current.track({
      userId: user.id,
      displayName: profile.data?.display_name || profile.data?.username || "عضو",
      avatarUrl: profile.data?.avatar_url ?? null,
      micOn,
      joinedAt: new Date().toISOString(),
    });
  }, [micOn, user, profile.data?.display_name, profile.data?.username, profile.data?.avatar_url]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  async function toggleMic() {
    if (micOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setMicOn(false);
      return;
    }
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

  return (
    <div className="border-t bg-background/80 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="hidden min-w-0 flex-1 sm:block">
          <p className="truncate text-xs font-semibold">الصوت · {roomName ?? "الغرفة"}</p>
          <p className="truncate text-[10px] text-muted-foreground">{micOn ? "أنت صاعد المايك في هذه الغرفة" : "صعود المايك يظهر بجانب اسمك للأعضاء"}</p>
        </div>
        <Button type="button" size="sm" variant={micOn ? "default" : "secondary"} className="h-10 flex-1 rounded-xl sm:flex-none" onClick={() => void toggleMic()}>
          {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          <span>{micOn ? "المايك شغال" : "صعود المايك"}</span>
        </Button>
        <Button type="button" size="icon" variant="secondary" className="size-10 shrink-0 rounded-xl" onClick={() => setSpeakerOn((value) => !value)} title={speakerOn ? "كتم الصوت" : "تشغيل الصوت"} aria-label={speakerOn ? "كتم الصوت" : "تشغيل الصوت"}>
          {speakerOn ? <Volume2 className="size-4" /> : <Headphones className="size-4" />}
        </Button>
        <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80" title="اختيار موسيقى من الجهاز">
          <Music2 className="size-4" />
          <input className="sr-only" type="file" accept="audio/*" onChange={(event) => setMediaName(event.target.files?.[0]?.name ?? null)} />
        </label>
        {micOn ? <Button type="button" size="icon" variant="destructive" className="size-10 shrink-0 rounded-xl" onClick={leaveVoice} title="مغادرة المايك" aria-label="مغادرة المايك"><PhoneOff className="size-4" /></Button> : null}
      </div>
      {mediaName ? <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px]"><Music2 className="size-3 text-primary" /><span className="min-w-0 truncate">{mediaName}</span></div> : null}
    </div>
  );
}
