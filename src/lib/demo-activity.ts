import type { MessageWithAuthor, Profile } from "@/types";
import { DEMO_PROFILES } from "@/lib/demo-community";

const greetings = [
  "هلا والله 🌷 نورتينا!",
  "هلااا، نورت الغرفة ❤️",
  "أهلاً وسهلاً! شلونج؟",
  "يا هلا، نورتينا بينا 😊",
  "أهلاً بيج! شنو أخبارج اليوم؟",
  "هلا والله، خوش وقت دخلتي بيه 😄",
];

const followUps = [
  "شلون يومج وياج؟",
  "إذا عندج سؤال احچي، إحنا هنا 🌷",
  "من أي مدينة؟",
  "تعالي ويانا بالسوالف 😄",
  "شنو رأيج بالغرفة؟",
];

const recentlyReplied = new Map<string, number>();

export function getActiveDemoMembers(limit = 120): Profile[] {
  return DEMO_PROFILES.slice(0, limit).map((profile, index) => ({
    ...profile,
    status: index % 11 === 0 ? "away" : "online",
    updated_at: new Date().toISOString(),
  }));
}

/** Creates a UI-only, synthetic reply when a real user speaks in an otherwise quiet room. */
export function buildDemoReply(roomId: string, realUserName: string): MessageWithAuthor | null {
  const now = Date.now();
  const last = recentlyReplied.get(roomId) ?? 0;
  // Prevent the demo layer from flooding a real conversation.
  if (now - last < 25_000) return null;
  recentlyReplied.set(roomId, now);

  const author = DEMO_PROFILES[Math.floor(Math.random() * DEMO_PROFILES.length)];
  const content = realUserName.toLowerCase().includes("سلام")
    ? greetings[Math.floor(Math.random() * greetings.length)]
    : followUps[Math.floor(Math.random() * followUps.length)];

  return {
    id: `demo-live-${roomId}-${now}`,
    room_id: roomId,
    user_id: author.id,
    content,
    created_at: new Date(now + 1200).toISOString(),
    reply_to_id: null,
    edited_at: null,
    is_deleted: false,
    author,
  };
}
