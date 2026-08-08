import type { MessageWithAuthor, Profile } from "@/types";
import { DEMO_PROFILES } from "@/lib/demo-community";

const greetings = [
  "هلا والله 🌷 نورتينا!", "هلااا، نورت الغرفة ❤️", "أهلاً وسهلاً! شلونج؟", "يا هلا، نورتينا بينا 😊", "أهلاً بيج! شنو أخبارج اليوم؟", "هلا والله، خوش وقت دخلتي بيه 😄",
];
const followUps = [
  "شلون يومج وياج؟", "إذا عندج سؤال احچي، إحنا هنا 🌷", "من أي مدينة؟", "تعالي ويانا بالسوالف 😄", "شنو رأيج بالغرفة؟",
];
const ambient = [
  "شنو أخباركم اليوم؟ 🌷", "أحد صاحي بهالوقت؟ 😂", "وين أحصل قهوة زينة؟ ☕", "والله اليوم الجو حلو 😄", "منو عنده اقتراح لفيلم؟ 🎬", "ههههه 😂", "صباح الخير يا جماعة ☀️", "مساء الخير 🌙", "شنو خطتكم للويكند؟", "أحد جرب مطعم جديد؟", "🇫🇮❤️", "🇮🇶❤️", "اشتقت للسوالف هنا 😄", "منو من هلسنكي؟", "أحد يعرف مكان هادي للدراسة؟", "يا جماعة عندي سالفة 😂", "شلونكم؟", "نورتوا ❤️", "شنو أكثر غرفة تحبونها؟", "اليوم مزاجي سوالف ☕",
];
const recentlyReplied = new Map<string, number>();
const recentlyAmbient = new Map<string, number>();

export function getActiveDemoMembers(limit = 120): Profile[] {
  return DEMO_PROFILES.slice(0, limit).map((profile, index) => ({ ...profile, status: index % 11 === 0 ? "away" : "online", updated_at: new Date().toISOString() }));
}

/** Creates a UI-only synthetic reply. It is never inserted into Supabase. */
export function buildDemoReply(roomId: string, realMessage: string): MessageWithAuthor | null {
  const now = Date.now();
  if (now - (recentlyReplied.get(roomId) ?? 0) < 25_000) return null;
  recentlyReplied.set(roomId, now);
  const author = DEMO_PROFILES[Math.floor(Math.random() * DEMO_PROFILES.length)];
  const isGreeting = /(^|\s)(سلام|هلا|هلو|مرحبا|هاي|hello|hi)(\s|!|！|$)/iu.test(realMessage);
  const pool = isGreeting ? greetings : followUps;
  return { id: `demo-live-${roomId}-${now}`, room_id: roomId, user_id: author.id, content: pool[Math.floor(Math.random() * pool.length)], created_at: new Date(now + 1200).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author };
}

/** Generates one lightweight ambient message for an open room. Never persisted. */
export function buildDemoAmbientMessage(roomId: string): MessageWithAuthor | null {
  const now = Date.now();
  if (now - (recentlyAmbient.get(roomId) ?? 0) < 10_000) return null;
  recentlyAmbient.set(roomId, now);
  const author = DEMO_PROFILES[Math.floor(Math.random() * DEMO_PROFILES.length)];
  return { id: `demo-ambient-${roomId}-${now}`, room_id: roomId, user_id: author.id, content: ambient[Math.floor(Math.random() * ambient.length)], created_at: new Date(now).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author };
}
