import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VoicePresenceEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  micOn: boolean;
  joinedAt: string;
};

/** Read-only listener for the people currently advertising a live microphone in this room. */
export function useVoiceParticipants(roomId: string | undefined) {
  const [entries, setEntries] = useState<VoicePresenceEntry[]>([]);

  useEffect(() => {
    if (!roomId) {
      setEntries([]);
      return;
    }

    const channel = supabase.channel(`voice-presence:room:${roomId}`);
    const sync = () => {
      const state = channel.presenceState<VoicePresenceEntry>();
      const values = Object.values(state).map((list) => list[0]).filter((entry): entry is VoicePresenceEntry => Boolean(entry));
      setEntries(values);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe();

    return () => {
      setEntries([]);
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return useMemo(() => ({
    entries,
    speakingIds: new Set(entries.filter((entry) => entry.micOn).map((entry) => entry.userId)),
  }), [entries]);
}
