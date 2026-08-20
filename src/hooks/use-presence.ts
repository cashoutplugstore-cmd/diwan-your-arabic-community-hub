import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresenceStatus = "online" | "away";
export type PresenceEntry = { userId: string; status: PresenceStatus; displayName: string; avatarUrl: string | null; onlineAt: string };
export type PresenceActivity = { id: string; type: "join" | "leave"; displayName: string; at: string };

const AWAY_AFTER_MS = 2 * 60 * 1000;
const HEARTBEAT_MS = 20_000;

export function useRoomPresence(roomId: string | undefined, me: { userId: string; displayName: string; avatarUrl: string | null } | null) {
  const [entries, setEntries] = useState<PresenceEntry[]>([]);
  const [activity, setActivity] = useState<PresenceActivity[]>([]);
  const previousRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!roomId || !me?.userId) {
      setEntries([]);
      setActivity([]);
      previousRef.current = new Map();
      return;
    }

    let lastActive = Date.now();
    let disposed = false;
    const markActive = () => { lastActive = Date.now(); };
    const markOnline = () => { lastActive = Date.now(); };

    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);
    window.addEventListener("focus", markActive);

    const channel = supabase.channel(`presence:room:${roomId}`, {
      config: { presence: { key: me.userId } },
    });

    const sync = () => {
      if (disposed) return;
      const state = channel.presenceState<PresenceEntry>();
      const flat = Object.values(state)
        .flatMap((list) => list)
        .filter((entry) => Boolean(entry?.userId));

      const byUser = new Map<string, PresenceEntry>();
      for (const entry of flat) {
        const existing = byUser.get(entry.userId);
        if (!existing || new Date(entry.onlineAt).getTime() >= new Date(existing.onlineAt).getTime()) {
          byUser.set(entry.userId, entry);
        }
      }

      const next = [...byUser.values()];
      const nextMap = new Map(next.map((entry) => [entry.userId, entry.displayName]));
      const previous = previousRef.current;
      const now = new Date().toISOString();

      next.forEach((entry) => {
        if (!previous.has(entry.userId)) {
          setActivity((items) => [
            { id: crypto.randomUUID(), type: "join" as const, displayName: entry.displayName, at: now },
            ...items,
          ].slice(0, 8));
        }
      });

      previous.forEach((displayName, userId) => {
        if (!nextMap.has(userId)) {
          setActivity((items) => [
            { id: crypto.randomUUID(), type: "leave" as const, displayName, at: now },
            ...items,
          ].slice(0, 8));
        }
      });

      previousRef.current = nextMap;
      setEntries(next);
    };

    const trackPresence = async () => {
      if (disposed) return;
      const status: PresenceStatus =
        document.visibilityState === "hidden" || Date.now() - lastActive > AWAY_AFTER_MS
          ? "away"
          : "online";
      const onlineAt = new Date().toISOString();
      const payload: PresenceEntry = {
        userId: me.userId,
        status,
        displayName: me.displayName || "عضو",
        avatarUrl: me.avatarUrl ?? null,
        onlineAt,
      };

      const result = await channel.track(payload);
      if (result !== "ok") return;

      // Persist a short-lived heartbeat for room cards/counts and create the
      // durable room_members row through the database trigger on first entry.
      await supabase.from("room_presence").upsert(
        { room_id: roomId, user_id: me.userId, last_seen_at: onlineAt },
        { onConflict: "room_id,user_id" },
      );
      sync();
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await trackPresence();
        sync();
      });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        markOnline();
        void trackPresence();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = window.setInterval(() => {
      void trackPresence();
    }, HEARTBEAT_MS);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("focus", markActive);
      previousRef.current = new Map();
      setEntries([]);
      void channel.untrack();
      void supabase.from("room_presence").delete().eq("room_id", roomId).eq("user_id", me.userId);
      supabase.removeChannel(channel);
    };
  }, [roomId, me?.userId, me?.displayName, me?.avatarUrl]);

  return useMemo(() => {
    const online = entries.filter((entry) => entry.status === "online");
    return {
      entries,
      online,
      onlineIds: new Set(online.map((entry) => entry.userId)),
      count: entries.length,
      activity,
    };
  }, [entries, activity]);
}
