import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    if (!roomId || !me) {
      setEntries([]);
      return;
    }

    const channel = supabase.channel(`voice-presence:room:${roomId}`, {
      config: { presence: { key: me.userId } },
    });

    const sync = () => {
      const state = channel.presenceState<VoicePresenceEntry>();
      const flat = Object.values(state)
        .map((list) => list[0])
        .filter(Boolean);
      setEntries(flat);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({
          userId: me.userId,
          displayName: me.displayName,
          avatarUrl: me.avatarUrl,
          micOn,
          joinedAt: new Date().toISOString(),
        } satisfies VoicePresenceEntry);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, me?.userId, me?.displayName, me?.avatarUrl]);

  useEffect(() => {
    if (!roomId || !me) return;
    const channel = supabase.channel(`voice-presence:room:${roomId}`);
    void channel.track({
      userId: me.userId,
      displayName: me.displayName,
      avatarUrl: me.avatarUrl,
      micOn,
      joinedAt: new Date().toISOString(),
    } satisfies VoicePresenceEntry);
  }, [roomId, me?.userId, micOn]);

  return useMemo(() => ({
    entries,
    speakingIds: new Set(entries.filter((entry) => entry.micOn).map((entry) => entry.userId)),
    count: entries.length,
  }), [entries]);
}
