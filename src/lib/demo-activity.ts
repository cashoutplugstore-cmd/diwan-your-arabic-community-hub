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

/** Creates a UI-only synthetic reply. It is never inserted into Supabase. */
export function buildDemoReply(roomId: string, realMessage: string): MessageWithAuthor | null {
  const now = Date.now();
  const last = recentlyReplied.get(roomId) ?? 0;
  if (now - last < 25_000) return null;
  recentlyReplied.set(roomId, now);

  const author = DEMO_PROFILES[Math.floor(Math.random() * DEMO_PROFILES.length)];
  const isGreeting = /(^|\s)(سلام|هلا|هلو|مرحبا|هاي|hello|hi)(\s|!|！|$)/iu.test(realMessage);
  const pool = isGreeting ? greetings : followUps;
  const content = pool[Math.floor(Math.random() * pool.length)];

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
