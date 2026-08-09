import type { MessageWithAuthor, Profile } from "@/types";
import { DEMO_PROFILES } from "@/lib/demo-community";
import { aiMembers, buildAiConversation } from "@/data/aiMembers";

const roomPools: Record<string, string[]> = {
  helsinki: ["شلون المواصلات اليوم؟ 🚋", "أحد يعرف كوفي هادي بهلسنكي؟ ☕", "الجو اليوم غريب 😂", "مين رايح للسنتر اليوم؟", "أحد جرب مكان جديد للأكل؟ 🍜"],
  finland: ["شنو أخباركم بفنلندا؟ 🇫🇮", "الشتاء بعده بعيد لو لا؟ 😂", "أحد يعرف مكان حلو للويكند؟", "شنو أفضل مدينة للمعيشة برأيكم؟", "أحد عنده تجربة ويا الدراسة هنا؟ 📚"],
  iraq: ["شلونكم أهل العراق ❤️🇮🇶", "اشتقت للأكل العراقي 😂", "منو بعده يحب الشاي بالهيل؟ ☕", "شنو أحلى أكلة عراقية برأيكم؟"],
  students: ["منو عنده امتحان هالأسبوع؟ 📚", "أحد يعرف مصادر زينة للدراسة؟", "وين أحصل مكتبة هادئة؟", "خلصتوا واجباتكم؟ 😅"],
  friends: ["شنو مسوين اليوم؟ 😄", "منو يريد سوالف؟ 😂", "أحد عنده فيلم حلو؟ 🎬", "شنو آخر شي فرحكم؟ ❤️", "منو يحب القهوة؟ ☕"],
  general: ["شلونكم اليوم؟ 🌷", "أحد صاحي بهالوقت؟ 😂", "وين أحصل قهوة زينة؟ ☕", "والله اليوم الجو حلو 😄", "منو عنده اقتراح لفيلم؟ 🎬", "شنو خطتكم للويكند؟", "أحد جرب مطعم جديد؟", "اشتقت للسوالف هنا 😄"],
};

const greetings = ["هلا والله 🌷 نورتينا!", "هلااا، نورت الغرفة ❤️", "أهلاً وسهلاً! شلونج؟", "يا هلا، نورتينا بينا 😊", "أهلاً بيج! شنو أخبارج اليوم؟"];
const followUps = ["إي والله 😄 شنو رأيك؟", "ههههه مضبوط 😂", "اتفق وياك، كمل السالفة 🌷", "زين! منو عنده تجربة ثانية؟", "حلوة السالفة 😄", "ذكرتيني بموقف صار وياي 😂"];
const recentlyReplied = new Map<string, number>();
const recentlyAmbient = new Map<string, number>();
const memberCursor = new Map<string, number>();

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
  const hash = [...roomId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, (2166136261 ^ salt) >>> 0);
  return DEMO_PROFILES[hash % DEMO_PROFILES.length]!;
}

function aiAuthor(roomId: string, salt = 0) {
  const cursor = memberCursor.get(roomId) ?? 0;
  const member = aiMembers[(cursor + salt) % aiMembers.length]!;
  memberCursor.set(roomId, cursor + 1);
  const fallback = authorFor(roomId, cursor + salt);
  return { member, author: { ...fallback, display_name: member.name, username: member.name.toLowerCase() } as Profile };
}

export function getActiveDemoMembers(limit = 48): Profile[] {
  return DEMO_PROFILES.slice(0, limit).map((profile) => ({ ...profile, status: "online", updated_at: new Date().toISOString() }));
}

export function buildDemoReply(roomId: string, realMessage: string): MessageWithAuthor | null {
  const now = Date.now();
  if (now - (recentlyReplied.get(roomId) ?? 0) < 10_000) return null;
  recentlyReplied.set(roomId, now);
  const { member, author } = aiAuthor(roomId);
  const isGreeting = /(^|\s)(سلام|هلا|هلو|مرحبا|هاي|hello|hi)(\s|!|！|$)/iu.test(realMessage);
  const generated = isGreeting ? greetings[Math.floor(Math.random() * greetings.length)]! : buildAiConversation(member, [realMessage]).text || followUps[Math.floor(Math.random() * followUps.length)]!;
  return { id: `ai-live-${roomId}-${now}`, room_id: roomId, user_id: author.id, content: generated, created_at: new Date(now + 1600).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author };
}

/** Community activity is triggered by a real message, then rotates through varied AI personas. */
export function buildDemoAmbientMessage(roomId: string): MessageWithAuthor | null {
  if (typeof window === "undefined") return null;
  const now = Date.now();
  const realAt = Number(window.localStorage.getItem(`diwan:last-real-message:${roomId}`) || 0);
  if (!realAt || now - realAt < 2500) return null;
  const lastAiAt = Number(window.localStorage.getItem(`diwan:last-ai-message:${roomId}`) || 0);
  if (now - lastAiAt < 10_000) return null;
  if (now - (recentlyAmbient.get(roomId) ?? 0) < 10_000) return null;
  recentlyAmbient.set(roomId, now);
  window.localStorage.setItem(`diwan:last-ai-message:${roomId}`, String(now));
  const { member, author } = aiAuthor(roomId, Math.floor(realAt / 1000));
  const previous = JSON.parse(window.localStorage.getItem(`diwan:ai-context:${roomId}`) || "[]") as string[];
  const pool = roomPools[roomKey(roomId)] ?? roomPools.general!;
  const text = buildAiConversation(member, [...previous, pool[Math.floor(Math.random() * pool.length)]!]).text;
  const context = [...previous, text].slice(-6);
  window.localStorage.setItem(`diwan:ai-context:${roomId}`, JSON.stringify(context));
  return { id: `ai-ambient-${roomId}-${now}`, room_id: roomId, user_id: author.id, content: text, created_at: new Date(now).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author };
}
