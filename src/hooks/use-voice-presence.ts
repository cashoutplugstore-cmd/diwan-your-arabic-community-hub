import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VoicePresenceEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  micOn: boolean;
  joinedAt: string;
};

export function useVoicePresence(
  roomId: string | undefined,
  me: { userId: string; displayName: string; avatarUrl: string | null } | null,
  micOn: boolean,
) {
  const [entries, setEntries] = useState<VoicePresenceEntry[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId || !me) {
      setEntries([]);
      return;
    }

    const channel = supabase.channel(`voice-presence:room:${roomId}`, {
      config: { presence: { key: me.userId } },
    });
    channelRef.current = channel;

    const sync = () => {
      const state = channel.presenceState<VoicePresenceEntry>();
      const flat = Object.values(state).map((list) => list[0]).filter(Boolean);
      setEntries(flat);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe();

    return () => {
      channelRef.current = null;
      setEntries([]);
      supabase.removeChannel(channel);
    };
  }, [roomId, me?.userId, me?.displayName, me?.avatarUrl]);

  useEffect(() => {
    if (!channelRef.current || !me) return;
    void channelRef.current.track({
      userId: me.userId,
      displayName: me.displayName,
      avatarUrl: me.avatarUrl,
      micOn,
      joinedAt: new Date().toISOString(),
    } satisfies VoicePresenceEntry);
  }, [me, micOn]);

  return useMemo(() => ({
    entries,
    speakingIds: new Set(entries.filter((entry) => entry.micOn).map((entry) => entry.userId)),
    count: entries.length,
  }), [entries]);
}
