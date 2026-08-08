import type { MessageWithAuthor, Profile } from "@/types";
import { DEMO_PROFILES } from "@/lib/demo-community";

const roomPools: Record<string, string[]> = {
  helsinki: ["شلون المواصلات اليوم؟ 🚋", "أحد يعرف كوفي هادي بهلسنكي؟ ☕", "الجو اليوم غريب 😂", "مين رايح للسنتر اليوم؟", "Kela اليوم مسوي زحمة 😅", "أحد جرب مكان جديد للأكل؟ 🍜"],
  finland: ["شنو أخباركم بفنلندا؟ 🇫🇮", "الشتاء بعده بعيد لو لا؟ 😂", "أحد يعرف مكان حلو للويكند؟", "شنو أفضل مدينة للمعيشة برأيكم؟", "أحد عنده تجربة ويا الدراسة هنا؟ 📚"],
  iraq: ["شلونكم أهل العراق ❤️🇮🇶", "شنو آخر الأخبار؟", "اشتقت للأكل العراقي 😂", "منو بعده يحب الشاي بالهيل؟ ☕", "شنو أحلى أكلة عراقية برأيكم؟", "ههههه هاي السالفة قديمة 😂"],
  students: ["منو عنده امتحان هالأسبوع؟ 📚", "أحد يعرف مصادر زينة للدراسة؟", "وين أحصل مكتبة هادئة؟", "خلصتوا واجباتكم؟ 😅", "شنو تخصصكم؟", "بالتوفيق للجميع ❤️"],
  friends: ["شنو مسوين اليوم؟ 😄", "منو يريد سوالف؟ 😂", "أحد عنده فيلم حلو؟ 🎬", "شنو آخر شي فرحكم؟ ❤️", "يلا نحچي، الغرفة هادئة اليوم 😅", "منو يحب القهوة؟ ☕"],
  general: ["شلونكم اليوم؟ 🌷", "أحد صاحي بهالوقت؟ 😂", "وين أحصل قهوة زينة؟ ☕", "والله اليوم الجو حلو 😄", "منو عنده اقتراح لفيلم؟ 🎬", "صباح الخير يا جماعة ☀️", "مساء الخير 🌙", "شنو خطتكم للويكند؟", "أحد جرب مطعم جديد؟", "🇫🇮❤️", "🇮🇶❤️", "اشتقت للسوالف هنا 😄"],
};

const greetings = ["هلا والله 🌷 نورتينا!", "هلااا، نورت الغرفة ❤️", "أهلاً وسهلاً! شلونج؟", "يا هلا، نورتينا بينا 😊", "أهلاً بيج! شنو أخبارج اليوم؟"];
const followUps = ["شلون يومج وياج؟", "إذا عندج سؤال احچي، إحنا هنا 🌷", "من أي مدينة؟", "تعالي ويانا بالسوالف 😄", "شنو رأيج بالغرفة؟"];
const recentlyReplied = new Map<string, number>();
const recentlyAmbient = new Map<string, number>();

function roomKey(roomId: string): string {
  const value = roomId.toLowerCase();
  if (/helsinki|هلسنكي/.test(value)) return "helsinki";
  if (/finland|فنلندا/.test(value)) return "finland";
  if (/iraq|العراق|عراق/.test(value)) return "iraq";
  if (/student|طلاب|دراسة|جامعة/.test(value)) return "students";
  if (/friend|تعرف|سوالف/.test(value)) return "friends";
  return "general";
}

function authorFor(roomId: string, salt = 0): Profile {
  const hash = [...roomId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261 ^ salt);
  return DEMO_PROFILES[hash % DEMO_PROFILES.length];
}

export function getActiveDemoMembers(limit = 48): Profile[] {
  return DEMO_PROFILES.slice(0, limit).map((profile) => ({ ...profile, status: "online", updated_at: new Date().toISOString() }));
}

/** UI-only demo reply; never inserted into Supabase. */
export function buildDemoReply(roomId: string, realMessage: string): MessageWithAuthor | null {
  const now = Date.now();
  if (now - (recentlyReplied.get(roomId) ?? 0) < 25_000) return null;
  recentlyReplied.set(roomId, now);
  const author = authorFor(roomId, now);
  const isGreeting = /(^|\s)(سلام|هلا|هلو|مرحبا|هاي|hello|hi)(\s|!|！|$)/iu.test(realMessage);
  const pool = isGreeting ? greetings : followUps;
  return { id: `demo-live-${roomId}-${now}`, room_id: roomId, user_id: author.id, content: pool[Math.floor(Math.random() * pool.length)], created_at: new Date(now + 1200).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author };
}

/** Lightweight room-specific ambient activity. */
export function buildDemoAmbientMessage(roomId: string): MessageWithAuthor | null {
  const now = Date.now();
  if (now - (recentlyAmbient.get(roomId) ?? 0) < 18_000) return null;
  recentlyAmbient.set(roomId, now);
  const pool = roomPools[roomKey(roomId)];
  const author = authorFor(roomId, Math.floor(now / 18_000));
  return { id: `demo-ambient-${roomId}-${now}`, room_id: roomId, user_id: author.id, content: pool[Math.floor(Math.random() * pool.length)], created_at: new Date(now).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author };
}
