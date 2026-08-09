import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresenceStatus = "online" | "away";
export type PresenceEntry = { userId: string; status: PresenceStatus; displayName: string; avatarUrl: string | null; onlineAt: string };
export type PresenceActivity = { id: string; type: "join" | "leave"; displayName: string; at: string };

const AWAY_AFTER_MS = 2 * 60 * 1000;

export function useRoomPresence(roomId: string | undefined, me: { userId: string; displayName: string; avatarUrl: string | null } | null) {
  const [entries, setEntries] = useState<PresenceEntry[]>([]);
  const [activity, setActivity] = useState<PresenceActivity[]>([]);
  const previousRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!roomId || !me) { setEntries([]); setActivity([]); previousRef.current = new Map(); return; }
    let lastActive = Date.now();
    const markActive = () => { lastActive = Date.now(); };
    window.addEventListener("pointerdown", markActive); window.addEventListener("keydown", markActive); window.addEventListener("focus", markActive);
    const channel = supabase.channel(`presence:room:${roomId}`, { config: { presence: { key: me.userId } } });
    const sync = () => {
      const state = channel.presenceState<PresenceEntry>();
      const flat = Object.values(state).map((list) => list[0]).filter((entry): entry is PresenceEntry & { presence_ref: string } => Boolean(entry));
      const next = flat.map(({ userId, status, displayName, avatarUrl, onlineAt }) => ({ userId, status, displayName, avatarUrl, onlineAt }));
      const nextMap = new Map(next.map((entry) => [entry.userId, entry.displayName]));
      const previous = previousRef.current;
      const now = new Date().toISOString();
      next.forEach((entry) => { if (!previous.has(entry.userId)) setActivity((items) => [{ id: crypto.randomUUID(), type: "join" as const, displayName: entry.displayName, at: now }, ...items].slice(0, 8)); });
      previous.forEach((displayName, userId) => { if (!nextMap.has(userId)) setActivity((items) => [{ id: crypto.randomUUID(), type: "leave" as const, displayName, at: now }, ...items].slice(0, 8)); });
      previousRef.current = nextMap;
      setEntries(next);
    };
    channel.on("presence", { event: "sync" }, sync).on("presence", { event: "join" }, sync).on("presence", { event: "leave" }, sync).subscribe(async (status) => { if (status !== "SUBSCRIBED") return; await channel.track({ userId: me.userId, status: "online", displayName: me.displayName, avatarUrl: me.avatarUrl, onlineAt: new Date().toISOString() } satisfies PresenceEntry); });
    const interval = window.setInterval(() => { const status: PresenceStatus = document.visibilityState === "hidden" || Date.now() - lastActive > AWAY_AFTER_MS ? "away" : "online"; void channel.track({ userId: me.userId, status, displayName: me.displayName, avatarUrl: me.avatarUrl, onlineAt: new Date().toISOString() } satisfies PresenceEntry); }, 45_000);
    return () => { window.clearInterval(interval); window.removeEventListener("pointerdown", markActive); window.removeEventListener("keydown", markActive); window.removeEventListener("focus", markActive); supabase.removeChannel(channel); };
  }, [roomId, me?.userId, me?.displayName, me?.avatarUrl]);

  return useMemo(() => { const online = entries.filter((e) => e.status === "online"); return { entries, online, onlineIds: new Set(online.map((e) => e.userId)), count: entries.length, activity }; }, [entries, activity]);
}
